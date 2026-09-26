import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Database, FileText, Plus, Search, Sparkles, X } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { Workspace, WorkspaceDatabase, WorkspaceRole } from '../../types/database.types'
import { useTeams, useUserTeams } from '../../features/teams/queries'
import { useWorkspacePermissions, workspaceKeys } from '../../features/workspace/queries'
import { pageKeys } from '../../features/pages/queries'
import { canUseWorkspaceAction } from '../../utils/permissions'
import { createWorkspacePage } from '../../services/page.service'
import { createDatabase } from '../../services/database.service'
import {
  instantiateTemplate,
  TEMPLATES,
  type CreationDestination,
  type TemplateDefinition,
} from '../../services/template.service'
import { DestinationPicker } from './DestinationPicker'
import { TemplateCard } from './TemplateCard'
import { ExistingCollectionCard } from './ExistingCollectionCard'
import { useToast } from '../ui/Toast'
import { Spinner } from '../ui/Spinner'

export interface AddNewModalProps {
  open: boolean
  onClose: () => void
  workspace: Workspace
  user: User
  role: WorkspaceRole
  databases: WorkspaceDatabase[]
  initialDestination?: 'private' | 'workspace' | 'team'
  initialTeamId?: string
  initialFocus?: 'page' | 'collection'
}

export function AddNewModal({
  open,
  onClose,
  workspace,
  user,
  role,
  databases,
  initialDestination = 'private',
  initialTeamId,
  initialFocus,
}: AddNewModalProps) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { push } = useToast()

  const permissions = useWorkspacePermissions(workspace.id)
  const teamsQuery = useTeams(open ? workspace.id : undefined)
  const userTeamsQuery = useUserTeams(open ? workspace.id : undefined, user.id)

  const teams = useMemo(() => teamsQuery.data ?? [], [teamsQuery.data])
  const userTeamIds = useMemo(
    () => new Set((userTeamsQuery.data ?? []).map((t) => t.id)),
    [userTeamsQuery.data]
  )

  const canCreateWorkspacePage = canUseWorkspaceAction(role, permissions.data, 'create_page')
  const canCreateWorkspaceCollection = canUseWorkspaceAction(role, permissions.data, 'create_collection')

  // Destination state
  const [destination, setDestination] = useState<CreationDestination>(() => {
    if (initialDestination === 'team' && initialTeamId) {
      const match = teams.find((t) => t.id === initialTeamId)
      return { type: 'team', workspaceId: workspace.id, teamId: initialTeamId, label: match?.name || 'Team' }
    }
    if (initialDestination === 'workspace' && (canCreateWorkspacePage || canCreateWorkspaceCollection)) {
      return { type: 'workspace', workspaceId: workspace.id, label: workspace.name }
    }
    return { type: 'private', workspaceId: workspace.id, label: 'Private' }
  })

  // Pre-filter to collection view if initialFocus is collection
  const emptyCollectionRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (open && initialFocus === 'collection') {
      emptyCollectionRef.current?.focus()
    }
  }, [open, initialFocus])

  // Update destination if initial props change on open
  useEffect(() => {
    if (!open) {
      setQuery('')
      setShowAllTemplates(false)
      return
    }
    if (initialDestination === 'team' && initialTeamId) {
      const match = teams.find((t) => t.id === initialTeamId)
      setDestination({ type: 'team', workspaceId: workspace.id, teamId: initialTeamId, label: match?.name || 'Team' })
    } else if (initialDestination === 'workspace' && (canCreateWorkspacePage || canCreateWorkspaceCollection)) {
      setDestination({ type: 'workspace', workspaceId: workspace.id, label: workspace.name })
    } else {
      setDestination({ type: 'private', workspaceId: workspace.id, label: 'Private' })
    }
  }, [open, initialDestination, initialTeamId, workspace.id, workspace.name, teams, canCreateWorkspacePage, canCreateWorkspaceCollection])

  const [query, setQuery] = useState('')
  const [showAllTemplates, setShowAllTemplates] = useState(false)
  const [creatingAction, setCreatingAction] = useState<string | null>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Focus trap & escape handler
  useEffect(() => {
    if (!open) return
    const prevFocused = document.activeElement as HTMLElement | null

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
      // Focus search on Cmd+K or Ctrl+K if open
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      if (e.key === 'Tab') {
        const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        )
        if (!focusable?.length) return
        const first = focusable[0]!
        const last = focusable[focusable.length - 1]!
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    window.setTimeout(() => {
      searchInputRef.current?.focus()
    }, 50)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      prevFocused?.focus()
    }
  }, [open, onClose])

  // Permissions in current selected destination
  const canCreateCollectionInDestination = useMemo(() => {
    if (destination.type === 'team') return true // Team members can create collections for their team
    return canCreateWorkspaceCollection
  }, [destination.type, canCreateWorkspaceCollection])

  const canCreatePageInDestination = useMemo(() => {
    if (destination.type === 'private') return true
    if (destination.type === 'team') return true
    return canCreateWorkspacePage
  }, [destination.type, canCreateWorkspacePage])

  // Filter templates & existing collections by search query
  const trimmedQuery = query.trim().toLowerCase()

  const filteredTemplates = useMemo(() => {
    if (!trimmedQuery) return TEMPLATES
    return TEMPLATES.filter(
      (tpl) =>
        tpl.name.toLowerCase().includes(trimmedQuery) ||
        tpl.description.toLowerCase().includes(trimmedQuery) ||
        tpl.category.toLowerCase().includes(trimmedQuery) ||
        tpl.type.includes(trimmedQuery)
    )
  }, [trimmedQuery])

  // Accessible collections in this workspace (pre-filtered by Supabase RLS)
  const filteredCollections = useMemo(() => {
    const list = databases ?? []
    if (!trimmedQuery) return list
    return list.filter(
      (db) =>
        db.name.toLowerCase().includes(trimmedQuery) ||
        (db.description && db.description.toLowerCase().includes(trimmedQuery))
    )
  }, [databases, trimmedQuery])

  const displayedTemplates = useMemo(() => {
    if (trimmedQuery || showAllTemplates) return filteredTemplates
    return filteredTemplates.slice(0, 6)
  }, [filteredTemplates, showAllTemplates, trimmedQuery])

  // Handlers
  async function handleCreateEmptyPage() {
    if (creatingAction) return
    setCreatingAction('empty-page')
    try {
      const isPrivate = destination.type === 'private'
      const teamId = destination.type === 'team' ? destination.teamId : undefined
      const created = await createWorkspacePage({
        workspaceId: workspace.id,
        userId: user.id,
        title: 'Untitled',
        visibility: isPrivate ? 'private' : 'workspace',
        teamId,
      })
      await queryClient.invalidateQueries({ queryKey: pageKeys.pages(workspace.id) })
      onClose()
      navigate(`/app/${workspace.slug}/page/${created.id}`)
    } catch (error) {
      console.error('Empty page creation failed', { destination: destination.type, error })
      push('Couldn’t create this page. Please try again.', 'error')
    } finally {
      setCreatingAction(null)
    }
  }

  async function handleCreateEmptyCollection() {
    if (creatingAction) return
    setCreatingAction('empty-collection')
    try {
      const teamId = destination.type === 'team' ? destination.teamId : undefined
      const created = await createDatabase({
        workspaceId: workspace.id,
        name: 'Untitled Collection',
        viewType: 'table',
        teamId,
      })
      await queryClient.invalidateQueries({ queryKey: workspaceKeys.databases(workspace.id) })
      onClose()
      navigate(`/app/${workspace.slug}/database/${created.database_id}/view/${created.view_id}`)
    } catch (error) {
      console.error('Empty collection creation failed', { destination: destination.type, error })
      push('Couldn’t create this collection. Please try again.', 'error')
    } finally {
      setCreatingAction(null)
    }
  }

  async function handleUseTemplate(template: TemplateDefinition) {
    if (creatingAction) return
    setCreatingAction(template.id)
    try {
      const result = await instantiateTemplate(template, destination, user.id)
      if (result.kind === 'page') {
        await queryClient.invalidateQueries({ queryKey: pageKeys.pages(workspace.id) })
      } else {
        await queryClient.invalidateQueries({ queryKey: workspaceKeys.databases(workspace.id) })
      }
      onClose()
      navigate(`/app/${workspace.slug}${result.url}`)
    } catch (error) {
      console.error('Template creation failed', { templateId: template.id, destination: destination.type, error })
      push('Couldn’t create this template. Please try again.', 'error')
    } finally {
      setCreatingAction(null)
    }
  }

  function handleOpenExisting(col: WorkspaceDatabase) {
    onClose()
    navigate(`/app/${workspace.slug}/database/${col.id}`)
  }

  if (!open) return null

  const teamsMap = new Map(teams.map((t) => [t.id, t.name]))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-0 sm:p-4 transition-opacity duration-200"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="creation-center-title"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full sm:h-[86vh] max-h-[820px] w-full sm:max-w-[900px] flex-col overflow-hidden rounded-none sm:rounded-2xl border-0 sm:border border-neutral-200/90 bg-white shadow-2xl transition-transform duration-200 animate-in fade-in zoom-in-95"
      >
        {/* Sticky Header */}
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-neutral-200/70 bg-white/95 px-4 sm:px-6 backdrop-blur-sm">
          {/* Left: Close + Add to + Destination selector */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close creation center"
              className="grid h-8 w-8 place-items-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 shrink-0"
            >
              <X size={17} />
            </button>

            <span id="creation-center-title" className="text-xs font-medium text-neutral-400 hidden xs:inline shrink-0">
              Add to
            </span>

            <DestinationPicker
              workspace={workspace}
              role={role}
              teams={teams}
              userTeamIds={userTeamIds}
              canCreateWorkspacePage={canCreateWorkspacePage}
              canCreateWorkspaceCollection={canCreateWorkspaceCollection}
              destination={destination}
              onChange={setDestination}
            />
          </div>

          {/* Right: Search Input */}
          <div className="relative w-44 sm:w-72 shrink-0">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              ref={searchInputRef}
              type="search"
              aria-label="Search templates"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search templates…"
              className="h-8.5 w-full rounded-lg border border-neutral-200 bg-neutral-50/70 pl-8.5 pr-7 text-xs text-neutral-800 placeholder:text-neutral-400 outline-none transition-all focus:border-neutral-400 focus:bg-white focus:ring-2 focus:ring-neutral-100"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </header>

        {/* Scrollable Body */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 space-y-7">
          {/* SEARCH MODE RESULTS */}
          {trimmedQuery ? (
            <div className="space-y-6">
              {/* Templates Match */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={14} className="text-amber-500" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Templates ({filteredTemplates.length})
                  </h2>
                </div>
                {filteredTemplates.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredTemplates.map((tpl) => (
                      <TemplateCard
                        key={tpl.id}
                        template={tpl}
                        creating={creatingAction === tpl.id}
                        disabled={Boolean(creatingAction) || (tpl.type === 'page' ? !canCreatePageInDestination : !canCreateCollectionInDestination)}
                        onSelect={handleUseTemplate}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="py-10 text-center text-sm text-neutral-500">No templates found.</p>
                )}
              </div>

              {/* Existing Collections Match */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Database size={14} className="text-blue-500" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    Existing Collections ({filteredCollections.length})
                  </h2>
                </div>
                {filteredCollections.length > 0 ? (
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {filteredCollections.map((col) => (
                      <ExistingCollectionCard
                        key={col.id}
                        collection={col}
                        teamName={col.team_id ? teamsMap.get(col.team_id) : undefined}
                        onOpen={handleOpenExisting}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 py-2">No accessible collections matching “{query}”.</p>
                )}
              </div>

              {filteredTemplates.length === 0 && filteredCollections.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-sm font-medium text-neutral-700">No matching items found</p>
                  <p className="text-xs text-neutral-400 mt-1">Try another search or start with a blank item above.</p>
                </div>
              )}
            </div>
          ) : (
            /* DEFAULT CURATED CATALOG */
            <>
              {/* Quick Create Cards */}
              <div>
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-3">
                  Quick start
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Empty Page */}
                  <button
                    type="button"
                    onClick={handleCreateEmptyPage}
                    disabled={!canCreatePageInDestination || Boolean(creatingAction)}
                    aria-label="Create empty page"
                    className="group relative flex items-center gap-3.5 rounded-xl border border-neutral-200/90 bg-white p-3.5 text-left transition-all duration-150 hover:border-neutral-300 hover:bg-neutral-50/70 hover:shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 active:scale-[0.99] disabled:opacity-50"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-100 text-neutral-700 transition-colors group-hover:bg-neutral-200/70">
                      {creatingAction === 'empty-page' ? (
                        <Spinner className="h-4 w-4 text-neutral-600" />
                      ) : (
                        <FileText size={18} strokeWidth={1.8} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-xs text-neutral-900 flex items-center gap-1.5">
                        Empty page
                        <Plus size={13} className="text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="mt-0.5 text-[11px] text-neutral-500 truncate">
                        Start with a blank document in {destination.label}.
                      </p>
                    </div>
                  </button>

                  {/* Empty Collection */}
                  {canCreateCollectionInDestination ? (
                    <button
                      type="button"
                      onClick={handleCreateEmptyCollection}
                      disabled={Boolean(creatingAction)}
                      aria-label="Create empty collection"
                      className="group relative flex items-center gap-3.5 rounded-xl border border-neutral-200/90 bg-white p-3.5 text-left transition-all duration-150 hover:border-neutral-300 hover:bg-neutral-50/70 hover:shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 active:scale-[0.99] disabled:opacity-50"
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 transition-colors group-hover:bg-blue-100/70">
                        {creatingAction === 'empty-collection' ? (
                          <Spinner className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Database size={18} strokeWidth={1.8} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs text-neutral-900 flex items-center gap-1.5">
                          Empty collection
                          <Plus size={13} className="text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="mt-0.5 text-[11px] text-neutral-500 truncate">
                          Organize structured data with views and properties.
                        </p>
                      </div>
                    </button>
                  ) : (
                    <div className="flex items-center gap-3.5 rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 p-3.5 text-left text-neutral-400">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-neutral-100 text-neutral-400">
                        <Database size={18} strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-xs text-neutral-500">Empty collection</div>
                        <p className="mt-0.5 text-[11px] text-neutral-400 truncate">
                          Collection creation is limited to workspace admins.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Templates Catalog */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-500" />
                    <h2 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                      Templates
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAllTemplates((prev) => !prev)}
                    className="text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 rounded px-1.5 py-0.5"
                  >
                    {showAllTemplates ? 'Show fewer' : `Show all (${TEMPLATES.length})`}
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {displayedTemplates.map((tpl) => (
                    <TemplateCard
                      key={tpl.id}
                      template={tpl}
                      creating={creatingAction === tpl.id}
                      disabled={Boolean(creatingAction) || (tpl.type === 'page' ? !canCreatePageInDestination : !canCreateCollectionInDestination)}
                      onSelect={handleUseTemplate}
                    />
                  ))}
                </div>
              </div>

              {/* Existing Collections Section */}
              {filteredCollections.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                        Existing collections
                      </h2>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        Access structured datasets already available in this workspace.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {filteredCollections.map((col) => (
                      <ExistingCollectionCard
                        key={col.id}
                        collection={col}
                        teamName={col.team_id ? teamsMap.get(col.team_id) : undefined}
                        onOpen={handleOpenExisting}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
