import { initials } from '../../utils/format'

export function Avatar({ name, email, url, size = 'md' }: { name?: string | null; email?: string | null; url?: string | null; size?: 'sm' | 'md' }) {
  const dimension = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs'
  if (url) return <img src={url} alt="" className={`${dimension} rounded-full object-cover`} />
  return <div className={`${dimension} grid shrink-0 place-items-center rounded-full bg-neutral-200 font-semibold text-neutral-700`}>{initials(name, email)}</div>
}
