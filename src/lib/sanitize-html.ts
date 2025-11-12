/**
 * Utilidad para sanitizar HTML y prevenir ataques XSS
 * 
 * Usa DOMPurify para limpiar el HTML generado por la IA antes de renderizarlo
 * con dangerouslySetInnerHTML. Permite solo tags y atributos seguros para
 * contenido de markdown.
 */

import DOMPurify from 'dompurify';

/**
 * Sanitiza HTML para prevenir XSS attacks
 * Permite solo tags y atributos seguros para contenido de markdown
 * 
 * @param dirty - HTML sin sanitizar
 * @returns HTML sanitizado y seguro para renderizar
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    // Tags permitidos para contenido de markdown
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'strike',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'blockquote', 'code', 'pre',
      'a', 'img',
      'hr', 'div', 'span'
    ],
    // Atributos permitidos
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id'],
    // No permitir data attributes (pueden ser usados para XSS)
    ALLOW_DATA_ATTR: false,
    // Permitir estilos inline solo si es necesario (por defecto false)
    ALLOW_UNKNOWN_PROTOCOLS: false,
  });
}

