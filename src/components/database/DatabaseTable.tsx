import { useEffect, useMemo, useState } from 'react'
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef, type ColumnSizingState, type VisibilityState } from '@tanstack/react-table'
import { Archive, Plus } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { DatabaseProperty, DatabaseRow, DatabaseView, Json } from '../../types/database.types'
import type { MemberWithProfile } from '../../types/domain'
import { filterAndSortRows, parseViewFilters, parseViewSorts, propertyConfig } from '../../utils/database'
import { archiveProperty, renameProperty, updateProperty, updatePropertyPosition, updateView } from '../../services/database.service'
import { databaseKeys } from '../../features/database/queries'
import { DatabaseCell } from './DatabaseCell'
import { PropertyHeader } from './PropertyHeader'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { useToast } from '../ui/Toast'

interface Props {
  databaseId: string
  rows: DatabaseRow[]
  properties: DatabaseProperty[]
  view: DatabaseView
  members: MemberWithProfile[]
  search: string
  canWrite: boolean
  onCommit: (row: DatabaseRow, propertyId: string, value: Json | undefined) => void
  onCreateRow: () => void
  onCreateProperty: () => void
  onArchiveRow: (row: DatabaseRow) => void
  onOpenRow: (row: DatabaseRow) => void
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  onLoadMore?: () => void
}

export function DatabaseTable({ databaseId, rows, properties, view, members, search, canWrite, onCommit, onCreateRow, onCreateProperty, onArchiveRow, onOpenRow, hasNextPage, isFetchingNextPage, onLoadMore }: Props) {
  const queryClient = useQueryClient()
  const { push } = useToast()
  const [rowToArchive, setRowToArchive] = useState<DatabaseRow | null>(null)
  const [configuringProperty, setConfiguringProperty] = useState<DatabaseProperty | null>(null)
  const [configCurrency, setConfigCurrency] = useState('INR')
  const [configOptions, setConfigOptions] = useState('')

  useEffect(() => {
    if (!configuringProperty) return
    const cfg = propertyConfig(configuringProperty)
    setConfigCurrency(cfg.currency ?? 'INR')
    setConfigOptions(cfg.options?.map((o) => o.label).join(', ') ?? '')
  }, [configuringProperty])

  const visibleIds = useMemo(() => Array.isArray(view.visible_property_ids) ? view.visible_property_ids.filter((value): value is string => typeof value === 'string') : [], [view.visible_property_ids])
  const initialVisibility = useMemo<VisibilityState>(() => Object.fromEntries(properties.map((property) => [property.id, !visibleIds.length || visibleIds.includes(property.id)])), [properties, visibleIds])
  const initialSizing = useMemo<ColumnSizingState>(() => {
    const widths = view.property_widths && typeof view.property_widths === 'object' && !Array.isArray(view.property_widths) ? view.property_widths : {}
    return Object.fromEntries(properties.map((property) => [property.id, typeof widths[property.id] === 'number' ? widths[property.id] as number : property.property_type === 'title' ? 240 : 170]))
  }, [properties, view.property_widths])
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(initialSizing)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(initialVisibility)
  useEffect(() => setColumnVisibility(initialVisibility), [initialVisibility])
  useEffect(() => setColumnSizing(initialSizing), [initialSizing])

  useEffect(() => {
    if (!canWrite || JSON.stringify(columnSizing) === JSON.stringify(initialSizing)) return
    const timer = window.setTimeout(() => {
      const widths = Object.fromEntries(Object.entries(columnSizing).map(([key, value]) => [key, Math.round(value)]))
      void updateView(view.id, { property_widths: widths }).catch(() => undefined)
    }, 600)
    return () => window.clearTimeout(timer)
  }, [columnSizing, initialSizing, view.id, canWrite])

  const propertyMutation = useMutation({
    mutationFn: async (action: { type: 'rename'; propertyId: string; name: string } | { type: 'archive'; propertyId: string } | { type: 'configure'; propertyId: string; config: Json } | { type: 'move'; propertyId: string; position: number; otherId: string; otherPosition: number }) => { if (action.type === 'rename') return renameProperty(action.propertyId, action.name); if (action.type === 'archive') return archiveProperty(action.propertyId); if (action.type === 'configure') return updateProperty(action.propertyId, { config: action.config }); await Promise.all([updatePropertyPosition(action.propertyId, action.position), updatePropertyPosition(action.otherId, action.otherPosition)]) },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: databaseKeys.properties(databaseId) }) },
    onError: (error) => push(error instanceof Error ? error.message : 'Property update failed.', 'error'),
  })

  const displayRows = useMemo(() => filterAndSortRows(rows, properties, search, parseViewFilters(view.filters), parseViewSorts(view.sorts)), [rows, properties, search, view.filters, view.sorts])
  const columns = useMemo<ColumnDef<DatabaseRow>[]>(() => [
    ...properties.map((property): ColumnDef<DatabaseRow> => ({
      id: property.id,
      size: initialSizing[property.id] ?? 170,
      minSize: property.property_type === 'title' ? 160 : 110,
      maxSize: 500,
      header: () => {
        const index = properties.findIndex((item) => item.id === property.id)
        const previous = properties[index - 1]
        const next = properties[index + 1]
        return (
          <PropertyHeader
            property={property}
            canEdit={canWrite}
            canMoveLeft={Boolean(previous)}
            canMoveRight={Boolean(next)}
            onRename={(name) => propertyMutation.mutate({ type: 'rename', propertyId: property.id, name })}
            onConfigure={() => setConfiguringProperty(property)}
            onArchive={() => propertyMutation.mutate({ type: 'archive', propertyId: property.id })}
            onMoveLeft={() => {
              if (previous) {
                propertyMutation.mutate({
                  type: 'move',
                  propertyId: property.id,
                  position: previous.position,
                  otherId: previous.id,
                  otherPosition: property.position,
                })
              }
            }}
            onMoveRight={() => {
              if (next) {
                propertyMutation.mutate({
                  type: 'move',
                  propertyId: property.id,
                  position: next.position,
                  otherId: next.id,
                  otherPosition: property.position,
                })
              }
            }}
          />
        )
      },
    })),
    {
      id: '__actions', size: 44, minSize: 44, maxSize: 44,
      header: () => canWrite ? (
        <button
          type="button"
          onClick={onCreateProperty}
          title="Add property"
          aria-label="Add column"
          className="grid h-9 w-full place-items-center text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-700"
        >
          <Plus size={14} />
        </button>
      ) : null,
    },
  ], [properties, initialSizing, canWrite, propertyMutation, onCreateProperty])

  const table = useReactTable({
    data: displayRows,
    getRowId: (row) => row.id,
    columns,
    state: { columnSizing, columnVisibility },
    onColumnSizingChange: setColumnSizing,
    onColumnVisibilityChange: setColumnVisibility,
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="w-full overflow-x-auto">
      <div style={{ width: table.getTotalSize(), minWidth: '100%' }}>
        <div className="sticky top-0 z-10 flex h-9 border-b border-neutral-200 bg-neutral-50/95 backdrop-blur">
          {table.getHeaderGroups()[0]?.headers.map((header) => <div key={header.id} className="relative shrink-0 border-r border-neutral-200 last:border-r-0" style={{ width: header.getSize() }}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}{header.column.id !== '__actions' ? <div onMouseDown={header.getResizeHandler()} onTouchStart={header.getResizeHandler()} className={`absolute right-0 top-0 h-full w-1 cursor-col-resize touch-none ${header.column.getIsResizing() ? 'bg-blue-500' : 'hover:bg-neutral-300'}`} /> : null}</div>)}
        </div>
        {table.getRowModel().rows.map((row) => <div key={row.id} data-row-id={row.original.id} className="flex min-h-9 border-b border-neutral-100 bg-white hover:bg-neutral-50/60">{row.getVisibleCells().map((cell) => {
          const property = properties.find((item) => item.id === cell.column.id)
          // Keep editor component identities stable when table options or callbacks change.
          return <div key={cell.id} className="shrink-0 border-r border-neutral-100 last:border-r-0" style={{ width: cell.column.getSize() }}>
            {property ? <DatabaseCell row={row.original} property={property} members={members} disabled={!canWrite} onCommit={onCommit} onOpenRow={property.property_type === 'title' ? onOpenRow : undefined} /> : canWrite ? <button title="Archive record" onClick={() => setRowToArchive(row.original)} className="grid h-9 w-full place-items-center text-neutral-300 hover:text-red-500"><Archive size={13} /></button> : null}
          </div>
        })}</div>)}
        {!displayRows.length ? <div className="grid h-36 place-items-center border-b border-neutral-100 text-sm text-neutral-400">{search || parseViewFilters(view.filters).length ? 'No records match this view.' : 'No records yet.'}</div> : null}
        {canWrite ? <button onClick={onCreateRow} className="flex h-10 w-full items-center gap-2 border-b border-neutral-100 px-3 text-sm text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"><Plus size={14} /> New row</button> : null}
        {hasNextPage ? <div className="flex justify-center p-3"><Button size="sm" onClick={onLoadMore} disabled={isFetchingNextPage}>{isFetchingNextPage ? 'Loading…' : 'Load 100 more'}</Button></div> : null}
      </div>
      <Modal open={Boolean(rowToArchive)} onClose={() => setRowToArchive(null)} title="Archive record">
        <p className="text-sm text-neutral-600">Archive this record? You can restore it later.</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={() => setRowToArchive(null)}>Cancel</Button>
          <Button variant="primary" onClick={() => { if (rowToArchive) onArchiveRow(rowToArchive); setRowToArchive(null) }}>Archive record</Button>
        </div>
      </Modal>

      {/* Centered Configure Property Modal */}
      <Modal
        open={Boolean(configuringProperty)}
        onClose={() => setConfiguringProperty(null)}
        title={configuringProperty ? `Configure ${configuringProperty.name}` : 'Configure property'}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!configuringProperty) return
            if (configuringProperty.property_type === 'currency') {
              propertyMutation.mutate({
                type: 'configure',
                propertyId: configuringProperty.id,
                config: { currency: configCurrency.trim().toUpperCase() },
              })
            } else {
              const options = configOptions
                .split(/[\n,]+/)
                .map((label) => label.trim())
                .filter(Boolean)
                .map((label) => ({ id: crypto.randomUUID(), label, color: 'gray' }))
              propertyMutation.mutate({
                type: 'configure',
                propertyId: configuringProperty.id,
                config: { options },
              })
            }
            setConfiguringProperty(null)
          }}
        >
          {configuringProperty?.property_type === 'currency' ? (
            <label className="block text-xs font-medium text-neutral-600">
              Currency
              <select
                value={configCurrency}
                onChange={(e) => setConfigCurrency(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-400"
              >
                <option value="INR">INR ₹</option>
                <option value="USD">USD $</option>
                <option value="EUR">EUR €</option>
                <option value="GBP">GBP £</option>
                <option value="AED">AED</option>
              </select>
            </label>
          ) : (
            <label className="block text-xs font-medium text-neutral-600">
              Options
              <textarea
                rows={4}
                value={configOptions}
                onChange={(e) => setConfigOptions(e.target.value)}
                placeholder="Option 1, Option 2, Option 3"
                className="mt-1 w-full rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
              />
              <span className="mt-1 block text-[11px] font-normal text-neutral-400">
                Separate options with commas or new lines.
              </span>
            </label>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={() => setConfiguringProperty(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
