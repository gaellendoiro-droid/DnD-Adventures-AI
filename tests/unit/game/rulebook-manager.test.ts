import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RulebookManager } from '../../../src/lib/game/rulebook-manager';
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
import fs from 'fs';

// Definir mocks globales para los métodos
const mockGetFile = vi.fn();
const mockUploadFile = vi.fn();

vi.mock('@google/generative-ai/server', () => {
    class MockGoogleAIFileManager {
        getFile = mockGetFile;
        uploadFile = mockUploadFile;
    }

    return {
        FileState: {
            ACTIVE: 'ACTIVE',
            PROCESSING: 'PROCESSING',
            FAILED: 'FAILED'
        },
        GoogleAIFileManager: MockGoogleAIFileManager
    };
});

describe('RulebookManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Mock fs para no escribir en disco en los tests
        vi.spyOn(fs, 'existsSync').mockReturnValue(false);
        vi.spyOn(fs, 'readFileSync').mockReturnValue('{}');
        vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
        vi.spyOn(fs, 'mkdirSync').mockImplementation(() => '');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('debería devolver las URIs por defecto si todos los archivos están activos', async () => {
        // Simular que todos los archivos están activos
        mockGetFile.mockResolvedValue({ state: FileState.ACTIVE });

        const uris = await RulebookManager.getOrUploadManuals('mock-api-key');

        expect(uris).toHaveLength(3);
        expect(uris[0]).toContain('7ji2goimrnvb');
        expect(uris[1]).toContain('41odl5mikhz8');
        expect(uris[2]).toContain('re3mt0rgvvi6');

        expect(mockGetFile).toHaveBeenCalledTimes(3);
        expect(mockUploadFile).not.toHaveBeenCalled();
    });

    it('debería subir el manual si getFile da un error 404/403 (archivo caducado)', async () => {
        // Simular que el primer archivo da error (caducado) y los otros dos están activos
        mockGetFile
            .mockRejectedValueOnce({ status: 404, message: 'Not found' }) // Primer manual
            .mockResolvedValueOnce({ state: FileState.ACTIVE })           // Espera de subida (estado del nuevo archivo)
            .mockResolvedValueOnce({ state: FileState.ACTIVE })           // Segundo manual
            .mockResolvedValueOnce({ state: FileState.ACTIVE });          // Tercer manual

        // Mock de existencia del archivo local para permitir la subida
        vi.spyOn(fs, 'existsSync').mockImplementation((path) => {
            if (typeof path === 'string' && path.includes('Manual_Jugador.pdf')) {
                return true;
            }
            return false;
        });

        mockUploadFile.mockResolvedValue({
            file: {
                name: 'files/nuevo-id-manual-jugador',
                uri: 'https://generativelanguage.googleapis.com/v1beta/files/nuevo-id-manual-jugador',
                displayName: 'Manual del Jugador D&D 5e'
            }
        });

        const uris = await RulebookManager.getOrUploadManuals('mock-api-key');

        expect(uris).toHaveLength(3);
        expect(uris[0]).toBe('https://generativelanguage.googleapis.com/v1beta/files/nuevo-id-manual-jugador');
        expect(mockUploadFile).toHaveBeenCalledTimes(1);
        expect(fs.writeFileSync).toHaveBeenCalled(); // Se debió guardar la caché
    });
});
