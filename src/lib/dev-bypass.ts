import { env } from './env'

// Intentionally restricted to Vite development mode. A production build will
// always use real Supabase Auth/RLS even if someone forgets to remove the env flag.
export const devBypassEnabled = import.meta.env.DEV && env.VITE_DEV_BYPASS_AUTH === 'true'

export const DEV_BYPASS_USER_ID = '11111111-1111-4111-8111-111111111111'
export const DEV_BYPASS_EMAIL = 'dev.owner@example.local'
export const DEV_BYPASS_NAME = 'Dev Owner'
