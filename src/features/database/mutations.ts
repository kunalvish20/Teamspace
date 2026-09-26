import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import type { DatabaseRow, Json } from '../../types/database.types'
import { archiveRow, createRow, updateRowData } from '../../services/database.service'
import { useToast } from '../../components/ui/Toast'
import { devBypassEnabled } from '../../lib/dev-bypass'

function patchRow(data: InfiniteData<DatabaseRow[], number> | undefined, row: DatabaseRow) {
  if (!data) return data
  return { ...data, pages: data.pages.map((page) => page.map((item) => item.id === row.id ? row : item)) }
}

function removeRow(data: InfiniteData<DatabaseRow[], number> | undefined, rowId: string) {
  if (!data) return data
  return { ...data, pages: data.pages.map((page) => page.filter((item) => item.id !== rowId)) }
}

export function useRowMutations(databaseId: string) {
  const queryClient = useQueryClient()
  const { push } = useToast()
  const rowPrefix = ['database', databaseId, 'rows'] as const

  const update = useMutation({
    mutationFn: ({ row, propertyId, value }: { row: DatabaseRow; propertyId: string; value: Json | undefined }) => updateRowData(row, propertyId, value),
    onMutate: async ({ row, propertyId, value }) => {
      await queryClient.cancelQueries({ queryKey: rowPrefix })
      const snapshots = queryClient.getQueriesData<InfiniteData<DatabaseRow[], number>>({ queryKey: rowPrefix })
      const source = row.data && typeof row.data === 'object' && !Array.isArray(row.data) ? row.data : {}
      const nextData = { ...source }
      if (value === undefined || value === null || value === '') delete nextData[propertyId]
      else nextData[propertyId] = value
      const optimistic = { ...row, data: nextData, updated_at: new Date().toISOString() }
      queryClient.setQueriesData<InfiniteData<DatabaseRow[], number>>({ queryKey: rowPrefix }, (current) => patchRow(current, optimistic))
      return { snapshots }
    },
    onError: (_error, _variables, context) => {
      context?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data))
      push('Cell update failed. Your change was rolled back.', 'error')
    },
    onSuccess: (saved) => { queryClient.setQueriesData<InfiniteData<DatabaseRow[], number>>({ queryKey: rowPrefix }, (current) => patchRow(current, saved)); if (devBypassEnabled) void queryClient.invalidateQueries({ queryKey: rowPrefix }); void queryClient.invalidateQueries({ queryKey: ['database', databaseId, 'dashboard'] }) },
  })

  const create = useMutation({
    mutationFn: createRow,
    onSuccess: (row) => {
      queryClient.setQueriesData<InfiniteData<DatabaseRow[], number>>({ queryKey: rowPrefix }, (current) => {
        if (!current) return current
        if (current.pages.some((page) => page.some((item) => item.id === row.id))) return current
        const pages = current.pages.map((page) => [...page])
        const firstPage = pages[0] ?? []
        pages[0] = [...firstPage, row]
        return { ...current, pages }
      })
    },
    onError: () => push('Could not create a new record.', 'error'),
    onSettled: () => { void queryClient.invalidateQueries({ queryKey: ['database', databaseId, 'dashboard'] }) },
  })

  const archive = useMutation({
    mutationFn: archiveRow,
    onMutate: async (row) => {
      await queryClient.cancelQueries({ queryKey: rowPrefix })
      const snapshots = queryClient.getQueriesData<InfiniteData<DatabaseRow[], number>>({ queryKey: rowPrefix })
      queryClient.setQueriesData<InfiniteData<DatabaseRow[], number>>({ queryKey: rowPrefix }, (current) => removeRow(current, row.id))
      return { snapshots }
    },
    onError: (_error, _row, context) => {
      context?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data))
      push('Could not archive the record.', 'error')
    },
    onSettled: () => { void queryClient.invalidateQueries({ queryKey: ['database', databaseId, 'dashboard'] }) },
  })

  return { update, create, archive }
}
