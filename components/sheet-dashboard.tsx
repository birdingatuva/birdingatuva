"use client"

import { useEffect, useState } from 'react'
import { Check, Clock } from 'lucide-react'
import type { CarpoolData } from '@/lib/carpool-data'

function CarIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-current text-primary" aria-hidden="true"><path fillRule="evenodd" d="M6.2 3a2 2 0 0 0-1.9 1.37L2.1 11a2 2 0 0 0-.1.63V19a2 2 0 0 0 4 0v-1h12v1a2 2 0 0 0 4 0v-7.37a2 2 0 0 0-.1-.63l-2.2-6.63A2 2 0 0 0 17.8 3H6.2ZM6.9 5h10.2l1.67 5H5.23L6.9 5ZM7 13H4v2h3v-2Zm13 0h-3v2h3v-2Z" clipRule="evenodd" /></svg>
}

export function SheetDashboard({ url }: { url: string }) {
  const [data, setData] = useState<CarpoolData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    let busy = false
    async function refresh() {
      if (busy || controller.signal.aborted) return
      busy = true
      setLoading(true)
      try {
        const response = await fetch(`/api/carpool?${new URLSearchParams({ url: url })}`, { signal: controller.signal, cache: 'no-store' })
        if (response.status === 422) {
          setData(null)
          setError('The dashboard link is broken or the sheet is not publicly accessible.')
          return
        }
        if (!response.ok) throw new Error('Dashboard unavailable')
        const result = await response.json()
        if (controller.signal.aborted) return
        setData(result.data)
        setError('')
      } catch {
        if (!controller.signal.aborted) setError('Could not update the dashboard. We’ll retry automatically.')
      } finally {
        busy = false
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void refresh()
    const timer = window.setInterval(() => { if (!document.hidden) void refresh() }, 30000)
    return () => { controller.abort(); window.clearInterval(timer) }
  }, [url])

  return (
    <section className="my-8 border-t border-border pt-8" aria-label="Carpool and waitlist">
      <h3 className="mb-6 font-display text-3xl font-bold text-primary">Carpool &amp; waitlist</h3>
      {(
        <div aria-busy={loading}>
          {error && <p role="status" className="mb-4 rounded-lg border border-border bg-muted/50 p-3 text-sm">{error}{data ? ' Showing the last successful update.' : ''}</p>}
          {!data && !error && <p role="status" className="py-8 text-sm text-muted-foreground">Loading carpool details…</p>}
          {data && <>
            <div className="mb-7">
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-primary">
                <span className="text-5xl font-semibold tracking-tight tabular-nums">{data.seatsRemaining ?? '—'}</span>
                <span className="inline-flex items-center gap-2 text-base font-medium">{data.seatsRemaining === 1 ? 'seat available' : 'seats available'}</span>
              </p>
              {data.seatsRemaining === null && <p className="mt-2 text-sm text-muted-foreground">Availability has not been reported yet.</p>}
            </div>
            <div className="grid gap-7 sm:grid-cols-3 sm:gap-8">
              {[
                { label: 'Drivers', people: data.drivers, empty: 'No drivers listed yet.', waiting: false, icon: CarIcon },
                { label: 'Registered', people: data.registered, empty: 'No registrations yet.', waiting: false, icon: Check },
                { label: 'Waitlisted', people: data.waitlisted, empty: 'No one on the waitlist.', waiting: true, icon: Clock },
              ].map(({ label, people, empty, waiting, icon: Icon }) => (
                <div key={label} className="min-w-0">
                  <h4 className="flex items-center gap-2.5 border-b border-border pb-3 text-lg font-semibold text-foreground"><Icon className="h-6 w-6 shrink-0 text-primary" strokeWidth={2.5} aria-hidden="true" />{label}</h4>
                  {people.length ? <ul className="divide-y divide-border/50">
                    {people.map((person, index) => <li key={index} className="flex items-baseline gap-3 py-3 text-base leading-6">
                      {waiting && <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground" aria-label={`List position ${index + 1}`}>{index + 1}.</span>}
                      <span className="min-w-0 whitespace-pre-line break-words">{person}</span>
                    </li>)}
                  </ul> : <p className="py-3 text-sm text-muted-foreground">{empty}</p>}
                </div>
              ))}
            </div>
          </>}

        </div>
      )}
    </section>
  )
}
