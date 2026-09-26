import { ArrowRight, CheckSquare2, FileText } from 'lucide-react'
import type { TemplateDefinition } from '../../services/template.service'
import { Spinner } from '../ui/Spinner'

interface TemplateCardProps {
  template: TemplateDefinition
  creating: boolean
  disabled?: boolean
  onSelect: (template: TemplateDefinition) => void
}

const ACCENTS = {
  emerald: 'bg-emerald-50 text-emerald-700', blue: 'bg-blue-50 text-blue-700',
  purple: 'bg-violet-50 text-violet-700', amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-700', orange: 'bg-orange-50 text-orange-700',
  indigo: 'bg-indigo-50 text-indigo-700',
}

export function TemplateCard({ template, creating, disabled = false, onSelect }: TemplateCardProps) {
  const accent = ACCENTS[template.tint] ?? ACCENTS.blue
  const rows = template.previewRows?.slice(0, 2) ?? []
  return (
    <button type="button" onClick={() => onSelect(template)} disabled={disabled || creating}
      aria-label={`Use ${template.name} template`} aria-busy={creating}
      className="group relative flex min-h-[228px] cursor-pointer flex-col rounded-xl border border-neutral-200 bg-white p-4 text-left transition-[background-color,border-color,box-shadow] hover:border-neutral-300 hover:bg-neutral-50/60 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-800 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-base ${accent}`} aria-hidden="true">{template.icon}</span>
          <span className="truncate text-sm font-semibold text-neutral-900">{template.name}</span>
        </div>
        <span className="shrink-0 rounded-md bg-neutral-100 px-2 py-1 text-[10px] font-medium text-neutral-500">{template.type === 'page' ? 'Page' : 'Collection'}</span>
      </div>
      <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-neutral-500">{template.description}</p>
      <div className="mt-3 min-h-[72px] rounded-lg border border-neutral-200/80 bg-neutral-50/70 px-3 py-2.5">
        {template.type === 'collection' ? <>
          <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-3 border-b border-neutral-200 pb-1.5 text-[10px] font-medium text-neutral-400">
            <span className="truncate">{template.headers?.[0] ?? 'Name'}</span><span className="truncate">{template.headers?.[1] ?? 'Status'}</span>
          </div>
          <div className="divide-y divide-neutral-200/70">{rows.map((row) => (
            <div key={`${row.col1}-${row.col2}`} className="grid grid-cols-[minmax(0,1fr)_88px] gap-3 py-1.5 text-[10px]">
              <span className="truncate font-medium text-neutral-700">{row.col1}</span><span className="truncate text-neutral-500">{row.col2}</span>
            </div>
          ))}</div>
        </> : <div className="space-y-2">{rows.map((row, index) => (
          <div key={`${row.col1}-${index}`} className="flex items-center gap-2 text-[10px] text-neutral-600">
            {index === 0 ? <FileText size={12} className="shrink-0 text-neutral-400" /> : <CheckSquare2 size={12} className="shrink-0 text-neutral-400" />}
            <span className="truncate font-medium">{row.col1}</span><span className="ml-auto truncate text-neutral-400">{row.col2}</span>
          </div>
        ))}</div>}
      </div>
      <span className="mt-auto flex items-center gap-1.5 pt-3 text-xs font-medium text-neutral-700">
        {creating ? <><Spinner className="h-3.5 w-3.5" /> Creating…</> : <>Use template <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" /></>}
      </span>
    </button>
  )
}
