import { useEffect, useState } from 'react'
import { Copy, MoreHorizontal } from 'lucide-react'
import { ensureRecordShareLink, listRecordShares, revokeRecordShare, sendRecordShareInvite, updateRecordShare, type RecordPermission, type RecordSharePerson } from '../../services/record-share.service'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { useToast } from '../ui/Toast'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const LABELS: Record<RecordPermission, string> = { view: 'Can view', edit: 'Can edit', admin: 'Admin' }

export function RecordShareDialog({ open, rowId, title, onClose }: { open: boolean; rowId: string; title: string; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState<RecordPermission>('view')
  const [people, setPeople] = useState<RecordSharePerson[]>([])
  const [linkId, setLinkId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const { push } = useToast()

  async function refresh() {
    const [nextPeople, nextLink] = await Promise.all([listRecordShares(rowId), ensureRecordShareLink(rowId)])
    setPeople(nextPeople); setLinkId(nextLink)
  }

  useEffect(() => {
    if (!open) return
    setLoading(true)
    void refresh().catch(() => push('Could not load record access.', 'error')).finally(() => setLoading(false))
  }, [open, rowId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function invite(event: React.FormEvent) {
    event.preventDefault()
    const cleanEmail = email.trim().toLowerCase()
    if (!EMAIL_RE.test(cleanEmail) || loading) return
    setLoading(true)
    try {
      const result = await sendRecordShareInvite(rowId, cleanEmail, permission)
      setLinkId(result.link_id); setEmail(''); await refresh(); push('Invitation email sent', 'success')
    } catch (error) { push(error instanceof Error ? error.message : 'Could not grant access.', 'error') }
    finally { setLoading(false) }
  }

  async function change(person: RecordSharePerson, next: RecordPermission) {
    if (!person.id) return
    setBusyId(person.id)
    try { await updateRecordShare(person.id, next); await refresh(); push('Permission updated', 'success') }
    catch { push('Could not update permission.', 'error') }
    finally { setBusyId(null) }
  }

  async function remove(person: RecordSharePerson) {
    if (!person.id || !window.confirm(`Remove access for ${person.email}?`)) return
    setBusyId(person.id)
    try { await revokeRecordShare(person.id); await refresh(); push('Access removed', 'success') }
    catch { push('Could not remove access.', 'error') }
    finally { setBusyId(null) }
  }

  async function copyLink() {
    try {
      const id = linkId ?? await ensureRecordShareLink(rowId)
      await navigator.clipboard.writeText(`${window.location.origin}/shared/record/${id}`)
      push('Link copied', 'success')
    } catch { push('Could not copy the link.', 'error') }
  }

  return <Modal open={open} onClose={onClose} title={`Share “${title}”`}>
    <form onSubmit={invite} className="flex gap-2">
      <input autoFocus type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" aria-label="Email address" className="h-9 min-w-0 flex-1 rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100" />
      <select value={permission} onChange={(event) => setPermission(event.target.value as RecordPermission)} aria-label="Permission" className="h-9 rounded-md border border-neutral-200 bg-white px-2 text-xs outline-none focus:ring-2 focus:ring-neutral-700">
        <option value="view">Can view</option><option value="edit">Can edit</option><option value="admin">Admin</option>
      </select>
      <Button type="submit" variant="primary" disabled={loading || !EMAIL_RE.test(email.trim())}>{loading ? 'Inviting…' : 'Invite'}</Button>
    </form>
    <div className="mt-5 border-t border-neutral-100 pt-4">
      <h3 className="text-xs font-semibold text-neutral-700">People with access</h3>
      <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
        {people.map((person) => <div key={person.id ?? `owner-${person.email}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-neutral-50">
          <Avatar size="sm" name={person.display_name} email={person.email} />
          <div className="min-w-0 flex-1"><div className="truncate text-xs font-medium text-neutral-800">{person.display_name || person.email}</div>{person.display_name ? <div className="truncate text-[11px] text-neutral-400">{person.email}</div> : null}</div>
          {person.is_owner ? <span className="text-xs text-neutral-400">Owner</span> : <>
            <select disabled={busyId === person.id} value={person.permission} onChange={(event) => void change(person, event.target.value as RecordPermission)} aria-label={`Permission for ${person.email}`} className="h-8 rounded-md border border-neutral-200 bg-white px-2 text-xs outline-none focus:ring-2 focus:ring-neutral-700"><option value="view">Can view</option><option value="edit">Can edit</option><option value="admin">Admin</option></select>
            <button type="button" disabled={busyId === person.id} onClick={() => void remove(person)} title="Remove access" aria-label={`Remove access for ${person.email}`} className="grid h-8 w-8 place-items-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-red-600"><MoreHorizontal size={15} /></button>
          </>}
        </div>)}
        {!loading && !people.length ? <p className="py-4 text-center text-xs text-neutral-400">No one else has access.</p> : null}
      </div>
    </div>
    <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-4"><div><div className="text-xs font-medium text-neutral-700">General access</div><div className="text-[11px] text-neutral-400">Restricted · Sign-in required</div></div><Button type="button" size="sm" onClick={() => void copyLink()}><Copy size={13} /> Copy link</Button></div>
  </Modal>
}

export { LABELS }
