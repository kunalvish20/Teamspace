import { useMemo, useState } from 'react'
import type { EditableRole } from '../../types/domain'
import { inviteWorkspaceMembers, type BulkInviteResult } from '../../services/member.service'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { useToast } from '../ui/Toast'
import { useTeams } from '../../features/teams/queries'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function parseEmails(value: string) {
  return [...new Set(value.split(/[\s,;\n]+/).map((item) => item.trim().toLowerCase()).filter(Boolean))]
}

export function InviteMemberModal({ open, workspaceId, onClose, onInvited }: { open: boolean; workspaceId: string; onClose: () => void; onInvited: () => void }) {
  const [value, setValue] = useState('')
  const [role, setRole] = useState<EditableRole>('MEMBER')
  const [teamId, setTeamId] = useState('')
  const teams = useTeams(open ? workspaceId : undefined)
  const [pending, setPending] = useState(false)
  const [results, setResults] = useState<BulkInviteResult[]>([])
  const { push } = useToast()
  const emails = useMemo(() => parseEmails(value), [value])
  const invalid = emails.filter((email) => !EMAIL_RE.test(email))
  const overLimit = emails.length > 50

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!emails.length || invalid.length || overLimit) return
    setPending(true)
    setResults([])
    try {
      const response = await inviteWorkspaceMembers({ workspaceId, emails, role, intendedTeamId: teamId || undefined })
      setResults(response.results)
      if (response.successCount) {
        push(`${response.successCount} invitation${response.successCount === 1 ? '' : 's'} sent.`, 'success')
        onInvited()
      }
      if (!response.failureCount) {
        setValue('')
        window.setTimeout(onClose, 500)
      }
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not send invitations.', 'error')
    } finally {
      setPending(false)
    }
  }

  return <Modal open={open} onClose={onClose} title="Invite workspace members">
    <form className="space-y-4" onSubmit={submit}>
      <label className="block text-xs font-medium text-neutral-600">Email addresses
        <textarea
          autoFocus
          rows={7}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={'one@example.com\ntwo@example.com\nthree@example.com'}
          className="mt-1 w-full resize-y rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100"
        />
      </label>
      {teams.data?.length ? <label className="block text-xs font-medium text-neutral-600">Add to team (optional)
        <select value={teamId} onChange={(event) => setTeamId(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700"><option value="">No team</option>{teams.data.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select>
      </label> : null}
      <div className="flex items-center justify-between text-[11px] text-neutral-400">
        <span>Separate emails with commas, spaces, semicolons, or new lines.</span>
        <span className={overLimit ? 'font-semibold text-red-600' : ''}>{emails.length}/50</span>
      </div>
      {invalid.length ? <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">Invalid email: {invalid.slice(0, 3).join(', ')}</p> : null}
      {overLimit ? <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">You can invite up to 50 unique emails in one action.</p> : null}
      <label className="block text-xs font-medium text-neutral-600">Role
        <select value={role} onChange={(event) => setRole(event.target.value as EditableRole)} className="mt-1 h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-400">
          <option value="ADMIN">Admin</option>
          <option value="MEMBER">Member</option>
          <option value="VIEWER">Viewer</option>
        </select>
      </label>
      {results.length ? <div className="max-h-40 overflow-auto rounded-md border border-neutral-200 bg-neutral-50 p-2 text-xs">
        {results.map((result) => <div key={result.email} className="flex gap-2 py-1"><span className={result.ok ? 'text-emerald-600' : 'text-red-600'}>{result.ok ? '✓' : '×'}</span><span className="min-w-0 flex-1 truncate text-neutral-700">{result.email}</span>{result.error ? <span className="text-neutral-400">{result.error}</span> : null}</div>)}
      </div> : null}
      <div className="flex justify-end gap-2"><Button type="button" onClick={onClose}>Cancel</Button><Button variant="primary" type="submit" disabled={pending || !emails.length || Boolean(invalid.length) || overLimit}>{pending ? 'Sending…' : `Invite ${emails.length || ''}${emails.length > 1 ? ' members' : ' member'}`}</Button></div>
    </form>
  </Modal>
}
