import { normalizeGroupMeTemplate, renderGroupMeMessage, validateGroupMeTemplate } from './groupme'

// Keep SMS and GroupMe placeholders, date formatting and validation consistent.
export const normalizeSmsTemplate = normalizeGroupMeTemplate
export const validateSmsTemplate = validateGroupMeTemplate
export const renderSmsMessage = renderGroupMeMessage
export const DEFAULT_SMS_TEMPLATE = 'Hi everyone! Here are the details for @title:\n@date/time\nLocation: @location\n@event_url\n\nPlease reply if your plans change. See you there!'
export function selectSmsTemplate(saved: unknown): string {
  return typeof saved === 'string' ? saved : DEFAULT_SMS_TEMPLATE
}
