import { z } from 'zod'

const lookupErrors: Record<string, string> = {
  EMAIL_RECIPIENTS_INVALID: 'Sending blocked: a confirmed passenger has a missing or invalid email, or an ambiguous name. Correct the private sheet and reload the composer.',
  EMAIL_SEND_UNCONFIRMED: 'Google did not confirm the send. Check the club Gmail Sent folder and Apps Script authorization or quota. This message is locked to prevent duplicates.',
  CLUB_ACCOUNT_REQUIRED: 'Deploy and authorize Apps Script as birdingatuva@gmail.com to send club email.',
  INVALID_EVENT_EMAIL: 'Enter a valid subject and message before sending.',
  EMAIL_SEND_PENDING: 'A send was already attempted but has no confirmation. Check the club Gmail Sent folder; this message is locked to prevent duplicates.',
  EMAIL_SEND_CONFLICT: 'This send request changed. Close and reopen the composer after checking Gmail Sent.',
  NO_EMAIL_RECIPIENTS: 'No confirmed passenger email addresses were found.',
  RECIPIENTS_CHANGED: 'The passenger list changed. Close and reopen the composer to review the latest recipients.',
  TOO_MANY_EMAIL_RECIPIENTS: 'Each email supports at most 49 passengers. No email was sent.',

  SOURCE_MAPPING_MISSING: 'This dashboard has no private source mapping. Check the carpool_sources table in Neon.',
  PASSENGER_RANGE_INVALID: 'Set passengers_name_range in the Neon carpool_settings table to the confirmed-name range, such as A2:A1000. Use one column, no tab prefix, and at most 1,000 rows within the sheet.',
  SOURCE_ACCESS_FAILED: 'The Apps Script deployment owner cannot open the mapped private spreadsheet. Check its access permissions.',
  TABS_MISSING: 'The private spreadsheet must contain tabs named Form Responses 1 and Passengers.',
  HEADERS_MISMATCH: 'The response sheet headers do not match: B1 must contain “What is your name” and F1 must contain “phone number”.',
  EMAIL_HEADERS_MISMATCH: 'The response sheet headers do not match: B1 must contain “What is your name” and C1 must contain “email”.',
  TOO_MANY_RESPONSES: 'The private response sheet exceeds the 10,000-response lookup limit.',
  RECIPIENT_LOOKUP_FAILED: 'The recipient lookup failed inside Apps Script. Check the deployment and sheet setup.',
}

export function recipientLookupError(code: unknown): string {
  return typeof code === 'string' && Object.hasOwn(lookupErrors, code)
    ? lookupErrors[code]
    : 'Apps Script did not return recipient data. Deploy the latest script version; successful form creation alone does not verify the recipient lookup.'
}

export const textRecipientsSchema = z.object({
  recipients: z.array(z.object({
    name: z.string().trim().min(1).max(200),
    phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  }).strict()).max(1000),
  skipped: z.number().int().min(0).max(1000),
}).strict()
