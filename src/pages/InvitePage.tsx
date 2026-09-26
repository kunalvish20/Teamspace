import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { acceptWorkspaceInvite, previewWorkspaceInvite } from '../services/member.service'
import { useAuth } from '../features/auth/AuthProvider'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useToast } from '../components/ui/Toast'
import { AuthShell } from './LoginPage'

export function InvitePage() {
  const { token } = useParams()
  const { user, loading, updatePassword } = useAuth()
  const navigate = useNavigate()
  const { push } = useToast()
  const preview = useQuery({ queryKey: ['invitation-preview', token], queryFn: () => previewWorkspaceInvite(token ?? ''), enabled: Boolean(token), retry: false })
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  if (!token) return <AuthShell title="Invalid invitation" subtitle="The invitation link is incomplete."><Link className="text-sm font-medium" to="/app">Go to app</Link></AuthShell>
  if (preview.isPending || loading) return <AuthShell title="Checking invitation" subtitle="One moment while we verify this link."><div className="h-10 animate-pulse rounded-lg bg-neutral-100" role="status" aria-label="Checking invitation" /></AuthShell>
  if (preview.isError || !preview.data?.available) return <AuthShell title="Invitation unavailable" subtitle="This invitation has expired, been cancelled, or already been used."><Link to="/app" className="text-sm font-medium underline underline-offset-2">Go to your workspaces</Link></AuthShell>
  const invitation = preview.data
  if (!user) {
    const redirect = `/invite/${encodeURIComponent(token)}`
    return <AuthShell title={`Join ${invitation.workspaceName}`} subtitle={`${invitation.inviterName || 'A workspace member'} invited you as ${invitation.role.toLowerCase()}. Sign in with the email that received this invitation.`}><div className="space-y-2"><Link to={`/login?redirect=${encodeURIComponent(redirect)}`} className="block"><Button variant="primary" className="w-full">Sign in to join</Button></Link><Link to={`/signup?redirect=${encodeURIComponent(redirect)}`} className="block"><Button className="w-full">Create account</Button></Link></div></AuthShell>
  }
  const needsPassword = user.user_metadata.workspace_invite === true
  async function accept() {
    if (needsPassword && password.length < 8) { push('Set a password with at least 8 characters first.', 'error'); return }
    setPending(true)
    try {
      if (needsPassword) await updatePassword(password)
      const result = await acceptWorkspaceInvite(token!)
      push(`Welcome to ${invitation.workspaceName}.`, 'success')
      navigate(`/app/${result.workspaceSlug}`, { replace: true })
    } catch (error) { push(error instanceof Error ? error.message : 'Could not accept invitation.', 'error') }
    finally { setPending(false) }
  }
  return <AuthShell title={`Join ${invitation.workspaceName}`} subtitle={`${invitation.inviterName || 'A workspace member'} invited you as ${invitation.role.toLowerCase()}.`}><div className="space-y-4"><div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">Signed in as <span className="font-medium text-neutral-900">{user.email}</span></div>{needsPassword ? <label className="block text-xs font-medium text-neutral-600">Set your password<Input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1" placeholder="At least 8 characters" /></label> : null}<Button variant="primary" className="w-full" disabled={pending || (needsPassword && password.length < 8)} onClick={() => void accept()}>{pending ? 'Joining…' : needsPassword ? 'Set password and join' : 'Join workspace'}</Button><p className="text-xs text-neutral-500">Use the invited email address. If this is a different account, sign out and try again.</p></div></AuthShell>
}
