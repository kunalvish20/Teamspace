export function DateCell({ value, disabled, includeTime = false, onCommit }: { value?: string; disabled?: boolean; includeTime?: boolean; onCommit: (value: string | undefined) => void }) {
  const normalized = value ? (includeTime ? value.slice(0, 16) : value.slice(0, 10)) : ''
  return <input type={includeTime ? 'datetime-local' : 'date'} disabled={disabled} value={normalized} onChange={(event) => onCommit(event.target.value || undefined)} className="h-full min-h-9 w-full bg-transparent px-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-blue-500 disabled:cursor-default" />
}
