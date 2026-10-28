import { z } from 'zod'

export const carpoolSettingsSchema = z.object({
  yearFolderId: z.string().trim().min(1, 'Enter the Google Drive year folder ID.').max(200)
    .regex(/^[\w-]+$/, 'Enter the folder ID, not the full Google Drive URL.'),
  passengersNameRange: z.string().trim().toUpperCase().max(40).superRefine((value, ctx) => {
    const match = /^([A-Z]{1,3})([1-9]\d*):\1([1-9]\d*)$/.exec(value)
    const start = match ? Number(match[2]) : NaN
    const end = match ? Number(match[3]) : NaN
    if (!match || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end < start || end - start + 1 > 1000) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Use a single-column range of 1–1,000 rows, such as A2:A1000, without a sheet name.' })
    }
  }),
}).strict()
export type CarpoolSettingsValues = z.infer<typeof carpoolSettingsSchema>
