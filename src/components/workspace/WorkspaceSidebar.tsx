import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Database, FileText, Home, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Plus, Search, Settings, Star, Trash2, Users, X } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import type { ViewType, Workspace, WorkspaceDatabase, WorkspacePage, WorkspaceRole } from '../../types/database.types'
import { devBypassEnabled } from '../../lib/dev-bypass'
import { usePageFavorites, useWorkspacePages } from '../../features/pages/queries'
import { createDatabase, renameCollection, setCollectionArchived } from '../../services/database.service'
import { createWorkspace } from '../../services/workspace.service'
import { workspaceKeys, useWorkspacePermissions } from '../../features/workspace/queries'
import { canUseWorkspaceAction } from '../../utils/permissions'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'
import { useTeams } from '../../features/teams/queries'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'
import { AccountMenu } from './AccountMenu'
import { AddNewModal } from '../creation/AddNewModal'

export function WorkspaceSidebar({ workspace, workspaces, databases, user, role, collapsed, onToggle, onLogout, onWorkspaceChange, forceVisible = false, onNavigate, onSearch }: { workspace: Workspace; workspaces: Workspace[]; databases: WorkspaceDatabase[]; user: User; role: WorkspaceRole; collapsed: boolean; onToggle: () => void; onLogout: () => void; onWorkspaceChange: (slug: string) => void; forceVisible?: boolean; onNavigate?: () => void; onSearch?: () => void }) {
  const pages = useWorkspacePages(workspace.id)
  const teams = useTeams(workspace.id)
  const permissions = useWorkspacePermissions(workspace.id)
  const favorites = usePageFavorites(workspace.id, user.id)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { push } = useToast()
  const [addNewOpen, setAddNewOpen] = useState(false)
  const [addNewDestination, setAddNewDestination] = useState<'private' | 'workspace' | 'team'>('private')
  const [addNewFocus, setAddNewFocus] = useState<'page' | 'collection' | undefined>()
  const [databaseOpen, setDatabaseOpen] = useState(false)
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [databaseName, setDatabaseName] = useState('')
  const [databaseType, setDatabaseType] = useState<ViewType>('table')
  const [workspaceName, setWorkspaceName] = useState('')
  const [pending, setPending] = useState(false)
  const [collectionMenu, setCollectionMenu] = useState<string | null>(null)
  const [collectionDialog, setCollectionDialog] = useState<{ kind: 'rename' | 'archive'; database: WorkspaceDatabase } | null>(null)
  const [collectionName, setCollectionName] = useState('')
  const allPages = useMemo(() => pages.data ?? [], [pages.data])
  const privatePages = useMemo(() => allPages.filter((page) => page.visibility === 'private' && page.created_by === user.id && !page.team_id), [allPages, user.id])
  const sharedPages = useMemo(() => allPages.filter((page) => page.visibility === 'workspace' && !page.team_id), [allPages])
  const favoriteIds = useMemo(() => new Set((favorites.data ?? []).map((item) => item.page_id)), [favorites.data])
  const favoritePages = useMemo(() => allPages.filter((page) => favoriteIds.has(page.id)), [allPages, favoriteIds])
  const canWrite = canUseWorkspaceAction(role, permissions.data, 'create_page')
  const canCreateDatabase = canUseWorkspaceAction(role, permissions.data, 'create_collection')
  const canCreateTeam = canUseWorkspaceAction(role, permissions.data, 'create_team')

  function openAddNew(destination: 'private' | 'workspace' | 'team' = 'private', focus?: 'page' | 'collection') {
    setAddNewDestination(destination)
    setAddNewFocus(focus)
    setAddNewOpen(true)
  }

  return (
    <>
      <aside
        className={`${
          collapsed ? 'w-14' : 'w-60'
        } ${
          forceVisible ? 'flex w-full h-full' : 'hidden md:flex h-screen'
        } shrink-0 flex-col border-r border-neutral-200/80 bg-[#f7f7f5] text-neutral-700 transition-[width] duration-200 ease-in-out select-none`}
      >
        {/* Workspace Switcher Header */}
        <div className="flex h-12 shrink-0 items-center justify-between gap-2 px-2.5 border-b border-neutral-200/50">
          <WorkspaceSwitcher workspace={workspace} workspaces={workspaces} collapsed={collapsed && !forceVisible} onSwitch={onWorkspaceChange} onCreate={() => setWorkspaceOpen(true)} onSettings={() => { onNavigate?.(); navigate(`/app/${workspace.slug}/settings`) }} />

          <button
            onClick={onToggle}
            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-200/70 hover:text-neutral-700 transition-colors shrink-0"
            title={forceVisible ? 'Close menu' : collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={forceVisible ? 'Close menu' : collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {forceVisible ? <X size={16} /> : collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>
        </div>

        {/* Scrollable Navigation Body */}
        <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-2 text-sm scrollbar-none space-y-0.5">
          <NavItem to={`/app/${workspace.slug}`} label="Home" collapsed={collapsed} icon={<Home size={15} />} onNavigate={onNavigate} />

          <button onClick={() => { onNavigate?.(); onSearch?.() }} className={`flex h-8 w-full items-center gap-2.5 rounded-md px-2 text-xs text-neutral-500 transition-colors hover:bg-neutral-200/60 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 ${collapsed ? 'justify-center' : ''}`} title="Search workspace" aria-label="Search workspace"><Search size={15} />{!collapsed ? <span className="flex-1 text-left">Search</span> : null}{!collapsed ? <kbd className="text-[10px] text-neutral-400">⌘K</kbd> : null}</button>

          {!collapsed && favoritePages.length ? (
            <SidebarSection label="Favorites">
              {favoritePages.map((page) => (
                <PageNav key={`favorite-${page.id}`} page={page} workspace={workspace} collapsed={collapsed} favorite onNavigate={onNavigate} />
              ))}
            </SidebarSection>
          ) : null}

          <SidebarSection
            label={collapsed ? '' : 'Private'}
            action={
              canWrite && !collapsed ? (
                <button
                  onClick={() => openAddNew('private', 'page')}
                  title="New page"
                  aria-label="New private page"
                  className="rounded p-0.5 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 transition-colors"
                >
                  <Plus size={13} />
                </button>
              ) : null
            }
          >
            <PageTree pages={privatePages} workspace={workspace} collapsed={collapsed} onNavigate={onNavigate} />
            {canWrite && !privatePages.length && !collapsed ? (
              <button
                onClick={() => openAddNew('private', 'page')}
                className="flex h-7 w-full items-center gap-2 rounded-md px-2 text-xs text-neutral-500 transition-colors hover:bg-neutral-200/60 hover:text-neutral-800"
              >
                <Plus size={13} /> Add a page
              </button>
            ) : null}
          </SidebarSection>

          {sharedPages.length ? <SidebarSection label={collapsed ? '' : 'Shared'}><PageTree pages={sharedPages} workspace={workspace} collapsed={collapsed} onNavigate={onNavigate} /></SidebarSection> : null}

          <SidebarSection
            label={collapsed ? '' : 'Collections'}
            action={
              canCreateDatabase && !collapsed ? (
                <button
                  onClick={() => openAddNew('workspace', 'collection')}
                  title="New collection"
                  aria-label="New collection"
                  className="rounded p-0.5 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700 transition-colors"
                >
                  <Plus size={13} />
                </button>
              ) : null
            }
          >
            {databases.map((database) => <div key={database.id} className="group/collection relative">
              <NavItem to={`/app/${workspace.slug}/database/${database.id}`} label={database.name} collapsed={collapsed} icon={<Database size={15} />} onNavigate={onNavigate} />
              {(role === 'OWNER' || role === 'ADMIN') && !collapsed ? <button aria-label={`Actions for ${database.name}`} aria-expanded={collectionMenu === database.id} onClick={() => setCollectionMenu(collectionMenu === database.id ? null : database.id)} className="absolute right-1 top-0.5 rounded p-1 text-neutral-400 opacity-0 hover:bg-neutral-200 focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 group-hover/collection:opacity-100"><MoreHorizontal size={14} /></button> : null}
              {collectionMenu === database.id ? <div className="absolute right-1 top-7 z-30 w-36 rounded-lg border border-neutral-200 bg-white p-1 shadow-panel"><button onClick={() => { setCollectionMenu(null); setCollectionName(database.name); setCollectionDialog({ kind: 'rename', database }) }} className="block w-full rounded px-2 py-2 text-left text-xs hover:bg-neutral-50">Rename</button><button onClick={() => { setCollectionMenu(null); setCollectionDialog({ kind: 'archive', database }) }} className="block w-full rounded px-2 py-2 text-left text-xs text-red-600 hover:bg-red-50">Move to Trash</button></div> : null}
            </div>)}
          </SidebarSection>

          <SidebarSection label={collapsed ? '' : 'Teams'} action={canCreateTeam && !collapsed ? <button onClick={() => { onNavigate?.(); navigate(`/app/${workspace.slug}/teams?create=1`) }} title="Create team" aria-label="Create team" className="rounded p-0.5 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700"><Plus size={13} /></button> : null}>
            {!collapsed ? <NavItem to={`/app/${workspace.slug}/teams`} label="All teams" collapsed={collapsed} icon={<Users size={15} />} onNavigate={onNavigate} /> : null}
            {teams.data?.map((team) => <NavItem key={team.id} to={`/app/${workspace.slug}/teams/${team.id}`} label={team.name} collapsed={collapsed} icon={<span className="grid w-[15px] place-items-center text-xs">{team.icon || '◌'}</span>} onNavigate={onNavigate} />)}
          </SidebarSection>

          <div className="pt-2">
            <div className="my-1 border-t border-neutral-200/60" />
            <NavItem to={`/app/${workspace.slug}/settings`} label="Settings" collapsed={collapsed} icon={<Settings size={15} />} onNavigate={onNavigate} />
            <NavItem to={`/app/${workspace.slug}/settings/members`} label="Members" collapsed={collapsed} icon={<Users size={15} />} onNavigate={onNavigate} />
            {role !== 'VIEWER' ? <NavItem to={`/app/${workspace.slug}/trash`} label="Trash" collapsed={collapsed} icon={<Trash2 size={15} />} onNavigate={onNavigate} /> : null}
            {!collapsed ? (
              <button
                onClick={() => setWorkspaceOpen(true)}
                className="flex h-7 w-full items-center gap-2 rounded-md px-2 text-xs text-neutral-500 transition-colors hover:bg-neutral-200/60 hover:text-neutral-800"
              >
                <Plus size={13} className="text-neutral-400" />
                <span>New workspace</span>
              </button>
            ) : null}
          </div>
        </nav>

        {/* Account Section - Firmly pinned at the bottom */}
        <div className="mt-auto shrink-0 border-t border-neutral-200/80 bg-[#f7f7f5] p-2">
          {devBypassEnabled && !collapsed ? (
            <div className="mb-2 flex items-center justify-between rounded-md border border-amber-200/90 bg-amber-50/90 px-2 py-1 text-[10px] font-semibold text-amber-800 shadow-2xs">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                DEV BYPASS
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 bg-amber-100/80 px-1 py-0.5 rounded">
                OWNER
              </span>
            </div>
          ) : null}

          <AccountMenu user={user} collapsed={collapsed && !forceVisible} onLogout={onLogout} onNavigate={onNavigate} />
        </div>
      </aside>

      <Modal open={databaseOpen} onClose={() => setDatabaseOpen(false)} title="Create collection">
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault()
            if (!databaseName.trim()) return
            setPending(true)
            try {
              const created = await createDatabase({
                workspaceId: workspace.id,
                name: databaseName.trim(),
                viewType: databaseType
              })
              await queryClient.invalidateQueries({ queryKey: workspaceKeys.databases(workspace.id) })
              setDatabaseOpen(false)
              setDatabaseName('')
              onNavigate?.()
              navigate(`/app/${workspace.slug}/database/${created.database_id}/view/${created.view_id}`)
            } catch (error) {
              push(error instanceof Error ? error.message : 'Could not create collection.', 'error')
            } finally {
              setPending(false)
            }
          }}
        >
          <label className="block text-xs font-medium text-neutral-600">
            Name
            <Input
              autoFocus
              className="mt-1"
              value={databaseName}
              onChange={(event) => setDatabaseName(event.target.value)}
              placeholder="Project tracker"
            />
          </label>
          <label className="block text-xs font-medium text-neutral-600">
            Initial view
            <select
              value={databaseType}
              onChange={(event) => setDatabaseType(event.target.value as ViewType)}
              className="mt-1 h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm"
            >
              <option value="table">Table</option>
              <option value="board">Board</option>
              <option value="calendar">Calendar</option>
              <option value="gallery">Gallery</option>
            </select>
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={() => setDatabaseOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!databaseName.trim() || pending}>
              {pending ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={workspaceOpen} onClose={() => setWorkspaceOpen(false)} title="Create workspace">
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault()
            if (!workspaceName.trim()) return
            setPending(true)
            try {
              const created = await createWorkspace(workspaceName.trim())
              await queryClient.invalidateQueries({ queryKey: workspaceKeys.all })
              setWorkspaceOpen(false)
              setWorkspaceName('')
              onNavigate?.()
              navigate(`/app/${created.workspace_slug}`)
            } catch (error) {
              push(error instanceof Error ? error.message : 'Could not create workspace.', 'error')
            } finally {
              setPending(false)
            }
          }}
        >
          <label className="block text-xs font-medium text-neutral-600">
            Workspace name
            <Input
              autoFocus
              className="mt-1"
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              placeholder="Team workspace"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={() => setWorkspaceOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!workspaceName.trim() || pending}>
              {pending ? 'Creating…' : 'Create workspace'}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal open={Boolean(collectionDialog)} onClose={() => setCollectionDialog(null)} title={collectionDialog?.kind === 'rename' ? 'Rename collection' : 'Move collection to Trash'}>
        {collectionDialog?.kind === 'rename' ? <form onSubmit={async (event) => { event.preventDefault(); if (!collectionName.trim()) return; setPending(true); try { await renameCollection(workspace.id, collectionDialog.database.id, collectionName); await queryClient.invalidateQueries({ queryKey: workspaceKeys.databases(workspace.id) }); setCollectionDialog(null); push('Collection renamed.', 'success') } catch { push('Could not rename collection.', 'error') } finally { setPending(false) } }}><label className="block text-sm font-medium">Name<Input autoFocus className="mt-1" value={collectionName} maxLength={120} onChange={(event) => setCollectionName(event.target.value)} /></label><div className="mt-6 flex justify-end gap-2"><Button type="button" onClick={() => setCollectionDialog(null)}>Cancel</Button><Button type="submit" variant="primary" disabled={!collectionName.trim() || pending}>Save</Button></div></form> : <><p className="text-sm text-neutral-600">Move {collectionDialog?.database.name} to Trash? Its records will be hidden until restored.</p><div className="mt-6 flex justify-end gap-2"><Button onClick={() => setCollectionDialog(null)}>Cancel</Button><Button variant="danger" disabled={pending} onClick={async () => { if (!collectionDialog) return; setPending(true); try { await setCollectionArchived(workspace.id, collectionDialog.database.id, true); await queryClient.invalidateQueries({ queryKey: workspaceKeys.databases(workspace.id) }); setCollectionDialog(null); push('Collection moved to Trash.', 'success'); navigate(`/app/${workspace.slug}`) } catch { push('Could not move collection to Trash.', 'error') } finally { setPending(false) } }}>Move to Trash</Button></div></>}
      </Modal>

      <AddNewModal
        open={addNewOpen}
        onClose={() => setAddNewOpen(false)}
        workspace={workspace}
        user={user}
        role={role}
        databases={databases}
        initialDestination={addNewDestination}
        initialFocus={addNewFocus}
      />
    </>
  )
}

function SidebarSection({ label, action, children }: { label: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="pt-3 first:pt-1">
      {label ? (
        <div className="group/section mb-1 flex h-5 items-center justify-between px-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{label}</span>
          {action}
        </div>
      ) : null}
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function PageTree({ pages, workspace, collapsed, parentId = null, depth = 0, onNavigate }: { pages: WorkspacePage[]; workspace: Workspace; collapsed: boolean; parentId?: string | null; depth?: number; onNavigate?: () => void }) {
  const children = pages.filter((page) => page.parent_page_id === parentId || (parentId === null && page.parent_page_id && !pages.some((parent) => parent.id === page.parent_page_id)))
  return (
    <>
      {children.map((page) => (
        <div key={page.id}>
          <PageNav page={page} workspace={workspace} collapsed={collapsed} depth={depth} onNavigate={onNavigate} />
          {!collapsed && depth < 5 ? <PageTree pages={pages} workspace={workspace} collapsed={collapsed} parentId={page.id} depth={depth + 1} onNavigate={onNavigate} /> : null}
        </div>
      ))}
    </>
  )
}

function PageNav({ page, workspace, collapsed, depth = 0, favorite = false, onNavigate }: { page: WorkspacePage; workspace: Workspace; collapsed: boolean; depth?: number; favorite?: boolean; onNavigate?: () => void }) {
  return (
    <NavLink
      to={`/app/${workspace.slug}/page/${page.id}`}
      onClick={() => onNavigate?.()}
      className={({ isActive }) =>
        `flex h-7 items-center gap-2 rounded-md pr-2 text-xs transition-colors ${
          isActive
            ? 'bg-neutral-200/80 font-medium text-neutral-900 shadow-2xs'
            : 'text-neutral-600 hover:bg-neutral-200/60 hover:text-neutral-900'
        } ${collapsed ? 'justify-center px-0' : ''}`
      }
      style={collapsed ? undefined : { paddingLeft: 8 + depth * 12 }}
      title={collapsed ? page.title : undefined}
    >
      {favorite ? (
        <Star size={13} className="shrink-0 text-amber-500 fill-amber-400" />
      ) : (
        <span className="w-4 shrink-0 text-center text-xs text-neutral-400">{page.icon || <FileText size={13} />}</span>
      )}
      {!collapsed ? <span className="truncate">{page.title || 'Untitled'}</span> : null}
    </NavLink>
  )
}

function NavItem({ to, label, icon, collapsed, onNavigate }: { to: string; label: string; icon: React.ReactNode; collapsed: boolean; onNavigate?: () => void }) {
  return (
    <NavLink
      to={to}
      end
      onClick={() => onNavigate?.()}
      className={({ isActive }) =>
        `flex h-7 items-center gap-2.5 rounded-md px-2 text-xs transition-colors ${
          isActive
            ? 'bg-neutral-200/80 font-medium text-neutral-900 shadow-2xs'
            : 'text-neutral-600 hover:bg-neutral-200/60 hover:text-neutral-900'
        } ${collapsed ? 'justify-center px-0' : ''}`
      }
      title={collapsed ? label : undefined}
    >
      <span className="shrink-0 text-neutral-400">{icon}</span>
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </NavLink>
  )
}
