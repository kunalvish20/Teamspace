import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useToast } from '../components/ui/Toast'
import { AuthShell } from './LoginPage'

export function ForgotPasswordPage() {
  const { sendPasswordReset } = useAuth(); const { push } = useToast(); const [email, setEmail] = useState(''); const [pending, setPending] = useState(false)
  return <AuthShell title="Reset password" subtitle="We’ll email you a secure reset link."><form onSubmit={async (event) => { event.preventDefault(); setPending(true); try { await sendPasswordReset(email); push('Password reset email sent.', 'success') } catch (error) { push(error instanceof Error ? error.message : 'Could not send reset email.', 'error') } finally { setPending(false) } }} className="space-y-3"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" /><Button variant="primary" type="submit" className="w-full" disabled={pending}>{pending ? 'Sending…' : 'Send reset link'}</Button></form><div className="mt-4 text-center"><Link to="/login" className="text-xs text-neutral-500 hover:text-neutral-900">Back to sign in</Link></div></AuthShell>
}
