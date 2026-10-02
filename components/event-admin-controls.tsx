'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { GroupMeSendButton } from '@/components/groupme-send-button'

export function EventAdminControls({ slug, preview }: { slug: string; preview: boolean }) {
  const router = useRouter()
  const [hidden, setHidden] = useState(preview)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)
  useEffect(() => { setHidden(preview) }, [preview])

  async function changeVisibility(nextHidden: boolean) {
    if (lock.current || nextHidden === hidden) return
    lock.current = true
    setSaving(true); setError('')
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(slug)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hidden: nextHidden }),
      })
      if (!response.ok) throw new Error('Could not update event visibility. Please try again.')
      setHidden(nextHidden)
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not update event visibility.')
    } finally { lock.current = false; setSaving(false) }
  }

  return <div className="mb-8">
    <div className="flex items-center justify-between gap-3">
      <Link href={`/admin?edit=${encodeURIComponent(slug)}`} className="inline-flex min-w-0 items-center gap-2 font-display text-2xl font-semibold text-primary">
        <ArrowLeft aria-hidden="true" className="h-6 w-6 shrink-0" /> Edit in Admin Page
      </Link>
        <div className="inline-flex shrink-0 rounded-lg border border-border bg-background p-1 shadow-sm" role="group" aria-label="Event visibility" aria-busy={saving}>
          <button type="button" aria-pressed={hidden} disabled={saving} onClick={() => changeVisibility(true)} className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${hidden ? 'preview-stripes bg-amber-500/15 text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>Preview</button>
          <button type="button" aria-pressed={!hidden} disabled={saving} onClick={() => changeVisibility(false)} className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${!hidden ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>Published</button>
        </div>
      </div>
    <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out motion-reduce:transition-none ${hidden ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`} aria-hidden={!hidden}>
      <div className="overflow-hidden">
        <aside aria-label="Event preview notice" className="relative mt-5 border-y border-border bg-transparent py-5 pl-7 pr-5 text-primary">
          <span aria-hidden="true" className="preview-stripes pointer-events-none absolute inset-y-0 left-0 w-2" />
          <p className="font-display text-xl font-semibold leading-tight">Preview mode — admins only</p>
          <p className="mt-2 text-sm leading-relaxed">This event is hidden from the public. Select <strong>“Published”</strong> to make it public.</p>
        </aside>
      </div>
    </div>
    <span className="sr-only" role="status">{saving ? 'Updating visibility...' : hidden ? 'Only admins can view this event' : 'Visible to everyone'}</span>
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    <GroupMeSendButton slug={slug} hidden={hidden} />
  </div>
}
