import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Blocks,
  CalendarDays,
  Check,
  Database,
  FileText,
  GalleryHorizontalEnd,
  KanbanSquare,
  LockKeyhole,
  MessageSquareText,
  Search,
  ShieldCheck,
  Sparkles,
  Table2,
  Users,
  Workflow,
  Zap,
} from 'lucide-react'

const primaryFeatures = [
  {
    icon: FileText,
    title: 'Notion-style pages',
    description: 'Create nested pages, add icons and covers, favorite important docs, and edit structured blocks with autosave.',
  },
  {
    icon: Database,
    title: 'Flexible databases',
    description: 'Build collections with text, number, currency, date, select, people, checkbox, phone, email, URL, and title properties.',
  },
  {
    icon: Users,
    title: 'Workspace collaboration',
    description: 'Invite teams, manage roles, switch workspaces, and keep shared knowledge organized in one place.',
  },
]

const databaseViews = [
  { icon: Table2, label: 'Table' },
  { icon: KanbanSquare, label: 'Board' },
  { icon: CalendarDays, label: 'Calendar' },
  { icon: GalleryHorizontalEnd, label: 'Gallery' },
  { icon: BarChart3, label: 'Dashboard' },
]

const detailFeatures = [
  'Inline editing with optimistic updates',
  'Search, filters, sorts, and column sizing',
  'Record detail panels and comments',
  'Soft archive, trash, restore, and permanent delete',
  'Realtime refresh for pages and databases',
  'Secure public sharing for records and collections',
]

const trustFeatures = [
  {
    icon: ShieldCheck,
    title: 'Role-based access',
    description: 'OWNER, ADMIN, MEMBER, and VIEWER roles keep workspace actions clear and controlled.',
  },
  {
    icon: LockKeyhole,
    title: 'RLS-backed isolation',
    description: 'Workspace data is protected by PostgreSQL row-level security, not only frontend checks.',
  },
  {
    icon: Zap,
    title: 'Production ready stack',
    description: 'React, TypeScript, Vite, Supabase, TanStack Query/Table, and lazy-loaded routes are already wired up.',
  },
]

const footerLinks = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Databases', href: '#databases' },
      { label: 'Security', href: '#security' },
    ],
  },
  {
    title: 'Workspace',
    links: [
      { label: 'Pages', href: '#features' },
      { label: 'Collections', href: '#databases' },
      { label: 'Collaboration', href: '#security' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Log in', href: '/login' },
      { label: 'Get started', href: '/signup' },
    ],
  },
]

function LogoMark() {
  return (
    <div className="grid h-9 w-9 place-items-center rounded-lg bg-neutral-950 text-sm font-semibold text-white shadow-sm">
      T
    </div>
  )
}

function WorkspacePreview() {
  const rows = [
    ['Website redesign', 'In progress', 'Design', 'Sep 28'],
    ['CRM pipeline', 'Review', 'Sales', 'Oct 02'],
    ['Launch checklist', 'Done', 'Ops', 'Oct 08'],
    ['Customer notes', 'Draft', 'Success', 'Oct 15'],
  ]

  return (
    <div className="relative mx-auto w-full max-w-[680px] lg:max-w-none">
      <div className="absolute -inset-6 rounded-[2rem] bg-sky-100/70 blur-3xl" />
      <div className="relative overflow-hidden rounded-lg border border-neutral-200 bg-white/95 shadow-2xl shadow-neutral-900/10 backdrop-blur">
        <div className="flex h-12 items-center gap-2 border-b border-neutral-200 px-4">
          <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          <div className="ml-2 hidden h-7 flex-1 max-w-[360px] items-center gap-2 rounded-md bg-neutral-100 px-3 text-xs text-neutral-500 sm:flex">
            <Search size={13} />
            Search workspace, pages, records
          </div>
        </div>
        <div className="grid md:grid-cols-[170px_1fr] lg:grid-cols-[190px_1fr]">
          <aside className="hidden border-r border-neutral-200 bg-neutral-50/80 p-4 md:block">
            <div className="mb-5 flex items-center gap-2">
              <LogoMark />
              <div>
                <div className="h-2.5 w-24 rounded-full bg-neutral-900" />
                <div className="mt-2 h-2 w-16 rounded-full bg-neutral-300" />
              </div>
            </div>
            {['Product', 'Roadmap', 'CRM', 'Team wiki'].map((item, index) => (
              <div key={item} className="mb-2 flex h-8 items-center gap-2 rounded-md px-2 text-xs text-neutral-600">
                <span className={index === 1 ? 'h-2 w-2 rounded-full bg-sky-500' : 'h-2 w-2 rounded-full bg-neutral-300'} />
                {item}
              </div>
            ))}
            <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-3">
              <div className="flex items-center gap-2 text-xs font-medium text-neutral-700">
                <Users size={14} />
                Members
              </div>
              <div className="mt-3 flex -space-x-2">
                <span className="h-7 w-7 rounded-full border-2 border-white bg-sky-200" />
                <span className="h-7 w-7 rounded-full border-2 border-white bg-emerald-200" />
                <span className="h-7 w-7 rounded-full border-2 border-white bg-amber-200" />
              </div>
            </div>
          </aside>
          <main className="min-w-0 p-4 sm:p-6">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-3 inline-flex rounded-md bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">
                  Workspace database
                </div>
                <div className="h-7 w-56 max-w-full rounded-md bg-neutral-950 sm:w-64" />
                <div className="mt-3 h-2.5 w-full max-w-sm rounded-full bg-neutral-200" />
              </div>
              <div className="w-fit rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 shadow-sm">
                Share
              </div>
            </div>
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {databaseViews.map((view) => (
                <div key={view.label} className="flex shrink-0 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-600">
                  <view.icon size={13} />
                  {view.label}
                </div>
              ))}
            </div>
            <div className="overflow-x-auto rounded-lg border border-neutral-200">
              <div className="min-w-[560px]">
                <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] bg-neutral-50 text-xs font-medium text-neutral-500">
                  {['Name', 'Status', 'Team', 'Due'].map((heading) => (
                    <div key={heading} className="border-b border-r border-neutral-200 px-3 py-2 last:border-r-0">
                      {heading}
                    </div>
                  ))}
                </div>
                {rows.map((row) => (
                  <div key={row[0]} className="grid grid-cols-[1.5fr_1fr_1fr_1fr] text-xs text-neutral-700">
                    {row.map((cell, index) => (
                      <div key={cell} className="border-b border-r border-neutral-200 px-3 py-3 last:border-r-0">
                        {index === 1 ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-700">{cell}</span>
                        ) : (
                          cell
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

function Footer() {
  return (
    <footer className="border-t border-neutral-800 bg-neutral-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-white text-sm font-semibold text-neutral-950 shadow-sm">
                T
              </div>
              <div>
                <div className="font-semibold">Teamspace</div>
                <div className="text-xs text-neutral-400">Workspace OS for growing teams</div>
              </div>
            </div>
            <p className="mt-6 max-w-xl text-sm leading-6 text-neutral-300">
              A focused workspace for docs, databases, teams, secure sharing, and the everyday decisions that move projects forward.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {['Realtime', 'RLS secured', 'TypeScript', 'Supabase'].map((item) => (
                <span key={item} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-neutral-300">
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {footerLinks.map((group) => (
              <div key={group.title}>
                <h3 className="text-sm font-semibold text-white">{group.title}</h3>
                <div className="mt-4 space-y-3">
                  {group.links.map((link) => (
                    link.href.startsWith('/') ? (
                      <Link key={link.label} to={link.href} className="block text-sm text-neutral-400 transition-colors hover:text-white">
                        {link.label}
                      </Link>
                    ) : (
                      <a key={link.label} href={link.href} className="block text-sm text-neutral-400 transition-colors hover:text-white">
                        {link.label}
                      </a>
                    )
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 rounded-lg border border-white/10 bg-white/[0.03] p-4 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-5">
          <div>
            <h3 className="text-base font-semibold">Ready to organize your team workspace?</h3>
            <p className="mt-1 text-sm text-neutral-400">Create pages, ship database workflows, and invite collaborators in minutes.</p>
          </div>
          <Link to="/signup" className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-white bg-white px-4 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-100 sm:mt-0 sm:w-auto">
            Get started
            <ArrowRight size={15} />
          </Link>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Teamspace. All rights reserved.</p>
          <p>Built for clean collaboration and secure workspace data.</p>
        </div>
      </div>
    </footer>
  )
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-neutral-950">
      <header className="sticky top-0 z-30 border-b border-neutral-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="Teamspace home">
            <LogoMark />
            <span className="text-sm font-semibold">Teamspace</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-neutral-600 md:flex">
            <a href="#features" className="hover:text-neutral-950">Features</a>
            <a href="#databases" className="hover:text-neutral-950">Databases</a>
            <a href="#security" className="hover:text-neutral-950">Security</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden h-9 items-center rounded-md px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100 sm:inline-flex">
              Log in
            </Link>
            <Link to="/signup" className="inline-flex h-9 items-center gap-2 rounded-md border border-neutral-950 bg-neutral-950 px-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800">
              Get started
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="overflow-hidden border-b border-neutral-200 bg-[radial-gradient(circle_at_80%_20%,#dbeafe_0,#ffffff_34%,#ffffff_100%)]">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[0.86fr_1.14fr] lg:gap-12 lg:px-8 lg:py-24">
            <div className="max-w-2xl text-center lg:text-left">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-sm backdrop-blur">
                <Sparkles size={14} className="text-sky-600" />
                Workspace OS for pages, projects, and CRM data
              </div>
              <h1 className="mx-auto max-w-xl text-4xl font-semibold leading-[1.06] text-neutral-950 sm:text-6xl lg:mx-0 lg:text-7xl">
                Teamspace
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-neutral-600 sm:text-lg sm:leading-8 lg:mx-0">
                A clean collaborative workspace where teams can write docs, manage databases, invite members, share records, and keep projects moving from one organized place.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Link to="/signup" className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-neutral-950 bg-neutral-950 px-5 text-sm font-medium text-white transition-colors hover:bg-neutral-800">
                  Start your workspace
                  <ArrowRight size={16} />
                </Link>
                <Link to="/login" className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-neutral-200 bg-white px-5 text-sm font-medium text-neutral-800 transition-colors hover:bg-neutral-50">
                  Sign in
                </Link>
              </div>
              <div className="mx-auto mt-8 grid max-w-xl grid-cols-1 gap-3 text-left text-sm text-neutral-600 sm:grid-cols-3 lg:mx-0">
                {['Realtime pages', 'Flexible database views', 'Workspace permissions'].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <Check size={16} className="text-emerald-600" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <WorkspacePreview />
          </div>
        </section>

        <section id="features" className="border-b border-neutral-200 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-sky-700">Everything your team needs</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight text-neutral-950 sm:text-4xl">
                One calm workspace for knowledge, data, and collaboration.
              </h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {primaryFeatures.map((feature) => (
                <article key={feature.title} className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 grid h-11 w-11 place-items-center rounded-lg bg-neutral-950 text-white">
                    <feature.icon size={20} />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-950">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-neutral-600">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="databases" className="border-b border-neutral-200 bg-neutral-50 py-16 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
            <div>
              <p className="text-sm font-semibold text-emerald-700">Powerful collections</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight text-neutral-950 sm:text-4xl">
                Turn team information into views people actually use.
              </h2>
              <p className="mt-5 text-base leading-7 text-neutral-600">
                Manage CRM pipelines, product roadmaps, project trackers, team directories, launch calendars, and internal dashboards with the same simple database foundation.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                {databaseViews.map((view) => (
                  <div key={view.label} className="inline-flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700">
                    <view.icon size={16} />
                    {view.label}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {detailFeatures.map((feature) => (
                <div key={feature} className="flex min-h-20 items-start gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
                  <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-emerald-50 text-emerald-700">
                    <Check size={15} />
                  </div>
                  <p className="text-sm font-medium leading-6 text-neutral-700">{feature}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-neutral-200 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-5 md:grid-cols-3">
              <div className="rounded-lg border border-neutral-200 bg-neutral-950 p-6 text-white">
                <Blocks size={24} />
                <h3 className="mt-5 text-xl font-semibold">Blocks for real docs</h3>
                <p className="mt-3 text-sm leading-6 text-neutral-300">
                  Paragraphs, headings, lists, todos, quotes, callouts, code, and dividers make documents useful from day one.
                </p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
                <Workflow size={24} className="text-sky-700" />
                <h3 className="mt-5 text-xl font-semibold text-neutral-950">Organized workflows</h3>
                <p className="mt-3 text-sm leading-6 text-neutral-600">
                  Page trees, favorites, search, database tabs, and workspace navigation keep large teams from losing context.
                </p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
                <MessageSquareText size={24} className="text-amber-700" />
                <h3 className="mt-5 text-xl font-semibold text-neutral-950">Shared conversations</h3>
                <p className="mt-3 text-sm leading-6 text-neutral-600">
                  Comments, detail panels, invites, and shared records help collaboration stay attached to the work itself.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="security" className="bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-neutral-700">Built with care</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight text-neutral-950 sm:text-4xl">
                Simple on the surface, serious underneath.
              </h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {trustFeatures.map((feature) => (
                <article key={feature.title} className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
                  <feature.icon size={24} className="text-neutral-900" />
                  <h3 className="mt-5 text-lg font-semibold text-neutral-950">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-neutral-600">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-neutral-200 bg-neutral-950 py-14 text-white sm:py-16">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 sm:px-6 md:flex-row md:items-center lg:px-8">
            <div>
              <h2 className="text-2xl font-semibold sm:text-3xl">Create your workspace today.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-300">
                Start with pages, build databases as your work grows, and invite the people who need shared context.
              </p>
            </div>
            <Link to="/signup" className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-md border border-white bg-white px-5 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-100 sm:w-auto">
              Get started
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
