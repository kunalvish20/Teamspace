import { useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Share2 } from 'lucide-react'
import { filterAndSortRows, getCellValue, parseViewFilters, parseViewSorts, propertyConfig } from '../utils/database'
import { formatCurrency, formatDate } from '../utils/format'
import type { DatabaseProperty, DatabaseRow, DatabaseView, Json } from '../types/database.types'
import { DatabaseCell } from '../components/database/DatabaseCell'
import { CollectionShareDialog } from '../components/database/CollectionShareDialog'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { useToast } from '../components/ui/Toast'
import { getSharedCollection, updateSharedCollectionValue } from '../services/collection-share.service'

function valueText(row: DatabaseRow, property: DatabaseProperty) {
  const value = getCellValue(row, property.id)
  if (value === undefined || value === null || value === '') return '—'
  if (property.property_type === 'checkbox') return value === true ? 'Yes' : 'No'
  if (property.property_type === 'currency') return formatCurrency(value, propertyConfig(property).currency)
  if (property.property_type === 'date' || property.property_type === 'datetime') return formatDate(String(value))
  if (property.property_type === 'select') return propertyConfig(property).options?.find((option) => option.id === value)?.label ?? String(value)
  if (property.property_type === 'person') return 'Member'
  if (property.property_type === 'multi_person') return Array.isArray(value) && value.length ? 'Members' : '—'
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

export function SharedCollectionPage() {
  const { shareId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { push } = useToast()
  const [search, setSearch] = useState('')
  const [shareOpen, setShareOpen] = useState(false)

  const key = ['shared-collection', shareId] as const
  const collection = useQuery({
    queryKey: key,
    queryFn: () => getSharedCollection(shareId),
    retry: false,
    refetchInterval: 15_000,
  })
  const bundle = collection.data

  const canEdit = bundle?.permission === 'edit' || bundle?.permission === 'admin'
  const canAdmin = bundle?.permission === 'admin'
  const members = useMemo(() => [], [])

  const properties = useMemo(() => bundle?.properties ?? [], [bundle?.properties])
  const views = useMemo(() => bundle?.views ?? [], [bundle?.views])
  const activeView = views.find((view) => view.id === searchParams.get('view')) ?? views[0] ?? null
  const rows = useMemo(() => bundle?.rows ?? [], [bundle?.rows])
  const visibleRows = useMemo(
    () => (properties.length && activeView ? filterAndSortRows(rows, properties, '', parseViewFilters(activeView.filters), parseViewSorts(activeView.sorts)) : rows),
    [rows, properties, activeView]
  )
  const titleProperty = properties.find((p) => p.property_type === 'title')

  const update = useMutation({
    mutationFn: ({ rowId, propertyId, value }: { rowId: string; propertyId: string; value: Json | undefined }) =>
      updateSharedCollectionValue(shareId, rowId, propertyId, value),
    onSuccess: (row) =>
      queryClient.setQueryData(key, (current: typeof bundle) =>
        current ? { ...current, rows: current.rows.map((r) => (r.id === row.id ? row : r)) } : current
      ),
    onError: () => push('Could not update this record.', 'error'),
  })

  const commonViewProps = {
    rows: visibleRows,
    properties,
    canWrite: canEdit,
    onOpenRow: () => undefined,
    onCommit: (row: DatabaseRow, propertyId: string, value: Json | undefined) => update.mutate({ rowId: row.id, propertyId, value }),
    titleProperty,
  }

  if (collection.isLoading)
    return <div className="grid min-h-screen place-items-center"><Spinner className="h-5 w-5 text-neutral-400" /></div>
  if (collection.isError) {
    const unauthorized = collection.error instanceof Error && collection.error.message === 'unauthorized'
    return (
      <div className="grid min-h-screen place-items-center bg-neutral-50 px-6">
        <div className="text-center">
          <h1 className="text-lg font-semibold text-neutral-900">
            {unauthorized ? "You don't have access to this collection." : 'This collection is no longer available.'}
          </h1>
          <p className="mt-2 text-sm text-neutral-500">Contact the collection owner if you believe this is a mistake.</p>
        </div>
      </div>
    )
  }
  if (!bundle) {
    return (
      <div className="grid min-h-screen place-items-center bg-neutral-50 px-6">
        <h1 className="text-lg font-semibold text-neutral-900">This collection is no longer available.</h1>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-5">
          <div className="text-sm font-semibold text-neutral-900">TeamSpace</div>
          <span className="text-neutral-300">/</span>
          <span className="min-w-0 flex-1 truncate text-xs text-neutral-500">{bundle.workspaceName}</span>
          <span className="rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-600">
            {bundle.permission === 'view' ? 'Can view' : bundle.permission === 'edit' ? 'Can edit' : 'Admin'}
          </span>
          {canAdmin ? (
            <Button size="sm" onClick={() => setShareOpen(true)}>
              <Share2 size={13} /> Share
            </Button>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-5 sm:py-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-neutral-400">{bundle.database.name}</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">{bundle.database.name}</h1>
            {bundle.database.description ? <p className="mt-1 text-sm text-neutral-500">{bundle.database.description}</p> : null}
          </div>
        </div>
        {activeView ? (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-1.5 border-b border-neutral-200 px-3 py-2">
              <div className="relative mr-auto min-w-32 max-w-sm flex-1 md:flex-none md:w-64">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search this view"
                  className="h-8 w-full rounded-md border border-transparent bg-neutral-50 pl-2 pr-2 text-xs outline-none focus:border-neutral-200 focus:bg-white"
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-neutral-500">{activeView.view_type}</span>
                {canAdmin && (
                  <Button size="sm" variant="ghost" onClick={() => setShareOpen(true)}>
                    <Share2 size={13} /> Share
                  </Button>
                )}
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {activeView.view_type === 'table' ? (
                <SharedCollectionTable
                  rows={rows}
                  properties={properties}
                  view={activeView}
                  members={members}
                  search={search}
                  canWrite={canEdit}
                  onCommit={(row, propertyId, value) => update.mutate({ rowId: row.id, propertyId, value })}
                  onOpenRow={() => undefined}
                  titleProperty={titleProperty}
                />
              ) : activeView.view_type === 'board' ? (
                <SharedCollectionBoard {...commonViewProps} />
              ) : activeView.view_type === 'calendar' ? (
                <SharedCollectionCalendar rows={visibleRows} properties={properties} onOpenRow={() => undefined} titleProperty={titleProperty} />
              ) : activeView.view_type === 'gallery' ? (
                <SharedCollectionGallery {...commonViewProps} titleProperty={titleProperty} />
              ) : null}
            </div>
          </>
        ) : (
          <div className="mt-8 text-center text-neutral-500">No views available</div>
        )}
      </main>
      <CollectionShareDialog
        open={shareOpen}
        databaseId={bundle.database.id}
        databaseName={bundle.database.name}
        onClose={() => setShareOpen(false)}
      />
    </div>
  )
}

function SharedCollectionTable({
  rows,
  properties,
  view,
  members,
  search,
  canWrite,
  onCommit,
  onOpenRow,
  titleProperty,
}: {
  rows: DatabaseRow[]
  properties: DatabaseProperty[]
  view: DatabaseView
  members: never[]
  search: string
  canWrite: boolean
  onCommit: (row: DatabaseRow, propertyId: string, value: Json | undefined) => void
  onOpenRow: (row: DatabaseRow) => void
  titleProperty: DatabaseProperty | undefined
}) {
  const visibleIds = Array.isArray(view.visible_property_ids) ? view.visible_property_ids.filter((value): value is string => typeof value === 'string') : []
  const displayProperties = properties.filter((p) => !visibleIds.length || visibleIds.includes(p.id))

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-neutral-200 bg-neutral-50">
            {displayProperties.map((property) => (
              <th key={property.id} className="w-48 min-w-48 px-3 py-2 text-left text-xs font-medium text-neutral-500">
                {property.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={displayProperties.length} className="px-4 py-12 text-center text-sm text-neutral-400">
                {search ? 'No results found.' : 'No records yet.'}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50/50 cursor-pointer" onClick={() => onOpenRow(row)}>
                {displayProperties.map((property) => (
                  <td key={property.id} className="w-48 min-w-48 px-3 py-2 text-sm text-neutral-800">
                    {property.id === titleProperty?.id ? (
                      <span className="font-medium">{valueText(row, property)}</span>
                    ) : (
                      canWrite ? (
                        <DatabaseCell row={row} property={property} members={members} onCommit={(_row, propertyId, value) => onCommit(row, propertyId, value)} />
                      ) : (
                        <div className="px-2 py-1 break-words">{valueText(row, property)}</div>
                      )
                    )}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function SharedCollectionBoard({
  rows,
  properties,
  canWrite,
  onOpenRow,
  onCommit,
  titleProperty,
}: {
  rows: DatabaseRow[]
  properties: DatabaseProperty[]
  canWrite: boolean
  onOpenRow: (row: DatabaseRow) => void
  onCommit: (row: DatabaseRow, propertyId: string, value: Json | undefined) => void
  titleProperty: DatabaseProperty | undefined
}) {
  const statusProperty = properties.find((p) => p.property_type === 'select')
  const statusOptions = statusProperty ? propertyConfig(statusProperty).options ?? [] : []
  const getStatus = (row: DatabaseRow) => getCellValue(row, statusProperty?.id ?? '') as string | undefined

  const columns = statusOptions.length ? statusOptions.map((o: { id: string }) => o.id) : ['backlog', 'in_progress', 'done']

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((columnId: string) => (
        <div key={columnId} className="w-72 min-w-72 flex flex-col">
          <div className="px-3 py-2 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
            {statusOptions.find((o: { id: string; label: string }) => o.id === columnId)?.label ?? columnId.replace('_', ' ')}
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 p-3 bg-neutral-50/50 rounded-lg">
            {rows
              .filter((row) => getStatus(row) === columnId || (!getStatus(row) && columnId === columns[0]))
              .map((row) => (
                <div key={row.id} className="rounded-lg border border-neutral-200 bg-white p-3 shadow-sm hover:shadow-md cursor-pointer" onClick={() => onOpenRow(row)}>
                  <div className="font-medium text-sm text-neutral-900">{titleProperty ? valueText(row, titleProperty) : 'Untitled'}</div>
                  {canWrite && statusProperty && (
                    <select
                      value={getStatus(row) ?? ''}
                      onChange={(event) => {
                        event.stopPropagation()
                        onCommit(row, statusProperty.id, event.target.value || undefined)
                      }}
                      className="mt-2 w-full rounded border border-neutral-200 bg-white px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-neutral-700"
                    >
                      <option value="">—</option>
                      {statusOptions.map((option: { id: string; label: string }) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function SharedCollectionCalendar({ rows, properties, onOpenRow, titleProperty }: { rows: DatabaseRow[]; properties: DatabaseProperty[]; onOpenRow: (row: DatabaseRow) => void; titleProperty: DatabaseProperty | undefined }) {
  const dateProperty = properties.find((p) => p.property_type === 'date' || p.property_type === 'datetime')
  return (
    <div className="text-center py-12 text-neutral-500">
      {dateProperty ? (
        <div className="space-y-2">
          {rows
            .filter((row) => getCellValue(row, dateProperty.id))
            .map((row) => (
              <div key={row.id} className="rounded-lg border border-neutral-200 bg-white p-3 hover:bg-neutral-50 cursor-pointer" onClick={() => onOpenRow(row)}>
                <div className="font-medium text-sm text-neutral-900">{titleProperty ? valueText(row, titleProperty) : 'Untitled'}</div>
                <div className="text-xs text-neutral-500">{formatDate(String(getCellValue(row, dateProperty.id)))}</div>
              </div>
            ))}
        </div>
      ) : (
        <p>Add a date property to enable calendar view.</p>
      )}
    </div>
  )
}

function SharedCollectionGallery({
  rows,
  properties,
  onOpenRow,
  titleProperty,
}: {
  rows: DatabaseRow[]
  properties: DatabaseProperty[]
  onOpenRow: (row: DatabaseRow) => void
  titleProperty: DatabaseProperty | undefined
}) {
  const imageProperty = properties.find((p) => p.property_type === 'url')
  const galleryTitleProperty = titleProperty ?? properties.find((p) => p.property_type === 'title') ?? properties[0] ?? { id: '', property_type: 'title' as const, name: '', position: 0, config: {}, is_required: false, archived_at: null, created_at: '', updated_at: '', database_id: '' }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {rows.map((row) => (
        <div key={row.id} className="rounded-xl border border-neutral-200 bg-white overflow-hidden hover:shadow-md cursor-pointer" onClick={() => onOpenRow(row)}>
          {imageProperty && getCellValue(row, imageProperty.id) ? (
            <img src={String(getCellValue(row, imageProperty.id))} alt="" className="w-full h-32 object-cover" />
          ) : (
            <div className="w-full h-32 bg-neutral-100 flex items-center justify-center"><span className="text-neutral-400 text-xs">No image</span></div>
          )}
          <div className="p-3">
            <div className="font-medium text-sm text-neutral-900 truncate">{valueText(row, galleryTitleProperty)}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
