import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Users, Trash2 } from 'lucide-react'
import { useWorkspaceOutlet } from '../features/workspace/useWorkspaceOutlet'
import { useWorkspaceMembers, useWorkspacePermissions } from '../features/workspace/queries'
import { canUseWorkspaceAction } from '../utils/permissions'
import { teamKeys, useTeamMembers, useTeams } from '../features/teams/queries'
import { addTeamMember, createTeam, deleteTeam, removeTeamMember, updateTeam } from '../services/team.service'
import { useAuth } from '../features/auth/AuthProvider'
import type { Team } from '../types/database.types'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Avatar } from '../components/ui/Avatar'
import { useToast } from '../components/ui/Toast'

export function TeamsPage() {
  const { workspace, role } = useWorkspaceOutlet()
  const { teamId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { push } = useToast()
  const teams = useTeams(workspace.id)
  const team = teams.data?.find((item) => item.id === teamId)
  const teamMembers = useTeamMembers(workspace.id, teamId)
  const workspaceMembers = useWorkspaceMembers(teamId ? workspace.id : undefined)
  const permissions = useWorkspacePermissions(workspace.id)
  const [editing, setEditing] = useState<Team | 'new' | null>(null)
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [search, setSearch] = useState('')
  const canManage = role === 'OWNER' || role === 'ADMIN' || (team?.created_by === user?.id)
  const canCreate = canUseWorkspaceAction(role, permissions.data, 'create_team')
  useEffect(() => {
    if (canCreate && searchParams.get('create') === '1') {
      setEditing('new')
      setSearchParams({}, { replace: true })
    }
  }, [canCreate, searchParams, setSearchParams])
  const refresh = async () => { await queryClient.invalidateQueries({ queryKey: teamKeys.list(workspace.id) }); if (teamId) await queryClient.invalidateQueries({ queryKey: teamKeys.members(workspace.id, teamId) }) }
  const save = useMutation({ mutationFn: async (input: { name: string; description: string; icon: string }) => {
    if (editing && editing !== 'new') return updateTeam(editing.id, workspace.id, input)
    if (!user) throw new Error('Sign in to create a team.')
    return createTeam({ workspaceId: workspace.id, userId: user.id, ...input })
  }, onSuccess: async (result) => { await refresh(); setEditing(null); push('Team saved.', 'success'); navigate(`/app/${workspace.slug}/teams/${result.id}`) }, onError: (error) => push(error instanceof Error ? error.message : 'Could not save team.', 'error') })
  const remove = useMutation({ mutationFn: async () => { if (teamId) await deleteTeam(teamId, workspace.id) }, onSuccess: async () => { await refresh(); setDeleting(false); push('Team deleted.', 'success'); navigate(`/app/${workspace.slug}/teams`) }, onError: (error) => push(error instanceof Error ? error.message : 'Could not delete team.', 'error') })
  const addMember = useMutation({ mutationFn: (userId: string) => addTeamMember(teamId ?? '', workspace.id, userId), onSuccess: async () => { await refresh(); push('Member added to team.', 'success') }, onError: (error) => push(error instanceof Error ? error.message : 'Could not add member.', 'error') })
  const removeMember = useMutation({ mutationFn: (userId: string) => removeTeamMember(teamId ?? '', workspace.id, userId), onSuccess: async () => { await refresh(); push('Member removed from team.', 'success') }, onError: (error) => push(error instanceof Error ? error.message : 'Could not remove member.', 'error') })
  const assigned = new Set(teamMembers.data?.map((item) => item.user_id) ?? [])
  const available = (workspaceMembers.data ?? []).filter((item) => !assigned.has(item.user_id) && `${item.profile?.full_name ?? ''} ${item.profile?.email ?? ''}`.toLowerCase().includes(search.toLowerCase()))

  return <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 md:py-10">
    {teamId ? <Link to={`/app/${workspace.slug}/teams`} className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900"><ArrowLeft size={14} /> Teams</Link> : null}
    <header className="mt-2 flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{team ? <><span aria-hidden="true">{team.icon || '◌'} </span>{team.name}</> : 'Teams'}</h1><p className="mt-1 text-sm text-neutral-500">{team ? team.description || 'People working together in this workspace.' : 'Organize people who already have workspace access.'}</p></div>
      {team && canManage ? <div className="flex gap-2"><Button onClick={() => setEditing(team)}>Edit team</Button><Button variant="danger" onClick={() => setDeleting(true)} aria-label="Delete team"><Trash2 size={15} /></Button></div> : !team && canCreate ? <Button variant="primary" onClick={() => setEditing('new')}><Plus size={15} /> Create team</Button> : null}
    </header>
    {teams.isPending ? <div className="mt-8 h-24 animate-pulse rounded-xl bg-neutral-100" role="status" aria-label="Loading teams" /> : teams.isError ? <div className="mt-8 rounded-xl border border-neutral-200 p-5 text-sm">Could not load teams. <Button size="sm" onClick={() => void teams.refetch()}>Try again</Button></div> : teamId && !team ? <p className="mt-8 text-sm text-neutral-500">This team is unavailable.</p> : team ? <>
      <div className="mt-8 flex items-center justify-between"><h2 className="text-sm font-semibold">Members <span className="font-normal text-neutral-500">{teamMembers.data?.length ?? 0}</span></h2>{canManage ? <Button size="sm" onClick={() => setAdding(true)}><Plus size={14} /> Add members</Button> : null}</div>
      {teamMembers.isPending || workspaceMembers.isPending ? <div className="mt-4 h-20 animate-pulse rounded-xl bg-neutral-100" role="status" aria-label="Loading members" /> : teamMembers.isError || workspaceMembers.isError ? <p className="mt-4 text-sm text-red-600">Could not load team members.</p> : teamMembers.data?.length ? <div className="mt-4 divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200">{teamMembers.data.map((item) => { const member = workspaceMembers.data?.find((entry) => entry.user_id === item.user_id); return <div key={item.user_id} className="flex items-center gap-3 px-4 py-3"><Avatar name={member?.profile?.full_name} email={member?.profile?.email} url={member?.profile?.avatar_url} /><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{member?.profile?.full_name || member?.profile?.email || 'Workspace member'}</div><div className="truncate text-xs text-neutral-500">{member?.profile?.email}</div></div>{canManage ? <Button size="sm" variant="ghost" onClick={() => removeMember.mutate(item.user_id)} disabled={removeMember.isPending}>Remove</Button> : null}</div> })}</div> : <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-600">No members in this team yet. {canManage ? 'Add people who already belong to this workspace.' : ''}</div>}
    </> : teams.data?.length ? <div className="mt-8 grid gap-3 sm:grid-cols-2">{teams.data.map((item) => <Link key={item.id} to={`/app/${workspace.slug}/teams/${item.id}`} className="flex items-center gap-3 rounded-xl border border-neutral-200 p-4 transition-colors hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700"><span className="grid h-9 w-9 place-items-center rounded-lg bg-neutral-100 text-lg" aria-hidden="true">{item.icon || <Users size={17} />}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{item.name}</span><span className="block truncate text-xs text-neutral-500">{item.description || 'Workspace team'}</span></span></Link>)}</div> : <div className="mt-8 rounded-xl border border-neutral-200 bg-neutral-50 px-6 py-10 text-center"><Users size={22} className="mx-auto text-neutral-400" /><h2 className="mt-3 text-sm font-semibold">No teams yet</h2><p className="mt-1 text-sm text-neutral-500">Create a team to organize people and shared work.</p>{canCreate ? <Button className="mt-5" onClick={() => setEditing('new')}>Create team</Button> : null}</div>}
    {editing ? <TeamForm initial={editing !== 'new' ? editing : null} pending={save.isPending} onClose={() => setEditing(null)} onSave={(input) => save.mutate(input)} /> : null}
    <Modal open={adding} onClose={() => { setAdding(false); setSearch('') }} title="Add workspace members"><div className="space-y-4"><p className="text-sm text-neutral-600">Choose people who already have workspace access.</p><Input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search members" aria-label="Search workspace members" /><div className="max-h-60 divide-y divide-neutral-100 overflow-y-auto">{available.map((member) => <div key={member.user_id} className="flex items-center gap-3 py-2"><Avatar name={member.profile?.full_name} email={member.profile?.email} /><span className="min-w-0 flex-1 truncate text-sm">{member.profile?.full_name || member.profile?.email}</span><Button size="sm" disabled={addMember.isPending} onClick={() => addMember.mutate(member.user_id)}>Add</Button></div>)}{!available.length ? <p className="py-4 text-sm text-neutral-500">No available members match. Invite new people from Members first.</p> : null}</div><Button onClick={() => setAdding(false)}>Done</Button></div></Modal>
    <Modal open={deleting} onClose={() => setDeleting(false)} title="Delete team"><p className="text-sm text-neutral-600">Delete {team?.name}? Members keep their workspace access.</p><div className="mt-6 flex justify-end gap-2"><Button onClick={() => setDeleting(false)}>Cancel</Button><Button variant="danger" disabled={remove.isPending} onClick={() => remove.mutate()}>{remove.isPending ? 'Deleting…' : 'Delete team'}</Button></div></Modal>
  </div>
}

function TeamForm({ initial, pending, onClose, onSave }: { initial: Team | null; pending: boolean; onClose: () => void; onSave: (value: { name: string; description: string; icon: string }) => void }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? '')
  return <Modal open onClose={onClose} title={initial ? 'Edit team' : 'Create team'}><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); onSave({ name, description, icon }) }}><label className="block text-xs font-medium text-neutral-600">Team name<Input autoFocus maxLength={120} className="mt-1" value={name} onChange={(event) => setName(event.target.value)} placeholder="Design" /></label><label className="block text-xs font-medium text-neutral-600">Icon (optional)<Input maxLength={16} className="mt-1" value={icon} onChange={(event) => setIcon(event.target.value)} placeholder="👥" /></label><label className="block text-xs font-medium text-neutral-600">Description (optional)<Input maxLength={500} className="mt-1" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What this team works on" /></label><div className="flex justify-end gap-2"><Button type="button" onClick={onClose}>Cancel</Button><Button type="submit" variant="primary" disabled={!name.trim() || pending}>{pending ? 'Saving…' : initial ? 'Save team' : 'Create team'}</Button></div></form></Modal>
}
