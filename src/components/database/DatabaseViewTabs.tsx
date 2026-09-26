import { CalendarDays, Columns3, GalleryHorizontalEnd, LayoutDashboard, Plus, Table2 } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import type { DatabaseView } from '../../types/database.types'

const icons = { table: Table2, board: Columns3, calendar: CalendarDays, gallery: GalleryHorizontalEnd }

export function DatabaseViewTabs({ workspaceSlug, databaseId, views, canWrite, onAddView }: { workspaceSlug: string; databaseId: string; views: DatabaseView[]; canWrite?: boolean; onAddView?: () => void }) {
  const location = useLocation()
  const dashboardActive = new URLSearchParams(location.search).get('mode') === 'dashboard'
  const viewLink = (view: DatabaseView) => { const Icon = icons[view.view_type]; return <NavLink key={view.id} to={`/app/${workspaceSlug}/database/${databaseId}/view/${view.id}`} className={({ isActive }) => `flex h-10 shrink-0 items-center gap-1.5 border-b-2 px-2 text-xs font-medium ${isActive && !dashboardActive ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}><Icon size={13} />{view.name}</NavLink> }
  return <div className="flex min-w-0 items-center gap-1 overflow-x-auto border-b border-neutral-200 px-5 scrollbar-none">{views.map(viewLink)}<NavLink to={`/app/${workspaceSlug}/database/${databaseId}?mode=dashboard`} className={`flex h-10 shrink-0 items-center gap-1.5 border-b-2 px-2 text-xs font-medium ${dashboardActive ? 'border-neutral-900 text-neutral-900' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}><LayoutDashboard size={13} /> Dashboard</NavLink>{canWrite && onAddView ? <button onClick={onAddView} className="flex h-8 shrink-0 items-center gap-1 rounded px-2 text-xs text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"><Plus size={13} /> View</button> : null}</div>
}
