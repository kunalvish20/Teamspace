import { ArrowUpRight, Database, Users } from 'lucide-react'
import type { WorkspaceDatabase } from '../../types/database.types'

interface ExistingCollectionCardProps {
  collection: WorkspaceDatabase
  teamName?: string
  onOpen: (collection: WorkspaceDatabase) => void
}

export function ExistingCollectionCard({ collection, teamName, onOpen }: ExistingCollectionCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(collection)}
      aria-label={`Open existing collection: ${collection.name}`}
      className="group relative flex items-center justify-between rounded-xl border border-neutral-200/80 bg-white p-3 text-left transition-all duration-150 hover:border-neutral-300 hover:bg-neutral-50/50 hover:shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 active:scale-[0.99]"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-neutral-100 text-neutral-600 transition-colors group-hover:bg-neutral-200/70">
          <Database size={16} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold text-xs text-neutral-900">
              {collection.name}
            </span>
            {teamName ? (
              <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200/50">
                <Users size={10} />
                <span className="truncate max-w-[80px]">{teamName}</span>
              </span>
            ) : (
              <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600">
                Workspace
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-neutral-500 max-w-sm">
            {collection.description || 'Collection in this workspace'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 text-neutral-400 group-hover:text-neutral-700 transition-colors shrink-0 ml-2">
        <span className="text-[11px] font-medium hidden sm:inline">Open</span>
        <ArrowUpRight size={13} />
      </div>
    </button>
  )
}
