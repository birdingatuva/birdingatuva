import { z } from 'zod'

export const adminResponsesSchema = z.object({
  responses: z.array(z.object({
    name: z.string().trim().min(1).max(500),
    additionalInformation: z.string().max(50000),
    dues: z.enum(['paid', 'unpaid', 'unknown']),
    duesAnswer: z.string().max(1000).optional(),
  })).max(2000),
})

export type AdminResponses = z.infer<typeof adminResponsesSchema>
