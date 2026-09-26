import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ToastItem { id: number; message: string; kind: 'success' | 'error' | 'info' }
interface ToastApi { push: (message: string, kind?: ToastItem['kind']) => void }
const ToastContext = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const push = useCallback((message: string, kind: ToastItem['kind'] = 'info') => {
    const id = Date.now() + Math.random()
    setItems((current) => [...current, { id, message, kind }])
    window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 3500)
  }, [])
  const value = useMemo(() => ({ push }), [push])
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
        {items.map((item) => (
          <div key={item.id} className={`flex items-start gap-3 rounded-lg border bg-white px-3 py-2.5 text-sm shadow-panel ${item.kind === 'error' ? 'border-red-200' : 'border-neutral-200'}`}>
            <span className="flex-1 text-neutral-800">{item.message}</span>
            <button onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} className="text-neutral-400 hover:text-neutral-700"><X size={14} /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast must be used inside ToastProvider')
  return value
}
