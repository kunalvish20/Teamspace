import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
export function NotFoundPage() { return <div className="grid min-h-screen place-items-center p-6 text-center"><div><div className="text-5xl font-semibold text-neutral-200">404</div><h1 className="mt-3 text-lg font-semibold">Page not found</h1><p className="mt-1 text-sm text-neutral-500">The route or workspace may no longer exist.</p><Link to="/app" className="mt-5 inline-block"><Button>Back to workspace</Button></Link></div></div> }
