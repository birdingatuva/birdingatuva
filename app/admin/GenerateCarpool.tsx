"use client"
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

type Props = {
  title: string
  startDate: string
  signupUrl: string
  dashboardUrl: string
  disabled: boolean
  onBusyChange: (busy: boolean) => void
  onGenerated: (links: { signupUrl: string; dashboardUrl: string }) => void
}
export function GenerateCarpool(props: Props) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const running = useRef(false)
  const current = useRef(props)
  current.current = props
  async function generate() {
    if (running.current) return
    if ((props.signupUrl || props.dashboardUrl) && !window.confirm('Replace the existing signup and dashboard links with generated links?')) return
    running.current = true
    setBusy(true)
    props.onBusyChange(true)
    setMessage('Creating your Google form and dashboard. This may take a minute.')
    const original = props
    try {
      const response = await fetch('/api/admin/carpool', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventName: props.title, eventDate: props.startDate }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to generate links.')
      const latest = current.current
      if (latest.title !== original.title || latest.startDate !== original.startDate || latest.signupUrl !== original.signupUrl || latest.dashboardUrl !== original.dashboardUrl) {
        setMessage('The form changed during generation. Return to the original title and date and click again to retrieve its links. The generated files are also in the event folder in Google Drive.')
        return
      }
      latest.onGenerated(data)
      setMessage('Both links are filled in. Save the event to keep them.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to generate links.')
    } finally { running.current = false; setBusy(false); props.onBusyChange(false) }
  }
  return <div className="space-y-2">
    <Button type="button" variant="outline" className="text-black hover:text-black dark:text-black dark:hover:text-black" onClick={generate} disabled={busy || props.disabled || !props.title.trim() || !props.startDate}>
      {busy ? 'Generating…' : 'Generate Google form and autofill URLs'}
    </Button>
    <p className="text-xs text-muted-foreground">Uses the event title and start date. Creates the signup form and carpool dashboard in Google Drive.</p>
    <p className="text-sm" role="status" aria-live="polite">{message}</p>
  </div>
}
