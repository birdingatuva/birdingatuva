import { createHash } from 'node:crypto'
import { sql } from '@vercel/postgres'
import type { EventRecord } from './events-db'

export type DeliveryState = 'sending' | 'sent' | 'unconfirmed'

// Visibility changes and template edits must not unlock an unchanged trip.
export function groupMeRevision(event: EventRecord): string {
  const { hidden, ...details } = event
  return createHash('sha256').update(JSON.stringify(details)).digest('hex')
}

let setup: Promise<unknown> | undefined
function ensureDeliveries() {
  if (!setup) {
    setup = sql`
      CREATE TABLE IF NOT EXISTS groupme_deliveries (
        event_slug TEXT NOT NULL,
        revision TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'sending',
        attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (event_slug, revision)
      )
    `.catch(error => { setup = undefined; throw error })
  }
  return setup
}

export async function getDelivery(slug: string, revision: string): Promise<DeliveryState | null> {
  await ensureDeliveries()
  const result = await sql`SELECT state FROM groupme_deliveries WHERE event_slug = ${slug} AND revision = ${revision}`
  return result.rows[0]?.state ?? null
}

export async function claimDelivery(slug: string, revision: string): Promise<boolean> {
  await ensureDeliveries()
  // Never expire or release a claim: even a timeout may have delivered a message.
  const result = await sql`
    INSERT INTO groupme_deliveries (event_slug, revision)
    VALUES (${slug}, ${revision})
    ON CONFLICT (event_slug, revision) DO NOTHING
    RETURNING event_slug
  `
  return result.rows.length > 0
}

export async function finishDelivery(slug: string, revision: string, state: DeliveryState) {
  await sql`UPDATE groupme_deliveries SET state = ${state} WHERE event_slug = ${slug} AND revision = ${revision}`
}
