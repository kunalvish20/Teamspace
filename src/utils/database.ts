import type { DatabaseProperty, DatabaseRow, Json } from '../types/database.types'
import type { PropertyConfig, RowData, ViewFilter, ViewSort } from '../types/domain'

export function rowData(row: DatabaseRow): RowData {
  if (row.data && typeof row.data === 'object' && !Array.isArray(row.data)) return row.data as RowData
  return {}
}

export function propertyConfig(property: DatabaseProperty): PropertyConfig {
  if (!property.config || typeof property.config !== 'object' || Array.isArray(property.config)) return {}
  const config = property.config as Record<string, Json | undefined>
  const options = Array.isArray(config.options)
    ? config.options.flatMap((item) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return []
        const candidate = item as Record<string, Json | undefined>
        if (typeof candidate.id !== 'string' || typeof candidate.label !== 'string') return []
        return [{ id: candidate.id, label: candidate.label, color: typeof candidate.color === 'string' ? candidate.color : undefined }]
      })
    : undefined
  return {
    currency: typeof config.currency === 'string' ? config.currency : undefined,
    options,
  }
}

export function getCellValue(row: DatabaseRow, propertyId: string) {
  return rowData(row)[propertyId]
}

export function parseViewFilters(value: Json): ViewFilter[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const raw = item as Record<string, Json | undefined>
    if (typeof raw.propertyId !== 'string' || typeof raw.operator !== 'string') return []
    return [{ propertyId: raw.propertyId, operator: raw.operator as ViewFilter['operator'], value: raw.value }]
  })
}

export function parseViewSorts(value: Json): ViewSort[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return []
    const raw = item as Record<string, Json | undefined>
    if (typeof raw.propertyId !== 'string' || (raw.direction !== 'asc' && raw.direction !== 'desc')) return []
    return [{ propertyId: raw.propertyId, direction: raw.direction }]
  })
}

function scalar(value: Json | undefined): string | number | boolean | null {
  if (value === undefined || value === null) return null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.join(' ')
  return JSON.stringify(value)
}

export function matchesFilter(row: DatabaseRow, filter: ViewFilter) {
  const value = getCellValue(row, filter.propertyId)
  const needle = filter.value
  const text = String(scalar(value) ?? '').toLowerCase()
  const target = String(scalar(needle) ?? '').toLowerCase()
  switch (filter.operator) {
    case 'equals': return scalar(value) === scalar(needle)
    case 'not_equals': return scalar(value) !== scalar(needle)
    case 'contains': return text.includes(target)
    case 'is_empty': return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
    case 'is_not_empty': return !(value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0))
    case 'greater_than': return Number(value) > Number(needle)
    case 'less_than': return Number(value) < Number(needle)
    case 'before': return new Date(String(value)).getTime() < new Date(String(needle)).getTime()
    case 'after': return new Date(String(value)).getTime() > new Date(String(needle)).getTime()
    case 'on': return String(value).slice(0, 10) === String(needle).slice(0, 10)
    case 'contains_person': return Array.isArray(value) ? value.includes(needle as Json) : value === needle
    default: return true
  }
}

export function filterAndSortRows(rows: DatabaseRow[], properties: DatabaseProperty[], search: string, filters: ViewFilter[], sorts: ViewSort[]) {
  const propertyIds = properties.map((property) => property.id)
  const filtered = rows.filter((row) => {
    if (filters.some((filter) => !matchesFilter(row, filter))) return false
    if (!search.trim()) return true
    const query = search.toLowerCase()
    return propertyIds.some((id) => {
      const value = getCellValue(row, id)
      if (Array.isArray(value)) return value.join(' ').toLowerCase().includes(query)
      if (typeof value === 'string' || typeof value === 'number') return String(value).toLowerCase().includes(query)
      return false
    })
  })

  if (!sorts.length) return filtered
  return [...filtered].sort((a, b) => {
    for (const sort of sorts) {
      const left = scalar(getCellValue(a, sort.propertyId))
      const right = scalar(getCellValue(b, sort.propertyId))
      if (left === right) continue
      const direction = sort.direction === 'asc' ? 1 : -1
      if (left === null) return 1 * direction
      if (right === null) return -1 * direction
      if (typeof left === 'number' && typeof right === 'number') return (left - right) * direction
      return String(left).localeCompare(String(right)) * direction
    }
    return 0
  })
}
