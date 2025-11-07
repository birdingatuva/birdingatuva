export const DEFAULT_TIMEZONE = 'America/New_York'

export function tzOffsetMinutes(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts = fmt.formatToParts(date)
  const map: Record<string, string> = {}
  for (const p of parts) map[p.type] = p.value
  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  )
  return (asUTC - date.getTime()) / 60000
}

export function isoToZonedDate(iso: string, timeZone = DEFAULT_TIMEZONE) {
  const [y, m, d] = iso.split('-').map((v) => parseInt(v, 10))
  const utcMidnight = new Date(Date.UTC(y, (m || 1) - 1, d || 1, 0, 0, 0))
  const offsetMinutes = tzOffsetMinutes(utcMidnight, timeZone)
  const zonedUtcMs = utcMidnight.getTime() - offsetMinutes * 60000
  return new Date(zonedUtcMs)
}

export function formatDisplayDate(startIso: string, endIso: string, timeZone = DEFAULT_TIMEZONE) {
  try {
    const start = isoToZonedDate(startIso, timeZone)
    const end = isoToZonedDate(endIso, timeZone)
    const optsStart: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', timeZone }
    const optsEnd: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric', timeZone }
    const startStr = start.toLocaleDateString(undefined, optsStart)
    if (startIso === endIso) return startStr
    const endStr = end.toLocaleDateString(undefined, optsEnd)
    return `${startStr} -\n${endStr}`
  } catch {
    return startIso === endIso ? startIso : `${startIso} -\n${endIso}`
  }
}

// parse a time token in 24-hour HH:mm format and return a Date instant for that local time in the timezone
export function parseTimeToken(dateISO: string, token: string, timeZone = DEFAULT_TIMEZONE): Date | null {
  const m = token.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const hour = parseInt(m[1], 10)
  const minute = parseInt(m[2], 10)
  const d = isoToZonedDate(dateISO, timeZone)
  // isoToZonedDate returns the UTC instant that corresponds to LOCAL midnight.
  // To get the UTC instant that corresponds to LOCAL hour:minute, add the
  // hour/minute offset to that base instant rather than overwriting the UTC hour.
  const utcMs = d.getTime() + hour * 60 * 60 * 1000 + minute * 60 * 1000
  return new Date(utcMs)
}

export function formatTimeForDisplay(dateISO: string, time24: string | undefined, timeZone = DEFAULT_TIMEZONE) {
  if (!time24) return ''
  const dt = parseTimeToken(dateISO, time24, timeZone)
  if (!dt) return time24
  const timeStr = dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZone })
  // Do not append timezone abbreviations on the site; show local formatted time only.
  return timeStr
}
