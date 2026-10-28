'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Car } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { carpoolSettingsSchema, type CarpoolSettingsValues } from '@/lib/carpool-settings-schema'

export function CarpoolSettings() {
  const [values, setValues] = useState<CarpoolSettingsValues | null>(null)
  const [saved, setSaved] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [reload, setReload] = useState(0)
  const lock = useRef(false)
  const id = useId()
  useEffect(() => {
    const controller = new AbortController()
    setError('')
    fetch('/api/admin/carpool-settings', { cache: 'no-store', signal: controller.signal }).then(async response => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to load carpool settings.')
      if (!controller.signal.aborted) { setValues(data); setSaved(JSON.stringify(data)) }
    }).catch(error => { if (!controller.signal.aborted) setError(error.message) })
    return () => controller.abort()
  }, [reload])
  const validation = carpoolSettingsSchema.safeParse(values)
  const changed = !!values && JSON.stringify(values) !== saved

  async function save() {
    if (lock.current || !validation.success || !changed) return
    lock.current = true; setSaving(true); setError(''); setStatus('')
    try {
      const response = await fetch('/api/admin/carpool-settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(validation.data) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to save carpool settings.')
      setValues(data); setSaved(JSON.stringify(data)); setStatus('Carpool settings saved.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to save carpool settings.') }
    finally { lock.current = false; setSaving(false) }
  }
  return <section className="space-y-4" aria-label="Carpool settings">
    <h3 className="flex items-center gap-3 text-xl font-semibold"><Car aria-hidden="true" className="h-8 w-8 text-primary" />Carpool settings</h3>
    <p className="text-sm text-muted-foreground">Choose where new carpool files are created and which passenger names are used for event messages.</p>
    {!values && !error && <p role="status">Loading carpool settings…</p>}
    {values && <form className="max-w-xl space-y-4" onSubmit={event => { event.preventDefault(); void save() }}>
      <div className="space-y-2">
        <label htmlFor={`${id}-folder`} className="text-sm font-medium">Year folder ID</label>
        <Input id={`${id}-folder`} aria-describedby={`${id}-folder-help`} value={values.yearFolderId} maxLength={200} disabled={saving} autoCapitalize="none" spellCheck={false} onChange={event => { setValues({ ...values, yearFolderId: event.target.value }); setStatus('') }} />
        <p id={`${id}-folder-help`} className="text-xs leading-relaxed text-muted-foreground">The ID after /folders/ in the Google Drive folder URL. This folder must contain the “automated form templates” subfolder. Applies to new carpools.</p>
      </div>
      <div className="space-y-2">
        <label htmlFor={`${id}-range`} className="text-sm font-medium">Passenger name range</label>
        <Input id={`${id}-range`} aria-describedby={`${id}-range-help`} value={values.passengersNameRange} maxLength={40} disabled={saving} placeholder="A2:A1000" autoCapitalize="characters" spellCheck={false} onChange={event => { setValues({ ...values, passengersNameRange: event.target.value }); setStatus('') }} />
        <p id={`${id}-range-help`} className="text-xs leading-relaxed text-muted-foreground">The names in the Passengers tab, excluding the header. Use one column and at most 1,000 rows, such as A2:A1000.</p>
      </div>
      {changed && !validation.success && <p role="alert" className="text-sm text-destructive">{validation.error.issues[0].message}</p>}
      <Button type="submit" disabled={saving || !changed || !validation.success}>{saving ? 'Saving…' : 'Save carpool settings'}</Button>
    </form>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {!values && error && <Button type="button" variant="outline" onClick={() => setReload(value => value + 1)}>Retry</Button>}
    {status && <p role="status" className="text-sm">{status}</p>}
  </section>
}
