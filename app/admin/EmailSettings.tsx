'use client'

import { useEffect, useRef, useState } from 'react'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GroupMeTemplateEditor } from '@/components/groupme-template-editor'
import { DEFAULT_EMAIL_TEMPLATE, emailTemplateSchema } from '@/lib/email'

export function EmailSettings() {
  const [template, setTemplate] = useState(DEFAULT_EMAIL_TEMPLATE)
  const [saved, setSaved] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const lock = useRef(false)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/admin/email', { cache: 'no-store', signal: controller.signal }).then(async response => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load email settings.')
      if (!controller.signal.aborted) { setTemplate(data.template); setSaved(JSON.stringify(data.template)); setLoaded(true) }
    }).catch(error => { if (!controller.signal.aborted) setError(error.message) })
    return () => controller.abort()
  }, [])
  const validation = emailTemplateSchema.safeParse(template)
  async function save() {
    if (lock.current || !loaded || !validation.success || JSON.stringify(template) === saved) return
    lock.current = true; setSaving(true); setError(''); setStatus('')
    try {
      const response = await fetch('/api/admin/email', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ template }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to save email settings.')
      setTemplate(data.template); setSaved(JSON.stringify(data.template)); setStatus('Default email saved.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to save email settings.') }
    finally { lock.current = false; setSaving(false) }
  }
  return <section className="space-y-4" aria-label="Default event email template">
    <h3 className="flex items-center gap-3 text-xl font-semibold"><Mail aria-hidden="true" className="h-8 w-8 text-primary" />Default email</h3>
    <p className="text-sm text-muted-foreground">Autofills the event email composer. Review and send from birdingatuva@gmail.com on the event page.</p>
    {!loaded && !error && <p role="status">Loading email settings…</p>}
    {loaded && <>
      <p className="text-sm font-medium">Subject</p>
      <GroupMeTemplateEditor label="Default email subject" maxLength={200} value={template.subject} disabled={saving} onChange={subject => { setTemplate(value => ({ ...value, subject })); setStatus('') }} />
      <p className="text-sm font-medium">Message</p>
      <GroupMeTemplateEditor label="Default email body" maxLength={4000} value={template.body} disabled={saving} onChange={body => { setTemplate(value => ({ ...value, body })); setStatus('') }} />
      {!validation.success && <p role="alert" className="text-sm text-destructive">{validation.error.issues[0].message}</p>}
      <Button type="button" disabled={saving || !validation.success || JSON.stringify(template) === saved} onClick={save}>{saving ? 'Saving…' : 'Save default email'}</Button>
    </>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {status && <p role="status" className="text-sm">{status}</p>}
  </section>
}
