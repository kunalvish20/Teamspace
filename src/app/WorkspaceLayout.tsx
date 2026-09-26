import { useEffect, useState } from 'react'
import { Navigate, Outlet, useNavigate, useParams } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { useAuth } from '../features/auth/AuthProvider'
import { useWorkspace, useWorkspaceDatabases, useWorkspaceRole, useWorkspaces } from '../features/workspace/queries'
import { WorkspaceSidebar } from '../components/workspace/WorkspaceSidebar'
import { Spinner } from '../components/ui/Spinner'
import { useWorkspaceRealtime } from '../hooks/useWorkspaceRealtime'
import { WorkspaceSearchDialog } from '../components/workspace/WorkspaceSearchDialog'

export function WorkspaceLayout() {
  const { workspaceSlug } = useParams()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(() => window.localStorage.getItem('teamspace:sidebar-collapsed') === 'true')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const allWorkspacesQuery = useWorkspaces()
  const workspaceQuery = useWorkspace(workspaceSlug)
  const databasesQuery = useWorkspaceDatabases(workspaceQuery.data?.id)
  const roleQuery = useWorkspaceRole(workspaceQuery.data?.id)
  useWorkspaceRealtime(workspaceQuery.data?.id)

  useEffect(() => { window.localStorage.setItem('teamspace:sidebar-collapsed', String(collapsed)) }, [collapsed])
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setMobileOpen(false); setSearchOpen((value) => !value) }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  useEffect(() => {
    if (!mobileOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  if (allWorkspacesQuery.isLoading || workspaceQuery.isLoading || roleQuery.isLoading) return <div className="grid min-h-screen place-items-center text-neutral-500"><Spinner className="h-5 w-5" /></div>
  if (!workspaceQuery.data || !user || !roleQuery.data) return <Navigate to="/app" replace />

  const sidebar = <WorkspaceSidebar workspace={workspaceQuery.data} workspaces={allWorkspacesQuery.data ?? [workspaceQuery.data]} databases={databasesQuery.data ?? []} user={user} role={roleQuery.data} collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} onLogout={() => void signOut()} onWorkspaceChange={(slug) => navigate(`/app/${slug}`)} onSearch={() => setSearchOpen(true)} />

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white text-neutral-900">
      {sidebar}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex bg-black/40 backdrop-blur-xs transition-opacity duration-200 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="h-full w-72 max-w-[85vw] shadow-2xl transition-transform duration-200 ease-out" onClick={(event) => event.stopPropagation()}>
            <WorkspaceSidebar
              forceVisible
              workspace={workspaceQuery.data}
              workspaces={allWorkspacesQuery.data ?? [workspaceQuery.data]}
              databases={databasesQuery.data ?? []}
              user={user}
              role={roleQuery.data}
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
              onLogout={() => void signOut()}
              onWorkspaceChange={(slug) => {
                setMobileOpen(false)
                navigate(`/app/${slug}`)
              }}
              onNavigate={() => setMobileOpen(false)}
              onSearch={() => { setMobileOpen(false); setSearchOpen(true) }}
            />
          </div>
        </div>
      ) : null}
      <main className="flex min-w-0 flex-1 flex-col h-screen overflow-y-auto bg-white">
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-neutral-200/80 bg-white px-3 md:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200 transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu size={18} />
            </button>
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="grid h-5 w-5 shrink-0 place-items-center rounded bg-neutral-100 text-[10px] font-bold text-neutral-700">
                {workspaceQuery.data.name[0]?.toUpperCase()}
              </div>
              <span className="truncate text-sm font-medium text-neutral-900">{workspaceQuery.data.name}</span>
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <Outlet context={{ workspace: workspaceQuery.data, role: roleQuery.data, databases: databasesQuery.data ?? [], databasesLoading: databasesQuery.isPending, databasesError: databasesQuery.isError, retryDatabases: () => { void databasesQuery.refetch() } }} />
        </div>
      </main>
      <WorkspaceSearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} workspace={workspaceQuery.data} databases={databasesQuery.data ?? []} />
    </div>
  )
}
