export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return <span className={`${className} inline-block animate-spin rounded-full border-2 border-current border-r-transparent`} aria-label="Loading" />
}
