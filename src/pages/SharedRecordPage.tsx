import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Share2 } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { DatabaseCell } from '../components/database/DatabaseCell'
import { RecordShareDialog } from '../components/database/RecordShareDialog'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { useToast } from '../components/ui/Toast'
import { addSharedRecordComment, getSharedRecord, updateSharedRecordValue } from '../services/record-share.service'
import { getCellValue, propertyConfig } from '../utils/database'
import { formatCurrency, formatDate } from '../utils/format'
import type { DatabaseProperty, DatabaseRow, Json } from '../types/database.types'

function valueText(row: DatabaseRow, property: DatabaseProperty) {
  const value = getCellValue(row, property.id)
  if (value === undefined || value === null || value === '') return '—'
  if (property.property_type === 'checkbox') return value === true ? 'Yes' : 'No'
  if (property.property_type === 'currency') return formatCurrency(value, propertyConfig(property).currency)
  if (property.property_type === 'date' || property.property_type === 'datetime') return formatDate(String(value))
  if (property.property_type === 'select') return propertyConfig(property).options?.find((option) => option.id === value)?.label ?? String(value)
  if (property.property_type === 'person') return 'Member'
  if (property.property_type === 'multi_person') return Array.isArray(value) && value.length ? 'Members' : '—'
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

export function SharedRecordPage() {
  const { shareId = '' } = useParams()
  const queryClient = useQueryClient()
  const { push } = useToast()
  const [comment, setComment] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const key = ['shared-record', shareId] as const
  const record = useQuery({ queryKey: key, queryFn: () => getSharedRecord(shareId), retry: false, refetchInterval: 15_000 })
  const bundle = record.data
  const titleProperty = bundle?.properties.find((property) => property.property_type === 'title')
  const title = bundle && titleProperty ? valueText(bundle.row, titleProperty) : 'Record'
  const canEdit = bundle?.permission === 'edit' || bundle?.permission === 'admin'
  const members = useMemo(() => [], [])

  const update = useMutation({
    mutationFn: ({ propertyId, value }: { propertyId: string; value: Json | undefined }) => updateSharedRecordValue(shareId, propertyId, value),
    onSuccess: (row) => queryClient.setQueryData(key, (current: typeof bundle) => current ? { ...current, row } : current),
    onError: () => push('Could not update this record.', 'error'),
  })
  const addComment = useMutation({
    mutationFn: () => addSharedRecordComment(shareId, comment.trim()),
    onSuccess: async () => { setComment(''); await queryClient.invalidateQueries({ queryKey: key }) },
    onError: () => push('Could not add comment.', 'error'),
  })

  if (record.isLoading) return <div className="grid min-h-screen place-items-center"><Spinner className="h-5 w-5 text-neutral-400" /></div>
  if (record.isError) {
    const unauthorized = record.error instanceof Error && record.error.message === 'unauthorized'
    return <div className="grid min-h-screen place-items-center bg-neutral-50 px-6"><div className="text-center"><h1 className="text-lg font-semibold text-neutral-900">{unauthorized ? 'You don’t have access to this record.' : 'This record is no longer available.'}</h1><p className="mt-2 text-sm text-neutral-500">Contact the record owner if you believe this is a mistake.</p></div></div>
  }
  if (!bundle) return <div className="grid min-h-screen place-items-center bg-neutral-50 px-6"><h1 className="text-lg font-semibold text-neutral-900">This record is no longer available.</h1></div>

  return <div className="min-h-screen bg-neutral-50">
    <header className="border-b border-neutral-200 bg-white"><div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-5"><div className="text-sm font-semibold text-neutral-900">TeamSpace</div><span className="text-neutral-300">/</span><span className="min-w-0 flex-1 truncate text-xs text-neutral-500">{bundle.workspaceName}</span><span className="rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-medium text-neutral-600">{bundle.permission === 'view' ? 'Can view' : bundle.permission === 'edit' ? 'Can edit' : 'Admin'}</span>{bundle.permission === 'admin' ? <Button size="sm" onClick={() => setShareOpen(true)}><Share2 size={13} /> Share</Button> : null}</div></header>
    <main className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
      <div className="text-xs font-medium text-neutral-400">{bundle.databaseName}</div>
      <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight text-neutral-900">{title}</h1>
      <div className="mt-8 overflow-hidden rounded-xl border border-neutral-200 bg-white">
        {bundle.properties.map((property) => <div key={property.id} className="grid min-h-12 border-b border-neutral-100 last:border-b-0 sm:grid-cols-[180px_1fr]">
          <div className="flex items-center bg-neutral-50/70 px-4 py-3 text-xs font-medium text-neutral-500">{property.name}</div>
          <div className="min-w-0 px-2 py-1 text-sm text-neutral-800">{canEdit ? <DatabaseCell row={bundle.row} property={property} members={members} onCommit={(_row, propertyId, value) => update.mutate({ propertyId, value })} /> : <div className="px-2 py-2 break-words">{valueText(bundle.row, property)}</div>}</div>
        </div>)}
      </div>
      <section className="mt-10 border-t border-neutral-200 pt-7"><h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-800"><MessageSquare size={15} /> Comments</h2><div className="mt-5 space-y-4">{bundle.comments.map((entry) => <div key={entry.id} className="flex gap-3"><Avatar size="sm" name={entry.authorName} email={entry.authorEmail} /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-medium text-neutral-700">{entry.authorName || entry.authorEmail || 'Member'}</span><span className="text-[10px] text-neutral-400">{formatDate(entry.created_at)}</span></div><p className="mt-1 whitespace-pre-wrap break-words text-sm text-neutral-700">{entry.body}</p></div></div>)}{!bundle.comments.length ? <p className="text-xs text-neutral-400">No comments yet.</p> : null}</div>
        {canEdit ? <div className="mt-5 flex gap-2"><input value={comment} onChange={(event) => setComment(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && comment.trim() && !addComment.isPending) addComment.mutate() }} placeholder="Add a comment…" className="h-9 min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100" /><Button variant="primary" size="sm" disabled={!comment.trim() || addComment.isPending} onClick={() => addComment.mutate()}>{addComment.isPending ? 'Sending…' : 'Send'}</Button></div> : null}
      </section>
    </main>
    <RecordShareDialog open={shareOpen} rowId={bundle.row.id} title={title} onClose={() => setShareOpen(false)} />
  </div>
}
