import { useState } from 'react'
import { ArrowRight, Database, FileText, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useWorkspaceOutlet } from '../features/workspace/useWorkspaceOutlet'
import { useWorkspacePermissions } from '../features/workspace/queries'
import { useWorkspacePages } from '../features/pages/queries'
import { useAuth } from '../features/auth/AuthProvider'
import { canUseWorkspaceAction } from '../utils/permissions'
import { Button } from '../components/ui/Button'

const cardClass = 'group flex min-w-0 cursor-pointer items-center gap-4 rounded-xl border border-neutral-200/80 bg-white px-4 py-3.5 transition-[background-color,border-color] duration-200 hover:border-neutral-300 hover:bg-neutral-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2 motion-reduce:transition-none'

function SectionError({ retry }: { retry: () => void }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-5 py-4 text-sm text-neutral-600" role="alert">
    <span>Couldn't load this section.</span><Button size="sm" onClick={retry}>Try again</Button>
  </div>
}

function SectionSkeleton() {
  return <div className="grid gap-3 sm:grid-cols-2" aria-label="Loading workspace content" role="status">
    {[0, 1].map((item) => <div key={item} className="flex h-[72px] animate-pulse items-center gap-4 rounded-xl border border-neutral-200/80 px-4 motion-reduce:animate-none">
      <div className="h-10 w-10 shrink-0 rounded-lg bg-neutral-100" /><div className="flex-1 space-y-2"><div className="h-3 w-1/2 rounded bg-neutral-100" /><div className="h-2.5 w-1/3 rounded bg-neutral-100" /></div>
    </div>)}
  </div>
}

import { AddNewModal } from '../components/creation/AddNewModal'

export function WorkspaceHomePage() {
  const { workspace, databases, role, databasesLoading, databasesError, retryDatabases } = useWorkspaceOutlet()
  const { user } = useAuth()
  const pages = useWorkspacePages(workspace.id)
  const permissions = useWorkspacePermissions(workspace.id)
  const [addNewOpen, setAddNewOpen] = useState(false)
  const recentPages = [...(pages.data ?? [])].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 8)
  const canWrite = canUseWorkspaceAction(role, permissions.data, 'create_page')
  const displayName = (user?.user_metadata.full_name as string | undefined)?.trim().split(/\s+/)[0] || workspace.name

  const createButton = (secondary = false) => (
    <Button
      variant={secondary ? 'secondary' : 'primary'}
      onClick={() => setAddNewOpen(true)}
      className="h-10 rounded-lg px-4 text-sm shadow-sm transition-[background-color,transform] duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2 motion-reduce:transition-none"
    >
      <Plus size={16} aria-hidden="true" />
      <span>Add new</span>
    </Button>
  )

  return <div className="mx-auto w-full max-w-[1160px] px-4 pb-16 pt-8 sm:px-6 sm:pt-12 lg:px-10 lg:pt-16">
    <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
      <div className="min-w-0"><p className="truncate text-[13px] font-medium text-neutral-500">{displayName}</p><h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight text-neutral-950 sm:text-[32px]">Your Workspace</h1><p className="mt-2 max-w-xl text-sm leading-6 text-neutral-600 sm:text-[15px]">Create pages, organize your work, and keep everything in one place.</p></div>
      {canWrite ? <div className="shrink-0 [&>button]:w-full sm:[&>button]:w-auto">{createButton()}</div> : null}
    </header>

    <section className="mt-10" aria-labelledby="recent-heading">
      <h2 id="recent-heading" className="mb-4 text-[13px] font-semibold text-neutral-700">Recent</h2>
      {pages.isPending ? <SectionSkeleton /> : pages.isError ? <SectionError retry={() => void pages.refetch()} /> : recentPages.length ?
        <div className="grid gap-3 sm:grid-cols-2">{recentPages.map((page) => <Link key={page.id} to={`/app/${workspace.slug}/page/${page.id}`} className={cardClass} title={page.title || 'Untitled'}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-neutral-100 text-lg text-neutral-600" aria-hidden="true">{page.icon || <FileText size={18} strokeWidth={1.75} />}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-neutral-900">{page.title || 'Untitled'}</span><span className="mt-0.5 block text-xs text-neutral-500">Last edited {new Date(page.updated_at).toLocaleDateString()}</span></span>
          <ArrowRight size={16} className="shrink-0 text-neutral-400 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0 motion-reduce:transition-none" aria-hidden="true" />
        </Link>)}</div> :
        <div className="flex flex-col items-center rounded-xl border border-neutral-200 bg-neutral-50/70 px-5 py-8 text-center"><span className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-200 bg-white text-neutral-600" aria-hidden="true"><FileText size={20} strokeWidth={1.7} /></span><h3 className="mt-3 text-sm font-semibold text-neutral-900">No pages yet</h3><p className="mt-1 max-w-sm text-sm leading-5 text-neutral-600">Create your first page to start organizing your ideas and work.</p>{canWrite ? <div className="mt-5">{createButton(true)}</div> : null}</div>}
    </section>

    <section className="mt-10" aria-labelledby="collections-heading"><h2 id="collections-heading" className="mb-4 text-[13px] font-semibold text-neutral-700">Collections</h2>
      {databasesLoading ? <SectionSkeleton /> : databasesError ? <SectionError retry={retryDatabases} /> : databases.length ?
        <div className="grid gap-3">{databases.map((database) => <Link key={database.id} to={`/app/${workspace.slug}/database/${database.id}`} className={cardClass} title={database.name}>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-neutral-100 text-neutral-600" aria-hidden="true"><Database size={18} strokeWidth={1.7} /></span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-neutral-900">{database.name}</span><span className="mt-0.5 block truncate text-[13px] text-neutral-600">{database.description || 'Organize structured information for your team.'}</span></span>
          <ArrowRight size={17} className="shrink-0 text-neutral-400 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0 motion-reduce:transition-none" aria-hidden="true" />
        </Link>)}</div> : <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 px-5 py-6 text-sm text-neutral-600">No collections yet. {role === 'OWNER' || role === 'ADMIN' ? 'Create one from the sidebar.' : ''}</div>}
    </section>

    {user && (
      <AddNewModal
        open={addNewOpen}
        onClose={() => setAddNewOpen(false)}
        workspace={workspace}
        user={user}
        role={role}
        databases={databases}
        initialDestination="private"
      />
    )}
  </div>
}
