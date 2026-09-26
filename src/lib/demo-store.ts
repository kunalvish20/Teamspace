import type {
  DatabaseProperty,
  DatabaseRow,
  DatabaseView,
  Json,
  Profile,
  RowComment,
  Workspace,
  WorkspaceDatabase,
  WorkspaceInvite,
  WorkspaceMember,
  WorkspaceRole,
  WorkspacePage,
  PageBlock,
  PageFavorite,
  ViewType,
  Team,
  TeamMember,
  WorkspaceSettings,
} from '../types/database.types'
import type { MemberWithProfile, ViewFilter, ViewSort } from '../types/domain'
import { DEV_BYPASS_USER_ID } from './dev-bypass'

const STORAGE_KEY = 'notion-workspace-crm:dev-bypass:v2'
const LEGACY_STORAGE_KEY = 'notion-workspace-crm:dev-bypass:v1'
const SEEDED_DATABASE_ID = '33333333-3333-4333-8333-333333333333'
const SEEDED_PAGE_ID = '99999999-9999-4999-8999-999999999991'

interface DemoStore {
  workspaces: Workspace[]
  databases: WorkspaceDatabase[]
  properties: DatabaseProperty[]
  views: DatabaseView[]
  rows: DatabaseRow[]
  profiles: Profile[]
  members: WorkspaceMember[]
  invites: WorkspaceInvite[]
  comments: RowComment[]
  pages: WorkspacePage[]
  blocks: PageBlock[]
  favorites: PageFavorite[]
  teams: Team[]
  teamMembers: TeamMember[]
  settings: WorkspaceSettings[]
}

function iso(offsetDays = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return date.toISOString()
}

function makeInitialStore(): DemoStore {
  return {
    workspaces: [],
    databases: [],
    properties: [],
    views: [],
    rows: [],
    profiles: [],
    members: [],
    invites: [],
    comments: [],
    pages: [],
    blocks: [],
    favorites: [],
    teams: [],
    teamMembers: [],
    settings: [],
  }
}

function readStore(): DemoStore {
  if (typeof window === 'undefined') return makeInitialStore()
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacy) {
      try {
        const previous = JSON.parse(legacy) as DemoStore
        const migrated: DemoStore = {
          ...makeInitialStore(),
          ...previous,
          databases: previous.databases.filter((item) => item.id !== SEEDED_DATABASE_ID),
          properties: previous.properties.filter((item) => item.database_id !== SEEDED_DATABASE_ID),
          views: previous.views.filter((item) => item.database_id !== SEEDED_DATABASE_ID),
          rows: previous.rows.filter((item) => item.database_id !== SEEDED_DATABASE_ID),
          comments: previous.comments.filter((item) => item.database_id !== SEEDED_DATABASE_ID),
          pages: previous.pages.filter((item) => item.id !== SEEDED_PAGE_ID),
          blocks: previous.blocks.filter((item) => item.page_id !== SEEDED_PAGE_ID),
          favorites: previous.favorites.filter((item) => item.page_id !== SEEDED_PAGE_ID),
          members: previous.members.filter((item) => item.user_id === DEV_BYPASS_USER_ID || !['11111111-1111-4111-8111-111111111112', '11111111-1111-4111-8111-111111111113', '11111111-1111-4111-8111-111111111114'].includes(item.user_id)),
          profiles: previous.profiles.filter((item) => item.id === DEV_BYPASS_USER_ID || !['11111111-1111-4111-8111-111111111112', '11111111-1111-4111-8111-111111111113', '11111111-1111-4111-8111-111111111114'].includes(item.id)),
        }
        writeStore(migrated)
        return migrated
      } catch {
        // A malformed development store is replaced with an empty one.
      }
    }
    const initial = makeInitialStore()
    writeStore(initial)
    return initial
  }
  try {
    const parsed = JSON.parse(raw) as Partial<DemoStore>
    const initial = makeInitialStore()
    return { ...initial, ...parsed, pages: (parsed.pages ?? []).map((page) => ({ ...page, visibility: page.visibility ?? 'workspace' })), blocks: parsed.blocks ?? initial.blocks, favorites: parsed.favorites ?? initial.favorites, teams: parsed.teams ?? [], teamMembers: parsed.teamMembers ?? [], settings: parsed.settings ?? [] } as DemoStore
  } catch {
    const initial = makeInitialStore()
    writeStore(initial)
    return initial
  }
}

function writeStore(store: DemoStore) {
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function mutateStore<T>(updater: (store: DemoStore) => T): T {
  const store = readStore()
  const result = updater(store)
  writeStore(store)
  return result
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function objectData(row: DatabaseRow): Record<string, Json | undefined> {
  return row.data && typeof row.data === 'object' && !Array.isArray(row.data) ? row.data : {}
}

function compareValues(a: Json | undefined, b: Json | undefined) {
  if (a === b) return 0
  if (a === undefined || a === null) return 1
  if (b === undefined || b === null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  const left = (typeof a === 'string' ? a : JSON.stringify(a) ?? '').toLowerCase()
  const right = (typeof b === 'string' ? b : JSON.stringify(b) ?? '').toLowerCase()
  return left.localeCompare(right)
}

function matchesFilter(row: DatabaseRow, filter: ViewFilter) {
  const value = objectData(row)[filter.propertyId]
  const expected = filter.value
  switch (filter.operator) {
    case 'equals': return value === expected
    case 'not_equals': return value !== expected
    case 'contains': return String(value ?? '').toLowerCase().includes(String(expected ?? '').toLowerCase())
    case 'is_empty': return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
    case 'is_not_empty': return !(value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0))
    case 'before': return String(value ?? '') < String(expected ?? '')
    case 'after': return String(value ?? '') > String(expected ?? '')
    case 'on': return String(value ?? '').slice(0, 10) === String(expected ?? '').slice(0, 10)
    case 'greater_than': return Number(value ?? 0) > Number(expected ?? 0)
    case 'less_than': return Number(value ?? 0) < Number(expected ?? 0)
    case 'contains_person': return Array.isArray(value) ? value.includes(expected as Json) : value === expected
    default: return true
  }
}

export const demoStore = {
  reset() {
    const initial = makeInitialStore()
    writeStore(initial)
    return clone(initial)
  },
  listWorkspaces() {
    return clone(readStore().workspaces)
  },
  getWorkspaceBySlug(slug: string) {
    return clone(readStore().workspaces.find((workspace) => workspace.slug === slug) ?? null)
  },
  createWorkspace(name: string) {
    return mutateStore((store) => {
      const id = crypto.randomUUID()
      const slugBase = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'workspace'
      const slug = `${slugBase}-${store.workspaces.length + 1}`
      const workspace: Workspace = { id, name, slug, owner_id: DEV_BYPASS_USER_ID, logo_url: null, created_at: iso(), updated_at: iso() }
      store.workspaces.push(workspace)
      store.members.push({ id: crypto.randomUUID(), workspace_id: id, user_id: DEV_BYPASS_USER_ID, role: 'OWNER', joined_at: iso(), created_at: iso() })
      store.settings.push({ workspace_id: id, who_can_invite: 'admins', who_can_create_team: 'admins', who_can_create_collection: 'admins', who_can_create_page: 'everyone', updated_at: iso() })
      return { workspace_id: id, workspace_slug: slug, database_id: null }
    })
  },
  updateWorkspaceName(workspaceId: string, name: string) {
    return mutateStore((store) => {
      const workspace = store.workspaces.find((item) => item.id === workspaceId)
      if (!workspace) throw new Error('Workspace not found')
      workspace.name = name
      workspace.updated_at = iso()
    })
  },
  updateWorkspace(workspaceId: string, patch: { name?: string; logo_url?: string | null }) {
    return mutateStore((store) => {
      const workspace = store.workspaces.find((item) => item.id === workspaceId)
      if (!workspace) throw new Error('Workspace not found')
      if (patch.name !== undefined) workspace.name = patch.name
      if (patch.logo_url !== undefined) workspace.logo_url = patch.logo_url
      workspace.updated_at = iso()
      return clone(workspace)
    })
  },
  createDatabase(input: { workspaceId: string; name: string; description?: string; viewType?: ViewType }) {
    return mutateStore((store) => {
      const databaseId = crypto.randomUUID(); const viewId = crypto.randomUUID(); const now = iso()
      store.databases.push({ id: databaseId, workspace_id: input.workspaceId, name: input.name, icon: 'table', description: input.description ?? null, created_by: DEV_BYPASS_USER_ID, archived_at: null, created_at: now, updated_at: now })
      store.properties.push({ id: crypto.randomUUID(), database_id: databaseId, name: 'Name', property_type: 'title', position: 0, config: {}, is_required: true, archived_at: null, created_at: now, updated_at: now })
      store.views.push({ id: viewId, database_id: databaseId, workspace_id: input.workspaceId, name: 'Main view', view_type: input.viewType ?? 'table', filters: [], sorts: [], visible_property_ids: [], property_widths: {}, position: 0, created_by: DEV_BYPASS_USER_ID, created_at: now, updated_at: now })
      return { database_id: databaseId, view_id: viewId }
    })
  },
  listDatabases(workspaceId: string) {
    return clone(readStore().databases.filter((database) => database.workspace_id === workspaceId && !database.archived_at))
  },
  listArchivedDatabases(workspaceId: string) {
    return clone(readStore().databases.filter((database) => database.workspace_id === workspaceId && Boolean(database.archived_at)))
  },
  updateDatabase(databaseId: string, patch: { name?: string; archived_at?: string | null }) {
    return mutateStore((store) => {
      const database = store.databases.find((item) => item.id === databaseId)
      if (!database) throw new Error('Collection not found')
      Object.assign(database, patch, { updated_at: iso() })
      return clone(database)
    })
  },
  deleteDatabase(databaseId: string) {
    return mutateStore((store) => {
      store.databases = store.databases.filter((item) => item.id !== databaseId)
      store.properties = store.properties.filter((item) => item.database_id !== databaseId)
      store.views = store.views.filter((item) => item.database_id !== databaseId)
      store.rows = store.rows.filter((item) => item.database_id !== databaseId)
      store.comments = store.comments.filter((item) => item.database_id !== databaseId)
    })
  },
  getSettings(workspaceId: string): WorkspaceSettings {
    return clone(readStore().settings.find((item) => item.workspace_id === workspaceId) ?? { workspace_id: workspaceId, who_can_invite: 'admins', who_can_create_team: 'admins', who_can_create_collection: 'admins', who_can_create_page: 'everyone', updated_at: iso() })
  },
  updateSettings(workspaceId: string, patch: Partial<Omit<WorkspaceSettings, 'workspace_id' | 'updated_at'>>) {
    return mutateStore((store) => {
      const current = store.settings.find((item) => item.workspace_id === workspaceId)
      const updated = { ...(current ?? { workspace_id: workspaceId, who_can_invite: 'admins' as const, who_can_create_team: 'admins' as const, who_can_create_collection: 'admins' as const, who_can_create_page: 'everyone' as const }), ...patch, updated_at: iso() }
      store.settings = store.settings.filter((item) => item.workspace_id !== workspaceId).concat(updated)
      return clone(updated)
    })
  },
  listTeams(workspaceId: string) {
    return clone(readStore().teams.filter((team) => team.workspace_id === workspaceId))
  },
  createTeam(input: { workspaceId: string; name: string; description?: string; icon?: string }) {
    return mutateStore((store) => {
      if (!store.members.some((member) => member.workspace_id === input.workspaceId && member.user_id === DEV_BYPASS_USER_ID)) throw new Error('Workspace not found')
      if (store.teams.some((team) => team.workspace_id === input.workspaceId && team.name.toLowerCase() === input.name.toLowerCase())) throw new Error('A team with this name already exists.')
      const now = iso()
      const team: Team = { id: crypto.randomUUID(), workspace_id: input.workspaceId, name: input.name, description: input.description ?? null, icon: input.icon ?? null, created_by: DEV_BYPASS_USER_ID, created_at: now, updated_at: now }
      store.teams.push(team)
      return clone(team)
    })
  },
  updateTeam(teamId: string, patch: { name?: string; description?: string | null; icon?: string | null }) {
    return mutateStore((store) => {
      const team = store.teams.find((item) => item.id === teamId)
      if (!team) throw new Error('Team not found')
      if (patch.name && store.teams.some((item) => item.id !== teamId && item.workspace_id === team.workspace_id && item.name.toLowerCase() === patch.name?.toLowerCase())) throw new Error('A team with this name already exists.')
      Object.assign(team, patch, { updated_at: iso() })
      return clone(team)
    })
  },
  deleteTeam(teamId: string) {
    return mutateStore((store) => {
      store.teams = store.teams.filter((team) => team.id !== teamId)
      store.teamMembers = store.teamMembers.filter((member) => member.team_id !== teamId)
    })
  },
  listTeamMembers(teamId: string) {
    return clone(readStore().teamMembers.filter((member) => member.team_id === teamId))
  },
  addTeamMember(teamId: string, workspaceId: string, userId: string) {
    return mutateStore((store) => {
      if (!store.teams.some((team) => team.id === teamId && team.workspace_id === workspaceId) || !store.members.some((member) => member.workspace_id === workspaceId && member.user_id === userId)) throw new Error('Choose an existing workspace member.')
      if (!store.teamMembers.some((member) => member.team_id === teamId && member.user_id === userId)) store.teamMembers.push({ team_id: teamId, workspace_id: workspaceId, user_id: userId, created_at: iso() })
    })
  },
  removeTeamMember(teamId: string, userId: string) {
    return mutateStore((store) => { store.teamMembers = store.teamMembers.filter((member) => member.team_id !== teamId || member.user_id !== userId) })
  },
  listMembers(workspaceId: string): MemberWithProfile[] {
    const store = readStore()
    return clone(store.members.filter((member) => member.workspace_id === workspaceId).map((item) => ({ ...item, profile: store.profiles.find((profileItem) => profileItem.id === item.user_id) ?? null })))
  },
  role(workspaceId: string, userId: string) {
    return readStore().members.find((member) => member.workspace_id === workspaceId && member.user_id === userId)?.role ?? null
  },
  changeMemberRole(workspaceId: string, memberId: string, role: Exclude<WorkspaceRole, 'OWNER'>) {
    mutateStore((store) => {
      const memberItem = store.members.find((item) => item.workspace_id === workspaceId && item.id === memberId)
      if (!memberItem) throw new Error('Member not found')
      if (memberItem.role === 'OWNER') throw new Error('OWNER role cannot be changed in demo mode')
      memberItem.role = role
    })
  },
  removeMember(workspaceId: string, memberId: string) {
    mutateStore((store) => {
      store.members = store.members.filter((item) => !(item.workspace_id === workspaceId && item.id === memberId && item.role !== 'OWNER'))
    })
  },
  getDatabase(databaseId: string) {
    return clone(readStore().databases.find((database) => database.id === databaseId && !database.archived_at) ?? null)
  },
  getProperties(databaseId: string) {
    return clone(readStore().properties.filter((item) => item.database_id === databaseId && !item.archived_at).sort((a, b) => a.position - b.position))
  },
  getViews(databaseId: string) {
    return clone(readStore().views.filter((item) => item.database_id === databaseId).sort((a, b) => a.position - b.position))
  },
  getRowsPage(input: { databaseId: string; workspaceId: string; view?: DatabaseView | null; page: number; search?: string; pageSize: number }) {
    const store = readStore()
    const properties = store.properties.filter((propertyItem) => propertyItem.database_id === input.databaseId && !propertyItem.archived_at)
    const searchable = properties.filter((propertyItem) => ['title', 'text', 'phone', 'email', 'url'].includes(propertyItem.property_type)).map((propertyItem) => propertyItem.id)
    let rows = store.rows.filter((item) => item.database_id === input.databaseId && item.workspace_id === input.workspaceId && !item.archived_at)
    const filters = Array.isArray(input.view?.filters) ? input.view.filters as unknown as ViewFilter[] : []
    rows = rows.filter((item) => filters.every((filter) => matchesFilter(item, filter)))
    const search = input.search?.trim().toLowerCase()
    if (search) rows = rows.filter((item) => searchable.some((propertyId) => String(objectData(item)[propertyId] ?? '').toLowerCase().includes(search)))
    const sorts = Array.isArray(input.view?.sorts) ? input.view.sorts as unknown as ViewSort[] : []
    if (sorts.length) rows.sort((left, right) => {
      for (const sort of sorts) {
        const comparison = compareValues(objectData(left)[sort.propertyId], objectData(right)[sort.propertyId])
        if (comparison !== 0) return sort.direction === 'asc' ? comparison : -comparison
      }
      return 0
    })
    else rows.sort((a, b) => a.position - b.position)
    const start = input.page * input.pageSize
    return clone(rows.slice(start, start + input.pageSize))
  },
  createRow(input: { databaseId: string; workspaceId: string; userId: string; data?: Record<string, Json | undefined> }) {
    return mutateStore((store) => {
      const now = iso()
      const created: DatabaseRow = {
        id: crypto.randomUUID(),
        database_id: input.databaseId,
        workspace_id: input.workspaceId,
        created_by: input.userId,
        updated_by: input.userId,
        data: input.data ?? {},
        position: Date.now(),
        archived_at: null,
        created_at: now,
        updated_at: now,
      }
      store.rows.push(created)
      return clone(created)
    })
  },
  updateRow(rowValue: DatabaseRow, propertyId: string, value: Json | undefined) {
    return mutateStore((store) => {
      const target = store.rows.find((item) => item.id === rowValue.id)
      if (!target) throw new Error('Record not found')
      const data = objectData(target)
      const next = { ...data }
      if (value === undefined || value === null || value === '') delete next[propertyId]
      else next[propertyId] = value
      target.data = next
      target.updated_by = DEV_BYPASS_USER_ID
      target.updated_at = iso()
      return clone(target)
    })
  },
  archiveRow(rowValue: DatabaseRow) {
    return mutateStore((store) => {
      const target = store.rows.find((item) => item.id === rowValue.id)
      if (!target) throw new Error('Record not found')
      target.archived_at = iso()
      target.updated_at = iso()
      return clone(target)
    })
  },
  createProperty(input: { databaseId: string; name: string; propertyType: DatabaseProperty['property_type'] }) {
    return mutateStore((store) => {
      const position = Math.max(-1, ...store.properties.filter((item) => item.database_id === input.databaseId && !item.archived_at).map((item) => item.position)) + 1
      const now = iso()
      const created: DatabaseProperty = { id: crypto.randomUUID(), database_id: input.databaseId, name: input.name, property_type: input.propertyType, position, config: input.propertyType === 'select' ? { options: [] } : {}, is_required: false, archived_at: null, created_at: now, updated_at: now }
      store.properties.push(created)
      return clone(created)
    })
  },
  renameProperty(propertyId: string, name: string) {
    mutateStore((store) => {
      const target = store.properties.find((item) => item.id === propertyId)
      if (!target) throw new Error('Property not found')
      target.name = name
      target.updated_at = iso()
    })
  },
  archiveProperty(propertyId: string) {
    mutateStore((store) => {
      const target = store.properties.find((item) => item.id === propertyId)
      if (!target) throw new Error('Property not found')
      if (target.property_type === 'title') throw new Error('The primary title property cannot be deleted')
      target.archived_at = iso()
      target.updated_at = iso()
    })
  },
  updatePropertyPosition(propertyId: string, position: number) {
    mutateStore((store) => {
      const target = store.properties.find((item) => item.id === propertyId)
      if (!target) throw new Error('Property not found')
      target.position = position
      target.updated_at = iso()
    })
  },
  createView(input: { databaseId: string; workspaceId: string; userId: string; name: string; viewType: ViewType }) {
    return mutateStore((store) => { const now = iso(); const view: DatabaseView = { id: crypto.randomUUID(), database_id: input.databaseId, workspace_id: input.workspaceId, name: input.name, view_type: input.viewType, filters: [], sorts: [], visible_property_ids: [], property_widths: {}, position: store.views.filter((item) => item.database_id === input.databaseId).length, created_by: input.userId, created_at: now, updated_at: now }; store.views.push(view); return clone(view) })
  },
  updateProperty(propertyId: string, patch: Partial<Pick<DatabaseProperty, 'name' | 'config' | 'position'>>) {
    return mutateStore((store) => { const target = store.properties.find((item) => item.id === propertyId); if (!target) throw new Error('Property not found'); Object.assign(target, patch, { updated_at: iso() }); return clone(target) })
  },
  updateView(viewId: string, patch: Partial<Pick<DatabaseView, 'filters' | 'sorts' | 'visible_property_ids' | 'property_widths' | 'name' | 'view_type'>>) {
    return mutateStore((store) => {
      const target = store.views.find((item) => item.id === viewId)
      if (!target) throw new Error('View not found')
      Object.assign(target, patch, { updated_at: iso() })
      return clone(target)
    })
  },
  listComments(rowId: string) {
    return clone(readStore().comments.filter((item) => item.row_id === rowId).sort((a, b) => a.created_at.localeCompare(b.created_at)))
  },
  addComment(input: { workspaceId: string; databaseId: string; rowId: string; userId: string; body: string }) {
    return mutateStore((store) => {
      const created: RowComment = {
        id: crypto.randomUUID(),
        workspace_id: input.workspaceId,
        database_id: input.databaseId,
        row_id: input.rowId,
        user_id: input.userId,
        body: input.body,
        created_at: iso(),
        updated_at: iso(),
      }
      store.comments.push(created)
      return clone(created)
    })
  },
  dashboard(databaseId: string) {
    const store = readStore()
    const rows = store.rows.filter((item) => item.database_id === databaseId && !item.archived_at)
    const properties = store.properties.filter((item) => item.database_id === databaseId && !item.archived_at)
    const statusId = properties.find((item) => item.name.toLowerCase() === 'status')?.id
    const revenueId = properties.find((item) => item.name.toLowerCase() === 'revenue')?.id
    const status = (item: DatabaseRow) => statusId ? objectData(item)[statusId] : undefined
    const revenue = (item: DatabaseRow) => revenueId ? Number(objectData(item)[revenueId] ?? 0) : 0
    return {
      total_records: rows.length,
      leads: rows.filter((item) => status(item) === 'lead').length,
      follow_ups: rows.filter((item) => status(item) === 'follow-up').length,
      potential: rows.filter((item) => status(item) === 'potential').length,
      closing: rows.filter((item) => status(item) === 'closing').length,
      closed: rows.filter((item) => status(item) === 'closed').length,
      total_revenue: rows.reduce((sum, item) => sum + revenue(item), 0),
    }
  },
  invite(input: { workspaceId: string; email: string; role: Exclude<WorkspaceRole, 'OWNER'>; intendedTeamId?: string }) {
    return mutateStore((store) => {
      const existing = store.invites.find((item) => item.workspace_id === input.workspaceId && item.email === input.email && item.status === 'pending')
      if (existing) return { ok: true as const, inviteId: existing.id }
      const created: WorkspaceInvite = {
        id: crypto.randomUUID(),
        workspace_id: input.workspaceId,
        email: input.email,
        role: input.role,
        invited_by: DEV_BYPASS_USER_ID,
        invite_token: crypto.randomUUID(),
        status: 'pending',
        expires_at: iso(7),
        accepted_at: null,
        intended_team_id: input.intendedTeamId ?? null,
        last_sent_at: iso(),
        cancelled_at: null,
        created_at: iso(),
      }
      store.invites.push(created)
      return { ok: true as const, inviteId: created.id }
    })
  },
  listInvites(workspaceId: string) {
    return clone(readStore().invites.filter((item) => item.workspace_id === workspaceId && item.status === 'pending').sort((a, b) => b.created_at.localeCompare(a.created_at)))
  },
  cancelInvite(workspaceId: string, inviteId: string) {
    mutateStore((store) => {
      const target = store.invites.find((item) => item.id === inviteId && item.workspace_id === workspaceId && item.status === 'pending')
      if (target) { target.status = 'cancelled'; target.cancelled_at = iso() }
    })
  },
  listPages(workspaceId: string, includeArchived = false) {
    return clone(readStore().pages.filter((page) => page.workspace_id === workspaceId && (includeArchived || !page.archived_at)).sort((a, b) => a.position - b.position))
  },
  getPage(pageId: string) {
    return clone(readStore().pages.find((page) => page.id === pageId) ?? null)
  },
  createPage(input: { workspaceId: string; parentPageId?: string | null; title?: string; visibility?: WorkspacePage['visibility'] }) {
    return mutateStore((store) => {
      const now = iso(); const page: WorkspacePage = { id: crypto.randomUUID(), workspace_id: input.workspaceId, parent_page_id: input.parentPageId ?? null, title: input.title ?? 'Untitled', icon: null, visibility: input.visibility ?? 'private', cover_url: null, position: Date.now(), created_by: DEV_BYPASS_USER_ID, updated_by: DEV_BYPASS_USER_ID, archived_at: null, created_at: now, updated_at: now }
      store.pages.push(page); return clone(page)
    })
  },
  updatePage(pageId: string, patch: Partial<Pick<WorkspacePage, 'title' | 'icon' | 'visibility' | 'cover_url' | 'parent_page_id' | 'position' | 'archived_at'>>) {
    return mutateStore((store) => { const page = store.pages.find((item) => item.id === pageId); if (!page) throw new Error('Page not found'); Object.assign(page, patch, { updated_by: DEV_BYPASS_USER_ID, updated_at: iso() }); return clone(page) })
  },
  setPageArchived(pageId: string, archived: boolean) {
    return mutateStore((store) => {
      const ids = new Set<string>([pageId]); let changed = true
      while (changed) { changed = false; for (const page of store.pages) if (page.parent_page_id && ids.has(page.parent_page_id) && !ids.has(page.id)) { ids.add(page.id); changed = true } }
      let count = 0
      for (const page of store.pages) if (ids.has(page.id)) { page.archived_at = archived ? iso() : null; page.updated_at = iso(); page.updated_by = DEV_BYPASS_USER_ID; count += 1 }
      return count
    })
  },
  deletePage(pageId: string) {
    mutateStore((store) => { store.pages = store.pages.filter((page) => page.id !== pageId); store.blocks = store.blocks.filter((block) => block.page_id !== pageId); store.favorites = store.favorites.filter((favorite) => favorite.page_id !== pageId) })
  },
  listBlocks(pageId: string) {
    return clone(readStore().blocks.filter((block) => block.page_id === pageId).sort((a, b) => a.position - b.position))
  },
  createBlock(input: { workspaceId: string; pageId: string; blockType: PageBlock['block_type']; content?: Json; position?: number }) {
    return mutateStore((store) => { const now = iso(); const block: PageBlock = { id: crypto.randomUUID(), workspace_id: input.workspaceId, page_id: input.pageId, block_type: input.blockType, content: input.content ?? { text: '' }, position: input.position ?? Date.now(), created_by: DEV_BYPASS_USER_ID, updated_by: DEV_BYPASS_USER_ID, created_at: now, updated_at: now }; store.blocks.push(block); return clone(block) })
  },
  updateBlock(blockId: string, patch: Partial<Pick<PageBlock, 'block_type' | 'content' | 'position'>>) {
    return mutateStore((store) => { const block = store.blocks.find((item) => item.id === blockId); if (!block) throw new Error('Block not found'); Object.assign(block, patch, { updated_by: DEV_BYPASS_USER_ID, updated_at: iso() }); return clone(block) })
  },
  deleteBlock(blockId: string) { mutateStore((store) => { store.blocks = store.blocks.filter((block) => block.id !== blockId) }) },
  listFavorites(workspaceId: string, userId: string) { return clone(readStore().favorites.filter((favorite) => favorite.workspace_id === workspaceId && favorite.user_id === userId)) },
  setFavorite(input: { workspaceId: string; pageId: string; userId: string; favorite: boolean }) {
    return mutateStore((store) => { const existing = store.favorites.find((item) => item.page_id === input.pageId && item.user_id === input.userId); if (input.favorite && !existing) store.favorites.push({ id: crypto.randomUUID(), workspace_id: input.workspaceId, page_id: input.pageId, user_id: input.userId, created_at: iso() }); if (!input.favorite) store.favorites = store.favorites.filter((item) => !(item.page_id === input.pageId && item.user_id === input.userId)); return input.favorite })
  },
}
