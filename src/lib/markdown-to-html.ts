/**
 * @fileOverview Conversión determinista de la narración (Markdown) a HTML.
 *
 * Sustituye a la antigua llamada a la IA (TASK-092): no cuesta tokens ni latencia
 * y siempre produce lo mismo para la misma entrada.
 *
 * Seguridad: TODO el texto se escapa antes de aplicar el formato, así que el HTML
 * que escriba el modelo (o el jugador) se muestra como texto y nunca se inyecta.
 * Solo salen las etiquetas que genera este módulo. La interfaz vuelve a sanear con
 * DOMPurify (`src/lib/sanitize-html.ts`) antes de pintarlo.
 *
 * Subconjunto soportado (el que usa la narración del DM):
 * - Párrafos separados por línea en blanco; saltos de línea simples → `<br>`.
 * - `**negrita**`, `__negrita__`, `*cursiva*`, `_cursiva_`, `***ambas***`, `~~tachado~~`, `` `código` ``.
 * - Listas `- `, `* `, `+ ` (→ `<ul>`) y `1. ` / `1) ` (→ `<ol>`).
 * - Encabezados `#`..`######`, citas `> ` y separadores `---` / `***`.
 * Los enlaces e imágenes no se convierten (se dejan como texto).
 */

const ESCAPES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
};

function escapeHtml(text: string): string {
    return text.replace(/[&<>"]/g, ch => ESCAPES[ch]);
}

/** Formato en línea sobre texto YA escapado. */
function renderInline(raw: string): string {
    const codeSpans: string[] = [];
    // Los fragmentos de código se apartan para que no se les aplique más formato.
    let text = escapeHtml(raw).replace(/`([^`\n]+)`/g, (_, code: string) => {
        codeSpans.push(`<code>${code}</code>`);
        return `\u0000${codeSpans.length - 1}\u0000`;
    });

    text = text
        .replace(/\*\*\*(?=\S)([^*\n]+?)(?<=\S)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(?=\S)(.+?)(?<=\S)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^\w])__(?=\S)(.+?)(?<=\S)__(?!\w)/g, '$1<strong>$2</strong>')
        .replace(/\*(?=[^\s*])([^*\n]*?[^\s*])\*/g, '<em>$1</em>')
        .replace(/\*(?=[^\s*])([^*\n])\*/g, '<em>$1</em>')
        .replace(/(^|[^\w])_(?=[^\s_])([^_\n]*?[^\s_]|[^\s_])_(?!\w)/g, '$1<em>$2</em>')
        .replace(/~~(?=\S)(.+?)(?<=\S)~~/g, '<s>$1</s>');

    return text.replace(/\u0000(\d+)\u0000/g, (_, i: string) => codeSpans[Number(i)]);
}

type Block =
    | { kind: 'p'; lines: string[] }
    | { kind: 'ul' | 'ol'; items: string[] }
    | { kind: 'quote'; lines: string[] }
    | { kind: 'h'; level: number; text: string }
    | { kind: 'hr' };

const UL_ITEM = /^\s*[-*+]\s+(.*)$/;
const OL_ITEM = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^\s*(#{1,6})\s+(.*?)\s*#*\s*$/;
const QUOTE = /^\s*>\s?(.*)$/;
const HR = /^\s*([-*_])(\s*\1){2,}\s*$/;

function parseBlocks(markdown: string): Block[] {
    const blocks: Block[] = [];
    // `as`: si no, TS estrecha a `null` porque no ve las asignaciones dentro de `close()`.
    let current = null as Block | null;

    const close = () => {
        if (current) blocks.push(current);
        current = null;
    };

    for (const line of markdown.split('\n')) {
        if (line.trim() === '') {
            close();
            continue;
        }

        let m: RegExpMatchArray | null;
        if (HR.test(line)) {
            close();
            blocks.push({ kind: 'hr' });
        } else if ((m = line.match(HEADING))) {
            close();
            blocks.push({ kind: 'h', level: m[1].length, text: m[2] });
        } else if ((m = line.match(UL_ITEM)) || (m = line.match(OL_ITEM))) {
            const kind = UL_ITEM.test(line) ? 'ul' : 'ol';
            if (current?.kind !== kind) {
                close();
                current = { kind, items: [] };
            }
            (current as { items: string[] }).items.push(m[1]);
        } else if ((m = line.match(QUOTE))) {
            if (current?.kind !== 'quote') {
                close();
                current = { kind: 'quote', lines: [] };
            }
            (current as { lines: string[] }).lines.push(m[1]);
        } else if (current?.kind === 'ul' || current?.kind === 'ol') {
            // Línea de continuación del último elemento de la lista.
            const items: string[] = current.items;
            items[items.length - 1] += ` ${line.trim()}`;
        } else {
            if (current?.kind !== 'p' && current?.kind !== 'quote') {
                close();
                current = { kind: 'p', lines: [] };
            }
            (current as { lines: string[] }).lines.push(line.trim());
        }
    }
    close();
    return blocks;
}

function renderBlock(block: Block): string {
    switch (block.kind) {
        case 'p':
            return `<p>${block.lines.map(renderInline).join('<br>')}</p>`;
        case 'quote':
            return `<blockquote><p>${block.lines.map(renderInline).join('<br>')}</p></blockquote>`;
        case 'ul':
        case 'ol':
            return `<${block.kind}>${block.items.map(i => `<li>${renderInline(i)}</li>`).join('')}</${block.kind}>`;
        case 'h':
            return `<h${block.level}>${renderInline(block.text)}</h${block.level}>`;
        case 'hr':
            return '<hr>';
    }
}

/** Convierte Markdown a HTML de forma síncrona y determinista. */
export function renderMarkdownToHtml(markdown: string): string {
    const normalized = (markdown ?? '').replace(/\r\n?/g, '\n').trim();
    if (!normalized) return '';
    return parseBlocks(normalized).map(renderBlock).join('');
}

export type MarkdownToHtmlInput = { markdown: string };
export type MarkdownToHtmlOutput = { html: string };

/**
 * Misma firma que el antiguo flujo de Genkit, para no tocar a quien lo inyecta
 * como dependencia (combate, gestor narrativo).
 */
export async function markdownToHtml(input: MarkdownToHtmlInput): Promise<MarkdownToHtmlOutput> {
    return { html: renderMarkdownToHtml(input.markdown) };
}
