import { useEffect, useState } from 'react'

export function NumberCell({ value, disabled, onCommit }: { value: number | undefined; disabled?: boolean; onCommit: (value: number | undefined) => void }) {
  const [draft, setDraft] = useState(value === undefined ? '' : String(value))
  useEffect(() => setDraft(value === undefined ? '' : String(value)), [value])
  function commit() {
    if (!draft.trim()) { if (value !== undefined) onCommit(undefined); return }
    const parsed = Number(draft)
    if (Number.isFinite(parsed) && parsed !== value) onCommit(parsed)
    else setDraft(value === undefined ? '' : String(value))
  }
  return <input type="number" disabled={disabled} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()} className="h-full min-h-9 w-full bg-transparent px-2 text-right text-sm outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 disabled:cursor-default" placeholder="0" />
}
