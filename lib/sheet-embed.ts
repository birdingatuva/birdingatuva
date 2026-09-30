export function getSheetEmbed(url: string) {
  try {
    const source = new URL(url)
    if (source.protocol !== 'https:' || source.hostname !== 'docs.google.com') return null
    const published = source.pathname.match(/^\/spreadsheets\/d\/e\/(2PACX-[a-zA-Z0-9_-]+)\/pub\/?$/)
    if (published) {
      const csv = new URL(`https://docs.google.com/spreadsheets/d/e/${published[1]}/pub`)
      csv.searchParams.set('output', 'csv')
      const tab = source.searchParams.get('gid')
      if (tab && !/^\d+$/.test(tab)) return null
      if (tab) csv.searchParams.set('gid', tab)
      return { id: `${published[1]}-${tab || 'default'}`, url: csv.toString().replace('output=csv', 'output=html'), embedUrl: '', csvUrl: csv.toString() }
    }
    const match = source.pathname.match(/^\/spreadsheets\/d\/([a-zA-Z0-9_-]+)(?:\/(?:edit|view|preview|htmlembed))?\/?$/)
    if (!match) return null
    const gid = new URLSearchParams(source.hash.slice(1)).get('gid') || source.searchParams.get('gid') || '0'
    if (!/^\d+$/.test(gid)) return null
    const base = `https://docs.google.com/spreadsheets/d/${match[1]}`
    return {
      id: `${match[1]}-${gid}`,
      url: `${base}/edit?gid=${gid}#gid=${gid}`,
      embedUrl: `${base}/htmlembed?${new URLSearchParams({ gid, range: 'A:D', widget: 'false', headers: 'false' })}`,
    }
  } catch {
    return null
  }
}

export function getEventSheets(markdown: string) {
  const sheets = new Map<string, NonNullable<ReturnType<typeof getSheetEmbed>>>()
  for (const match of markdown.matchAll(/https:\/\/docs\.google\.com\/spreadsheets\/d\/[^\s<>\)\]"']+/g)) {
    const sheet = getSheetEmbed(match[0])
    if (sheet) sheets.set(sheet.id, sheet)
  }
  return [...sheets.values()]
}
