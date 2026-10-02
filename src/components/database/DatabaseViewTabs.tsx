import { type FormEvent, useState } from 'react'
import { CalendarDays, Columns3, Ellipsis, GalleryHorizontalEnd, LayoutDashboard, Plus, Table2 } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import type { DatabaseView, ViewType } from '../../types/database.types'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'

const icons = { table: Table2, board: Columns3, calendar: CalendarDays, gallery: GalleryHorizontalEnd }

export function DatabaseViewTabs({
  workspaceSlug,
  databaseId,
  views,
  canWrite,
  onAddView,
  onUpdateView,
}: {
  workspaceSlug: string
  databaseId: string
  views: DatabaseView[]
  canWrite?: boolean
  onAddView?: () => void
  onUpdateView?: (viewId: string, patch: Partial<Pick<DatabaseView, 'name' | 'view_type'>>) => Promise<void> | void
}) {
  const location = useLocation()
  const [editingView, setEditingView] = useState<DatabaseView | null>(null)
  const [editName, setEditName] = useState('')
  const [editType, setEditType] = useState<ViewType>('table')
  const [pending, setPending] = useState(false)
  const dashboardActive = new URLSearchParams(location.search).get('mode') === 'dashboard'

  function openEdit(view: DatabaseView) {
    setEditingView(view)
    setEditName(view.name)
    setEditType(view.view_type)
  }

  async function saveView(event: FormEvent) {
    event.preventDefault()
    if (!editingView || !onUpdateView || !editName.trim()) return
    const patch: Partial<Pick<DatabaseView, 'name' | 'view_type'>> = {}
    if (editName.trim() !== editingView.name) patch.name = editName.trim()
    if (editType !== editingView.view_type) patch.view_type = editType
    if (!Object.keys(patch).length) {
      setEditingView(null)
      return
    }
    setPending(true)
    try {
      await onUpdateView(editingView.id, patch)
      setEditingView(null)
    } finally {
      setPending(false)
    }
  }

  const viewLink = (view: DatabaseView) => {
    const Icon = icons[view.view_type]
    const active = !dashboardActive && location.pathname.endsWith(`/view/${view.id}`)
    return (
      <div key={view.id} className={`group flex h-10 shrink-0 items-center border-b-2 text-xs font-medium ${active ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}>
        <NavLink to={`/app/${workspaceSlug}/database/${databaseId}/view/${view.id}`} className="flex h-full min-w-0 items-center gap-1.5 px-2">
          <Icon size={13} className="shrink-0" />
          <span className="max-w-36 truncate">{view.name}</span>
        </NavLink>
        {canWrite && onUpdateView ? (
          <button
            type="button"
            onClick={() => openEdit(view)}
            title="Edit view"
            aria-label={`Edit ${view.name} view`}
            className={`mr-1 grid h-6 w-6 place-items-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'}`}
          >
            <Ellipsis size={14} />
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <>
      <div className="flex min-w-0 items-center gap-1 overflow-x-auto border-b border-neutral-200 px-5 scrollbar-none">
        {views.map(viewLink)}
        <NavLink to={`/app/${workspaceSlug}/database/${databaseId}?mode=dashboard`} className={`flex h-10 shrink-0 items-center gap-1.5 border-b-2 px-2 text-xs font-medium ${dashboardActive ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}><LayoutDashboard size={13} /> Dashboard</NavLink>
        {canWrite && onAddView ? <button onClick={onAddView} className="flex h-8 shrink-0 items-center gap-1 rounded px-2 text-xs text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"><Plus size={13} /> View</button> : null}
      </div>
      <Modal open={Boolean(editingView)} onClose={() => setEditingView(null)} title="Edit view">
        <form className="space-y-4" onSubmit={saveView}>
          <label className="block text-xs font-medium text-neutral-600">
            View name
            <Input autoFocus className="mt-1" value={editName} onChange={(event) => setEditName(event.target.value)} placeholder="View name" />
          </label>
          <label className="block text-xs font-medium text-neutral-600">
            Layout
            <select className="mt-1 h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm" value={editType} onChange={(event) => setEditType(event.target.value as ViewType)}>
              <option value="table">Table</option>
              <option value="board">Board</option>
              <option value="calendar">Calendar</option>
              <option value="gallery">Gallery</option>
            </select>
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={() => setEditingView(null)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={pending || !editName.trim()}>{pending ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
