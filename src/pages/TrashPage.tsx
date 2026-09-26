import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RotateCcw, Search, Trash2 } from 'lucide-react'
import { useWorkspaceOutlet } from '../features/workspace/useWorkspaceOutlet'
import { pageKeys, useWorkspacePages } from '../features/pages/queries'
import { workspaceKeys } from '../features/workspace/queries'
import { permanentlyDeletePage, setWorkspacePageArchived } from '../services/page.service'
import { listArchivedCollections, permanentlyDeleteCollection, setCollectionArchived } from '../services/database.service'
import { canWriteRows } from '../utils/permissions'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { formatDate } from '../utils/format'
import { useToast } from '../components/ui/Toast'

export function TrashPage() {
  const { workspace, role } = useWorkspaceOutlet()
  const pages = useWorkspacePages(workspace.id, true)
  const collections = useQuery({ queryKey: ['workspace', workspace.id, 'trashed-collections'], queryFn: () => listArchivedCollections(workspace.id) })
  const queryClient = useQueryClient()
  const { push } = useToast()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'pages' | 'collections'>('all')
  const [confirm, setConfirm] = useState<{ kind: 'page' | 'collection' | 'empty'; id?: string; title?: string } | null>(null)
  const [emptyText, setEmptyText] = useState('')
  const canManageCollections = role === 'OWNER' || role === 'ADMIN'
  const canDeletePermanently = canManageCollections
  const trashedPages = useMemo(() => (pages.data ?? []).filter((page) => page.archived_at), [pages.data])
  const visiblePages = trashedPages.filter((page) => filter !== 'collections' && (page.title || 'Untitled').toLowerCase().includes(search.toLowerCase()))
  const visibleCollections = (collections.data ?? []).filter((item) => filter !== 'pages' && item.name.toLowerCase().includes(search.toLowerCase()))
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: pageKeys.pages(workspace.id, true) }), queryClient.invalidateQueries({ queryKey: pageKeys.pages(workspace.id) }), queryClient.invalidateQueries({ queryKey: workspaceKeys.databases(workspace.id) }), queryClient.invalidateQueries({ queryKey: ['workspace', workspace.id, 'trashed-collections'] })])
  const restorePage = useMutation({ mutationFn: (id: string) => setWorkspacePageArchived(id, false), onSuccess: async () => { await refresh(); push('Page restored.', 'success') }, onError: () => push('Could not restore page.', 'error') })
  const restoreCollection = useMutation({ mutationFn: (id: string) => setCollectionArchived(workspace.id, id, false), onSuccess: async () => { await refresh(); push('Collection restored.', 'success') }, onError: () => push('Could not restore collection.', 'error') })
  const remove = useMutation({ mutationFn: async () => {
    if (!confirm) return
    if (confirm.kind === 'page' && confirm.id) await permanentlyDeletePage(confirm.id)
    if (confirm.kind === 'collection' && confirm.id) await permanentlyDeleteCollection(workspace.id, confirm.id)
    if (confirm.kind === 'empty') {
      const results = await Promise.allSettled([...trashedPages.map((page) => permanentlyDeletePage(page.id)), ...(collections.data ?? []).map((item) => permanentlyDeleteCollection(workspace.id, item.id))])
      if (results.some((result) => result.status === 'rejected')) throw new Error('Some items could not be deleted.')
    }
  }, onSuccess: async () => { await refresh(); setConfirm(null); setEmptyText(''); push('Deleted permanently.', 'success') }, onError: async () => { await refresh(); push('Some items could not be deleted. Try again.', 'error') } })
  if (!canWriteRows(role)) return <div className="p-8 text-sm text-neutral-500">You have read-only workspace access.</div>
  return <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 md:py-10"><header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight">Trash</h1><p className="mt-1 text-sm text-neutral-500">Restore items or delete them permanently.</p></div>{canDeletePermanently && (trashedPages.length || collections.data?.length) ? <Button variant="danger" onClick={() => setConfirm({ kind: 'empty' })}>Empty trash</Button> : null}</header><div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200"><div className="flex gap-4">{(['all', 'pages', 'collections'] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={`border-b-2 pb-3 text-sm capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 ${filter === item ? 'border-neutral-900 font-medium' : 'border-transparent text-neutral-500'}`}>{item}</button>)}</div><div className="relative mb-2 w-full sm:w-52"><Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" /><Input aria-label="Search trash" className="h-8 pl-8" placeholder="Search trash" value={search} onChange={(event) => setSearch(event.target.value)} /></div></div>
    {pages.isPending || collections.isPending ? <div className="mt-5 h-24 animate-pulse rounded-xl bg-neutral-100" role="status" aria-label="Loading trash" /> : pages.isError || collections.isError ? <div className="mt-5 rounded-xl border border-neutral-200 p-5 text-sm">Could not load Trash. <Button size="sm" onClick={() => { void pages.refetch(); void collections.refetch() }}>Try again</Button></div> : visiblePages.length || visibleCollections.length ? <div className="mt-5 divide-y divide-neutral-100 rounded-xl border border-neutral-200">{visiblePages.map((page) => <div key={page.id} className="flex flex-wrap items-center gap-3 px-4 py-3"><span className="text-lg" aria-hidden="true">{page.icon || '📄'}</span><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{page.title || 'Untitled'}</div><div className="text-xs text-neutral-500">Page · Deleted {page.archived_at ? formatDate(page.archived_at) : ''}</div></div><Button size="sm" disabled={restorePage.isPending} onClick={() => restorePage.mutate(page.id)}><RotateCcw size={14} /> Restore</Button>{canDeletePermanently ? <Button size="sm" variant="danger" aria-label={`Delete ${page.title || 'Untitled'} permanently`} onClick={() => setConfirm({ kind: 'page', id: page.id, title: page.title || 'Untitled' })}><Trash2 size={14} /></Button> : null}</div>)}{visibleCollections.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3"><span className="text-lg" aria-hidden="true">◫</span><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{item.name}</div><div className="text-xs text-neutral-500">Collection · Deleted {item.archived_at ? formatDate(item.archived_at) : ''}</div></div>{canManageCollections ? <Button size="sm" disabled={restoreCollection.isPending} onClick={() => restoreCollection.mutate(item.id)}><RotateCcw size={14} /> Restore</Button> : null}{canDeletePermanently ? <Button size="sm" variant="danger" aria-label={`Delete ${item.name} permanently`} onClick={() => setConfirm({ kind: 'collection', id: item.id, title: item.name })}><Trash2 size={14} /></Button> : null}</div>)}</div> : <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 px-5 py-10 text-center text-sm text-neutral-500">{search ? 'No matching items.' : 'Trash is empty.'}</div>}
    <Modal open={Boolean(confirm)} onClose={() => { setConfirm(null); setEmptyText('') }} title={confirm?.kind === 'empty' ? 'Empty trash' : 'Delete permanently'}><p className="text-sm text-neutral-600">{confirm?.kind === 'empty' ? 'This will permanently delete every page and collection in Trash. Type EMPTY to confirm.' : `Permanently delete ${confirm?.title}? This cannot be undone.`}</p>{confirm?.kind === 'empty' ? <Input autoFocus className="mt-4" value={emptyText} onChange={(event) => setEmptyText(event.target.value)} placeholder="EMPTY" aria-label="Type EMPTY to confirm" /> : null}<div className="mt-6 flex justify-end gap-2"><Button onClick={() => setConfirm(null)}>Cancel</Button><Button variant="danger" disabled={remove.isPending || (confirm?.kind === 'empty' && emptyText !== 'EMPTY')} onClick={() => remove.mutate()}>{remove.isPending ? 'Deleting…' : confirm?.kind === 'empty' ? 'Empty trash' : 'Delete permanently'}</Button></div></Modal>
  </div>
}
