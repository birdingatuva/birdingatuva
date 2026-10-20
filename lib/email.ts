import { z } from 'zod'
import type { EventRecord } from './events-db'
import { GROUPME_PLACEHOLDERS, normalizeGroupMeTemplate, renderEventTemplate } from './groupme'

export const CLUB_EMAIL = 'birdingatuva@gmail.com'
const emailPattern = /^[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i
export const emailAddressSchema = z.string().max(254).regex(emailPattern).refine(value => value.split('@')[0].length <= 64)

export const emailRecipientsSchema = z.object({
  recipients: z.array(z.object({ name: z.string().trim().min(1).max(200), email: emailAddressSchema }).strict()).max(1000),
  skipped: z.number().int().min(0).max(1000),
}).strict()
export const DEFAULT_EMAIL_TEMPLATE = {
  subject: '@title — trip details',
  body: 'Hi everyone!\n\nHere are the details for @title:\n@date/time\nLocation: @location\n\n@event_url\n\nPlease reply if your plans change. See you there!\nBirding at UVA',
}
export const emailTemplateSchema = z.object({
  subject: z.string().trim().min(1).max(200).refine(value => !/[\r\n]/.test(value), 'Keep the subject on one line.'),
  body: z.string().trim().min(1).max(4000),
}).strict().superRefine((value, context) => {
  for (const key of ['subject', 'body'] as const) {
    const remaining = value[key].replace(/{{\s*([\w/]+)\s*}}/g, (match, token) => (GROUPME_PLACEHOLDERS as readonly string[]).includes(token) ? '' : match)
    if (remaining.includes('{{') || remaining.includes('}}')) context.addIssue({ code: 'custom', path: [key], message: 'Use the supported @ options.' })
  }
})
export function selectEmailTemplate(saved: unknown) {
  return saved === null || saved === undefined ? DEFAULT_EMAIL_TEMPLATE : emailTemplateSchema.parse(saved)
}
export function renderEmailTemplate(template: typeof DEFAULT_EMAIL_TEMPLATE, event: EventRecord, origin: string) {
  const valid = emailTemplateSchema.parse(template)
  return emailTemplateSchema.parse({
    subject: renderEventTemplate(normalizeGroupMeTemplate(valid.subject), event, origin).replace(/[\r\n]+/g, ' '),
    body: renderEventTemplate(normalizeGroupMeTemplate(valid.body), event, origin),
  })
}
