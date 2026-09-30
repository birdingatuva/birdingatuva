"use client"

import { useEffect, useState } from 'react'
import type { CarpoolData } from '@/lib/carpool-csv'
import { ExternalLink } from 'lucide-react'

export function SheetDashboard({ embedUrl, csvUrl, url, title }: { embedUrl: string; csvUrl?: string; url: string; title: string }) {
  const [data, setData] = useState<CarpoolData | null>(null)
  const [loading, setLoading] = useState(Boolean(csvUrl))
  const [error, setError] = useState('')
  const [checked, setChecked] = useState('')

  useEffect(() => {
    if (!csvUrl) return
    const controller = new AbortController()
    let busy = false
    async function refresh() {
      if (busy || controller.signal.aborted) return
      busy = true
      setLoading(true)
      try {
        const response = await fetch(`/api/carpool?${new URLSearchParams({ url: csvUrl! })}`, { signal: controller.signal, cache: 'no-store' })
        if (!response.ok) throw new Error('Dashboard unavailable')
        const result = await response.json()
        if (controller.signal.aborted) return
        setData(result.data)
        setError('')
        setChecked(new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))
      } catch {
        if (!controller.signal.aborted) setError('Could not update the dashboard. We’ll retry automatically, or you can open the sheet.')
      } finally {
        busy = false
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void refresh()
    const timer = window.setInterval(() => { if (!document.hidden) void refresh() }, 60000)
    return () => { controller.abort(); window.clearInterval(timer) }
  }, [csvUrl])

  return (
    <section className="my-8 border-t border-border pt-8" aria-label="Carpool and waitlist">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-2xl font-bold text-primary">Carpool &amp; waitlist</h3>
        <div className="flex items-center gap-4 text-sm">
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 text-muted-foreground hover:text-primary">
            Open sheet <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
      <p className="mb-5 text-sm text-muted-foreground">After submitting the form, please allow about 2 minutes for changes to appear on the website.</p>
      {csvUrl ? (
        <div aria-busy={loading}>
          {error && <p role="status" className="mb-4 rounded-lg border border-border bg-muted/50 p-3 text-sm">{error}{data ? ' Showing the last successful update.' : ''}</p>}
          {!data && !error && <p role="status" className="py-8 text-sm text-muted-foreground">Loading carpool details…</p>}
          {data && <>
            <dl className="mb-5 grid grid-cols-2 gap-3">
              {[['Total seats', data.totalSeats], ['Seats remaining', data.seatsRemaining]].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-primary/15 bg-primary/5 px-5 py-4">
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-3xl font-semibold tabular-nums text-primary">{value ?? '—'}</dd>
                </div>
              ))}
            </dl>
            <div className="grid gap-4 sm:grid-cols-3">
              {([
                ['Registered passengers', data.registered],
                ['Waitlisted passengers', data.waitlisted],
                ['Drivers', data.drivers],
              ] as const).map(([label, people]) => (
                <div key={label} className="min-w-0 rounded-xl border border-border bg-background p-4">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold">{label}</h4>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium tabular-nums text-primary">{people.length}</span>
                  </div>
                  {people.length ? <ol className="space-y-2">
                    {people.map((person, index) => <li key={index} className="flex gap-2 border-t border-border/60 pt-2 text-sm">
                      <span className="w-4 shrink-0 text-muted-foreground tabular-nums">{index + 1}.</span>
                      <span className="min-w-0 whitespace-pre-line break-words">{person}</span>
                    </li>)}
                  </ol> : <p className="text-sm text-muted-foreground">None yet</p>}
                </div>
              ))}
            </div>
          </>}
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground" aria-live="polite">
            {checked ? `Last checked ${checked}. ` : ''}Updates automatically every minute.
          </p>
        </div>
      ) : <>
        <iframe src={embedUrl} title={`${title} carpool and waitlist dashboard`} className="block h-[360px] w-full border-0 bg-white [color-scheme:light]" loading="lazy" />
        <p className="mt-3 text-sm text-muted-foreground">Scroll to see more rows.</p>
      </>}
    </section>
  )
}
