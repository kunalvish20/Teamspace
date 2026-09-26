import { useEffect, useState } from 'react'
import { formatCurrency } from '../../../utils/format'

export function CurrencyCell({ value, currency = 'INR', disabled, onCommit }: { value: number | undefined; currency?: string; disabled?: boolean; onCommit: (value: number | undefined) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value === undefined ? '' : String(value))
  useEffect(() => setDraft(value === undefined ? '' : String(value)), [value])
  function commit() {
    setEditing(false)
    if (!draft.trim()) { if (value !== undefined) onCommit(undefined); return }
    const parsed = Number(draft.replace(/,/g, ''))
    if (Number.isFinite(parsed) && parsed !== value) onCommit(parsed)
    else setDraft(value === undefined ? '' : String(value))
  }
  if (!editing && !disabled) return <button onClick={() => setEditing(true)} className="h-full min-h-9 w-full px-2 text-right text-sm">{value === undefined ? <span className="text-neutral-300">Empty</span> : formatCurrency(value, currency)}</button>
  return <input autoFocus={editing} type="number" disabled={disabled} value={draft} onFocus={() => setEditing(true)} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()} className="h-full min-h-9 w-full bg-transparent px-2 text-right text-sm outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 disabled:cursor-default" />
}
