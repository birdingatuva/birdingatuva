'use client'

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronDown, Clock, FileText, Loader2, RefreshCw } from 'lucide-react'
import { adminResponsesSchema, type AdminResponses } from '@/lib/admin-responses'

function DuesDollar({ className }: { className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="10.6" y="0.5" width="2.8" height="5" rx="1.1" />
    <g transform="translate(0.6 1) scale(.95 .9)">
      <path d="M18.5 7.5h-3.6c-.2-1.6-1.2-2.4-2.9-2.4-1.8 0-2.9.9-2.9 2.2 0 1.4 1.2 2 3.8 2.9 3.6 1.2 5.8 2.7 5.8 6 0 3.5-2.7 5.6-6.7 5.6-4.3 0-7-2.2-7-6h3.7c.1 1.9 1.3 2.9 3.3 2.9 1.9 0 3-.8 3-2.2 0-1.5-1.2-2.2-3.9-3.1-3.4-1.1-5.6-2.6-5.6-5.8C5.5 4.3 8.1 2 12 2c4 0 6.4 2 6.5 5.5Z" />
    </g>
    <rect x="10.6" y="18.5" width="2.8" height="5" rx="1.1" />
  </svg>
}

function ContactExclamation({ className }: { className?: string; strokeWidth?: number }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M8.7 5.8a3.35 3.35 0 1 1 6.6 0l-1.9 10a1.43 1.43 0 0 1-2.8 0Z" />
    <circle cx="12" cy="20.5" r="2" />
  </svg>
}

function ResponseList({ slug, kind }: { slug: string; kind: 'information' | 'dues' }) {
  const [data, setData] = useState<AdminResponses | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const lock = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    lock.current = true
    setLoading(true)
    setError('')
    fetch(`/api/events/${encodeURIComponent(slug)}/admin-responses`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', cache: 'no-store', signal: controller.signal,
    }).then(async response => {
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Unable to load responses.')
      const parsed = adminResponsesSchema.parse(result)
      if (!controller.signal.aborted) setData(parsed)
    }).catch(error => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load responses.')
    }).finally(() => {
      if (!controller.signal.aborted) { lock.current = false; setLoading(false) }
    })
    return () => controller.abort()
  }, [slug, refresh])

  const notes = data?.responses.filter(row => row.additionalInformation.trim()) || []
  const responses = data?.responses || []
  const needsContact = (row: AdminResponses['responses'][number]) => row.dues === 'unpaid' && row.duesAnswer?.trim().toLowerCase() === 'no, i have not, and i would like a club executive to contact me regarding dues'
  const duesGroups = [
    { title: 'Paid', Icon: Check, rows: responses.filter(row => row.dues === 'paid') },
    { title: 'Unpaid · Venmo planned', Icon: Clock, rows: responses.filter(row => row.dues === 'unpaid' && !needsContact(row)) },
    { title: 'Unpaid · Contact requested', Icon: ContactExclamation, rows: responses.filter(needsContact) },
  ]
  const unknownDues = responses.filter(row => row.dues === 'unknown')
  return <div className="min-w-0 space-y-4 border-t border-border p-4 sm:p-5" aria-busy={loading}>
    {loading && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />Loading responses…</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {data && (kind === 'information' ? <>
      {!notes.length ? <p className="text-sm text-muted-foreground">{data.responses.length ? 'No additional information submitted.' : 'No responses yet. Additional information will appear here after members sign up.'}</p> :
        <ul className="divide-y divide-border">{notes.map((row, index) => <li key={index} className="min-w-0 py-3 first:pt-0 last:pb-0">
          <p className="text-sm font-semibold text-primary [overflow-wrap:anywhere]">{row.name}</p>
          <p className="mt-1.5 max-w-prose whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 [overflow-wrap:anywhere]">{row.additionalInformation}</p>
        </li>)}</ul>}
    </> : <>
      <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{data.responses.filter(row => row.dues === 'paid').length} of {data.responses.length}</span> report paid dues</p>
      {!data.responses.length && <p className="text-sm text-muted-foreground">No responses yet. Dues status will appear here after members sign up.</p>}
      {data.responses.length > 0 && <div className="grid grid-cols-1 gap-y-5 sm:grid-cols-3 sm:gap-x-5">
        {duesGroups.map(({ title, Icon, rows }) => <section key={title} className="min-w-0">
          <div className="border-b border-border pb-3">
            <h3 className="flex items-start gap-2 text-sm font-semibold"><Icon aria-hidden="true" strokeWidth={3} className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{title}</span></h3>
          </div>
          {rows.length ? <ul className="mt-2 space-y-2">{rows.map((row, index) => <li key={index} className="text-sm leading-relaxed [overflow-wrap:anywhere]">{row.name}</li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">None yet</p>}
        </section>)}
      </div>}
      {unknownDues.length > 0 && <section className="border-t border-border pt-3">
        <h3 className="text-sm font-semibold">Dues status unknown</h3>
        <p className="mt-1 text-xs text-muted-foreground">No recognized dues answer provided.</p>
        <ul className="mt-2 space-y-2">{unknownDues.map((row, index) => <li key={index} className="text-sm [overflow-wrap:anywhere]">{row.name}</li>)}</ul>
      </section>}
    </>)}
    <button type="button" disabled={loading} onClick={() => { if (!lock.current) { lock.current = true; setRefresh(value => value + 1) } }} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"><RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />Refresh responses</button>
  </div>
}

function ResponsePanel({ slug, kind, title, icon }: { slug: string; kind: 'information' | 'dues'; title: string; icon: ReactNode }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  return <section className="mt-3 overflow-hidden rounded-lg border border-border bg-background" aria-label={title}>
    <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)} className="flex w-full items-center gap-3 p-4 text-left font-medium transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5">
      {icon}<span className="flex-1">{title}</span>
      <ChevronDown aria-hidden="true" className={`h-4 w-4 text-muted-foreground transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
    </button>
    <div id={panelId} hidden={!open}>{open && <ResponseList key={slug} slug={slug} kind={kind} />}</div>
  </section>
}

export function EventAdminResponses({ slug }: { slug: string }) {
  return <>
    <ResponsePanel slug={slug} kind="information" title="Additional form information" icon={<FileText aria-hidden="true" className="h-5 w-5 text-primary" />} />
    <ResponsePanel slug={slug} kind="dues" title="Dues status" icon={<DuesDollar className="h-5 w-5 shrink-0 text-primary" />} />
  </>
}
