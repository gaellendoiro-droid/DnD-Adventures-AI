/**
 * Motor de escenarios narrativos (TASK-071 a TASK-074).
 *
 * Ejecuta el flujo real del juego (`gameStreamCoordinator`, el mismo que usa `/api/game/stream`)
 * turno a turno, con un cliente simulado que aplica los `state_delta` como la UI, y comprueba:
 *  - Invariantes generales en cada turno (sin errores, sin spoilers declarados en la aventura, etc.).
 *  - Las expectativas propias de cada paso del escenario.
 *
 * Modo (variable SCENARIO_MODE): replay (por defecto) | record | live. Ver docs/testing.md.
 */
import fs from 'fs';
import path from 'path';
import { CassetteRecorder, loadCassette, saveCassette, type ScenarioMode } from './cassette';
import { enableDeterminism } from './determinism';
import { applyStateDelta, nextMessageId, resetMessageCounter, type ClientState } from './client-state';
import type { GameMessage } from '@/lib/types';
import { resolveStartingLocationId } from '@/lib/adventure-loader/starting-location';

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export interface TurnResult {
    index: number;
    action: string;
    /** Eventos del stream tal y como los recibiría el navegador (serializados). */
    events: any[];
    /** Mensajes añadidos al chat en este turno (sin contar el del jugador). */
    newMessages: GameMessage[];
    /** Texto de todos los mensajes del DM/sistema de este turno. */
    dmText: string;
    /** Mensajes de compañeros de este turno. */
    companionMessages: GameMessage[];
    /** Tiradas de dados de este turno. */
    diceRolls: any[];
    llmCalls: number;
    otherCalls: number;
    durationMs: number;
    warnings: string[];
    /** Estado del cliente al terminar el turno (copia). */
    state: ClientState;
}

export interface ScenarioHelpers {
    /** Personaje del grupo por nombre (insensible a mayúsculas). */
    character(state: ClientState, name: string): any;
    /** ¿Algún miembro del grupo lleva un objeto cuyo id o nombre encaja? */
    partyHasItem(state: ClientState, pattern: RegExp): boolean;
    /** Nombre del miembro del grupo que lleva el objeto, si lo hay. */
    itemHolder(state: ClientState, pattern: RegExp): string | undefined;
    flag(state: ClientState, name: string): unknown;
}

/**
 * Comportamiento correcto que hoy NO se cumple por un problema ya registrado en el roadmap.
 * No rompe el escenario: se informa como aviso mientras siga fallando, y avisa cuando empieza
 * a cumplirse para convertirlo en una expectativa normal.
 */
export interface KnownIssue {
    /** ID del roadmap, p. ej. "TASK-084". */
    task: string;
    description: string;
    check: (turn: TurnResult, h: ScenarioHelpers) => void | Promise<void>;
}

export interface ScenarioStep {
    action: string;
    /** Descripción de lo que se espera, para el informe. */
    intent?: string;
    expect?: (turn: TurnResult, h: ScenarioHelpers) => void | Promise<void>;
    knownIssues?: KnownIssue[];
}

/** Punto de partida distinto del inicio de la aventura (como cargar una partida guardada). */
export interface ScenarioInitialState {
    locationId?: string;
    globalFlags?: Record<string, unknown>;
    /** Mensajes previos del chat (se añaden tras la narración inicial). */
    history?: { sender: 'DM' | 'Player' | 'Character'; senderName?: string; content: string }[];
}

export interface ScenarioDefinition {
    id: string;
    title: string;
    /** Ruta del JSON de la aventura, relativa a la raíz del proyecto. */
    adventure: string;
    /** Semilla de los dados: fija las tiradas de todo el escenario. */
    seed: number;
    /**
     * Resultados del d20 (sin modificadores) que se usarán en orden en las pruebas de habilidad,
     * para reproducir una partida concreta. Cuando se agotan, se vuelve a tirar con la semilla.
     */
    forcedD20?: number[];
    steps: ScenarioStep[];
    /** En combate, enviar "continuar turno" automáticamente mientras jueguen las IAs (como la UI). */
    autoContinueCombat?: boolean;
    initial?: ScenarioInitialState;
    /**
     * Fallos de invariantes o expectativas ya registrados en el roadmap: si el mensaje del fallo
     * encaja con `match`, se informa como aviso en vez de romper el escenario.
     */
    knownFailures?: { task: string; description: string; match: RegExp }[];
}

export interface ScenarioReport {
    id: string;
    mode: ScenarioMode;
    model: string;
    turns: TurnResult[];
    failures: string[];
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '..', '..', '..');

function scenarioMode(): ScenarioMode {
    const raw = (process.env.SCENARIO_MODE || 'replay').toLowerCase();
    if (raw === 'record' || raw === 'live' || raw === 'replay') return raw;
    throw new Error(`SCENARIO_MODE no válido: "${raw}" (usa replay, record o live)`);
}

function loadDotEnv(): void {
    const file = path.join(ROOT, '.env');
    if (!fs.existsSync(file)) return;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (!m || line.trim().startsWith('#')) continue;
        if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

const helpers: ScenarioHelpers = {
    character(state, name) {
        return state.party.find(c => c.name?.toLowerCase() === name.toLowerCase());
    },
    partyHasItem(state, pattern) {
        return state.party.some(c => (c.inventory || []).some((it: any) => pattern.test(`${it.id || ''} ${it.name || ''}`)));
    },
    itemHolder(state, pattern) {
        return state.party.find(c => (c.inventory || []).some((it: any) => pattern.test(`${it.id || ''} ${it.name || ''}`)))?.name;
    },
    flag(state, name) {
        return state.worldState?.globalFlags?.[name];
    },
};

function write(line = ''): void {
    process.stdout.write(line + '\n');
}

// ---------------------------------------------------------------------------
// Invariantes que se comprueban en TODOS los turnos de TODOS los escenarios
// ---------------------------------------------------------------------------

function checkInvariants(turn: TurnResult, hiddenTerms: string[]): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const streamErrors = turn.events.filter(e => e.type === 'error');
    if (streamErrors.length > 0) {
        errors.push(`El stream emitió errores: ${streamErrors.map(e => e.payload?.message).join(' | ')}`);
    }

    if (turn.newMessages.length === 0) {
        errors.push('El turno no produjo ningún mensaje (ni del DM ni del sistema).');
    }

    const allText = turn.newMessages.map(m => String(m.content ?? '')).join('\n');
    if (/\[object Object\]|\bundefined\b|\bNaN\b/.test(allText)) {
        errors.push('Hay restos técnicos en el texto mostrado ("[object Object]", "undefined" o "NaN").');
    }

    const rawCode = allText.match(/\b[A-Z]{3,}(?:_[A-Z]{2,})+\b/);
    if (rawCode) {
        errors.push(`Se muestra al jugador un código de error en bruto: "${rawCode[0]}".`);
    }

    if (/Hubo un error al procesar/i.test(allText)) {
        errors.push(`El juego muestra un error interno al jugador: "${allText.match(/Hubo un error al procesar[^.]*\.?/i)?.[0]}"`);
    }

    for (const c of turn.state.party) {
        const hp = (c as any).hp;
        if (hp && (hp.current < 0 || hp.current > hp.max)) {
            errors.push(`HP fuera de rango para ${c.name}: ${hp.current}/${hp.max}.`);
        }
    }

    const canTalkToAnimals = turn.state.worldState?.globalFlags?.speak_with_animals === true;
    if (!canTalkToAnimals) {
        for (const term of hiddenTerms) {
            const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            if (re.test(allText)) {
                errors.push(`Spoiler: aparece "${term}" mientras speak_with_animals no está activo.`);
            }
        }
    }

    // Problema conocido, aún abierto (TASK-007): se registra como aviso, no rompe el escenario.
    if (/\b(CD|DC)\s*\d+|clase de dificultad/i.test(turn.dmText)) {
        warnings.push('El DM menciona una CD en la narración (TASK-007).');
    }

    return { errors, warnings };
}

// ---------------------------------------------------------------------------
// Ejecución
// ---------------------------------------------------------------------------

export async function runScenario(def: ScenarioDefinition): Promise<ScenarioReport> {
    const mode = scenarioMode();
    const cassette = mode === 'replay' ? loadCassette(def.id) : undefined;

    // 1. Entorno: fijar el modelo ANTES de importar el código del juego.
    if (mode === 'replay') {
        if (!cassette) {
            throw new Error(`No existe cassette para "${def.id}". Grábalo con: npm run test:scenarios:record -- ${def.id}`);
        }
        process.env.GEMINI_MODEL = cassette.model;
        // Mismo respaldo local que al grabar (o ninguno), para que las peticiones coincidan.
        process.env.LOCAL_LLM_MODEL = cassette.localModel ?? '';
        process.env.GOOGLE_GENAI_API_KEY ||= 'replay-sin-clave';
        process.env.GEMINI_API_KEY ||= 'replay-sin-clave';
        process.env.GROQ_API_KEY ||= 'replay-sin-clave';
    } else {
        loadDotEnv();
    }

    const recorder = new CassetteRecorder(mode, def.id, cassette);
    recorder.install();
    const determinism = enableDeterminism(cassette?.seed ?? def.seed, mode === 'replay');
    (globalThis as any).__forcedD20 = def.forcedD20 ? [...def.forcedD20] : undefined;
    resetMessageCounter();

    const failures: string[] = [];
    const turns: TurnResult[] = [];
    let model = cassette?.model ?? '';

    try {
        const { GEMINI_MODEL_NAME } = await import('@/ai/model-config');
        model = GEMINI_MODEL_NAME;
        const { gameStreamCoordinator } = await import('@/ai/streaming/game-stream-coordinator');
        const { GameStateSchema } = await import('@/ai/flows/schemas');
        const { initialParty } = await import('@/lib/initial-party');
        const { createInitialWorldState } = await import('@/lib/game/world-state-types');
        const { collectHiddenIdentityTerms } = await import('@/lib/game/communication-barrier');

        // 2. Aventura (sustituye a la caché del servidor; ver tests/scenarios/harness/setup.ts).
        const adventure = JSON.parse(fs.readFileSync(path.join(ROOT, def.adventure), 'utf8'));
        (globalThis as any).__scenarioAdventure = adventure;
        const hiddenTerms = collectHiddenIdentityTerms(adventure.entities).map(t => t.term);

        // 3. Estado inicial, igual que game-initializer.ts con narración pregenerada.
        // Misma función que usa el juego: el arnés no debe ser más listo que el código real.
        const startId = resolveStartingLocationId(adventure)!;
        const party = clone(initialParty);
        const player = party.find((c: any) => c.controlledBy === 'Player') ?? party[0];
        const state: ClientState = {
            messages: [{
                id: nextMessageId(),
                sender: 'DM',
                content: adventure.introductoryNarration || adventure.openingScene || '',
                timestamp: '19:00',
            } as GameMessage],
            diceRolls: [],
            party,
            locationId: startId,
            inCombat: false,
            turnIndex: 0,
            initiativeOrder: [],
            enemies: [],
            enemiesByLocation: {},
            openDoors: {},
            worldState: createInitialWorldState(),
            selectedCharacterId: player.id,
        };
        if (def.initial?.locationId) state.locationId = def.initial.locationId;
        if (def.initial?.globalFlags) {
            state.worldState.globalFlags = { ...(state.worldState.globalFlags || {}), ...def.initial.globalFlags };
        }
        for (const m of def.initial?.history ?? []) {
            state.messages.push({ id: nextMessageId(), timestamp: '19:00', ...m } as GameMessage);
        }

        const runTurn = async (action: string, index: number, isContinuation: boolean): Promise<TurnResult> => {
            const callsBefore = { ...recorder.stats };
            const rollsBefore = state.diceRolls.length;
            const t0 = performance.now();

            if (!isContinuation) {
                const sender = state.inCombat ? state.initiativeOrder[state.turnIndex]?.characterName : player.name;
                state.messages.push({ id: nextMessageId(), sender: 'Player', senderName: sender, content: action, timestamp: '19:00' } as GameMessage);
            }

            const input = {
                playerAction: action,
                party: state.party,
                locationId: state.locationId,
                inCombat: state.inCombat,
                conversationHistory: state.messages.slice(-10),
                turnIndex: state.turnIndex,
                phase: state.phase,
                initiativeOrder: state.initiativeOrder,
                enemies: state.enemies,
                enemiesByLocation: state.enemiesByLocation,
                openDoors: state.openDoors,
                worldState: state.worldState,
                selectedCharacterId: state.selectedCharacterId,
            };
            // Igual que /api/game/stream: se valida y se pasa el resultado validado.
            const validated = GameStateSchema.parse(clone(input));

            const events: any[] = [];
            const newMessages: GameMessage[] = [];
            for await (const ev of gameStreamCoordinator(validated as any)) {
                const serialized = clone(ev);
                events.push(serialized);
                if (serialized.type === 'state_delta') {
                    newMessages.push(...applyStateDelta(state, serialized.payload?.data));
                }
            }

            const turn: TurnResult = {
                index,
                action,
                events,
                newMessages,
                dmText: newMessages.filter(m => m.sender === 'DM' || m.sender === 'System').map(m => String(m.content)).join('\n\n'),
                companionMessages: newMessages.filter(m => m.sender === 'Character'),
                diceRolls: state.diceRolls.slice(rollsBefore),
                llmCalls: recorder.stats.llmCalls - callsBefore.llmCalls,
                otherCalls: recorder.stats.otherCalls - callsBefore.otherCalls,
                durationMs: Math.round(performance.now() - t0),
                warnings: [],
                state: clone(state),
            };
            return turn;
        };

        // 4. Pasos del escenario.
        for (let i = 0; i < def.steps.length; i++) {
            const step = def.steps[i];
            const turn = await runTurn(step.action, i + 1, false);
            turns.push(turn);

            const { errors, warnings } = checkInvariants(turn, hiddenTerms);
            turn.warnings.push(...warnings);
            errors.forEach(e => failures.push(`Paso ${i + 1} («${step.action}»): ${e}`));

            if (step.expect) {
                try {
                    await step.expect(turn, helpers);
                } catch (err: any) {
                    failures.push(`Paso ${i + 1} («${step.action}»): ${err?.message ?? err}`);
                }
            }

            for (const issue of step.knownIssues ?? []) {
                try {
                    await issue.check(turn, helpers);
                    turn.warnings.push(`✨ [${issue.task}] Parece resuelto: «${issue.description}». Conviértelo en una expectativa normal.`);
                } catch {
                    turn.warnings.push(`[${issue.task}] Problema conocido: ${issue.description}`);
                }
            }

            // Combate: la UI pide los turnos de la IA automáticamente.
            let guard = 0;
            while (def.autoContinueCombat && state.inCombat && state.lastProcessedTurnWasAI && guard++ < 12) {
                const cont = await runTurn('continuar turno', i + 1, true);
                turns.push(cont);
                const inv = checkInvariants(cont, hiddenTerms);
                cont.warnings.push(...inv.warnings);
                inv.errors.forEach(e => failures.push(`Paso ${i + 1} (continuar turno): ${e}`));
            }
        }

        if (mode === 'replay') {
            const unused = recorder.unusedReplayInteractions();
            if (unused.length > 0) {
                failures.push(
                    `El juego ya no hace ${unused.length} llamada(s) que sí estaban grabadas. ` +
                    `Si el cambio es intencionado, vuelve a grabar: npm run test:scenarios:record -- ${def.id}`
                );
            }
        }
    } catch (err: any) {
        failures.push(`Error al ejecutar el escenario: ${err?.stack ?? err}`);
    } finally {
        determinism.restore();
        (globalThis as any).__forcedD20 = undefined;
        recorder.uninstall();
    }

    if (mode === 'record') {
        saveCassette(recorder.toCassette(model, def.seed));
    }

    // Fallos ya conocidos (registrados en el roadmap): pasan a aviso.
    const known = def.knownFailures ?? [];
    const realFailures: string[] = [];
    const knownWarnings: string[] = [];
    for (const f of failures) {
        const k = known.find(kf => kf.match.test(f));
        if (k) knownWarnings.push(`[${k.task}] Problema conocido (${k.description}): ${f}`);
        else realFailures.push(f);
    }
    const unmatched = known.filter(kf => !failures.some(f => kf.match.test(f)));
    for (const k of unmatched) {
        knownWarnings.push(`✨ [${k.task}] Ya no aparece el fallo conocido «${k.description}». Si está resuelto, quítalo de knownFailures.`);
    }

    printReport({ id: def.id, mode, model, turns, failures: realFailures }, def, knownWarnings);
    return { id: def.id, mode, model, turns, failures: realFailures };
}

function printReport(report: ScenarioReport, def: ScenarioDefinition, knownWarnings: string[] = []): void {
    write();
    write(`━━ Escenario ${report.id} — ${def.title}`);
    write(`   modo: ${report.mode} · modelo: ${report.model} · semilla: ${def.seed}`);
    for (const t of report.turns) {
        if (t.action === 'continuar turno') {
            const who = t.state.initiativeOrder?.[t.state.turnIndex]?.characterName ?? '?';
            write(`       ↳ turno IA → siguiente: ${who} · IA: ${t.llmCalls} llamadas · dados: ${t.diceRolls.length}`);
            for (const w of t.warnings) write(`         ⚠ ${w}`);
            if (process.env.SCENARIO_TRANSCRIPT) {
                for (const m of t.newMessages) {
                    const text = String(m.content).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
                    write(`           [${m.sender === 'Character' ? m.senderName : m.sender}] ${text}`);
                }
            }
            continue;
        }
        const dice = t.diceRolls.map(r => `${r.rollNotation ?? ''}=${r.totalResult ?? '?'}${r.outcome ? ` (${r.outcome})` : ''}`).join(', ');
        write(`   ${String(t.index).padStart(2)}. «${t.action.slice(0, 60)}»`);
        write(`       IA: ${t.llmCalls} llamadas · ${report.mode === 'replay' ? '-' : `${t.durationMs} ms`} · mensajes: ${t.newMessages.length}${dice ? ` · dados: ${dice}` : ''}`);
        for (const w of t.warnings) write(`       ⚠ ${w}`);
        if (process.env.SCENARIO_TRANSCRIPT) {
            for (const m of t.newMessages) {
                const who = m.sender === 'Character' ? m.senderName : m.sender;
                const text = String(m.content).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
                write(`         [${who}] ${text}`);
            }
        }
    }
    if (report.turns.length > 0) {
        const calls = report.turns.map(t => t.llmCalls);
        const avg = calls.reduce((a, b) => a + b, 0) / calls.length;
        write(`   Llamadas a la IA por turno: media ${avg.toFixed(1)} · máximo ${Math.max(...calls)}`);
    }
    for (const w of knownWarnings) write(`   ⚠ ${w}`);
    write(report.failures.length === 0 ? '   ✅ Sin fallos' : `   ❌ ${report.failures.length} fallo(s)`);
    for (const f of report.failures) write(`      - ${f}`);
}

/** Envuelve la ejecución para usarla dentro de un test de Vitest. */
export async function expectScenarioToPass(def: ScenarioDefinition): Promise<ScenarioReport> {
    const report = await runScenario(def);
    if (report.failures.length > 0) {
        throw new Error(`El escenario ${def.id} tiene ${report.failures.length} fallo(s):\n- ${report.failures.join('\n- ')}`);
    }
    return report;
}
