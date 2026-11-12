import { describe, it, expect } from 'vitest';
import { markdownToHtml, renderMarkdownToHtml as md } from '@/lib/markdown-to-html';
import { sanitizeHtml } from '@/lib/sanitize-html';

describe('renderMarkdownToHtml (TASK-092, sin IA)', () => {
    it('envuelve la narración en un párrafo', () => {
        expect(md('La oveja bala con impaciencia.')).toBe('<p>La oveja bala con impaciencia.</p>');
    });

    it('devuelve cadena vacía si no hay texto', () => {
        expect(md('')).toBe('');
        expect(md('   \n\n  ')).toBe('');
    });

    it('separa párrafos por línea en blanco y convierte saltos simples en <br>', () => {
        expect(md('Primero.\r\n\r\nSegundo,\nsigue aquí.')).toBe(
            '<p>Primero.</p><p>Segundo,<br>sigue aquí.</p>'
        );
    });

    it('convierte negritas y cursivas', () => {
        expect(md('Un **golpe** y un *susurro*.')).toBe('<p>Un <strong>golpe</strong> y un <em>susurro</em>.</p>');
        expect(md('__fuerte__ y _suave_')).toBe('<p><strong>fuerte</strong> y <em>suave</em></p>');
        expect(md('***ambas***')).toBe('<p><strong><em>ambas</em></strong></p>');
        expect(md('**Finethir** dice *ya*')).toBe('<p><strong>Finethir</strong> dice <em>ya</em></p>');
    });

    it('no confunde asteriscos ni guiones bajos sueltos con formato', () => {
        expect(md('2 * 3 = 6')).toBe('<p>2 * 3 = 6</p>');
        expect(md('variable_con_guiones')).toBe('<p>variable_con_guiones</p>');
    });

    it('respeta los diálogos (raya, comillas latinas y cursivas dentro de comillas)', () => {
        expect(md('—¿Quién anda ahí? —pregunta Guz.')).toBe('<p>—¿Quién anda ahí? —pregunta Guz.</p>');
        expect(md("Susurra: '*¿Shinebright? Ese viejo...*'")).toBe(
            "<p>Susurra: '<em>¿Shinebright? Ese viejo...</em>'</p>"
        );
        expect(md('*«Por fin alguien que lee el pergamino.»*')).toBe(
            '<p><em>«Por fin alguien que lee el pergamino.»</em></p>'
        );
        expect(md('Dice: "Seguidme".')).toBe('<p>Dice: &quot;Seguidme&quot;.</p>');
    });

    it('convierte listas con viñetas y numeradas', () => {
        expect(md('Encuentras:\n\n- una daga\n- *un pergamino*\n* 3 monedas')).toBe(
            '<p>Encuentras:</p><ul><li>una daga</li><li><em>un pergamino</em></li><li>3 monedas</li></ul>'
        );
        expect(md('1. Abrir la puerta\n2) Entrar')).toBe('<ol><li>Abrir la puerta</li><li>Entrar</li></ol>');
        expect(md('Opciones:\n- huir\n- luchar')).toBe('<p>Opciones:</p><ul><li>huir</li><li>luchar</li></ul>');
    });

    it('convierte encabezados, citas, separadores y código', () => {
        expect(md('## La torre')).toBe('<h2>La torre</h2>');
        expect(md('> Una inscripción\n> antigua')).toBe('<blockquote><p>Una inscripción<br>antigua</p></blockquote>');
        expect(md('Antes\n\n---\n\nDespués')).toBe('<p>Antes</p><hr><p>Después</p>');
        expect(md('Usa `**esto**` tal cual')).toBe('<p>Usa <code>**esto**</code> tal cual</p>');
        expect(md('~~roto~~')).toBe('<p><s>roto</s></p>');
    });

    it('no deja pasar HTML inyectado: todo se escapa', () => {
        const html = md('<script>alert(1)</script> <img src=x onerror="alert(2)"> **<b>hola</b>**');
        expect(html).not.toMatch(/<script|<img|<b>/);
        expect(html).toBe(
            '<p>&lt;script&gt;alert(1)&lt;/script&gt; &lt;img src=x onerror=&quot;alert(2)&quot;&gt; ' +
            '<strong>&lt;b&gt;hola&lt;/b&gt;</strong></p>'
        );
    });

    it('no convierte enlaces ni imágenes (no hay href que inyectar)', () => {
        expect(md('[pulsa](javascript:alert(1))')).toBe('<p>[pulsa](javascript:alert(1))</p>');
        expect(md('![x](http://mal.example/x.png)')).toBe('<p>![x](http://mal.example/x.png)</p>');
    });

    it('la salida sobrevive intacta al saneado de la interfaz', () => {
        const html = md('Un **golpe**.\n\n- *uno*\n- dos\n\n> cita');
        expect(sanitizeHtml(html)).toBe(html);
    });

    it('es determinista', () => {
        const text = 'Galador **avanza**.\n\n- *uno*\n- dos';
        expect(md(text)).toBe(md(text));
    });

    it('mantiene la firma asíncrona { markdown } → { html } que usan los gestores', async () => {
        await expect(markdownToHtml({ markdown: '*hola*' })).resolves.toEqual({ html: '<p><em>hola</em></p>' });
    });
});
