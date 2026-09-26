import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Plus, Settings } from 'lucide-react'
import type { Workspace } from '../../types/database.types'

export function WorkspaceSwitcher({ workspace, workspaces, collapsed, onSwitch, onCreate, onSettings }: { workspace: Workspace; workspaces: Workspace[]; collapsed: boolean; onSwitch: (slug: string) => void; onCreate: () => void; onSettings: () => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => { if (root.current && !root.current.contains(event.target as Node)) setOpen(false) }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onPointer); document.removeEventListener('keydown', onKey) }
  }, [open])
  const visible = workspaces.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
  const close = () => { setOpen(false); setSearch('') }
  return <div ref={root} className="relative min-w-0 flex-1"><button type="button" aria-haspopup="menu" aria-expanded={open} aria-label={collapsed ? `Switch workspace, current ${workspace.name}` : undefined} onClick={() => setOpen((value) => !value)} className={`flex h-9 w-full min-w-0 items-center gap-2 rounded-lg px-1.5 text-left text-xs font-semibold text-neutral-800 transition-colors hover:bg-neutral-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 ${collapsed ? 'justify-center' : ''}`}><span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-md border border-neutral-200 bg-white text-xs font-bold">{workspace.logo_url ? <img src={workspace.logo_url} alt="" className="h-full w-full object-cover" /> : workspace.name[0]?.toUpperCase()}</span>{!collapsed ? <><span className="min-w-0 flex-1 truncate">{workspace.name}</span><ChevronDown size={14} className="shrink-0 text-neutral-400" /></> : null}</button>
    {open ? <div role="menu" aria-label="Workspaces" className={`absolute top-10 z-40 w-64 rounded-xl border border-neutral-200 bg-white p-2 shadow-panel ${collapsed ? 'left-11' : 'left-0'}`}><div className="px-2 py-1.5 text-[11px] font-medium text-neutral-500">Workspaces</div>{workspaces.length > 5 ? <input autoFocus aria-label="Search workspaces" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search workspaces" className="mb-2 h-8 w-full rounded-lg border border-neutral-200 px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-neutral-700" /> : null}<div className="max-h-60 overflow-y-auto">{visible.map((item) => <button key={item.id} role="menuitem" onClick={() => { close(); onSwitch(item.slug) }} className="flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700"><span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-neutral-100 font-semibold">{item.name[0]?.toUpperCase()}</span><span className="min-w-0 flex-1 truncate">{item.name}</span>{item.id === workspace.id ? <Check size={14} aria-label="Current workspace" /> : null}</button>)}{!visible.length ? <p className="p-3 text-xs text-neutral-500">No workspaces found.</p> : null}</div><div className="mt-2 border-t border-neutral-100 pt-2"><button role="menuitem" onClick={() => { close(); onCreate() }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-neutral-50"><Plus size={15} /> Create workspace</button><button role="menuitem" onClick={() => { close(); onSettings() }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-neutral-50"><Settings size={15} /> Workspace settings</button></div></div> : null}
  </div>
}
