import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database, FileText, Search, Users } from 'lucide-react'
import type { Workspace, WorkspaceDatabase } from '../../types/database.types'
import { useWorkspacePages } from '../../features/pages/queries'
import { useTeams } from '../../features/teams/queries'
import { Modal } from '../ui/Modal'

interface Result { id: string; title: string; group: 'Pages' | 'Collections' | 'Teams'; to: string }

export function WorkspaceSearchDialog({ open, onClose, workspace, databases }: { open: boolean; onClose: () => void; workspace: Workspace; databases: WorkspaceDatabase[] }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const pages = useWorkspacePages(open ? workspace.id : undefined)
  const teams = useTeams(open ? workspace.id : undefined)
  const navigate = useNavigate()
  const results = useMemo(() => {
    const text = query.trim().toLowerCase()
    const items: Result[] = [
      ...(pages.data ?? []).map((page) => ({ id: page.id, title: page.title || 'Untitled', group: 'Pages' as const, to: `/app/${workspace.slug}/page/${page.id}` })),
      ...databases.map((database) => ({ id: database.id, title: database.name, group: 'Collections' as const, to: `/app/${workspace.slug}/database/${database.id}` })),
      ...(teams.data ?? []).map((team) => ({ id: team.id, title: team.name, group: 'Teams' as const, to: `/app/${workspace.slug}/teams/${team.id}` })),
    ]
    return (text ? items.filter((item) => item.title.toLowerCase().includes(text)) : items).slice(0, 30)
  }, [query, pages.data, databases, teams.data, workspace.slug])
  const openResult = (result: Result) => { onClose(); setQuery(''); setSelected(0); navigate(result.to) }
  const icons = { Pages: FileText, Collections: Database, Teams: Users }
  return <Modal open={open} onClose={() => { onClose(); setQuery(''); setSelected(0) }} title="Search workspace"><div className="relative"><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" /><input autoFocus aria-label="Search pages, collections, and teams" value={query} onChange={(event) => { setQuery(event.target.value); setSelected(0) }} onKeyDown={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); setSelected((value) => Math.min(results.length - 1, value + 1)) } if (event.key === 'ArrowUp') { event.preventDefault(); setSelected((value) => Math.max(0, value - 1)) } if (event.key === 'Enter' && results[selected]) openResult(results[selected]) }} placeholder="Find a page, collection, or team" className="h-11 w-full rounded-lg border border-neutral-200 bg-white pl-10 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-neutral-700" /></div><div className="mt-3 max-h-[min(50vh,360px)] overflow-y-auto" role="listbox" aria-label="Search results">{results.map((result, index) => { const Icon = icons[result.group]; return <button key={`${result.group}-${result.id}`} type="button" role="option" aria-selected={selected === index} onMouseEnter={() => setSelected(index)} onClick={() => openResult(result)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 ${selected === index ? 'bg-neutral-100' : 'hover:bg-neutral-50'}`}><Icon size={16} className="shrink-0 text-neutral-500" /><span className="min-w-0 flex-1 truncate">{result.title}</span><span className="text-[11px] text-neutral-500">{result.group}</span></button> })}{!results.length ? <p className="px-3 py-6 text-center text-sm text-neutral-500">{pages.isPending || teams.isPending ? 'Searching…' : 'No results found.'}</p> : null}</div><p className="mt-3 text-[11px] text-neutral-400">Use ↑ ↓ to navigate and Enter to open.</p></Modal>
}
