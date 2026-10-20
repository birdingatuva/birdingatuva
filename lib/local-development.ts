// Never trust a hostname alone: production and test builds must verify Turnstile,
// even if a request supplies a loopback Host header.
export function isLocalDevelopment(hostname: string): boolean {
  return process.env.NODE_ENV === 'development'
    && ['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname)
}
