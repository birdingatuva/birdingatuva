import type { EventRecord } from './events-db'

export const GROUPME_PLACEHOLDERS = ['title', 'date/time', 'date', 'time', 'location', 'event_url', 'signup_url'] as const
export const GROUPME_MAX_LENGTH = 1000

export function normalizeGroupMeTemplate(value: string): string {
  return value.replace(/{{\s*([\w/]+)\s*}}/g, (match, key) => GROUPME_PLACEHOLDERS.includes(key) ? `@${key}` : match)
}

export function validateGroupMeTemplate(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return 'Enter a message template.'
  if (value.length > GROUPME_MAX_LENGTH) return 'Keep the template within 1,000 characters.'
  const remaining = value.replace(/{{\s*([\w/]+)\s*}}/g, (match, key) => GROUPME_PLACEHOLDERS.includes(key) ? '' : match)
  if (remaining.includes('{{') || remaining.includes('}}')) return 'Use only the supported @ options shown above.'
  if (!/(?<![\w@])@event_url\b/.test(normalizeGroupMeTemplate(value))) return 'Include @event_url so members can open the trip page.'
  return null
}

export function renderGroupMeMessage(template: string, event: EventRecord, origin: string): string {
  const error = validateGroupMeTemplate(template)
  if (error) throw new Error(error)
  const date = (iso: string) => new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`))
  const time = (value: string) => {
    const [hour, minute] = value.split(':').map(Number)
    return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`
  }
  const dateRange = date(event.startDate) + (event.endDate && event.endDate !== event.startDate ? ` – ${date(event.endDate)}` : '')
  const timeRange = event.startTime ? time(event.startTime) + (event.endTime ? ` – ${time(event.endTime)}` : '') : ''
  const dateTime = !event.startTime
    ? dateRange
    : event.endDate && event.endDate !== event.startDate
      ? `${date(event.startDate)} at ${time(event.startTime)} – ${date(event.endDate)}${event.endTime ? ` at ${time(event.endTime)}` : ''}`
      : `${dateRange} at ${timeRange}`
  const values: Record<string, string> = {
    title: event.title,
    'date/time': dateTime,
    date: dateRange,
    time: timeRange || 'Time to be announced',
    location: event.location,
    event_url: `${new URL(origin).origin}/events/${encodeURIComponent(event.slug)}`,
    signup_url: event.signupUrl || '',
  }
  const text = normalizeGroupMeTemplate(template).replace(/(?<![\w@])@(title|date\/time|date|time|location|event_url|signup_url)\b/g, (_, key: string) => values[key]).trim()
  if (text.length > GROUPME_MAX_LENGTH) throw new Error('The completed message exceeds 1,000 characters. Shorten the template in Event Settings.')
  return text
}
