export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], cell = '', quoted = false
  const input = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < input.length; i++) {
    const c = input[i]
    if (c === '"') {
      if (quoted && input[i + 1] === '"') { cell += '"'; i++ }
      else quoted = !quoted
    } else if (!quoted && (c === ',' || c === '\n' || c === '\r')) {
      row.push(cell.trim()); cell = ''
      if (c !== ',') {
        rows.push(row); row = []
        if (c === '\r' && input[i + 1] === '\n') i++
      }
    } else cell += c
  }
  if (quoted) throw new Error('Incomplete CSV')
  if (cell || row.length) { row.push(cell.trim()); rows.push(row) }
  return rows
}

export function parseCarpoolCsv(text: string) {
  const rows = parseCsv(text)
  const header = rows.findIndex(row => row[0]?.toLowerCase() === 'total seats' && row[1]?.toLowerCase() === 'registered passengers' && row[2]?.toLowerCase() === 'waitlisted passengers' && row[3]?.toLowerCase() === 'driver list')
  if (header < 0) throw new Error('Dashboard columns not found')
  const body = rows.slice(header + 1)
  const remaining = body.findIndex(row => row[0]?.toLowerCase() === 'seats remaining')
  const count = (value: string | undefined) => value && /^\d+$/.test(value) ? Number(value) : null
  const list = (column: number) => body.map(row => row[column] || '').filter(Boolean)
  const lists = [list(1), list(2), list(3)]
  const sheetError = /^#(?:N\/A|REF!|VALUE!|DIV\/0!|ERROR!|NAME\?|NUM!|SPILL!|NULL!)/
  if (lists.some(list => list.some(value => sheetError.test(value)))) throw new Error('The source sheet has formula errors')
  return {
    totalSeats: count(body[0]?.[0]),
    seatsRemaining: remaining >= 0 ? count(body[remaining + 1]?.[0]) : null,
    registered: lists[0], waitlisted: lists[1], drivers: lists[2],
  }
}

export type CarpoolData = ReturnType<typeof parseCarpoolCsv>
