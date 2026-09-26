import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../utils/cn'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

export function Button({ className, variant = 'secondary', size = 'md', ...props }: Props) {
  const variants = {
    primary: 'bg-neutral-900 text-white hover:bg-neutral-800 border-neutral-900',
    secondary: 'bg-white text-neutral-700 hover:bg-neutral-50 border-neutral-200',
    ghost: 'bg-transparent text-neutral-600 hover:bg-neutral-100 border-transparent',
    danger: 'bg-white text-red-600 hover:bg-red-50 border-red-200',
  }
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md border font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none',
        size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3 text-sm',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}
