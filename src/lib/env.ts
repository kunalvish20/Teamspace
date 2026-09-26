import { z } from 'zod'

const schema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  VITE_APP_URL: z.string().url().optional(),
  VITE_DEV_BYPASS_AUTH: z.enum(['true', 'false']).optional().default('false'),
})

const parsed = schema.safeParse(import.meta.env)

if (!parsed.success) {
  const missing = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')
  throw new Error(`Missing or invalid environment variables: ${missing}. Copy .env.example to .env.local.`)
}

export const env = parsed.data
