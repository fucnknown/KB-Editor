import DOMPurify from 'dompurify';

/**
 * Configuration for safe HTML rendering.
 * Allows safe rich formatting elements while strictly stripping executable code,
 * event handlers, script injections, and malicious tags.
 */
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'b', 'strong', 'i', 'em', 'u', 's', 'strike',
    'span', 'div', 'br', 'hr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'a',
    'blockquote', 'pre', 'code', 'kbd',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'sub', 'sup', 'mark', 'small'
  ],
  ALLOWED_ATTR: [
    'href', 'title', 'target', 'rel', 'class', 'style',
    'colspan', 'rowspan', 'align'
  ],
  ALLOW_DATA_ATTR: false,
};

/**
 * Sanitizes dirty HTML string and ensures external links are safe
 */
export function sanitizeHtml(dirtyHtml: string): string {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') return '';

  const clean = DOMPurify.sanitize(dirtyHtml, SANITIZE_CONFIG);

  // Hook or post-process links to ensure security
  return clean.replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"/gi, (match) => {
    if (!match.includes('rel=')) {
      return match + ' rel="noopener noreferrer" target="_blank"';
    }
    return match;
  });
}
