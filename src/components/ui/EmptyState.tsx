import type { ReactNode } from 'react'

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center border-t border-neutral-100 px-6 text-center">
      <div className="text-sm font-medium text-neutral-900">{title}</div>
      {description ? <p className="mt-1 max-w-md text-sm text-neutral-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
