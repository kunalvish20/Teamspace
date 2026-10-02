import { useCallback, useMemo, useState } from 'react'
import { useSearchParams, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Database as DatabaseIcon, Search, Share2, X } from 'lucide-react'
import { CalendarDays, Columns3, GalleryHorizontalEnd, Table2 } from 'lucide-react'
import type { DatabaseProperty, DatabaseRow, DatabaseView, Json, ViewType } from '../types/database.types'
import type { MemberWithProfile } from '../types/domain'
import { filterAndSortRows, getCellValue, parseViewFilters, parseViewSorts } from '../utils/database'
import { DatabaseTable } from '../components/database/DatabaseTable'
import { DatabaseBoard } from '../components/database/DatabaseBoard'
import { DatabaseCalendar } from '../components/database/DatabaseCalendar'
import { DatabaseGallery } from '../components/database/DatabaseGallery'
import { CollectionShareDialog } from '../components/database/CollectionShareDialog'
import { DatabaseCell } from '../components/database/DatabaseCell'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { useToast } from '../components/ui/Toast'
import {
  archiveSharedCollectionRow,
  createSharedCollectionRow,
  getSharedCollection,
  updateSharedCollectionValue,
  updateSharedCollectionViewLayout,
  type SharedCollectionBundle,
} from '../services/collection-share.service'

const VIEW_ICONS: Record<ViewType, typeof Table2> = { table: Table2, board: Columns3, calendar: CalendarDays, gallery: GalleryHorizontalEnd }
const PERMISSION_LABEL = { view: 'Can view', edit: 'Can edit', admin: 'Owner access' } as const

export function SharedCollectionPage() {
  const { shareId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const { push } = useToast()
  const [search, setSearch] = useState('')
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)

  const key = useMemo(() => ['shared-collection', shareId] as const, [shareId])
  const collection = useQuery({ queryKey: key, queryFn: () => getSharedCollection(shareId), retry: false, refetchInterval: 15_000 })
  const bundle = collection.data

  const properties: DatabaseProperty[] = useMemo(() => bundle?.properties ?? [], [bundle])
  const views: DatabaseView[] = useMemo(() => bundle?.views ?? [], [bundle])
  const rows: DatabaseRow[] = useMemo(() => bundle?.rows ?? [], [bundle])
  const activeView = useMemo(
    () => views.find((view) => view.id === searchParams.get('view')) ?? views[0] ?? null,
    [views, searchParams]
  )

  const canEdit = bundle?.permission === 'edit' || bundle?.permission === 'admin'
  const canAdmin = bundle?.permission === 'admin'
  const members = useMemo<MemberWithProfile[]>(() => [], [])

  const visibleRows = useMemo(
    () => (properties.length && activeView ? filterAndSortRows(rows, properties, '', parseViewFilters(activeView.filters), parseViewSorts(activeView.sorts)) : rows),
    [rows, properties, activeView]
  )
  const selectedRow = selectedRowId ? rows.find((row) => row.id === selectedRowId) ?? null : null

  const patchBundle = useCallback(
    (updater: (current: SharedCollectionBundle) => SharedCollectionBundle) => {
      queryClient.setQueryData<SharedCollectionBundle | null>(key, (current) => (current ? updater(current) : current))
    },
    [key, queryClient]
  )

  const commitCell = useMutation({
    mutationFn: ({ rowId, propertyId, value }: { rowId: string; propertyId: string; value: Json | undefined }) =>
      updateSharedCollectionValue(shareId, rowId, propertyId, value),
    onSuccess: (row) => patchBundle((current) => ({ ...current, rows: current.rows.map((item) => (item.id === row.id ? row : item)) })),
    onError: () => push('Could not update this record.', 'error'),
  })

  const createRow = useMutation({
    mutationFn: (data: Record<string, Json | undefined>) => createSharedCollectionRow(shareId, data),
    onSuccess: (row) => {
      patchBundle((current) => ({ ...current, rows: [...current.rows, row] }))
      if (activeView?.view_type === 'table') {
        window.setTimeout(() => document.querySelector<HTMLInputElement>(`[data-row-id="${row.id}"] input`)?.focus(), 0)
      } else {
        setSelectedRowId(row.id)
      }
    },
    onError: (error) => push(error instanceof Error ? error.message : 'Could not add a record.', 'error'),
  })

  const archiveRow = useMutation({
    mutationFn: (row: DatabaseRow) => archiveSharedCollectionRow(shareId, row.id),
    onSuccess: (row) => {
      patchBundle((current) => ({ ...current, rows: current.rows.filter((item) => item.id !== row.id) }))
      setSelectedRowId((current) => (current === row.id ? null : current))
      push('Record archived.', 'success')
    },
    onError: (error) => push(error instanceof Error ? error.message : 'Could not archive this record.', 'error'),
  })

  function addNewRow() {
    const initialData: Record<string, Json | undefined> = {}
    for (const filter of parseViewFilters(activeView ? activeView.filters : [])) {
      if (filter.operator === 'equals' && filter.value !== undefined) initialData[filter.propertyId] = filter.value
    }
    createRow.mutate(initialData)
  }

  function switchView(viewId: string) {
    const next = new URLSearchParams(searchParams)
    next.set('view', viewId)
    setSearchParams(next, { replace: true })
  }

  if (collection.isLoading) {
    return <div className="grid min-h-screen place-items-center bg-neutral-50"><Spinner className="h-5 w-5 text-neutral-400" /></div>
  }
  if (collection.isError) {
    const unauthorized = collection.error instanceof Error && collection.error.message === 'unauthorized'
    return (
      <div className="grid min-h-screen place-items-center bg-neutral-50 px-6">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold text-neutral-900">{unauthorized ? "You don't have access to this collection." : 'This collection is no longer available.'}</h1>
          <p className="mt-2 text-sm text-neutral-500">
            {unauthorized
              ? 'Ask the owner to share it with your email address, or sign in with the account that was invited.'
              : 'The link may have been revoked by the owner.'}
          </p>
        </div>
      </div>
    )
  }
  if (!bundle) {
    return <div className="grid min-h-screen place-items-center bg-neutral-50 px-6"><h1 className="text-lg font-semibold text-neutral-900">This collection is no longer available.</h1></div>
  }

  const createRowButton = canEdit ? (
    <Button size="sm" onClick={addNewRow} disabled={createRow.isPending}>{createRow.isPending ? 'Adding…' : 'New record'}</Button>
  ) : null

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-5">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
            <DatabaseIcon size={15} className="text-neutral-400" />
            TeamSpace
          </div>
          <span className="text-neutral-300">/</span>
          <span className="min-w-0 flex-1 truncate text-xs text-neutral-500">{bundle.workspaceName}</span>
          <span className="rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-600">{PERMISSION_LABEL[bundle.permission]}</span>
          {canAdmin ? <Button size="sm" onClick={() => setShareOpen(true)}><Share2 size={13} /> Share</Button> : null}
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl flex-1 px-5 pb-16 pt-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-neutral-900">{bundle.database.name}</h1>
            {bundle.database.description ? <p className="mt-1 text-sm text-neutral-500">{bundle.database.description}</p> : null}
          </div>
          {createRowButton}
        </div>

        {views.length ? (
          <div className="mt-5 flex items-center gap-1 overflow-x-auto border-b border-neutral-200">
            {views.map((view) => {
              const Icon = VIEW_ICONS[view.view_type]
              const active = activeView?.id === view.id
              return (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => switchView(view.id)}
                  className={`flex h-9 shrink-0 items-center gap-1.5 border-b-2 px-2.5 text-xs font-medium transition-colors ${active ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
                >
                  <Icon size={13} />
                  {view.name}
                </button>
              )
            })}
          </div>
        ) : null}

        <div className="mt-3 flex items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search this view"
              className="h-8 w-full rounded-md border border-neutral-200 bg-white pl-8 pr-2 text-xs outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100"
            />
          </div>
          {search ? <button onClick={() => setSearch('')} className="text-xs text-neutral-400 hover:text-neutral-700">Clear</button> : null}
        </div>

        <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {!activeView ? (
            <p className="px-4 py-12 text-center text-sm text-neutral-400">This collection has no views yet.</p>
          ) : activeView.view_type === 'table' ? (
            <DatabaseTable
              databaseId={bundle.database.id}
              rows={rows}
              properties={properties}
              view={activeView}
              members={members}
              search={search}
              canWrite={canEdit}
              onCommit={(row, propertyId, value) => commitCell.mutate({ rowId: row.id, propertyId, value })}
              onCreateRow={addNewRow}
              onCreateProperty={() => push('Only the collection owner can change properties.', 'error')}
              onArchiveRow={(row) => archiveRow.mutate(row)}
              onOpenRow={(row) => setSelectedRowId(row.id)}
              canEditSchema={false}
              onPersistWidths={canEdit ? (widths) => { void updateSharedCollectionViewLayout(shareId, activeView.id, widths).catch(() => undefined) } : undefined}
            />
          ) : activeView.view_type === 'board' ? (
            <DatabaseBoard rows={visibleRows} properties={properties} canWrite={canEdit} onCommit={(row, propertyId, value) => commitCell.mutate({ rowId: row.id, propertyId, value })} onOpenRow={(row) => setSelectedRowId(row.id)} onCreateRow={addNewRow} />
          ) : activeView.view_type === 'calendar' ? (
            <DatabaseCalendar rows={visibleRows} properties={properties} onOpenRow={(row) => setSelectedRowId(row.id)} />
          ) : (
            <DatabaseGallery rows={visibleRows} properties={properties} canWrite={canEdit} onOpenRow={(row) => setSelectedRowId(row.id)} onCreateRow={addNewRow} />
          )}
        </div>
      </div>

      {selectedRow ? (
        <SharedRowDrawer
          row={selectedRow}
          properties={properties}
          members={members}
          canEdit={canEdit}
          canArchive={canEdit}
          onCommit={(propertyId, value) => commitCell.mutate({ rowId: selectedRow.id, propertyId, value })}
          onArchive={() => archiveRow.mutate(selectedRow)}
          onClose={() => setSelectedRowId(null)}
        />
      ) : null}

      <CollectionShareDialog
        open={shareOpen}
        databaseId={bundle.database.id}
        databaseName={bundle.database.name}
        onClose={() => setShareOpen(false)}
      />
    </div>
  )
}

function SharedRowDrawer({
  row,
  properties,
  members,
  canEdit,
  canArchive,
  onCommit,
  onArchive,
  onClose,
}: {
  row: DatabaseRow
  properties: DatabaseProperty[]
  members: MemberWithProfile[]
  canEdit: boolean
  canArchive: boolean
  onCommit: (propertyId: string, value: Json | undefined) => void
  onArchive: () => void
  onClose: () => void
}) {
  const title = properties.find((property) => property.property_type === 'title')
  const titleValue = title ? getCellValue(row, title.id) : undefined

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-neutral-900/20" role="dialog" aria-modal="true" aria-label="Record details">
      <button type="button" aria-label="Close" className="flex-1 cursor-default" onClick={onClose} />
      <aside className="flex h-full w-full max-w-xl flex-col border-l border-neutral-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
          <h2 className="truncate text-sm font-semibold text-neutral-900">{String(titleValue ?? 'Record')}</h2>
          <div className="flex items-center gap-2">
            {canArchive ? <Button size="sm" variant="ghost" onClick={onArchive}>Archive</Button> : null}
            <button type="button" onClick={onClose} aria-label="Close panel" className="grid h-8 w-8 place-items-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"><X size={15} /></button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {properties.map((property) => (
            <div key={property.id} className="grid min-h-12 border-b border-neutral-100 last:border-b-0 sm:grid-cols-[180px_1fr]">
              <div className="flex items-center bg-neutral-50/70 px-4 py-3 text-xs font-medium text-neutral-500">{property.name}</div>
              <div className="min-w-0 px-2 py-1 text-sm text-neutral-800">
                {canEdit ? (
                  <DatabaseCell row={row} property={property} members={members} onCommit={(_row, propertyId, value) => onCommit(propertyId, value)} />
                ) : (
                  <div className="px-2 py-2 break-words text-neutral-700">{String(getCellValue(row, property.id) ?? '—')}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}
