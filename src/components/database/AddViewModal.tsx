import { useState } from 'react'
import type { ViewType } from '../../types/database.types'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'

export function AddViewModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (name: string, type: ViewType) => Promise<void> }) {
  const [name, setName] = useState('')
  const [type, setType] = useState<ViewType>('table')
  const [pending, setPending] = useState(false)
  return <Modal open={open} onClose={onClose} title="Create database view"><form className="space-y-4" onSubmit={async (event) => { event.preventDefault(); if (!name.trim()) return; setPending(true); try { await onCreate(name.trim(), type); setName(''); setType('table'); onClose() } finally { setPending(false) } }}><label className="block text-xs font-medium text-neutral-600">View name<Input autoFocus className="mt-1" value={name} onChange={(event) => setName(event.target.value)} placeholder="My view" /></label><label className="block text-xs font-medium text-neutral-600">Layout<select className="mt-1 h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm" value={type} onChange={(event) => setType(event.target.value as ViewType)}><option value="table">Table</option><option value="board">Board</option><option value="calendar">Calendar</option><option value="gallery">Gallery</option></select></label><div className="flex justify-end gap-2"><Button type="button" onClick={onClose}>Cancel</Button><Button variant="primary" type="submit" disabled={pending || !name.trim()}>{pending ? 'Creating…' : 'Create view'}</Button></div></form></Modal>
}
