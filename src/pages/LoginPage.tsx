import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound, Mail, RefreshCw } from 'lucide-react'
import { useAuth } from '../features/auth/AuthProvider'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Spinner } from '../components/ui/Spinner'
import { useToast } from '../components/ui/Toast'

export function LoginPage() {
  const { user, signInWithOtp, verifyOtp } = useAuth()
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [pending, setPending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const otpInputRef = useRef<HTMLInputElement>(null)
  const { push } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()

  const redirect = params.get('redirect') || (location.state as { from?: string } | null)?.from || '/app'

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  useEffect(() => {
    if (step === 'otp') {
      window.setTimeout(() => {
        otpInputRef.current?.focus()
      }, 100)
    }
  }, [step])

  if (user) return <Navigate to={redirect} replace />

  async function handleSendEmail(event?: React.FormEvent) {
    if (event) event.preventDefault()
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail) return

    setPending(true)
    try {
      await signInWithOtp(trimmedEmail)
      setStep('otp')
      setResendCooldown(60)
      push(`Verification code sent to ${trimmedEmail}`, 'success')
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not send verification code.', 'error')
    } finally {
      setPending(false)
    }
  }

  async function handleVerifyOtp(event?: React.FormEvent, customCode?: string) {
    if (event) event.preventDefault()
    const code = (customCode ?? otp).trim()
    if (code.length !== 6) {
      push('Please enter the complete 6-digit code.', 'error')
      return
    }

    setPending(true)
    try {
      await verifyOtp(email.trim().toLowerCase(), code)
      push('Signed in successfully!', 'success')
      navigate(redirect, { replace: true })
    } catch (error) {
      push(error instanceof Error ? error.message : 'Invalid or expired verification code.', 'error')
    } finally {
      setPending(false)
    }
  }

  function handleOtpChange(value: string) {
    // Only allow digits, max 6 chars
    const cleaned = value.replace(/\D/g, '').slice(0, 6)
    setOtp(cleaned)
    if (cleaned.length === 6) {
      void handleVerifyOtp(undefined, cleaned)
    }
  }

  return (
    <AuthShell
      title={step === 'email' ? 'Welcome to Teamspace' : 'Check your email'}
      subtitle={
        step === 'email'
          ? 'Enter your email to sign in or create your workspace.'
          : `We sent a 6-digit verification code to ${email}`
      }
      icon={step === 'email' ? <Mail size={20} /> : <KeyRound size={20} />}
    >
      {step === 'email' ? (
        <form onSubmit={handleSendEmail} className="space-y-4">
          <label className="block text-xs font-medium text-neutral-700">
            Email address
            <div className="relative mt-1.5">
              <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <Input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="h-10 pl-9 pr-3 text-sm transition-all focus:border-neutral-900"
                disabled={pending}
              />
            </div>
          </label>

          <Button
            type="submit"
            variant="primary"
            className="w-full h-10 text-sm font-medium gap-2 justify-center shadow-xs"
            disabled={!email.trim() || pending}
          >
            {pending ? (
              <>
                <Spinner className="h-4 w-4" /> Sending code…
              </>
            ) : (
              <>
                Continue with Email <ArrowRight size={15} />
              </>
            )}
          </Button>

          <div className="rounded-lg bg-neutral-50 p-3 text-center border border-neutral-100">
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              We’ll email you a 6-digit one-time code. No passwords required. Works for both existing and new accounts.
            </p>
          </div>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2 text-xs border border-neutral-200/60">
            <div className="flex items-center gap-1.5 text-neutral-600 truncate">
              <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
              <span className="truncate font-medium">{email}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep('email')
                setOtp('')
              }}
              className="text-[11px] font-medium text-neutral-700 hover:text-neutral-900 underline ml-2 shrink-0"
            >
              Change
            </button>
          </div>

          <label className="block text-xs font-medium text-neutral-700">
            6-digit verification code
            <div className="relative mt-1.5">
              <Input
                ref={otpInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => handleOtpChange(e.target.value)}
                placeholder="123456"
                className="h-12 text-center text-2xl font-mono tracking-[0.5em] font-semibold transition-all focus:border-neutral-900"
                disabled={pending}
              />
            </div>
          </label>

          <Button
            type="submit"
            variant="primary"
            className="w-full h-10 text-sm font-medium gap-2 justify-center shadow-xs"
            disabled={otp.trim().length !== 6 || pending}
          >
            {pending ? (
              <>
                <Spinner className="h-4 w-4" /> Verifying…
              </>
            ) : (
              'Verify & Sign In'
            )}
          </Button>

          <div className="flex items-center justify-between pt-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setStep('email')
                setOtp('')
              }}
              className="flex items-center gap-1 text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              <ArrowLeft size={13} /> Back
            </button>

            {resendCooldown > 0 ? (
              <span className="text-[11px] text-neutral-400">
                Resend code in {resendCooldown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={() => void handleSendEmail()}
                disabled={pending}
                className="flex items-center gap-1 font-medium text-neutral-800 hover:text-neutral-950 transition-colors"
              >
                <RefreshCw size={12} className={pending ? 'animate-spin' : ''} /> Resend code
              </button>
            )}
          </div>
        </form>
      )}
    </AuthShell>
  )
}

export function AuthShell({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string
  subtitle: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#fafafa] px-4 py-8 sm:px-6">
      <div className="w-full max-w-[400px] rounded-2xl border border-neutral-200/80 bg-white p-6 sm:p-8 shadow-sm transition-all">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-neutral-900 text-white shadow-xs">
            {icon || <span className="text-base font-bold">W</span>}
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-neutral-900">{title}</h1>
          <p className="mt-1.5 text-xs sm:text-sm text-neutral-500 leading-normal">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  )
}
