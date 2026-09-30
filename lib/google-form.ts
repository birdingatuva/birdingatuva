// Only follow Google Forms links; never fetch arbitrary event-editor URLs.
export function isGoogleFormLink(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && (
      (url.hostname === 'forms.gle' && /^\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname)) ||
      (url.hostname === 'docs.google.com' && /^\/forms\/(?:u\/\d+\/)?d\/(?:e\/)?[a-zA-Z0-9_-]+\/viewform\/?$/.test(url.pathname))
    )
  } catch { return false }
}

export async function resolveGoogleForm(value: string): Promise<string | null> {
  if (!isGoogleFormLink(value)) return null
  let current = value.trim()
  try {
    for (let i = 0; i < 5; i++) {
      const response = await fetch(current, { redirect: 'manual', signal: AbortSignal.timeout(5000), next: { revalidate: 60 } })
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (!location) return null
        current = new URL(location, current).toString()
        if (!isGoogleFormLink(current)) return null
        continue
      }
      if (!response.ok || new URL(current).hostname !== 'docs.google.com') return null
      const url = new URL(current)
      url.searchParams.set('embedded', 'true')
      return url.toString()
    }
  } catch { return null }
  return null
}
