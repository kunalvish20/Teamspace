import type { SelectOption } from '../../../types/domain'

const pillClass: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-700', purple: 'bg-purple-50 text-purple-700', yellow: 'bg-amber-50 text-amber-700', green: 'bg-emerald-50 text-emerald-700', gray: 'bg-neutral-100 text-neutral-600', orange: 'bg-orange-50 text-orange-700', pink: 'bg-pink-50 text-pink-700', teal: 'bg-teal-50 text-teal-700',
}

export function SelectCell({ value, options, disabled, multiple = false, onCommit }: { value?: string | string[]; options: SelectOption[]; disabled?: boolean; multiple?: boolean; onCommit: (value: string | string[] | undefined) => void }) {
  if (multiple) {
    const selected = Array.isArray(value) ? value : []
    return (
      <div className="flex min-h-9 items-center gap-1 overflow-hidden px-1.5">
        <select disabled={disabled} value="" onChange={(event) => { const next = event.target.value; if (next && !selected.includes(next)) onCommit([...selected, next]) }} className="min-w-0 flex-1 bg-transparent text-xs text-neutral-800 outline-none [color-scheme:light]">
          <option className="bg-white text-neutral-900" value="">{selected.length ? 'Add…' : 'Select…'}</option>{options.filter((option) => !selected.includes(option.id)).map((option) => <option className="bg-white text-neutral-900" key={option.id} value={option.id}>{option.label}</option>)}
        </select>
        {selected.slice(0, 2).map((id) => { const option = options.find((item) => item.id === id); return option ? <button disabled={disabled} title="Remove" onClick={() => onCommit(selected.filter((item) => item !== id))} key={id} className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] ${pillClass[option.color ?? 'gray'] ?? pillClass.gray}`}>{option.label}</button> : null })}
      </div>
    )
  }
  const selected = typeof value === 'string' ? options.find((option) => option.id === value) : undefined
  return (
    <div className="relative min-h-9">
      {selected ? <span className={`pointer-events-none absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded px-2 py-0.5 text-xs ${pillClass[selected.color ?? 'gray'] ?? pillClass.gray}`}>{selected.label}</span> : null}
      <select disabled={disabled} value={typeof value === 'string' ? value : ''} onChange={(event) => onCommit(event.target.value || undefined)} className={`h-9 w-full appearance-none bg-transparent [color-scheme:light] px-2 text-sm outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 disabled:cursor-default ${selected ? 'text-transparent' : 'text-neutral-400'}`}><option className="bg-white text-neutral-900" value="">Empty</option>{options.map((option) => <option className="bg-white text-neutral-900" key={option.id} value={option.id}>{option.label}</option>)}</select>
    </div>
  )
}
