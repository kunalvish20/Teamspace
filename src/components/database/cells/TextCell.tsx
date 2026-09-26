import { useEffect, useState } from 'react'

export function TextCell({ value, disabled, type = 'text', onCommit }: { value: string; disabled?: boolean; type?: 'text' | 'email' | 'tel' | 'url'; onCommit: (value: string | undefined) => void }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  function commit() { if (draft !== value) onCommit(draft.trim() || undefined) }
  return <input type={type} disabled={disabled} value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') { event.currentTarget.blur() } if (event.key === 'Escape') { setDraft(value); event.currentTarget.blur() } }} className="h-full min-h-9 w-full bg-transparent px-2 text-sm text-neutral-800 outline-none placeholder:text-neutral-300 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 disabled:cursor-default" placeholder="Empty" />
}
