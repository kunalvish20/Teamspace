import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, RotateCcw, SlidersHorizontal, X } from 'lucide-react'
import type { DatabaseProperty, DatabaseRow } from '../../types/database.types'
import type { MemberWithProfile } from '../../types/domain'
import { getDashboardRows } from '../../services/dashboard.service'
import { formatCurrency, formatDate } from '../../utils/format'
import { getCellValue, propertyConfig } from '../../utils/database'
import { Button } from '../ui/Button'
import { SkeletonTable } from '../ui/SkeletonTable'

type DateRange = 'all' | '7' | '30' | '90' | 'month' | 'quarter' | 'year'
type Filters = { stages: string[]; owner: string; dateRange: DateRange; minimumValue: string }
const EMPTY_FILTERS: Filters = { stages: [], owner: '', dateRange: 'all', minimumValue: '' }
const CLOSED_RE = /(^|\s)(won|closed|complete|completed)(\s|$)/i
const LOST_RE = /(^|\s)(lost|cancelled|canceled)(\s|$)/i
const CHART_COLORS = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#4b5563']

function nameMatches(property: DatabaseProperty, words: string[]) {
  const name = property.name.toLowerCase()
  return words.some((word) => name.includes(word))
}

function numericValue(row: DatabaseRow, property?: DatabaseProperty) {
  if (!property) return null
  const raw = getCellValue(row, property.id)
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  if (typeof raw === 'string') { const parsed = Number(raw.replace(/[^0-9.-]/g, '')); return Number.isFinite(parsed) ? parsed : null }
  return null
}

function compactCurrency(value: number, currency = 'INR') {
  if (currency === 'INR' && Math.abs(value) >= 100_000) return `₹${(value / 100_000).toFixed(value >= 1_000_000 ? 1 : 2).replace(/\.0+$/, '')}L`
  return formatCurrency(value, currency)
}

function startForRange(range: DateRange) {
  const now = new Date()
  if (range === 'all') return null
  if (range === '7' || range === '30' || range === '90') return new Date(now.getTime() - Number(range) * 86_400_000)
  if (range === 'month') return new Date(now.getFullYear(), now.getMonth(), 1)
  if (range === 'quarter') return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
  return new Date(now.getFullYear(), 0, 1)
}

export function DashboardView({ databaseId, workspaceId, properties, members, onOpenRow, onViewMain }: { databaseId: string; workspaceId: string; properties: DatabaseProperty[]; members: MemberWithProfile[]; onOpenRow: (row: DatabaseRow) => void; onViewMain: () => void }) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [moreOpen, setMoreOpen] = useState(false)
  const rowsQuery = useQuery({ queryKey: ['database', databaseId, 'dashboard', 'rows'], queryFn: () => getDashboardRows(databaseId, workspaceId) })

  const model = useMemo(() => {
    const title = properties.find((property) => property.property_type === 'title')
    const stage = properties.find((property) => property.property_type === 'select' && nameMatches(property, ['stage', 'status', 'pipeline'])) ?? properties.find((property) => property.property_type === 'select')
    const value = properties.find((property) => ['currency', 'number'].includes(property.property_type) && nameMatches(property, ['deal', 'revenue', 'value', 'amount'])) ?? properties.find((property) => ['currency', 'number'].includes(property.property_type))
    const owner = properties.find((property) => ['person', 'multi_person'].includes(property.property_type) && nameMatches(property, ['owner', 'assignee'])) ?? properties.find((property) => ['person', 'multi_person'].includes(property.property_type))
    const nextStep = properties.find((property) => ['text', 'date', 'datetime'].includes(property.property_type) && nameMatches(property, ['next step', 'follow', 'action']))
    const date = properties.find((property) => ['date', 'datetime'].includes(property.property_type) && nameMatches(property, ['close', 'due', 'date'])) ?? properties.find((property) => ['date', 'datetime'].includes(property.property_type))
    const stageOptions = stage ? propertyConfig(stage).options ?? [] : []
    const currency = value ? propertyConfig(value).currency ?? 'INR' : 'INR'
    return { title, stage, value, owner, nextStep, date, stageOptions, currency }
  }, [properties])

  const filteredRows = useMemo(() => (rowsQuery.data ?? []).filter((row) => {
    if (filters.stages.length && model.stage && !filters.stages.includes(String(getCellValue(row, model.stage.id) ?? ''))) return false
    if (filters.owner && model.owner) { const raw = getCellValue(row, model.owner.id); if (Array.isArray(raw) ? !raw.includes(filters.owner) : raw !== filters.owner) return false }
    const start = startForRange(filters.dateRange)
    if (start) { const raw = model.date ? getCellValue(row, model.date.id) : row.created_at; const time = new Date(String(raw ?? '')).getTime(); if (!Number.isFinite(time) || time < start.getTime()) return false }
    if (filters.minimumValue && model.value) { const value = numericValue(row, model.value); if (value === null || value < Number(filters.minimumValue)) return false }
    return true
  }), [rowsQuery.data, filters, model])

  const analytics = useMemo(() => {
    const stageLabel = (row: DatabaseRow) => { const id = model.stage ? String(getCellValue(row, model.stage.id) ?? '') : ''; return model.stageOptions.find((option) => option.id === id)?.label ?? id }
    const stageStats = model.stageOptions.map((option) => { const rows = filteredRows.filter((row) => getCellValue(row, model.stage?.id ?? '') === option.id); return { ...option, count: rows.length, value: rows.reduce((sum, row) => sum + (numericValue(row, model.value) ?? 0), 0) } })
    const values = filteredRows.flatMap((row) => { const value = numericValue(row, model.value); return value === null ? [] : [value] })
    const closedRows = filteredRows.filter((row) => CLOSED_RE.test(stageLabel(row)))
    const openRows = filteredRows.filter((row) => { const label = stageLabel(row); return !CLOSED_RE.test(label) && !LOST_RE.test(label) })
    const followUps = model.nextStep ? filteredRows.filter((row) => { const value = getCellValue(row, model.nextStep!.id); return value !== undefined && value !== null && value !== '' }) : []
    const dates = filteredRows.map((row) => new Date(row.created_at).getTime()).filter(Number.isFinite)
    const end = dates.length ? Math.max(...dates, Date.now()) : Date.now(); const start = dates.length ? Math.min(...dates, end - 6 * 86_400_000) : end - 6 * 86_400_000
    const bucketCount = 7; const span = Math.max(end - start, 1); const buckets = Array.from({ length: bucketCount }, (_, index) => ({ label: formatDate(new Date(start + (span * index) / (bucketCount - 1)).toISOString()).replace(/ \d{4}$/, ''), value: 0 }))
    for (const time of dates) { const index = Math.min(bucketCount - 1, Math.floor(((time - start) / span) * bucketCount)); buckets[index]!.value += 1 }
    return { stageStats, values, closedRows, openRows, followUps, buckets }
  }, [filteredRows, model])

  if (rowsQuery.isLoading) return <SkeletonTable />
  if (rowsQuery.error) return <div className="p-6 text-sm text-red-600">Could not load dashboard data.</div>
  const activeCount = filters.stages.length + (filters.owner ? 1 : 0) + (filters.dateRange !== 'all' ? 1 : 0) + (filters.minimumValue ? 1 : 0)
  const totalValue = analytics.values.reduce((sum, value) => sum + value, 0)
  const pipelineValue = analytics.openRows.reduce((sum, row) => sum + (numericValue(row, model.value) ?? 0), 0)
  const revenue = analytics.closedRows.reduce((sum, row) => sum + (numericValue(row, model.value) ?? 0), 0)
  const maxStageCount = Math.max(1, ...analytics.stageStats.map((stage) => stage.count))
  const maxStageValue = Math.max(1, ...analytics.stageStats.map((stage) => stage.value))
  const pieItems = analytics.stageStats.filter((stage) => stage.count > 0)
  const pieTotal = pieItems.reduce((sum, stage) => sum + stage.count, 0)
  let pieOffset = 0
  const pieSlices = pieItems.map((stage, index) => {
    const percent = pieTotal ? (stage.count / pieTotal) * 100 : 0
    const slice = { ...stage, color: CHART_COLORS[index % CHART_COLORS.length], offset: pieOffset, percent }
    pieOffset += percent
    return slice
  })
  const usefulProperties = [model.title, model.stage, model.value, properties.find((property) => property.property_type === 'email'), model.nextStep].filter((property, index, list): property is DatabaseProperty => Boolean(property) && list.indexOf(property) === index).slice(0, 5)

  function toggleStage(id: string) { setFilters((current) => ({ ...current, stages: current.stages.includes(id) ? current.stages.filter((item) => item !== id) : [...current.stages, id] })) }
  function valueText(row: DatabaseRow, property: DatabaseProperty) { const raw = getCellValue(row, property.id); if (raw === undefined || raw === null || raw === '') return '—'; if (property.property_type === 'currency') return formatCurrency(raw, propertyConfig(property).currency); if (property.property_type === 'select') return propertyConfig(property).options?.find((option) => option.id === raw)?.label ?? String(raw); if (property.property_type === 'date' || property.property_type === 'datetime') return formatDate(String(raw)); return Array.isArray(raw) ? raw.join(', ') : String(raw) }

  return <div className="p-4 sm:p-6 lg:p-7">
    <div className="flex flex-wrap items-center gap-2 border-b border-neutral-100 pb-5">
      <select value={filters.stages[0] ?? ''} onChange={(event) => setFilters((current) => ({ ...current, stages: event.target.value ? [event.target.value] : [] }))} className="h-8 rounded-md border border-neutral-200 bg-white px-2 text-xs"><option value="">All records</option>{model.stageOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select>
      <select value={filters.dateRange} onChange={(event) => setFilters((current) => ({ ...current, dateRange: event.target.value as DateRange }))} className="h-8 rounded-md border border-neutral-200 bg-white px-2 text-xs"><option value="all">Any date</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="month">This month</option><option value="quarter">This quarter</option><option value="year">This year</option></select>
      {model.owner ? <select value={filters.owner} onChange={(event) => setFilters((current) => ({ ...current, owner: event.target.value }))} className="h-8 rounded-md border border-neutral-200 bg-white px-2 text-xs"><option value="">All owners</option>{members.map((member) => <option key={member.user_id} value={member.user_id}>{member.profile?.full_name ?? member.profile?.email ?? 'Member'}</option>)}</select> : null}
      {model.value ? <div className="relative"><Button size="sm" onClick={() => setMoreOpen((open) => !open)}><SlidersHorizontal size={13} /> More filters</Button>{moreOpen ? <div className="absolute left-0 top-10 z-20 w-56 rounded-lg border border-neutral-200 bg-white p-3 shadow-panel"><label className="text-xs font-medium text-neutral-600">Minimum {model.value.name}<input type="number" min="0" value={filters.minimumValue} onChange={(event) => setFilters((current) => ({ ...current, minimumValue: event.target.value }))} className="mt-1 h-8 w-full rounded border border-neutral-200 px-2 text-xs" /></label></div> : null}</div> : null}
      {activeCount ? <Button size="sm" variant="ghost" onClick={() => setFilters(EMPTY_FILTERS)}><RotateCcw size={13} /> Reset</Button> : null}
    </div>

    {activeCount ? <div className="flex flex-wrap items-center gap-2 py-3 text-[11px] text-neutral-500"><span>Filtered by:</span>{filters.stages.map((id) => <button key={id} onClick={() => toggleStage(id)} className="flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-1">{model.stageOptions.find((option) => option.id === id)?.label ?? id}<X size={11} /></button>)}</div> : null}

    {!(rowsQuery.data?.length) ? <div className="grid min-h-80 place-items-center text-center"><div><h2 className="text-sm font-semibold text-neutral-800">No records yet</h2><p className="mt-1 text-xs text-neutral-400">Add records in Main view to see analytics here.</p><Button className="mt-4" size="sm" onClick={onViewMain}>Open Main view</Button></div></div> : <>
      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[['Total leads', String(filteredRows.length)], ['Pipeline value', model.value ? compactCurrency(pipelineValue, model.currency) : 'Not available'], ['Average deal', model.value && analytics.values.length ? compactCurrency(totalValue / analytics.values.length, model.currency) : 'Not available'], ['Follow-ups', model.nextStep ? String(analytics.followUps.length) : 'Not available'], ['Closed deals', model.stage ? String(analytics.closedRows.length) : 'Not available'], ['Revenue', model.stage && model.value ? compactCurrency(revenue, model.currency) : 'Not available']].map(([label, value]) => <div key={label} className="rounded-xl border border-neutral-200 bg-white p-4"><div className="text-[11px] font-medium text-neutral-500">{label}</div><div className="mt-2 truncate text-xl font-semibold tracking-tight text-neutral-900" title={value}>{value}</div></div>)}
      </section>

      {!filteredRows.length ? <div className="mt-6 rounded-xl border border-neutral-200 bg-white py-16 text-center"><h2 className="text-sm font-semibold text-neutral-800">No records match these filters.</h2><Button className="mt-3" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</Button></div> : <>
        {model.stage && model.stageOptions.length ? (
          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(280px,380px)_1fr]">
            <section className="rounded-xl border border-neutral-200 bg-white p-5">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">Pie chart</h2>
                <p className="mt-1 text-xs text-neutral-400">Record distribution by {model.stage.name}</p>
              </div>
              <div className="mt-5 grid gap-5 sm:grid-cols-[150px_1fr] sm:items-center">
                <div className="relative mx-auto h-36 w-36">
                  {pieSlices.length ? (
                    <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
                      <circle cx="50" cy="50" r="36" fill="none" stroke="#f3f4f6" strokeWidth="18" />
                      {pieSlices.map((slice) => {
                        const circumference = 2 * Math.PI * 36
                        return (
                          <circle
                            key={slice.id}
                            cx="50"
                            cy="50"
                            r="36"
                            fill="none"
                            stroke={slice.color}
                            strokeWidth="18"
                            strokeDasharray={`${(slice.percent / 100) * circumference} ${circumference}`}
                            strokeDashoffset={-(slice.offset / 100) * circumference}
                          />
                        )
                      })}
                    </svg>
                  ) : (
                    <div className="grid h-full w-full place-items-center rounded-full bg-neutral-50 text-center text-xs text-neutral-400">No stage data</div>
                  )}
                  {pieSlices.length ? (
                    <div className="absolute inset-0 grid place-items-center text-center">
                      <div>
                        <div className="text-xl font-semibold text-neutral-900">{pieTotal}</div>
                        <div className="text-[10px] uppercase text-neutral-400">records</div>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="space-y-2">
                  {pieSlices.map((slice) => (
                    <button key={slice.id} onClick={() => toggleStage(slice.id)} className="grid w-full grid-cols-[10px_1fr_auto] items-center gap-2 rounded px-1.5 py-1 text-left text-xs hover:bg-neutral-50">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                      <span className="min-w-0 truncate text-neutral-700">{slice.label}</span>
                      <span className="font-medium text-neutral-900">{Math.round(slice.percent)}%</span>
                    </button>
                  ))}
                  {!pieSlices.length ? <div className="text-xs text-neutral-400">Add records with {model.stage.name} selected to see the chart.</div> : null}
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-neutral-200 bg-white p-5">
              <div>
                <h2 className="text-sm font-semibold text-neutral-900">Pipeline flow</h2>
                <p className="mt-1 text-xs text-neutral-400">Current records across configured stages</p>
              </div>
              <div className="mt-5 flex min-w-0 gap-2 overflow-x-auto pb-2">{analytics.stageStats.map((stage, index) => <div key={stage.id} className="flex shrink-0 items-center"><button onClick={() => toggleStage(stage.id)} className="w-36 rounded-lg border border-neutral-200 px-3 py-3 text-left hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-700"><div className="truncate text-xs font-medium text-neutral-700">{stage.label}</div><div className="mt-2 text-lg font-semibold text-neutral-900">{stage.count}</div><div className="mt-0.5 text-[11px] text-neutral-400">{model.value ? compactCurrency(stage.value, model.currency) : 'Value unavailable'}</div></button>{index < analytics.stageStats.length - 1 ? <ArrowRight size={14} className="mx-1 text-neutral-300" /> : null}</div>)}</div>
            </section>
          </div>
        ) : null}

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <section className="rounded-xl border border-neutral-200 bg-white p-5"><h2 className="text-sm font-semibold text-neutral-900">Records created trend</h2><p className="mt-1 text-xs text-neutral-400">Based on actual record creation dates</p><div className="mt-5 flex h-44 items-end gap-2 border-b border-neutral-200">{analytics.buckets.map((bucket, index) => { const max = Math.max(1, ...analytics.buckets.map((item) => item.value)); return <div key={`${bucket.label}-${index}`} className="group flex h-full min-w-0 flex-1 flex-col justify-end"><div title={`${bucket.label}: ${bucket.value} records`} className="mx-auto w-full max-w-10 rounded-t bg-neutral-300 transition-colors group-hover:bg-neutral-500" style={{ height: `${Math.max(bucket.value ? 8 : 2, (bucket.value / max) * 100)}%` }} /><div className="mt-2 truncate text-center text-[9px] text-neutral-400">{bucket.label}</div></div>})}</div></section>
          {model.stage ? <section className="rounded-xl border border-neutral-200 bg-white p-5"><h2 className="text-sm font-semibold text-neutral-900">Records by stage</h2><div className="mt-5 space-y-3">{analytics.stageStats.map((stage) => <button key={stage.id} onClick={() => toggleStage(stage.id)} title={`${stage.label}: ${stage.count} records · ${filteredRows.length ? Math.round((stage.count / filteredRows.length) * 100) : 0}%`} className="grid w-full grid-cols-[100px_1fr_34px] items-center gap-3 text-left"><span className="truncate text-xs text-neutral-600">{stage.label}</span><span className="h-2 overflow-hidden rounded-full bg-neutral-100"><span className="block h-full rounded-full bg-neutral-500" style={{ width: `${(stage.count / maxStageCount) * 100}%` }} /></span><span className="text-right text-xs font-medium text-neutral-700">{stage.count}</span></button>)}</div></section> : null}
          {model.stage && model.value ? <section className="rounded-xl border border-neutral-200 bg-white p-5"><h2 className="text-sm font-semibold text-neutral-900">Deal value by stage</h2><div className="mt-5 space-y-3">{analytics.stageStats.map((stage) => <button key={stage.id} onClick={() => toggleStage(stage.id)} className="grid w-full grid-cols-[100px_1fr_72px] items-center gap-3 text-left"><span className="truncate text-xs text-neutral-600">{stage.label}</span><span className="h-2 overflow-hidden rounded-full bg-neutral-100"><span className="block h-full rounded-full bg-emerald-500/70" style={{ width: `${(stage.value / maxStageValue) * 100}%` }} /></span><span className="text-right text-[11px] font-medium text-neutral-700">{compactCurrency(stage.value, model.currency)}</span></button>)}</div></section> : null}
          {model.nextStep ? <section className="rounded-xl border border-neutral-200 bg-white p-5"><h2 className="text-sm font-semibold text-neutral-900">Upcoming / Next actions</h2><div className="mt-3 divide-y divide-neutral-100">{analytics.followUps.slice(0, 6).map((row) => <button key={row.id} onClick={() => onOpenRow(row)} className="flex w-full items-center gap-3 py-3 text-left hover:bg-neutral-50"><div className="min-w-0 flex-1"><div className="truncate text-xs font-medium text-neutral-800">{model.title ? valueText(row, model.title) : 'Untitled'}</div><div className="mt-1 truncate text-[11px] text-neutral-500">{valueText(row, model.nextStep!)}</div></div>{model.nextStep?.property_type === 'date' || model.nextStep?.property_type === 'datetime' ? <span className="text-[10px] text-neutral-400">{valueText(row, model.nextStep)}</span> : null}</button>)}{!analytics.followUps.length ? <div className="py-8 text-center text-xs text-neutral-400">No next actions in these records.</div> : null}</div></section> : null}
        </div>

        <section className="mt-6 overflow-hidden rounded-xl border border-neutral-200 bg-white"><div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4"><div><h2 className="text-sm font-semibold text-neutral-900">Records</h2><p className="mt-0.5 text-xs text-neutral-400">{filteredRows.length} result{filteredRows.length === 1 ? '' : 's'}</p></div><Button size="sm" onClick={onViewMain}>View all in Main view</Button></div><div className="overflow-x-auto"><div className="min-w-[640px]"><div className="grid border-b border-neutral-100 bg-neutral-50/70 text-[10px] font-medium uppercase tracking-wide text-neutral-400" style={{ gridTemplateColumns: `repeat(${usefulProperties.length}, minmax(120px, 1fr))` }}>{usefulProperties.map((property) => <div key={property.id} className="px-4 py-2">{property.name}</div>)}</div>{filteredRows.slice(0, 25).map((row) => <button key={row.id} onClick={() => onOpenRow(row)} className="grid w-full border-b border-neutral-100 text-left text-xs text-neutral-700 last:border-0 hover:bg-neutral-50" style={{ gridTemplateColumns: `repeat(${usefulProperties.length}, minmax(120px, 1fr))` }}>{usefulProperties.map((property) => <div key={property.id} className="truncate px-4 py-3">{valueText(row, property)}</div>)}</button>)}</div></div></section>
      </>}
    </>}
  </div>
}
