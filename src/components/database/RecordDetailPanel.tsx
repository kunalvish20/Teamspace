import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock, MessageSquare, Share2, UserRound, X } from 'lucide-react'
import type { DatabaseProperty, DatabaseRow } from '../../types/database.types'
import type { MemberWithProfile } from '../../types/domain'
import { addComment, listComments } from '../../services/database.service'
import { databaseKeys } from '../../features/database/queries'
import { getCellValue, propertyConfig } from '../../utils/database'
import { formatCurrency, formatDate } from '../../utils/format'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'
import { RecordShareDialog } from './RecordShareDialog'

function displayValue(row: DatabaseRow, property: DatabaseProperty, members: MemberWithProfile[]) {
  const value = getCellValue(row, property.id)
  if (value === undefined || value === null || value === '') return '—'
  if (property.property_type === 'checkbox') return value === true ? 'Yes' : 'No'
  if (property.property_type === 'currency') return formatCurrency(value, propertyConfig(property).currency)
  if (property.property_type === 'date' || property.property_type === 'datetime') return formatDate(String(value))
  if (property.property_type === 'select') return propertyConfig(property).options?.find((option) => option.id === value)?.label ?? String(value)
  if (property.property_type === 'person') return members.find((member) => member.user_id === value)?.profile?.full_name ?? 'Member'
  if (property.property_type === 'multi_person' && Array.isArray(value)) return value.map((id) => members.find((member) => member.user_id === id)?.profile?.full_name).filter(Boolean).join(', ') || '—'
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

export function RecordDetailPanel({ row, properties, members, userId, canShare, onClose }: { row: DatabaseRow | null; properties: DatabaseProperty[]; members: MemberWithProfile[]; userId: string; canShare: boolean; onClose: () => void }) {
  const [comment, setComment] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const queryClient = useQueryClient()
  const { push } = useToast()
  const titleProperty = properties.find((property) => property.property_type === 'title')
  const title = row && titleProperty ? displayValue(row, titleProperty, members) : 'Record'
  const comments = useQuery({ queryKey: databaseKeys.comments(row?.id ?? ''), queryFn: () => listComments(row?.id ?? ''), enabled: Boolean(row) })
  const memberMap = useMemo(() => new Map(members.map((member) => [member.user_id, member])), [members])
  const add = useMutation({
    mutationFn: async () => {
      if (!row || !comment.trim()) throw new Error('Comment is required')
      return addComment({ workspaceId: row.workspace_id, databaseId: row.database_id, rowId: row.id, userId, body: comment.trim() })
    },
    onSuccess: async () => { setComment(''); await queryClient.invalidateQueries({ queryKey: databaseKeys.comments(row?.id ?? '') }) },
    onError: () => push('Could not add comment.', 'error'),
  })
  if (!row) return null
  const createdBy = memberMap.get(row.created_by)
  return (
    <div className="animate-peek-overlay fixed inset-0 z-40 bg-black/15 md:left-auto md:w-[440px]" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="animate-side-peek-in ml-auto flex h-full w-full flex-col border-l border-neutral-200 bg-white shadow-panel md:w-[440px]">
        <div className="flex items-start gap-3 border-b border-neutral-100 px-5 py-4"><div className="min-w-0 flex-1"><div className="text-xs text-neutral-400">Record</div><h2 className="mt-1 truncate text-lg font-semibold text-neutral-900">{title}</h2></div>{canShare ? <Button size="sm" onClick={() => setShareOpen(true)}><Share2 size={13} /> Share</Button> : null}<button onClick={onClose} aria-label="Close record" className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100"><X size={17} /></button></div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-1">{properties.slice(0, 10).map((property) => <div key={property.id} className="grid grid-cols-[140px_1fr] gap-3 rounded px-2 py-2 text-sm hover:bg-neutral-50"><div className="truncate text-neutral-400">{property.name}</div><div className="min-w-0 break-words text-neutral-800">{displayValue(row, property, members)}</div></div>)}</div>
          <div className="mt-6 border-t border-neutral-100 pt-5"><div className="mb-3 flex items-center gap-2 text-xs font-semibold text-neutral-600"><MessageSquare size={14} /> Comments</div><div className="space-y-3">{comments.data?.map((entry) => { const member = memberMap.get(entry.user_id); return <div key={entry.id} className="flex gap-2.5"><Avatar size="sm" name={member?.profile?.full_name} email={member?.profile?.email} url={member?.profile?.avatar_url} /><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="text-xs font-medium text-neutral-700">{member?.profile?.full_name ?? member?.profile?.email ?? 'Member'}</span><span className="text-[10px] text-neutral-400">{formatDate(entry.created_at)}</span></div><p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">{entry.body}</p></div></div> })}{!comments.isLoading && !comments.data?.length ? <div className="text-xs text-neutral-400">No comments yet.</div> : null}</div><div className="mt-4 flex gap-2"><input value={comment} onChange={(event) => setComment(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && comment.trim()) void add.mutateAsync() }} placeholder="Add a comment…" className="h-9 flex-1 rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-400" /><Button size="sm" variant="primary" disabled={!comment.trim() || add.isPending} onClick={() => add.mutate()}>Send</Button></div></div>
          <div className="mt-6 border-t border-neutral-100 pt-5 text-xs text-neutral-400"><div className="flex items-center gap-2 py-1"><UserRound size={13} /> Created by {createdBy?.profile?.full_name ?? createdBy?.profile?.email ?? 'member'}</div><div className="flex items-center gap-2 py-1"><Clock size={13} /> Created {formatDate(row.created_at)} · Updated {formatDate(row.updated_at)}</div></div>
        </div>
      </aside>
      {canShare ? <RecordShareDialog open={shareOpen} rowId={row.id} title={title} onClose={() => setShareOpen(false)} /> : null}
    </div>
  )
}
