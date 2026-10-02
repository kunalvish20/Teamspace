import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '../features/auth/ProtectedRoute'
import { WorkspaceLayout } from './WorkspaceLayout'
import { Spinner } from '../components/ui/Spinner'
import { devBypassEnabled } from '../lib/dev-bypass'

const LoginPage = lazy(() => import('../pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const SignupPage = lazy(() => import('../pages/SignupPage').then((module) => ({ default: module.SignupPage })))
const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })))
const InvitePage = lazy(() => import('../pages/InvitePage').then((module) => ({ default: module.InvitePage })))
const LandingPage = lazy(() => import('../pages/LandingPage').then((module) => ({ default: module.LandingPage })))
const AppIndexPage = lazy(() => import('../pages/AppIndexPage').then((module) => ({ default: module.AppIndexPage })))
const WorkspaceHomePage = lazy(() => import('../pages/WorkspaceHomePage').then((module) => ({ default: module.WorkspaceHomePage })))
const DatabasePage = lazy(() => import('../pages/DatabasePage').then((module) => ({ default: module.DatabasePage })))
const PagePage = lazy(() => import('../pages/PagePage').then((module) => ({ default: module.PagePage })))
const TrashPage = lazy(() => import('../pages/TrashPage').then((module) => ({ default: module.TrashPage })))
const MembersPage = lazy(() => import('../pages/MembersPage').then((module) => ({ default: module.MembersPage })))
const TeamsPage = lazy(() => import('../pages/TeamsPage').then((module) => ({ default: module.TeamsPage })))
const ProfilePage = lazy(() => import('../pages/ProfilePage').then((module) => ({ default: module.ProfilePage })))
const WorkspaceSettingsPage = lazy(() => import('../pages/WorkspaceSettingsPage').then((module) => ({ default: module.WorkspaceSettingsPage })))
const NotFoundPage = lazy(() => import('../pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))
const SharedRecordPage = lazy(() => import('../pages/SharedRecordPage').then((module) => ({ default: module.SharedRecordPage })))
const SharedCollectionPage = lazy(() => import('../pages/SharedCollectionPage').then((module) => ({ default: module.SharedCollectionPage })))

function Load({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="grid min-h-[40vh] place-items-center"><Spinner className="h-5 w-5 text-neutral-400" /></div>}>{children}</Suspense>
}

export function AppRouter() {
  const authPage = (page: ReactNode) => devBypassEnabled ? <Navigate to="/app" replace /> : <Load>{page}</Load>
  return <Routes>
    <Route path="/" element={<Load><LandingPage /></Load>} />
    <Route path="/login" element={authPage(<LoginPage />)} />
    <Route path="/signup" element={authPage(<SignupPage />)} />
    <Route path="/forgot-password" element={authPage(<ForgotPasswordPage />)} />
    <Route path="/reset-password" element={authPage(<ResetPasswordPage />)} />
    <Route path="/invite/:token" element={<Load><InvitePage /></Load>} />
    <Route element={<ProtectedRoute />}>
      <Route path="/app" element={<Load><AppIndexPage /></Load>} />
      <Route path="/account/profile" element={<Load><ProfilePage /></Load>} />
      <Route path="/shared/record/:shareId" element={<Load><SharedRecordPage /></Load>} />
      <Route path="/shared/collection/:shareId" element={<Load><SharedCollectionPage /></Load>} />
      <Route path="/app/:workspaceSlug" element={<WorkspaceLayout />}>
        <Route index element={<Load><WorkspaceHomePage /></Load>} />
        <Route path="page/:pageId" element={<Load><PagePage /></Load>} />
        <Route path="database/:databaseId" element={<Load><DatabasePage /></Load>} />
        <Route path="database/:databaseId/view/:viewId" element={<Load><DatabasePage /></Load>} />
        <Route path="trash" element={<Load><TrashPage /></Load>} />
        <Route path="settings" element={<Load><WorkspaceSettingsPage /></Load>} />
        <Route path="settings/members" element={<Load><MembersPage /></Load>} />
        <Route path="teams" element={<Load><TeamsPage /></Load>} />
        <Route path="teams/:teamId" element={<Load><TeamsPage /></Load>} />
      </Route>
    </Route>
    <Route path="*" element={<Load><NotFoundPage /></Load>} />
  </Routes>
}
