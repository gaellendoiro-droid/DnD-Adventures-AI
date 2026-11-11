import { describe, it, expect } from 'vitest';
import { sanitizeJsonForSchema } from '@/ai/groq-plugin';

const schema = {
    type: 'array',
    items: { type: 'object', properties: { id: { type: 'string' }, connections: { type: 'array' }, tags: { type: 'array' } } },
};

describe('sanitizeJsonForSchema con raíz lista (modo JSON del modelo local)', () => {
    it('desenvuelve {"items": [...]}', () => {
        expect(sanitizeJsonForSchema({ items: [{ id: 'a' }, { id: 'b' }] }, schema)).toHaveLength(2);
    });
    it('envuelve un único elemento suelto en vez de quedarse con una de sus listas', () => {
        const out = sanitizeJsonForSchema({ id: 'a', connections: [], tags: ['x'] }, schema);
        expect(out).toEqual([{ id: 'a', connections: [], tags: ['x'] }]);
    });
    it('desenvuelve un objeto con una sola lista bajo otro nombre', () => {
        expect(sanitizeJsonForSchema({ locations: [{ id: 'a' }] }, schema)).toEqual([{ id: 'a' }]);
    });
});
