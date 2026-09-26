import { createDatabase, createProperty, createRow, getProperties, renameProperty } from './database.service'
import { createPageBlock, createWorkspacePage, permanentlyDeletePage } from './page.service'
import type { ViewType, WorkspacePage } from '../types/database.types'

export type TemplateType = 'page' | 'collection'
export type TemplateCategory = 'Recommended' | 'Work' | 'Projects' | 'CRM' | 'Meetings' | 'Docs'
export type TemplateTint = 'emerald' | 'blue' | 'purple' | 'amber' | 'rose' | 'orange' | 'indigo'

export interface CreationDestination {
  type: 'private' | 'workspace' | 'team'
  workspaceId: string
  teamId?: string
  label: string
}

export interface TemplateDefinition {
  id: string
  name: string
  description: string
  icon: string
  type: TemplateType
  category: TemplateCategory
  tint: TemplateTint
  viewType?: ViewType
  previewRows?: Array<{ col1: string; col2: string; col3?: string }>
  headers?: string[]
}

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: 'tasks-tracker',
    name: 'Tasks Tracker',
    description: 'Track tasks, owners, priorities, and progress.',
    icon: '✓',
    type: 'collection',
    category: 'Work',
    tint: 'emerald',
    viewType: 'table',
    headers: ['Task name', 'Status', 'Priority'],
    previewRows: [
      { col1: 'Finalize product spec', col2: 'In progress', col3: 'High' },
      { col1: 'Creation center modal', col2: 'Done', col3: 'High' },
      { col1: 'Cross-browser testing', col2: 'Not started', col3: 'Medium' },
    ],
  },
  {
    id: 'projects',
    name: 'Projects',
    description: 'Manage projects, owners, and milestones.',
    icon: '◫',
    type: 'collection',
    category: 'Projects',
    tint: 'blue',
    viewType: 'board',
    headers: ['Project', 'Stage', 'Owner'],
    previewRows: [
      { col1: 'Collaboration 2.0', col2: 'In progress', col3: 'Rahul' },
      { col1: 'Mobile App Redesign', col2: 'Review', col3: 'Design' },
      { col1: 'Analytics Engine', col2: 'Planning', col3: 'Eng' },
    ],
  },
  {
    id: 'client-tracker',
    name: 'Client Tracker',
    description: 'Manage clients, proposals, and deal value.',
    icon: '💼',
    type: 'collection',
    category: 'CRM',
    tint: 'purple',
    viewType: 'table',
    headers: ['Client', 'Status', 'Value'],
    previewRows: [
      { col1: 'Acme Corp', col2: 'Active', col3: '₹1,20,000' },
      { col1: 'Globex Inc', col2: 'Proposal', col3: '₹85,000' },
      { col1: 'Stark Industries', col2: 'Lead', col3: '₹2,50,000' },
    ],
  },
  {
    id: 'document-hub',
    name: 'Document Hub',
    description: 'Central wiki for team knowledge, RFCs, and documentation.',
    icon: '📚',
    type: 'page',
    category: 'Docs',
    tint: 'rose',
    headers: ['Section', 'Details'],
    previewRows: [
      { col1: 'Overview', col2: 'Welcome & context' },
      { col1: 'Resources', col2: 'Guides & references' },
    ],
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    description: 'Structured template for agendas, decisions, and action items.',
    icon: '📝',
    type: 'page',
    category: 'Meetings',
    tint: 'amber',
    headers: ['Section', 'Details'],
    previewRows: [
      { col1: 'Agenda', col2: 'Topics to discuss' },
      { col1: 'Action items', col2: 'Owners & next steps' },
    ],
  },
  {
    id: 'brainstorm',
    name: 'Brainstorm',
    description: 'Fast-paced ideation board for hypotheses and problem statements.',
    icon: '💡',
    type: 'page',
    category: 'Docs',
    tint: 'orange',
    headers: ['Section', 'Details'],
    previewRows: [
      { col1: 'Problem', col2: 'What are we solving?' },
      { col1: 'Ideas', col2: 'Explore possibilities' },
    ],
  },
  {
    id: 'content-calendar',
    name: 'Content Calendar',
    description: 'Schedule newsletters, blog posts, releases, and campaigns.',
    icon: '📅',
    type: 'collection',
    category: 'Work',
    tint: 'indigo',
    viewType: 'calendar',
    headers: ['Content title', 'Channel', 'Status'],
    previewRows: [
      { col1: 'Teamspace 2.0 Launch', col2: 'Blog', col3: 'Published' },
      { col1: 'Deep Dive: Supabase RLS', col2: 'Newsletter', col3: 'Drafting' },
      { col1: 'Changelog #42', col2: 'Twitter/X', col3: 'Scheduled' },
    ],
  },
  {
    id: 'sales-crm',
    name: 'Sales CRM',
    description: 'Track inbound leads, stage progression, and pipeline revenue.',
    icon: '📈',
    type: 'collection',
    category: 'CRM',
    tint: 'emerald',
    viewType: 'table',
    headers: ['Opportunity', 'Stage', 'Amount'],
    previewRows: [
      { col1: 'Enterprise Tier License', col2: 'Proposal', col3: '₹5,00,000' },
      { col1: 'Team Upgrade - 50 seats', col2: 'Won', col3: '₹1,80,000' },
      { col1: 'Annual Cloud Renewal', col2: 'Qualified', col3: '₹90,000' },
    ],
  },
]

export interface InstantiateResult {
  kind: 'page' | 'collection'
  id: string
  url: string
}

export async function instantiateTemplate(
  template: TemplateDefinition,
  destination: CreationDestination,
  userId: string
): Promise<InstantiateResult> {
  const isPrivate = destination.type === 'private'
  const teamId = destination.type === 'team' ? destination.teamId : undefined
  const visibility: WorkspacePage['visibility'] = isPrivate ? 'private' : 'workspace'

  if (template.type === 'page') {
    // 1. Create page
    const page = await createWorkspacePage({
      workspaceId: destination.workspaceId,
      userId,
      title: template.name,
      visibility,
      teamId,
    })

    // 2. Populate structured blocks based on template
    try {
      if (template.id === 'meeting-notes') {
        await createPageBlock({
          workspaceId: destination.workspaceId,
          pageId: page.id,
          userId,
          blockType: 'callout',
          content: { text: `Meeting Sync • Date: ${new Date().toLocaleDateString()} • Attendees: Team` },
          position: 1000,
        })
        await createPageBlock({
          workspaceId: destination.workspaceId,
          pageId: page.id,
          userId,
          blockType: 'heading_2',
          content: { text: 'Agenda' },
          position: 2000,
        })
        await createPageBlock({
          workspaceId: destination.workspaceId,
          pageId: page.id,
          userId,
          blockType: 'bulleted_list',
          content: { text: 'Sprint review and team accomplishments' },
          position: 3000,
        })
        await createPageBlock({
          workspaceId: destination.workspaceId,
          pageId: page.id,
          userId,
          blockType: 'bulleted_list',
          content: { text: 'Address current blockers and dependency risks' },
          position: 4000,
        })
        await createPageBlock({
          workspaceId: destination.workspaceId,
          pageId: page.id,
          userId,
          blockType: 'heading_2',
          content: { text: 'Discussion & Decisions' },
          position: 5000,
        })
        await createPageBlock({
          workspaceId: destination.workspaceId,
          pageId: page.id,
          userId,
          blockType: 'paragraph',
          content: { text: 'Key discussion items captured during this sync.' },
          position: 6000,
        })
        await createPageBlock({
          workspaceId: destination.workspaceId,
          pageId: page.id,
          userId,
          blockType: 'heading_2',
          content: { text: 'Action Items' },
          position: 7000,
        })
        await createPageBlock({
          workspaceId: destination.workspaceId,
          pageId: page.id,
          userId,
          blockType: 'todo',
          content: { text: 'Share meeting summary with stakeholders' },
          position: 8000,
        })
        await createPageBlock({
          workspaceId: destination.workspaceId,
          pageId: page.id,
          userId,
          blockType: 'todo',
          content: { text: 'Follow up on assigned action items by Friday' },
          position: 9000,
        })
      } else if (template.id === 'document-hub') {
        await createPageBlock({
          workspaceId: destination.workspaceId,
          pageId: page.id,
          userId,
          blockType: 'callout',
          content: { text: 'Welcome to your Document Hub. Organize core team guides and reference documentation here.' },
          position: 1000,
        })
        await createPageBlock({
          workspaceId: destination.workspaceId,
          pageId: page.id,
          userId,
          blockType: 'heading_2',
          content: { text: 'Quick Navigation' },
          position: 2000,
        })
        await createPageBlock({
          workspaceId: destination.workspaceId,
          pageId: page.id,
          userId,
          blockType: 'bulleted_list',
          content: { text: 'Company Vision & Strategy Roadmap' },
          position: 3000,
        })
        await createPageBlock({
          workspaceId: destination.workspaceId,
          pageId: page.id,
          userId,
          blockType: 'bulleted_list',
          content: { text: 'Architecture Decision Records (ADRs)' },
          position: 4000,
        })
        await createPageBlock({
          workspaceId: destination.workspaceId,
          pageId: page.id,
          userId,
          blockType: 'bulleted_list',
          content: { text: 'Brand and Product Design Standards' },
          position: 5000,
        })
        await createPageBlock({
          workspaceId: destination.workspaceId,
          pageId: page.id,
          userId,
          blockType: 'heading_2',
          content: { text: 'Guidelines' },
          position: 6000,
        })
        await createPageBlock({
          workspaceId: destination.workspaceId,
          pageId: page.id,
          userId,
          blockType: 'paragraph',
          content: { text: 'Anyone in the workspace can contribute sub-pages to keep our documentation up to date.' },
          position: 7000,
        })
      } else if (template.id === 'brainstorm') {
        await createPageBlock({
          workspaceId: destination.workspaceId,
          pageId: page.id,
          userId,
          blockType: 'callout',
          content: { text: 'Theme: Rapid Ideation & Explorations' },
          position: 1000,
        })
        await createPageBlock({
          workspaceId: destination.workspaceId,
          pageId: page.id,
          userId,
          blockType: 'heading_2',
          content: { text: 'Problem Statement' },
          position: 2000,
        })
        await createPageBlock({
          workspaceId: destination.workspaceId,
          pageId: page.id,
          userId,
          blockType: 'paragraph',
          content: { text: 'What core user friction or technical opportunity are we exploring?' },
          position: 3000,
        })
        await createPageBlock({
          workspaceId: destination.workspaceId,
          pageId: page.id,
          userId,
          blockType: 'heading_2',
          content: { text: 'Ideas' },
          position: 4000,
        })
        await createPageBlock({
          workspaceId: destination.workspaceId,
          pageId: page.id,
          userId,
          blockType: 'bulleted_list',
          content: { text: 'Idea 1: Streamlined creation hub with instant templates' },
          position: 5000,
        })
        await createPageBlock({
          workspaceId: destination.workspaceId,
          pageId: page.id,
          userId,
          blockType: 'bulleted_list',
          content: { text: 'Idea 2: Destination-aware permission scoping' },
          position: 6000,
        })
        await createPageBlock({
          workspaceId: destination.workspaceId,
          pageId: page.id,
          userId,
          blockType: 'heading_2',
          content: { text: 'Next Steps' },
          position: 7000,
        })
        await createPageBlock({
          workspaceId: destination.workspaceId,
          pageId: page.id,
          userId,
          blockType: 'todo',
          content: { text: 'Vote on high-impact ideas in tomorrow’s sync' },
          position: 8000,
        })
      }
    } catch (error) {
      console.error('Page template seed failed', { templateId: template.id, pageId: page.id, error })
      try { await permanentlyDeletePage(page.id) } catch (cleanupError) {
        console.error('Page template cleanup failed', { templateId: template.id, pageId: page.id, cleanupError })
      }
      throw new Error('Couldn’t create this template. Please try again.')
    }

    return {
      kind: 'page',
      id: page.id,
      url: `/page/${page.id}`,
    }
  }

  // Collection template
  const createdDb = await createDatabase({
    workspaceId: destination.workspaceId,
    name: template.name,
    description: template.description,
    viewType: template.viewType ?? 'table',
    teamId,
  })
  const titleProp = (await getProperties(createdDb.database_id)).find((property) => property.property_type === 'title')
  if (!titleProp) throw new Error('The collection title property could not be created.')

  // Add template properties and sample rows
  try {
    if (template.id === 'tasks-tracker') {
      await renameProperty(titleProp.id, 'Task')
      const statusProp = await createProperty({
        databaseId: createdDb.database_id,
        name: 'Status',
        propertyType: 'select',
        config: {
          options: [
            { id: 'not_started', label: 'Not started', color: 'gray' },
            { id: 'in_progress', label: 'In progress', color: 'blue' },
            { id: 'done', label: 'Done', color: 'green' },
          ],
        },
      })
      const priorityProp = await createProperty({
        databaseId: createdDb.database_id,
        name: 'Priority',
        propertyType: 'select',
        config: {
          options: [
            { id: 'low', label: 'Low', color: 'gray' },
            { id: 'medium', label: 'Medium', color: 'yellow' },
            { id: 'high', label: 'High', color: 'red' },
          ],
        },
      })
      const assigneeProp = await createProperty({ databaseId: createdDb.database_id, name: 'Assignee', propertyType: 'person' })
      const dueDateProp = await createProperty({ databaseId: createdDb.database_id, name: 'Due Date', propertyType: 'date' })

      // Sample row 1
      await createRow({
        databaseId: createdDb.database_id,
        workspaceId: destination.workspaceId,
        userId,
        data: {
          [titleProp.id]: 'Homepage QA',
          [statusProp.id]: 'in_progress',
          [priorityProp.id]: 'high',
          [assigneeProp.id]: userId,
          [dueDateProp.id]: new Date().toISOString().slice(0, 10),
        },
      })
      await createRow({ databaseId: createdDb.database_id, workspaceId: destination.workspaceId, userId, data: {
        [titleProp.id]: 'Launch assets', [statusProp.id]: 'done', [priorityProp.id]: 'medium', [assigneeProp.id]: userId,
      } })
    } else if (template.id === 'projects') {
      await renameProperty(titleProp.id, 'Project')
      const stageProp = await createProperty({
        databaseId: createdDb.database_id,
        name: 'Stage',
        propertyType: 'select',
        config: {
          options: [
            { id: 'planning', label: 'Planning', color: 'gray' },
            { id: 'in_progress', label: 'In progress', color: 'blue' },
            { id: 'review', label: 'Review', color: 'purple' },
            { id: 'completed', label: 'Completed', color: 'green' },
          ],
        },
      })
      const ownerProp = await createProperty({ databaseId: createdDb.database_id, name: 'Owner', propertyType: 'person' })
      const priorityProp = await createProperty({ databaseId: createdDb.database_id, name: 'Priority', propertyType: 'select', config: {
        options: [{ id: 'high', label: 'High', color: 'red' }, { id: 'medium', label: 'Medium', color: 'yellow' }],
      } })
      const dueDateProp = await createProperty({ databaseId: createdDb.database_id, name: 'Due Date', propertyType: 'date' })
      await createRow({
        databaseId: createdDb.database_id,
        workspaceId: destination.workspaceId,
        userId,
        data: {
          [titleProp.id]: 'Mobile App',
          [stageProp.id]: 'in_progress',
          [ownerProp.id]: userId,
          [priorityProp.id]: 'high',
          [dueDateProp.id]: new Date().toISOString().slice(0, 10),
        },
      })
    } else if (template.id === 'client-tracker' || template.id === 'sales-crm') {
      await renameProperty(titleProp.id, template.id === 'sales-crm' ? 'Opportunity' : 'Client')
      const stageProp = await createProperty({
        databaseId: createdDb.database_id,
        name: 'Stage',
        propertyType: 'select',
        config: {
          options: [
            { id: 'lead', label: 'Lead', color: 'gray' },
            { id: 'proposal', label: 'Proposal', color: 'blue' },
            { id: 'active', label: 'Active', color: 'green' },
          ],
        },
      })
      const valueProp = await createProperty({
        databaseId: createdDb.database_id,
        name: 'Deal Value',
        propertyType: 'currency',
        config: { currency: 'INR' },
      })
      const contactProp = await createProperty({ databaseId: createdDb.database_id, name: 'Contact', propertyType: 'email' })
      const nextStepProp = await createProperty({ databaseId: createdDb.database_id, name: 'Next Step', propertyType: 'text' })
      await createRow({
        databaseId: createdDb.database_id,
        workspaceId: destination.workspaceId,
        userId,
        data: {
          [titleProp.id]: template.id === 'sales-crm' ? 'Enterprise plan' : 'Acme Corp',
          [stageProp.id]: 'active',
          [valueProp.id]: 150000,
          [contactProp.id]: 'hello@acme.example',
          [nextStepProp.id]: 'Schedule follow-up',
        },
      })
    } else if (template.id === 'content-calendar') {
      await renameProperty(titleProp.id, 'Content')
      const channelProp = await createProperty({ databaseId: createdDb.database_id, name: 'Channel', propertyType: 'select', config: {
        options: [{ id: 'blog', label: 'Blog', color: 'blue' }, { id: 'newsletter', label: 'Newsletter', color: 'purple' }],
      } })
      const statusProp = await createProperty({ databaseId: createdDb.database_id, name: 'Status', propertyType: 'select', config: {
        options: [{ id: 'draft', label: 'Draft', color: 'gray' }, { id: 'scheduled', label: 'Scheduled', color: 'blue' }, { id: 'published', label: 'Published', color: 'green' }],
      } })
      const publishDateProp = await createProperty({ databaseId: createdDb.database_id, name: 'Publish Date', propertyType: 'date' })
      await createRow({ databaseId: createdDb.database_id, workspaceId: destination.workspaceId, userId, data: {
        [titleProp.id]: 'Product launch', [channelProp.id]: 'blog', [statusProp.id]: 'scheduled', [publishDateProp.id]: new Date().toISOString().slice(0, 10),
      } })
    }
  } catch (error) {
    console.error('Collection template seed failed', { templateId: template.id, databaseId: createdDb.database_id, error })
    throw new Error('Couldn’t create this template. Please try again.')
  }

  return {
    kind: 'collection',
    id: createdDb.database_id,
    url: `/database/${createdDb.database_id}/view/${createdDb.view_id}`,
  }
}
