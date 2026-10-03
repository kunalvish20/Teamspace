import { type FormEvent, type PointerEvent as ReactPointerEvent, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  DollarSign,
  GripVertical,
  Hash,
  Link,
  List,
  Mail,
  Phone,
  Type,
  UserRound,
  UsersRound,
} from 'lucide-react'
import type { DatabaseProperty } from '../../types/database.types'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'

const icons = {
  title: Type,
  text: Type,
  number: Hash,
  currency: DollarSign,
  phone: Phone,
  email: Mail,
  date: CalendarDays,
  datetime: CalendarDays,
  select: List,
  multi_select: List,
  checkbox: CheckSquare,
  person: UserRound,
  multi_person: UsersRound,
  url: Link,
}

export function PropertyHeader({
  property,
  canEdit,
  canMoveLeft,
  canMoveRight,
  onRename,
  onConfigure,
  onArchive,
  onMoveLeft,
  onMoveRight,
  onPointerReorder,
  isDragging,
  isDropTarget,
}: {
  property: DatabaseProperty
  canEdit: boolean
  canMoveLeft: boolean
  canMoveRight: boolean
  onRename: (name: string) => void
  onConfigure: () => void
  onArchive: () => void
  onMoveLeft: () => void
  onMoveRight: () => void
  onPointerReorder?: (event: ReactPointerEvent<HTMLButtonElement>) => void
  isDragging?: boolean
  isDropTarget?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState(property.name)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const Icon = icons[property.property_type] ?? AtSign

  function handleOpenRename() {
    setOpen(false)
    setRenameValue(property.name)
    setRenameOpen(true)
  }

  function handleSaveRename(event: FormEvent) {
    event.preventDefault()
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== property.name) {
      onRename(trimmed)
    }
    setRenameOpen(false)
  }

  function handleOpenDelete() {
    setOpen(false)
    setDeleteOpen(true)
  }

  function handleConfirmDelete() {
    setDeleteOpen(false)
    onArchive()
  }

  return (
    <>
      <div
        data-property-drop-id={property.id}
        className={`relative flex h-full items-center gap-1.5 px-2 text-xs font-medium text-neutral-500 ${isDragging ? 'opacity-45' : ''} ${isDropTarget ? 'bg-blue-50 text-blue-700' : ''}`}
      >
        {canEdit ? (
          <button
            type="button"
            onPointerDown={onPointerReorder}
            title="Drag to reorder"
            aria-label={`Drag ${property.name} property`}
            className="cursor-grab rounded p-0.5 text-neutral-300 hover:bg-neutral-200 hover:text-neutral-600 active:cursor-grabbing"
          >
            <GripVertical size={13} />
          </button>
        ) : null}
        <Icon size={13} className="shrink-0 text-neutral-400" />
        <span className="min-w-0 flex-1 truncate">{property.name}</span>
        {canEdit ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="rounded p-0.5 text-neutral-300 hover:bg-neutral-200 hover:text-neutral-600"
            aria-label={`Options for ${property.name}`}
          >
            <ChevronDown size={13} />
          </button>
        ) : null}

        {open ? (
          <div className="absolute right-1 top-8 z-30 w-44 rounded-lg border border-neutral-200 bg-white p-1 shadow-panel">
            <Button
              variant="ghost"
              className="w-full justify-start"
              size="sm"
              onClick={handleOpenRename}
            >
              Rename property
            </Button>
            {['select', 'multi_select', 'currency'].includes(property.property_type) ? (
              <Button
                variant="ghost"
                className="w-full justify-start"
                size="sm"
                onClick={() => {
                  setOpen(false)
                  onConfigure()
                }}
              >
                Configure property
              </Button>
            ) : null}
            <div className="flex gap-1 px-1 py-1">
              <Button
                title="Move left"
                variant="ghost"
                size="sm"
                className="flex-1"
                disabled={!canMoveLeft}
                onClick={() => {
                  setOpen(false)
                  onMoveLeft()
                }}
              >
                <ArrowLeft size={13} />
              </Button>
              <Button
                title="Move right"
                variant="ghost"
                size="sm"
                className="flex-1"
                disabled={!canMoveRight}
                onClick={() => {
                  setOpen(false)
                  onMoveRight()
                }}
              >
                <ArrowRight size={13} />
              </Button>
            </div>
            {property.property_type !== 'title' ? (
              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
                size="sm"
                onClick={handleOpenDelete}
              >
                Delete property
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Centered Rename Property Modal */}
      <Modal open={renameOpen} onClose={() => setRenameOpen(false)} title="Rename property">
        <form className="space-y-4" onSubmit={handleSaveRename}>
          <label className="block text-xs font-medium text-neutral-600">
            Property name
            <Input
              autoFocus
              className="mt-1"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Enter property name"
              maxLength={80}
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={!renameValue.trim() || renameValue.trim() === property.name}
            >
              Save
            </Button>
          </div>
        </form>
      </Modal>

      {/* Centered Delete Property Modal */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete property">
        <p className="text-sm text-neutral-600">
          Delete <strong className="font-semibold text-neutral-900">“{property.name}”</strong>? Existing values will become hidden.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" type="button" onClick={handleConfirmDelete}>
            Delete property
          </Button>
        </div>
      </Modal>
    </>
  )
}
