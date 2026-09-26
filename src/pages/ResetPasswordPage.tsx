import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useToast } from '../components/ui/Toast'
import { AuthShell } from './LoginPage'

export function ResetPasswordPage() {
  const { updatePassword } = useAuth(); const { push } = useToast(); const navigate = useNavigate(); const [password, setPassword] = useState(''); const [pending, setPending] = useState(false)
  return <AuthShell title="Choose a new password" subtitle="Use at least 8 characters."><form onSubmit={async (event) => { event.preventDefault(); setPending(true); try { await updatePassword(password); push('Password updated.', 'success'); navigate('/app') } catch (error) { push(error instanceof Error ? error.message : 'Could not update password.', 'error') } finally { setPending(false) } }} className="space-y-3"><Input type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} /><Button type="submit" variant="primary" className="w-full" disabled={pending}>{pending ? 'Updating…' : 'Update password'}</Button></form></AuthShell>
}
