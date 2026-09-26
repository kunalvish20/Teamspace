import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Archive, Check, MoreHorizontal, Plus, Star } from 'lucide-react'
import { useAuth } from '../features/auth/AuthProvider'
import { useWorkspaceOutlet } from '../features/workspace/useWorkspaceOutlet'
import { pageKeys, usePageBlocks, usePageFavorites, useWorkspacePage, useWorkspacePages } from '../features/pages/queries'
import { createPageBlock, createWorkspacePage, deletePageBlock, setPageFavorite, setWorkspacePageArchived, updatePageBlock, updateWorkspacePage } from '../services/page.service'
import { canWriteRows } from '../utils/permissions'
import type { PageBlock } from '../types/database.types'
import { PageBlockEditor } from '../components/pages/PageBlockEditor'
import { Spinner } from '../components/ui/Spinner'
import { useToast } from '../components/ui/Toast'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export function PagePage() {
  const { pageId } = useParams()
  const { workspace, role } = useWorkspaceOutlet()
  const { user } = useAuth()
  const pageQuery = useWorkspacePage(pageId)
  const blocksQuery = usePageBlocks(pageId)
  const pagesQuery = useWorkspacePages(workspace.id)
  const favoritesQuery = usePageFavorites(workspace.id, user?.id)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { push } = useToast()
  const canWrite = canWriteRows(role)
  const [title, setTitle] = useState('')
  const [icon, setIcon] = useState('')
  const [menu, setMenu] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [iconOpen, setIconOpen] = useState(false)
  const [iconDraft, setIconDraft] = useState('')
  const titleTimer = useRef<number | null>(null)
  const page = pageQuery.data
  const blocks = useMemo(() => blocksQuery.data ?? [], [blocksQuery.data])
  const favorite = Boolean(favoritesQuery.data?.some((item) => item.page_id === pageId))

  useEffect(() => { if (page) { setTitle(page.title); setIcon(page.icon ?? ''); setIconDraft(page.icon ?? '') } }, [page])
  useEffect(() => () => { if (titleTimer.current) window.clearTimeout(titleTimer.current) }, [])

  function patchPage(patch: Parameters<typeof updateWorkspacePage>[1]) {
    if (!pageId || !canWrite) return
    void updateWorkspacePage(pageId, patch).then((saved) => {
      queryClient.setQueryData(pageKeys.page(pageId), saved)
      void queryClient.invalidateQueries({ queryKey: pageKeys.pages(workspace.id) })
    }).catch((error) => push(error instanceof Error ? error.message : 'Page update failed.', 'error'))
  }

  function changeTitle(next: string) {
    setTitle(next)
    if (!canWrite) return
    if (titleTimer.current) window.clearTimeout(titleTimer.current)
    titleTimer.current = window.setTimeout(() => patchPage({ title: next }), 350)
  }

  async function changeVisibility() {
    if (!pageId || !page || !user || page.created_by !== user.id) return
    try {
      const visibility = page.visibility === 'private' ? 'workspace' : 'private'
      const saved = await updateWorkspacePage(pageId, { visibility })
      queryClient.setQueryData(pageKeys.page(pageId), saved)
      await queryClient.invalidateQueries({ queryKey: pageKeys.pages(workspace.id) })
      push(visibility === 'workspace' ? 'Page shared with the workspace.' : 'Page is private.', 'success')
    } catch { push('Could not change page visibility.', 'error') }
  }

  const changeBlock = useMutation({ mutationFn: ({ block, patch }: { block: PageBlock; patch: Parameters<typeof updatePageBlock>[1] }) => updatePageBlock(block.id, patch), onSuccess: (saved) => queryClient.setQueryData<PageBlock[]>(pageKeys.blocks(pageId ?? ''), (current) => current?.map((item) => item.id === saved.id ? saved : item) ?? [saved]) })
  const addBlock = useMutation({ mutationFn: async (after?: PageBlock) => {
    if (!pageId || !user) throw new Error('Page is not ready')
    const list = queryClient.getQueryData<PageBlock[]>(pageKeys.blocks(pageId)) ?? blocks
    const index = after ? list.findIndex((item) => item.id === after.id) : list.length - 1
    const previous = list[index]?.position ?? 0
    const next = list[index + 1]?.position ?? previous + 2000
    return createPageBlock({ workspaceId: workspace.id, pageId, userId: user.id, blockType: 'paragraph', content: { text: '' }, position: previous + (next - previous) / 2 })
  }, onSuccess: (created) => { queryClient.setQueryData<PageBlock[]>(pageKeys.blocks(pageId ?? ''), (current) => [...(current ?? []), created].sort((a, b) => a.position - b.position)) } })
  const removeBlock = useMutation({ mutationFn: deletePageBlock, onSuccess: (_, id) => queryClient.setQueryData<PageBlock[]>(pageKeys.blocks(pageId ?? ''), (current) => current?.filter((item) => item.id !== id) ?? []) })

  async function moveBlock(block: PageBlock, direction: -1 | 1) {
    const list = [...blocks].sort((a, b) => a.position - b.position)
    const index = list.findIndex((item) => item.id === block.id)
    const otherIndex = index + direction
    if (otherIndex < 0 || otherIndex >= list.length) return
    const other = list[otherIndex]
    if (!other) return
    await Promise.all([updatePageBlock(block.id, { position: other.position }), updatePageBlock(other.id, { position: block.position })])
    await queryClient.invalidateQueries({ queryKey: pageKeys.blocks(pageId ?? '') })
  }

  if (!pageId) return <Navigate to={`/app/${workspace.slug}`} replace />
  if (pageQuery.isLoading || blocksQuery.isLoading) return <div className="grid h-full place-items-center"><Spinner className="h-5 w-5 text-neutral-400" /></div>
  if (!page || page.workspace_id !== workspace.id || page.archived_at) return <Navigate to={`/app/${workspace.slug}`} replace />

  return <div className="h-[calc(100vh-44px)] overflow-y-auto md:h-screen">
    {page.cover_url ? <div className="h-48 w-full bg-cover bg-center md:h-64" style={{ backgroundImage: `url(${page.cover_url})` }} /> : null}
    <article className="mx-auto w-full max-w-4xl px-7 pb-40 pt-12 md:px-16">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button disabled={!canWrite} onClick={() => setIconOpen(true)} aria-label="Change page icon" className="text-4xl leading-none disabled:cursor-default">{icon || '📄'}</button>
          {!canWrite ? <span className="rounded bg-neutral-100 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-neutral-500">View only</span> : null}
        </div>
        <div className="relative flex items-center gap-1">
          <button onClick={() => user && setPageFavorite({ workspaceId: workspace.id, pageId, userId: user.id, favorite: !favorite }).then(() => queryClient.invalidateQueries({ queryKey: pageKeys.favorites(workspace.id, user.id) }))} className={`rounded p-2 hover:bg-neutral-100 ${favorite ? 'text-amber-500' : 'text-neutral-400'}`} title={favorite ? 'Remove from favorites' : 'Add to favorites'}><Star size={17} fill={favorite ? 'currentColor' : 'none'} /></button>
          {canWrite ? <button onClick={() => setMenu((value) => !value)} className="rounded p-2 text-neutral-400 hover:bg-neutral-100"><MoreHorizontal size={17} /></button> : null}
          {menu ? <div className="absolute right-0 top-10 z-30 w-52 rounded-lg border border-neutral-200 bg-white p-1 shadow-panel">{page.created_by === user?.id ? <button onClick={() => { setMenu(false); void changeVisibility() }} className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs text-neutral-700 hover:bg-neutral-50">{page.visibility === 'private' ? 'Share with workspace' : 'Make private'}</button> : null}<button onClick={() => { setMenu(false); setArchiveOpen(true) }} className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-xs text-red-600 hover:bg-red-50"><Archive size={14} /> Move to Trash</button></div> : null}
        </div>
      </div>
      <textarea value={title} readOnly={!canWrite} rows={1} onChange={(event) => changeTitle(event.target.value)} placeholder="Untitled" className="mb-7 w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-[40px] font-bold leading-tight tracking-tight outline-none placeholder:text-neutral-300" />
      <div className="space-y-1">
        {blocks.map((block, index) => <PageBlockEditor key={block.id} block={block} index={index} total={blocks.length} readOnly={!canWrite} onChange={(target, patch) => changeBlock.mutate({ block: target, patch })} onCreateAfter={(target) => addBlock.mutate(target)} onDelete={(target) => removeBlock.mutate(target.id)} onMove={(target, direction) => void moveBlock(target, direction)} />)}
        {canWrite && !blocks.length ? <button onClick={() => addBlock.mutate(undefined)} className="flex items-center gap-2 py-2 text-sm text-neutral-400 hover:text-neutral-700"><Plus size={15} /> Start writing</button> : null}
      </div>
      <div className="mt-12 flex items-center gap-2 text-[11px] text-neutral-300"><Check size={12} /> Changes autosave</div>
      {pagesQuery.data?.some((item) => item.parent_page_id === pageId) ? <div className="mt-10 border-t border-neutral-100 pt-6"><h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-400">Sub-pages</h2><div className="space-y-1">{pagesQuery.data.filter((item) => item.parent_page_id === pageId).map((child) => <button key={child.id} onClick={() => navigate(`/app/${workspace.slug}/page/${child.id}`)} className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm hover:bg-neutral-50"><span>{child.icon || '📄'}</span><span>{child.title || 'Untitled'}</span></button>)}</div></div> : null}
      {canWrite ? <button onClick={async () => { if (!user) return; const child = await createWorkspacePage({ workspaceId: workspace.id, userId: user.id, parentPageId: pageId, title: 'Untitled', visibility: page.visibility }); await queryClient.invalidateQueries({ queryKey: pageKeys.pages(workspace.id) }); navigate(`/app/${workspace.slug}/page/${child.id}`) }} className="mt-5 flex items-center gap-2 text-xs text-neutral-400 hover:text-neutral-700"><Plus size={13} /> Add sub-page</button> : null}
    </article>
    <Modal open={iconOpen} onClose={() => setIconOpen(false)} title="Page icon"><form onSubmit={(event) => { event.preventDefault(); setIcon(iconDraft); patchPage({ icon: iconDraft || null }); setIconOpen(false) }}><label className="block text-sm font-medium">Icon or emoji<Input autoFocus className="mt-1" maxLength={16} value={iconDraft} onChange={(event) => setIconDraft(event.target.value)} placeholder="📄" /></label><div className="mt-6 flex justify-end gap-2"><Button type="button" onClick={() => setIconOpen(false)}>Cancel</Button><Button type="submit" variant="primary">Save icon</Button></div></form></Modal>
    <Modal open={archiveOpen} onClose={() => setArchiveOpen(false)} title="Move page to Trash"><p className="text-sm text-neutral-600">Move this page and its sub-pages to Trash? You can restore them later.</p><div className="mt-6 flex justify-end gap-2"><Button onClick={() => setArchiveOpen(false)}>Cancel</Button><Button variant="danger" onClick={() => { void setWorkspacePageArchived(pageId, true).then(async () => { await queryClient.invalidateQueries({ queryKey: pageKeys.pages(workspace.id) }); navigate(`/app/${workspace.slug}`) }).catch(() => push('Could not move page to Trash.', 'error')) }}>Move to Trash</Button></div></Modal>
  </div>
}
