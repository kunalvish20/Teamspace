import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Database as DatabaseIcon } from 'lucide-react'
import { useAuth } from '../features/auth/AuthProvider'
import { useWorkspaceOutlet } from '../features/workspace/useWorkspaceOutlet'
import { databaseKeys, useDatabase, useDatabaseProperties, useDatabaseRows, useDatabaseViews } from '../features/database/queries'
import { useWorkspaceMembers } from '../features/workspace/queries'
import { useRowMutations } from '../features/database/mutations'
import { useDatabaseRealtime } from '../hooks/useDatabaseRealtime'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { canWriteRows } from '../utils/permissions'
import { filterAndSortRows, parseViewFilters, parseViewSorts } from '../utils/database'
import type { DatabaseRow, Json, ViewType } from '../types/database.types'
import { createProperty, createView, updateView } from '../services/database.service'
import { DatabaseViewTabs } from '../components/database/DatabaseViewTabs'
import { DatabaseToolbar } from '../components/database/DatabaseToolbar'
import { DatabaseTable } from '../components/database/DatabaseTable'
import { DatabaseBoard } from '../components/database/DatabaseBoard'
import { DatabaseCalendar } from '../components/database/DatabaseCalendar'
import { DatabaseGallery } from '../components/database/DatabaseGallery'
import { DashboardView } from '../components/database/DashboardView'
import { RecordDetailPanel } from '../components/database/RecordDetailPanel'
import { AddPropertyModal, type NewPropertyType } from '../components/database/AddPropertyModal'
import { AddViewModal } from '../components/database/AddViewModal'
import { SkeletonTable } from '../components/ui/SkeletonTable'
import { useToast } from '../components/ui/Toast'

export function DatabasePage() {
  const { databaseId, viewId } = useParams()
  const [searchParams] = useSearchParams()
  const dashboardMode = searchParams.get('mode') === 'dashboard'
  const { workspace, role } = useWorkspaceOutlet()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { push } = useToast()
  const [search, setSearch] = useState('')
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [dashboardRow, setDashboardRow] = useState<DatabaseRow | null>(null)
  const [propertyModal, setPropertyModal] = useState(false)
  const [viewModal, setViewModal] = useState(false)
  const debouncedSearch = useDebouncedValue(search, 350)
  const database = useDatabase(databaseId)
  const properties = useDatabaseProperties(databaseId)
  const views = useDatabaseViews(databaseId)
  const members = useWorkspaceMembers(workspace.id)
  const activeView = views.data?.find((view) => view.id === viewId) ?? views.data?.[0] ?? null
  const rowsQuery = useDatabaseRows({ databaseId: dashboardMode ? undefined : databaseId, workspaceId: dashboardMode ? undefined : workspace.id, view: activeView, search: debouncedSearch })
  useDatabaseRealtime(databaseId, workspace.id)
  const rowMutations = useRowMutations(databaseId ?? '')
  const canWrite = canWriteRows(role)
  const rows = useMemo(() => rowsQuery.data?.pages.flat() ?? [], [rowsQuery.data])
  const visibleRows = useMemo(() => properties.data && activeView ? filterAndSortRows(rows, properties.data, '', parseViewFilters(activeView.filters), parseViewSorts(activeView.sorts)) : rows, [rows, properties.data, activeView])
  const selectedRow = selectedRowId ? rows.find((row) => row.id === selectedRowId) ?? (dashboardRow?.id === selectedRowId ? dashboardRow : null) : null

  const patchView = useMutation({ mutationFn: (patch: Parameters<typeof updateView>[1]) => { if (!activeView) throw new Error('No active view'); return updateView(activeView.id, patch) }, onSuccess: (saved) => { queryClient.setQueryData(databaseKeys.views(databaseId ?? ''), (current: typeof views.data) => current?.map((view) => view.id === saved.id ? saved : view)); void queryClient.invalidateQueries({ queryKey: ['database', databaseId, 'rows'] }) }, onError: (error) => push(error instanceof Error ? error.message : 'View update failed.', 'error') })
  const addProperty = useMutation({ mutationFn: ({ name, type, config }: { name: string; type: NewPropertyType; config?: Json }) => createProperty({ databaseId: databaseId ?? '', name, propertyType: type, config }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: databaseKeys.properties(databaseId ?? '') }); push('Property added.', 'success') }, onError: (error) => push(error instanceof Error ? error.message : 'Could not add property.', 'error') })

  if (!databaseId || database.data === null) return <Navigate to={`/app/${workspace.slug}`} replace />
  if (database.isLoading || properties.isLoading || views.isLoading || members.isLoading) return <div><div className="px-5 py-5"><div className="h-6 w-48 animate-pulse rounded bg-neutral-100" /></div><SkeletonTable /></div>
  if (!database.data || !user || !properties.data || !views.data || !members.data) return <div className="p-6 text-sm text-red-600">Collection could not be loaded.</div>
  if (!dashboardMode && !viewId && activeView) return <Navigate to={`/app/${workspace.slug}/database/${databaseId}/view/${activeView.id}`} replace />
  if (!dashboardMode && viewId && !views.data.some((view) => view.id === viewId)) return <Navigate to={`/app/${workspace.slug}/database/${databaseId}`} replace />

  async function createNewRow() {
    if (!activeView || !databaseId || !user) return
    const initialData: Record<string, Json | undefined> = {}
    for (const filter of parseViewFilters(activeView.filters)) if (filter.operator === 'equals' && filter.value !== undefined) initialData[filter.propertyId] = filter.value
    const created = await rowMutations.create.mutateAsync({ databaseId, workspaceId: workspace.id, userId: user.id, data: initialData })
    if (activeView.view_type === 'table') window.setTimeout(() => document.querySelector<HTMLInputElement>(`[data-row-id="${created.id}"] input`)?.focus(), 0)
    else setSelectedRowId(created.id)
  }

  async function addNewView(name: string, type: ViewType) {
    if (!databaseId || !user) return
    const created = await createView({ databaseId, workspaceId: workspace.id, userId: user.id, name, viewType: type })
    await queryClient.invalidateQueries({ queryKey: databaseKeys.views(databaseId) })
    navigate(`/app/${workspace.slug}/database/${databaseId}/view/${created.id}`)
  }

  const commonViewProps = { rows: visibleRows, properties: properties.data, canWrite, onOpenRow: (row: typeof rows[number]) => setSelectedRowId(row.id), onCreateRow: () => void createNewRow() }

  return <div className="flex h-[calc(100vh-44px)] min-h-0 flex-col md:h-screen">
    <div className="shrink-0 px-5 pb-3 pt-5"><div className="flex items-center gap-2 text-xs text-neutral-500"><DatabaseIcon size={14} /> Collection</div><h1 className="mt-1 text-xl font-semibold tracking-tight text-neutral-900">{database.data.name}</h1>{database.data.description ? <p className="mt-1 text-xs text-neutral-500">{database.data.description}</p> : null}</div>
    <DatabaseViewTabs workspaceSlug={workspace.slug} databaseId={databaseId} views={views.data} canWrite={canWrite} onAddView={() => setViewModal(true)} />
    {dashboardMode ? <div className="min-h-0 flex-1 overflow-y-auto"><DashboardView databaseId={databaseId} workspaceId={workspace.id} properties={properties.data} members={members.data} onOpenRow={(row) => { setDashboardRow(row); setSelectedRowId(row.id) }} onViewMain={() => navigate(`/app/${workspace.slug}/database/${databaseId}/view/${activeView?.id ?? views.data[0]?.id ?? ''}`)} /></div> : activeView ? <>
      <DatabaseToolbar search={search} onSearch={setSearch} view={activeView} properties={properties.data} canWrite={canWrite} onPatchView={(patch) => patchView.mutate(patch)} onAddProperty={() => setPropertyModal(true)} />
      <div className="min-h-0 flex-1 overflow-auto">
        {activeView.view_type === 'table' ? <DatabaseTable databaseId={databaseId} rows={rows} properties={properties.data} view={activeView} members={members.data} search={search} canWrite={canWrite} onCommit={(row, propertyId, value) => rowMutations.update.mutate({ row, propertyId, value })} onCreateRow={() => void createNewRow()} onCreateProperty={() => setPropertyModal(true)} onArchiveRow={(row) => rowMutations.archive.mutate(row)} onOpenRow={(row) => setSelectedRowId(row.id)} hasNextPage={rowsQuery.hasNextPage} isFetchingNextPage={rowsQuery.isFetchingNextPage} onLoadMore={() => void rowsQuery.fetchNextPage()} /> : null}
        {activeView.view_type === 'board' ? <DatabaseBoard {...commonViewProps} onCommit={(row, propertyId, value) => rowMutations.update.mutate({ row, propertyId, value })} /> : null}
        {activeView.view_type === 'calendar' ? <DatabaseCalendar rows={visibleRows} properties={properties.data} onOpenRow={(row) => setSelectedRowId(row.id)} /> : null}
        {activeView.view_type === 'gallery' ? <DatabaseGallery {...commonViewProps} /> : null}
      </div>
    </> : null}
    <RecordDetailPanel row={selectedRow} properties={properties.data} members={members.data} userId={user.id} canShare={Boolean(selectedRow && (selectedRow.created_by === user.id || role === 'OWNER' || role === 'ADMIN'))} onClose={() => setSelectedRowId(null)} />
    <AddPropertyModal open={propertyModal} onClose={() => setPropertyModal(false)} onCreate={async (name, type, config) => { await addProperty.mutateAsync({ name, type, config }) }} />
    <AddViewModal open={viewModal} onClose={() => setViewModal(false)} onCreate={addNewView} />
  </div>
}
