import { useMemo, useState } from 'react'
import type { Json, PropertyType } from '../../types/database.types'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'

export type NewPropertyType = Exclude<PropertyType, 'title'>

const types: Array<{ value: NewPropertyType; label: string }> = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'Date & time' },
  { value: 'select', label: 'Select' },
  { value: 'multi_select', label: 'Multi-select' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'person', label: 'Person' },
  { value: 'multi_person', label: 'People' },
]

export function AddPropertyModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (name: string, type: NewPropertyType, config?: Json) => Promise<void> }) {
  const [name, setName] = useState('')
  const [type, setType] = useState<NewPropertyType>('text')
  const [options, setOptions] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [pending, setPending] = useState(false)
  const parsedOptions = useMemo(() => [...new Set(options.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean))].map((label) => ({ id: crypto.randomUUID(), label, color: 'gray' })), [options])

  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (!name.trim()) return; setPending(true)
    try {
      const config: Json = type === 'select' || type === 'multi_select' ? { options: parsedOptions } : type === 'currency' ? { currency } : {}
      await onCreate(name.trim(), type, config); setName(''); setOptions(''); setType('text'); onClose()
    } finally { setPending(false) }
  }

  return <Modal open={open} onClose={onClose} title="Add property"><form className="space-y-4" onSubmit={submit}><label className="block text-xs font-medium text-neutral-600">Name<Input className="mt-1" autoFocus value={name} onChange={(e) => setName(e.target.value)} /></label><label className="block text-xs font-medium text-neutral-600">Type<select className="mt-1 h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm" value={type} onChange={(e) => setType(e.target.value as NewPropertyType)}>{types.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
    {(type === 'select' || type === 'multi_select') ? <label className="block text-xs font-medium text-neutral-600">Options<textarea rows={4} value={options} onChange={(event) => setOptions(event.target.value)} placeholder="Lead, In progress, Done" className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400" /><span className="mt-1 block text-[11px] font-normal text-neutral-400">Separate options with commas or new lines. You can edit these later.</span></label> : null}
    {type === 'currency' ? <label className="block text-xs font-medium text-neutral-600">Currency<select value={currency} onChange={(event) => setCurrency(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm"><option value="INR">INR ₹</option><option value="USD">USD $</option><option value="EUR">EUR €</option><option value="GBP">GBP £</option><option value="AED">AED</option></select></label> : null}
    <div className="flex justify-end gap-2"><Button type="button" onClick={onClose}>Cancel</Button><Button variant="primary" type="submit" disabled={pending || !name.trim()}>{pending ? 'Adding…' : 'Add property'}</Button></div></form></Modal>
}
