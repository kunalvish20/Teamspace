import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, Settings, UserRound } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { Avatar } from '../ui/Avatar'

export function AccountMenu({ user, collapsed, onLogout, onNavigate }: { user: User; collapsed: boolean; onLogout: () => void; onNavigate?: () => void }) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => { if (root.current && !root.current.contains(event.target as Node)) setOpen(false) }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onPointer); document.removeEventListener('keydown', onKey) }
  }, [open])
  const name = (user.user_metadata.full_name as string | undefined) ?? user.email?.split('@')[0] ?? 'Account'
  return <div ref={root} className="relative"><button type="button" aria-expanded={open} aria-haspopup="menu" aria-label={collapsed ? `Account menu for ${name}` : undefined} onClick={() => setOpen((value) => !value)} title={collapsed ? name : undefined} className={`flex w-full items-center gap-2 rounded-lg p-1.5 text-left transition-colors hover:bg-neutral-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 ${collapsed ? 'justify-center' : ''}`}><Avatar size="sm" name={name} email={user.email} url={user.user_metadata.avatar_url as string | undefined} />{!collapsed ? <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-neutral-800">{name}</span><span className="block truncate text-[10px] text-neutral-500" title={user.email}>{user.email}</span></span> : null}</button>{open ? <div role="menu" className={`absolute bottom-full z-40 mb-2 w-56 rounded-xl border border-neutral-200 bg-white p-1 shadow-panel ${collapsed ? 'left-11' : 'left-0'}`}><Link role="menuitem" to="/account/profile" onClick={() => { setOpen(false); onNavigate?.() }} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-neutral-50"><UserRound size={15} /> My profile</Link><Link role="menuitem" to="/app" onClick={() => { setOpen(false); onNavigate?.() }} className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-neutral-50"><Settings size={15} /> Switch workspace</Link><button role="menuitem" onClick={() => { setOpen(false); onLogout() }} className="flex w-full items-center gap-2 border-t border-neutral-100 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"><LogOut size={15} /> Log out</button></div> : null}</div>
}
