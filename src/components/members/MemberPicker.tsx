import { useMemo, useState } from 'react'
import { Check, Search } from 'lucide-react'
import type { MemberWithProfile } from '../../types/domain'
import { Avatar } from '../ui/Avatar'

interface Props {
  members: MemberWithProfile[]
  selectedIds: string[]
  multiple?: boolean
  disabled?: boolean
  onChange: (ids: string[]) => void
}

export function MemberPicker({ members, selectedIds, multiple = false, disabled, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const selected = members.filter((member) => selectedIds.includes(member.user_id))
  const filtered = useMemo(() => members.filter((member) => {
    const haystack = `${member.profile?.full_name ?? ''} ${member.profile?.email ?? ''}`.toLowerCase()
    return haystack.includes(search.toLowerCase())
  }), [members, search])

  function toggle(userId: string) {
    if (multiple) onChange(selectedIds.includes(userId) ? selectedIds.filter((id) => id !== userId) : [...selectedIds, userId])
    else { onChange(selectedIds.includes(userId) ? [] : [userId]); setOpen(false) }
  }

  return (
    <div className="relative h-full w-full">
      <button disabled={disabled} onClick={() => setOpen((value) => !value)} className="flex h-full min-h-9 w-full items-center gap-1.5 overflow-hidden px-2 text-left disabled:cursor-default">
        {selected.length ? selected.slice(0, 2).map((member) => <span key={member.user_id} className="inline-flex max-w-28 items-center gap-1 rounded bg-neutral-100 px-1.5 py-0.5 text-xs"><Avatar size="sm" name={member.profile?.full_name} email={member.profile?.email} url={member.profile?.avatar_url} /><span className="truncate">{member.profile?.full_name ?? member.profile?.email ?? 'Member'}</span></span>) : <span className="text-neutral-400">Select person</span>}
        {selected.length > 2 ? <span className="text-xs text-neutral-500">+{selected.length - 2}</span> : null}
      </button>
      {open && !disabled ? (
        <div className="absolute left-0 top-[calc(100%+4px)] z-40 w-72 rounded-lg border border-neutral-200 bg-white p-1.5 shadow-panel">
          <div className="mb-1 flex items-center gap-2 rounded border border-neutral-200 px-2"><Search size={13} className="text-neutral-400" /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search team member..." className="h-8 w-full text-sm outline-none" /></div>
          <div className="max-h-56 overflow-auto">
            {filtered.map((member) => {
              const active = selectedIds.includes(member.user_id)
              return <button key={member.user_id} onClick={() => toggle(member.user_id)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-neutral-50"><Avatar size="sm" name={member.profile?.full_name} email={member.profile?.email} url={member.profile?.avatar_url} /><span className="min-w-0 flex-1"><span className="block truncate text-sm text-neutral-800">{member.profile?.full_name ?? 'Unnamed member'}</span><span className="block truncate text-xs text-neutral-400">{member.profile?.email}</span></span>{active ? <Check size={14} /> : null}</button>
            })}
            {!filtered.length ? <div className="px-2 py-6 text-center text-xs text-neutral-400">No members found</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
