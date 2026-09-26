import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'
import { useAuth } from '../features/auth/AuthProvider'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Avatar } from '../components/ui/Avatar'
import { useToast } from '../components/ui/Toast'

export function ProfilePage() {
  const { user, bypass, updatePassword } = useAuth()
  const { push } = useToast()
  const [name, setName] = useState((user?.user_metadata.full_name as string | undefined) ?? '')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  if (!user) return null
  async function saveProfile() {
    if (!user || !name.trim()) return
    setPending(true)
    try {
      const { error: profileError } = await supabase.from('profiles').update({ full_name: name.trim() }).eq('id', user.id)
      if (profileError) throw profileError
      const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim() } })
      if (error) throw error
      push('Profile saved.', 'success')
    } catch { push('Could not save your profile.', 'error') } finally { setPending(false) }
  }
  async function savePassword() {
    if (password.length < 8) return
    setPending(true)
    try { await updatePassword(password); setPassword(''); push('Password updated.', 'success') }
    catch { push('Could not update your password.', 'error') }
    finally { setPending(false) }
  }
  return <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 md:py-10"><Link to="/app" className="text-xs text-neutral-500 hover:text-neutral-900">← Workspaces</Link><h1 className="mt-3 text-2xl font-semibold tracking-tight">My profile</h1><p className="mt-1 text-sm text-neutral-500">Manage your personal account details.</p><div className="mt-8 flex items-center gap-4"><Avatar name={name} email={user.email} url={user.user_metadata.avatar_url as string | undefined} /><div className="min-w-0"><div className="truncate text-sm font-medium">{name || user.email}</div><div className="truncate text-xs text-neutral-500">{user.email}</div></div></div><section className="mt-8 space-y-4 rounded-xl border border-neutral-200 p-5"><h2 className="text-sm font-semibold">Profile</h2><label className="block text-sm font-medium">Name<Input className="mt-1" maxLength={120} value={name} onChange={(event) => setName(event.target.value)} disabled={bypass} /></label><label className="block text-sm font-medium">Email<Input className="mt-1" value={user.email ?? ''} disabled /></label>{!bypass ? <Button variant="primary" onClick={() => void saveProfile()} disabled={!name.trim() || pending}>Save profile</Button> : <p className="text-xs text-neutral-500">Profile changes are unavailable in development bypass mode.</p>}</section>{!bypass ? <section className="mt-6 space-y-4 rounded-xl border border-neutral-200 p-5"><h2 className="text-sm font-semibold">Password</h2><label className="block text-sm font-medium">New password<Input type="password" minLength={8} className="mt-1" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /></label><Button onClick={() => void savePassword()} disabled={password.length < 8 || pending}>Update password</Button></section> : null}</div>
}
