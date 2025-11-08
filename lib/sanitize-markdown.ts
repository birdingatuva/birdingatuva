import DOMPurify from 'dompurify'

export function sanitizeMarkdown(html: string) {
  // DOMPurify.sanitize will remove any XSS vectors
  return typeof window !== 'undefined' ? DOMPurify.sanitize(html) : html
}
