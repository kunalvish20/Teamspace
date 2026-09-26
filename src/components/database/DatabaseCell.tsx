import { PanelRightOpen } from 'lucide-react'
import type { DatabaseProperty, DatabaseRow, Json } from '../../types/database.types'
import type { MemberWithProfile } from '../../types/domain'
import { getCellValue, propertyConfig } from '../../utils/database'
import { MemberPicker } from '../members/MemberPicker'
import { CheckboxCell } from './cells/CheckboxCell'
import { CurrencyCell } from './cells/CurrencyCell'
import { DateCell } from './cells/DateCell'
import { NumberCell } from './cells/NumberCell'
import { SelectCell } from './cells/SelectCell'
import { TextCell } from './cells/TextCell'

interface Props {
  row: DatabaseRow
  property: DatabaseProperty
  members: MemberWithProfile[]
  disabled?: boolean
  onCommit: (row: DatabaseRow, propertyId: string, value: Json | undefined) => void
  onOpenRow?: (row: DatabaseRow) => void
}

export function DatabaseCell({ row, property, members, disabled, onCommit, onOpenRow }: Props) {
  const raw = getCellValue(row, property.id)
  const config = propertyConfig(property)
  const commit = (value: Json | undefined) => onCommit(row, property.id, value)

  if (property.property_type === 'title') {
    return (
      <div className="group/title-cell flex h-full min-w-0 items-center pr-1">
        <div className="min-w-0 flex-1"><TextCell value={typeof raw === 'string' ? raw : ''} disabled={disabled} onCommit={commit} /></div>
        <button
          type="button"
          onClick={() => onOpenRow?.(row)}
          aria-label="Open in side peek"
          className="group/open relative ml-1 inline-flex h-6 shrink-0 items-center gap-1 rounded border border-transparent px-1.5 text-[10px] font-semibold uppercase leading-none text-neutral-500 opacity-0 shadow-sm transition-all duration-150 hover:border-neutral-300 hover:bg-white hover:text-neutral-800 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 group-hover/title-cell:opacity-100"
        >
          <PanelRightOpen size={12} strokeWidth={2} />
          Open
          <span className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded bg-neutral-900 px-2 py-1 text-[11px] font-medium normal-case text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/open:opacity-100 group-focus-visible/open:opacity-100">
            Open in side peek
          </span>
        </button>
      </div>
    )
  }
  if (property.property_type === 'text') return <TextCell value={typeof raw === 'string' ? raw : ''} disabled={disabled} onCommit={commit} />
  if (property.property_type === 'email') return <TextCell type="email" value={typeof raw === 'string' ? raw : ''} disabled={disabled} onCommit={commit} />
  if (property.property_type === 'phone') return <TextCell type="tel" value={typeof raw === 'string' ? raw : ''} disabled={disabled} onCommit={commit} />
  if (property.property_type === 'url') return <TextCell type="url" value={typeof raw === 'string' ? raw : ''} disabled={disabled} onCommit={commit} />
  if (property.property_type === 'number') return <NumberCell value={typeof raw === 'number' ? raw : undefined} disabled={disabled} onCommit={commit} />
  if (property.property_type === 'currency') return <CurrencyCell value={typeof raw === 'number' ? raw : undefined} currency={config.currency ?? 'INR'} disabled={disabled} onCommit={commit} />
  if (property.property_type === 'date') return <DateCell value={typeof raw === 'string' ? raw : undefined} disabled={disabled} onCommit={commit} />
  if (property.property_type === 'datetime') return <DateCell includeTime value={typeof raw === 'string' ? raw : undefined} disabled={disabled} onCommit={commit} />
  if (property.property_type === 'checkbox') return <CheckboxCell value={raw === true} disabled={disabled} onCommit={commit} />
  if (property.property_type === 'select') return <SelectCell value={typeof raw === 'string' ? raw : undefined} options={config.options ?? []} disabled={disabled} onCommit={commit} />
  if (property.property_type === 'multi_select') return <SelectCell multiple value={Array.isArray(raw) ? raw.filter((value): value is string => typeof value === 'string') : []} options={config.options ?? []} disabled={disabled} onCommit={commit} />
  if (property.property_type === 'person') return <MemberPicker members={members} selectedIds={typeof raw === 'string' ? [raw] : []} disabled={disabled} onChange={(ids) => commit(ids[0])} />
  if (property.property_type === 'multi_person') return <MemberPicker multiple members={members} selectedIds={Array.isArray(raw) ? raw.filter((value): value is string => typeof value === 'string') : []} disabled={disabled} onChange={(ids) => commit(ids)} />
  return <div className="px-2 text-xs text-neutral-400">Unsupported</div>
}
