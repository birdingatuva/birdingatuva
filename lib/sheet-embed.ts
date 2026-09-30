export function getDashboardLink(url: string) {
  try {
    const source = new URL(url)
    if (source.protocol !== 'https:' || source.hostname !== 'docs.google.com') return null
    const match = source.pathname.match(/^\/spreadsheets\/d\/([a-zA-Z0-9_-]+)(?:\/(?:edit|view|preview|htmlembed))?\/?$/)
    if (!match) return null
    const gid = new URLSearchParams(source.hash.slice(1)).get('gid') || source.searchParams.get('gid') || '0'
    if (!/^\d+$/.test(gid)) return null
    const base = `https://docs.google.com/spreadsheets/d/${match[1]}`
    return {
      id: `${match[1]}-${gid}`,
      spreadsheetId: match[1],
      url: `${base}/edit?gid=${gid}#gid=${gid}`,
      embedUrl: `${base}/htmlembed?${new URLSearchParams({ gid, range: 'A:D', widget: 'false', headers: 'false' })}`,
    }
  } catch {
    return null
  }
}
