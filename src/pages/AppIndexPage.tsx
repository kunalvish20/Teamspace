import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useWorkspaces, workspaceKeys } from '../features/workspace/queries'
import { createWorkspace } from '../services/workspace.service'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Spinner } from '../components/ui/Spinner'
import { useToast } from '../components/ui/Toast'

export function AppIndexPage() {
  const { data, isLoading } = useWorkspaces(); const [name, setName] = useState(''); const [pending, setPending] = useState(false); const navigate = useNavigate(); const queryClient = useQueryClient(); const { push } = useToast()
  if (isLoading) return <div className="grid min-h-screen place-items-center"><Spinner className="h-5 w-5 text-neutral-500" /></div>
  if (data?.[0]) return <Navigate to={`/app/${data[0].slug}`} replace />
  return <div className="grid min-h-screen place-items-center bg-[#fafafa] px-4"><div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-7 shadow-sm"><div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">First run</div><h1 className="mt-2 text-2xl font-semibold tracking-tight">Create your workspace</h1><p className="mt-2 text-sm text-neutral-500">Start with an empty workspace. You can add pages and collections when you’re ready.</p><form className="mt-6 space-y-3" onSubmit={async (event) => { event.preventDefault(); setPending(true); try { const created = await createWorkspace(name.trim()); await queryClient.invalidateQueries({ queryKey: workspaceKeys.all }); navigate(`/app/${created.workspace_slug}`) } catch (error) { push(error instanceof Error ? error.message : 'Workspace creation failed.', 'error') } finally { setPending(false) } }}><Input autoFocus required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Company workspace" /><Button type="submit" variant="primary" className="w-full" disabled={!name.trim() || pending}>{pending ? 'Creating…' : 'Create workspace'}</Button></form></div></div>
}
