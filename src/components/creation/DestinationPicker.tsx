import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Globe, Lock, Users } from 'lucide-react'
import type { Team, Workspace, WorkspaceRole } from '../../types/database.types'
import type { CreationDestination } from '../../services/template.service'

interface DestinationPickerProps {
  workspace: Workspace
  role: WorkspaceRole
  teams: Team[]
  userTeamIds: Set<string>
  canCreateWorkspacePage: boolean
  canCreateWorkspaceCollection: boolean
  destination: CreationDestination
  onChange: (next: CreationDestination) => void
}

export function DestinationPicker({
  workspace,
  role,
  teams,
  userTeamIds,
  canCreateWorkspacePage,
  canCreateWorkspaceCollection,
  destination,
  onChange,
}: DestinationPickerProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Teams the user is member of OR workspace owner/admin
  const allowedTeams = teams.filter(
    (t) => role === 'OWNER' || role === 'ADMIN' || userTeamIds.has(t.id)
  )

  const canCreateWorkspace = canCreateWorkspacePage || canCreateWorkspaceCollection

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const select = (next: CreationDestination) => {
    onChange(next)
    setOpen(false)
  }

  const iconForDestination = () => {
    if (destination.type === 'private') return <Lock size={13} className="text-neutral-500" />
    if (destination.type === 'workspace') return <Globe size={13} className="text-blue-500" />
    return <Users size={13} className="text-amber-500" />
  }

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select destination"
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-200/90 bg-neutral-50/80 px-2.5 text-xs font-medium text-neutral-700 shadow-2xs transition-all hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700"
      >
        {iconForDestination()}
        <span className="max-w-[140px] truncate">{destination.label}</span>
        <ChevronDown size={12} className={`text-neutral-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Destination options"
          className="absolute left-0 top-9 z-50 w-64 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl transition-all"
        >
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
            Destination
          </div>

          {/* Private Option */}
          <button
            type="button"
            role="option"
            aria-selected={destination.type === 'private'}
            onClick={() => select({ type: 'private', workspaceId: workspace.id, label: 'Private' })}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
              destination.type === 'private' ? 'bg-neutral-100 font-medium text-neutral-900' : 'text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            <div className="grid h-6 w-6 place-items-center rounded-md bg-neutral-100 text-neutral-600">
              <Lock size={12} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-neutral-900">Private</div>
              <div className="truncate text-[10px] text-neutral-400">Only you can view and edit</div>
            </div>
            {destination.type === 'private' && <Check size={13} className="text-neutral-900 shrink-0" />}
          </button>

          {/* Workspace Option */}
          {canCreateWorkspace && (
            <>
              <div className="my-1 border-t border-neutral-100" />
              <div className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                Workspace
              </div>
              <button
                type="button"
                role="option"
                aria-selected={destination.type === 'workspace'}
                onClick={() => select({ type: 'workspace', workspaceId: workspace.id, label: workspace.name })}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                  destination.type === 'workspace' ? 'bg-neutral-100 font-medium text-neutral-900' : 'text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <div className="grid h-6 w-6 place-items-center rounded-md bg-blue-50 text-blue-600">
                  <Globe size={12} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-neutral-900">{workspace.name}</div>
                  <div className="truncate text-[10px] text-neutral-400">All workspace members</div>
                </div>
                {destination.type === 'workspace' && <Check size={13} className="text-neutral-900 shrink-0" />}
              </button>
            </>
          )}

          {/* Teams Options */}
          {allowedTeams.length > 0 && (
            <>
              <div className="my-1 border-t border-neutral-100" />
              <div className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                Teams
              </div>
              <div className="max-h-40 overflow-y-auto space-y-0.5">
                {allowedTeams.map((t) => {
                  const isSelected = destination.type === 'team' && destination.teamId === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => select({ type: 'team', workspaceId: workspace.id, teamId: t.id, label: t.name })}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                        isSelected ? 'bg-neutral-100 font-medium text-neutral-900' : 'text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      <div className="grid h-6 w-6 place-items-center rounded-md bg-amber-50 text-amber-700 text-xs">
                        {t.icon || '👥'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-neutral-900">{t.name}</div>
                        <div className="truncate text-[10px] text-neutral-400">Members of {t.name}</div>
                      </div>
                      {isSelected && <Check size={13} className="text-neutral-900 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
