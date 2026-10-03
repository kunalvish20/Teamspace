import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

type DragState = {
  propertyId: string
  startX: number
  startY: number
  dragging: boolean
}

const DROP_SELECTOR = '[data-property-drop-id]'

export function usePropertyPointerReorder(enabled: boolean, onReorder: (sourceId: string, targetId: string) => void) {
  const dragRef = useRef<DragState | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null)

  const cleanup = useCallback(() => {
    cleanupRef.current?.()
    cleanupRef.current = null
    dragRef.current = null
    setDraggingId(null)
    setActiveTargetId(null)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  useEffect(() => cleanup, [cleanup])

  const getDropTargetId = useCallback((clientX: number, clientY: number) => {
    for (const element of document.elementsFromPoint(clientX, clientY)) {
      const target = element.closest<HTMLElement>(DROP_SELECTOR)
      const targetId = target?.dataset.propertyDropId
      if (targetId) return targetId
    }
    return null
  }, [])

  const startPointerDrag = useCallback((event: ReactPointerEvent<HTMLElement>, propertyId: string) => {
    if (!enabled || event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture?.(event.pointerId)

    dragRef.current = { propertyId, startX: event.clientX, startY: event.clientY, dragging: false }

    const pointerId = event.pointerId
    const handleMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return
      const drag = dragRef.current
      if (!drag) return
      const distance = Math.abs(moveEvent.clientX - drag.startX) + Math.abs(moveEvent.clientY - drag.startY)
      if (!drag.dragging && distance > 4) {
        drag.dragging = true
        setDraggingId(drag.propertyId)
        document.body.style.cursor = 'grabbing'
        document.body.style.userSelect = 'none'
      }
      if (drag.dragging) {
        moveEvent.preventDefault()
        const targetId = getDropTargetId(moveEvent.clientX, moveEvent.clientY)
        setActiveTargetId(targetId && targetId !== drag.propertyId ? targetId : null)
      }
    }

    const handleEnd = (endEvent: PointerEvent) => {
      if (endEvent.pointerId !== pointerId) return
      const drag = dragRef.current
      const targetId = getDropTargetId(endEvent.clientX, endEvent.clientY)
      cleanup()
      if (drag?.dragging && targetId && targetId !== drag.propertyId) onReorder(drag.propertyId, targetId)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleEnd)
    window.addEventListener('pointercancel', handleEnd)
    cleanupRef.current = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleEnd)
      window.removeEventListener('pointercancel', handleEnd)
    }
  }, [cleanup, enabled, getDropTargetId, onReorder])

  return { activeTargetId, draggingId, startPointerDrag }
}
