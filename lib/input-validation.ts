import { z } from 'zod'
import { isGoogleFormLink } from './google-form'
import { getDashboardLink } from './sheet-embed'

export const eventSlug = z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
})
const optionalDate = z.union([date, z.literal(''), z.null()]).optional()
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
const optionalTime = z.union([time, z.literal(''), z.null()]).optional()
const optionalURL = (check: (value: string) => boolean) => z.union([z.string().max(2048).refine(value => !value || check(value)), z.null()]).optional()
export const eventFields = z.object({
  title: z.string().trim().min(1).max(200),
  startDate: date,
  endDate: optionalDate,
  startTime: optionalTime,
  endTime: optionalTime,
  location: z.string().trim().min(1).max(500),
  bodyMarkdown: z.string().max(100000).optional(),
  signupUrl: optionalURL(isGoogleFormLink),
  dashboardUrl: optionalURL(value => !!getDashboardLink(value)),
  showFaqBanner: z.boolean().optional(),
  hidden: z.boolean().optional(),
}).strict()
export const eventCreate = eventFields.extend({ slug: eventSlug }).refine(value => !value.endDate || value.endDate >= value.startDate, 'End date precedes start date')
export const eventUpdate = eventFields.partial().refine(value => !value.startDate || !value.endDate || value.endDate >= value.startDate, 'End date precedes start date')
const httpURL = z.string().max(2048).refine(value => {
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password } catch { return false }
})
const cloudinaryURL = z.union([z.literal(''), z.string().max(2048).refine(value => {
  try {
    const u = new URL(value)
    const cloud = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    return u.protocol === 'https:' && u.hostname === 'res.cloudinary.com' && !u.username && !u.password && !u.port && !!cloud && u.pathname.startsWith(`/${cloud}/image/upload/`)
  } catch { return false }
})])
export const linkSettings = z.array(z.object({ label: z.string().trim().min(1).max(200), url: z.union([httpURL, z.literal('')]), enabled: z.boolean() }).strict()).max(100)
export const leadershipSettings = z.array(z.object({
  name: z.string().trim().max(200),
  position: z.string().max(200),
  major: z.string().max(200),
  year: z.string().max(100),
  bio: z.string().max(5000),
  favoriteBird: z.string().max(200),
  email: z.union([z.string().email().max(254), z.literal('')]),
  image: cloudinaryURL,
}).strict()).max(50)

export const suggestEventLinkSchema = z.string().trim().min(1).max(2048).url().refine(value => {
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
  } catch { return false }
})
