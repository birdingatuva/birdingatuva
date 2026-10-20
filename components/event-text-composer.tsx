'use client'

import { useEffect, useId, useState } from 'react'
import { ChevronDown, MessageCircle, ArrowUpRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { buildSmsUrl } from '@/lib/sms'

type Preview = { recipients: { name: string; phone: string }[]; skipped: number; text: string }

function Composer({ slug }: { slug: string }) {
  const [preview, setPreview] = useState<Preview | null>(null)
  const [text, setText] = useState('')
  const [platform, setPlatform] = useState<'iphone' | 'android'>('iphone')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')
  const messageId = useId()
  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/events/${encodeURIComponent(slug)}/text-recipients`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      cache: 'no-store', signal: controller.signal,
    }).then(async response => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load recipients.')
      if (!controller.signal.aborted) { setPreview(data); setText(data.text) }
    }).catch(error => { if (!controller.signal.aborted) setError(error.message) })
    return () => controller.abort()
  }, [slug])
  async function copy(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); setCopied(`${label} copied.`) }
    catch { setError('Clipboard unavailable. Select and copy the text manually.') }
  }
  return <div className="space-y-4 border-t border-border p-4 sm:p-5">
    {!preview && !error && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />Loading passengers…</p>}
    {preview && <>
      <details className="rounded-md bg-muted/40 px-3 py-2 text-sm">
        <summary className="cursor-pointer font-medium">{preview.recipients.length} recipients <span className="ml-2 font-normal text-muted-foreground">Review numbers</span></summary>
        <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto">{preview.recipients.map(recipient => <li className="flex flex-wrap justify-between gap-x-4" key={recipient.phone}><span>{recipient.name}</span><span className="text-muted-foreground">{recipient.phone}</span></li>)}</ul>
      </details>
      {preview.skipped > 0 && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{preview.skipped} passenger {preview.skipped === 1 ? 'needs' : 'entries need'} review: invalid number or unmatched or ambiguous name. Check the private sheet before sending.</p>}
      {!preview.recipients.length && <p className="text-sm text-muted-foreground">{preview.skipped === 0 ? 'No phone numbers available yet. Only confirmed passengers who provide a phone number are included.' : 'No recipients available. Review the passenger details above.'}</p>}
      <div className="space-y-2">
        <label htmlFor={messageId} className="block text-sm font-medium">Message</label>
        <Textarea id={messageId} rows={6} maxLength={4000} value={text} onChange={event => setText(event.target.value)} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border p-1" role="group" aria-label="Messaging app format">
          {(['iphone', 'android'] as const).map(option => <button key={option} type="button" aria-pressed={platform === option} onClick={() => setPlatform(option)} className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${platform === option ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>{option === 'iphone' ? 'iPhone' : 'Android'}</button>)}
        </div>
        <Button type="button" className="w-full sm:w-auto" disabled={!preview.recipients.length || !text.trim()} onClick={() => {
          window.location.href = buildSmsUrl(platform, preview.recipients.map(recipient => recipient.phone), text)
        }}><MessageCircle aria-hidden="true" />Open Messages<ArrowUpRight aria-hidden="true" /></Button>
      </div>
      <p className="text-xs text-muted-foreground">Review and send in your messaging app. Group members can see each other’s numbers.</p>
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer">App didn’t autofill? Copy instead</summary>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" disabled={!preview.recipients.length} onClick={() => copy(preview.recipients.map(r => r.phone).join(', '), 'Recipients')}>Copy recipients</Button>
          <Button type="button" size="sm" variant="outline" disabled={!text.trim()} onClick={() => copy(text, 'Message')}>Copy message</Button>
        </div>
      </details>
    </>}
    {copied && <p role="status" className="text-sm text-muted-foreground">{copied}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>
}

export function EventTextComposer({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  return <section className="mt-3 overflow-hidden rounded-lg border border-border bg-background" aria-label="Group text composer">
    <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)} className="flex w-full items-center gap-3 p-4 text-left font-medium transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5">
      <MessageCircle aria-hidden="true" className="h-5 w-5 text-primary" />
      <span className="flex-1">Compose group text</span>
      <ChevronDown aria-hidden="true" className={`h-4 w-4 text-muted-foreground transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
    </button>
    <div id={panelId} hidden={!open}>{open && <Composer key={slug} slug={slug} />}</div>
  </section>
}
