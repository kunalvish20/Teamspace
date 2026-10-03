import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Eye, Filter, GripVertical, Search, SlidersHorizontal, SortAsc, X } from 'lucide-react'
import type { DatabaseProperty, DatabaseView, Json } from '../../types/database.types'
import type { ViewFilter, ViewSort } from '../../types/domain'
import { parseViewFilters, parseViewSorts, propertyConfig } from '../../utils/database'
import { Button } from '../ui/Button'
import { usePropertyPointerReorder } from './usePropertyPointerReorder'

interface Props {
  search: string
  onSearch: (value: string) => void
  view: DatabaseView
  properties: DatabaseProperty[]
  canWrite: boolean
  onPatchView: (patch: Partial<Pick<DatabaseView, 'filters' | 'sorts' | 'visible_property_ids'>>) => void
  onAddProperty: () => void
  onReorderProperties: (sourceId: string, targetId: string) => void
}

export function DatabaseToolbar({ search, onSearch, view, properties, canWrite, onPatchView, onAddProperty, onReorderProperties }: Props) {
  const [panel, setPanel] = useState<'filter' | 'sort' | 'properties' | null>(null)
  const pointerReorder = usePropertyPointerReorder(canWrite, onReorderProperties)
  const filters = useMemo(() => parseViewFilters(view.filters), [view.filters])
  const sorts = useMemo(() => parseViewSorts(view.sorts), [view.sorts])
  const visibleIds = Array.isArray(view.visible_property_ids) ? view.visible_property_ids.filter((value): value is string => typeof value === 'string') : []
  const [filterProperty, setFilterProperty] = useState(properties[0]?.id ?? '')
  const [filterOperator, setFilterOperator] = useState<ViewFilter['operator']>('equals')
  const [filterValue, setFilterValue] = useState('')
  const [sortProperty, setSortProperty] = useState(properties[0]?.id ?? '')
  const [sortDirection, setSortDirection] = useState<ViewSort['direction']>('asc')
  const selectedFilterProperty = properties.find((property) => property.id === filterProperty)
  const options = selectedFilterProperty ? propertyConfig(selectedFilterProperty).options ?? [] : []

  function addFilter() {
    if (!filterProperty) return
    const emptyOperator = filterOperator === 'is_empty' || filterOperator === 'is_not_empty'
    const value: Json | undefined = emptyOperator ? undefined : filterValue
    onPatchView({ filters: [...filters, { propertyId: filterProperty, operator: filterOperator, value }] as unknown as Json })
    setFilterValue('')
  }
  function addSort() {
    if (!sortProperty) return
    const next = [...sorts.filter((sort) => sort.propertyId !== sortProperty), { propertyId: sortProperty, direction: sortDirection }]
    onPatchView({ sorts: next as unknown as Json })
  }
  function toggleProperty(id: string) {
    const all = properties.map((property) => property.id)
    const current = visibleIds.length ? visibleIds : all
    const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    onPatchView({ visible_property_ids: next as unknown as Json })
  }
  return (
    <div className="relative flex flex-wrap items-center gap-1.5 border-b border-neutral-200 px-3 sm:px-5 py-2">
      <div className="relative mr-auto min-w-32 max-w-sm flex-1 md:flex-none md:w-64"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search this view" className="h-8 w-full rounded-md border border-transparent bg-neutral-50 pl-8 pr-2 text-xs outline-none focus:border-neutral-200 focus:bg-white" /></div>
      <Button size="sm" variant="ghost" onClick={() => setPanel(panel === 'filter' ? null : 'filter')}><Filter size={14} /> Filter {filters.length ? <span className="rounded bg-neutral-200 px-1 text-[10px]">{filters.length}</span> : null}</Button>
      <Button size="sm" variant="ghost" onClick={() => setPanel(panel === 'sort' ? null : 'sort')}><SortAsc size={14} /> Sort {sorts.length ? <span className="rounded bg-neutral-200 px-1 text-[10px]">{sorts.length}</span> : null}</Button>
      <Button size="sm" variant="ghost" onClick={() => setPanel(panel === 'properties' ? null : 'properties')}><Eye size={14} /> Properties</Button>

      {panel ? (
        <div className="absolute left-3 right-3 top-12 z-30 md:left-auto md:right-5 md:top-11 w-auto md:w-[420px] max-h-[calc(100vh-120px)] overflow-y-auto rounded-lg border border-neutral-200 bg-white p-3 shadow-panel">
          <div className="mb-2 flex items-center justify-between"><span className="text-xs font-semibold text-neutral-700">{panel === 'filter' ? 'Filters' : panel === 'sort' ? 'Sorts' : 'Properties'}</span><button onClick={() => setPanel(null)} className="text-neutral-400"><X size={14} /></button></div>
          {panel === 'filter' ? <div className="space-y-2">
            {filters.map((filter, index) => <div key={`${filter.propertyId}-${index}`} className="flex items-center gap-2 rounded bg-neutral-50 px-2 py-1.5 text-xs"><span className="truncate">{properties.find((property) => property.id === filter.propertyId)?.name ?? 'Property'} · {filter.operator.replace('_', ' ')}</span><button className="ml-auto text-neutral-400 hover:text-red-600" onClick={() => onPatchView({ filters: filters.filter((_, itemIndex) => itemIndex !== index) as unknown as Json })}><X size={13} /></button></div>)}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2"><select value={filterProperty} onChange={(event) => setFilterProperty(event.target.value)} className="h-8 rounded border border-neutral-200 px-2 text-xs">{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select><select value={filterOperator} onChange={(event) => setFilterOperator(event.target.value as ViewFilter['operator'])} className="h-8 rounded border border-neutral-200 px-2 text-xs"><option value="equals">equals</option><option value="not_equals">not equals</option><option value="contains">contains</option><option value="is_empty">is empty</option><option value="is_not_empty">is not empty</option><option value="greater_than">greater than</option><option value="less_than">less than</option><option value="before">before</option><option value="after">after</option><option value="on">on</option><option value="contains_person">contains person</option></select>{options.length ? <select value={filterValue} onChange={(event) => setFilterValue(event.target.value)} className="h-8 rounded border border-neutral-200 px-2 text-xs"><option value="">Choose…</option>{options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select> : <input value={filterValue} onChange={(event) => setFilterValue(event.target.value)} className="h-8 rounded border border-neutral-200 px-2 text-xs" placeholder="Value" />}</div>
            <Button size="sm" onClick={addFilter} disabled={!canWrite}>Add filter</Button>
          </div> : null}
          {panel === 'sort' ? <div className="space-y-2">{sorts.map((sort, index) => <div key={`${sort.propertyId}-${index}`} className="flex items-center gap-2 rounded bg-neutral-50 px-2 py-1.5 text-xs"><span>{properties.find((property) => property.id === sort.propertyId)?.name ?? 'Property'} · {sort.direction}</span><button className="ml-auto text-neutral-400 hover:text-red-600" onClick={() => onPatchView({ sorts: sorts.filter((_, itemIndex) => itemIndex !== index) as unknown as Json })}><X size={13} /></button></div>)}<div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><select value={sortProperty} onChange={(event) => setSortProperty(event.target.value)} className="h-8 rounded border border-neutral-200 px-2 text-xs">{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select><select value={sortDirection} onChange={(event) => setSortDirection(event.target.value as ViewSort['direction'])} className="h-8 rounded border border-neutral-200 px-2 text-xs"><option value="asc">Ascending</option><option value="desc">Descending</option></select></div><Button size="sm" onClick={addSort} disabled={!canWrite}>Add sort</Button></div> : null}
          {panel === 'properties' ? (
            <div className="space-y-1">
              {properties.map((property, index) => {
                const visible = !visibleIds.length || visibleIds.includes(property.id)
                const previous = properties[index - 1]
                const next = properties[index + 1]
                const isDragging = pointerReorder.draggingId === property.id
                const isDropTarget = pointerReorder.activeTargetId === property.id
                return (
                  <label
                    key={property.id}
                    data-property-drop-id={property.id}
                    className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-neutral-50 ${isDragging ? 'opacity-45' : ''} ${isDropTarget ? 'bg-blue-50 text-blue-700' : ''}`}
                  >
                    {canWrite ? (
                      <button
                        type="button"
                        onPointerDown={(event) => pointerReorder.startPointerDrag(event, property.id)}
                        title="Drag to reorder"
                        aria-label={`Drag ${property.name} property`}
                        className="cursor-grab rounded p-0.5 text-neutral-300 hover:bg-neutral-200 hover:text-neutral-600 active:cursor-grabbing"
                      >
                        <GripVertical size={13} />
                      </button>
                    ) : null}
                    <input type="checkbox" disabled={property.property_type === 'title' || !canWrite} checked={visible} onChange={() => toggleProperty(property.id)} />
                    <span className="min-w-0 flex-1 truncate">{property.name}</span>
                    {canWrite ? (
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          title="Move up"
                          disabled={!previous}
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            if (previous) onReorderProperties(property.id, previous.id)
                          }}
                          className="rounded p-0.5 text-neutral-300 hover:bg-neutral-200 hover:text-neutral-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-300"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          title="Move down"
                          disabled={!next}
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            if (next) onReorderProperties(property.id, next.id)
                          }}
                          className="rounded p-0.5 text-neutral-300 hover:bg-neutral-200 hover:text-neutral-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-neutral-300"
                        >
                          <ArrowDown size={13} />
                        </button>
                      </div>
                    ) : null}
                  </label>
                )
              })}
              {canWrite ? <Button size="sm" className="mt-2" onClick={onAddProperty}><SlidersHorizontal size={13} /> Add property</Button> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
