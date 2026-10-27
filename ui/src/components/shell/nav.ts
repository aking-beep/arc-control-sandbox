import {
  Activity, BarChart3, Boxes, Briefcase, Building2, ClipboardCheck, FileSearch, FileText, Gauge, GitBranch,
  Globe, HeartPulse, Headphones, Landmark, LayoutDashboard, Plug, Scale, Settings, ShieldAlert, ShieldCheck,
  Siren, FlaskConical, Users, Zap, Bot, Palette, Layers, Map, type LucideIcon
} from 'lucide-react'

export interface NavItem { to: string; label: string; icon: LucideIcon; keywords?: string }
export interface NavGroup { id: 'enterprise' | 'lab' | 'system'; label: string; items: NavItem[] }

export const NAV: NavGroup[] = [
  { id: 'enterprise', label: 'Meridian Commerce', items: [
    { to: '/company', label: 'Company Website', icon: Globe },
    { to: '/enterprise', label: 'Enterprise Overview', icon: Building2 },
    { to: '/enterprise/finance', label: 'Finance', icon: Landmark, keywords: 'refunds ledger transactions' },
    { to: '/enterprise/support', label: 'Customer Support', icon: Headphones, keywords: 'tickets' },
    { to: '/enterprise/sales', label: 'Sales & CRM', icon: Briefcase, keywords: 'accounts export' },
    { to: '/enterprise/hr', label: 'Human Resources', icon: Users, keywords: 'employees salary' },
    { to: '/enterprise/it', label: 'IT & Infrastructure', icon: GitBranch, keywords: 'deployments' },
    { to: '/enterprise/security', label: 'Security Operations', icon: Siren, keywords: 'incidents quarantine' },
  ] },
  { id: 'lab', label: 'ARC Validation Lab', items: [
    { to: '/lab', label: 'Command Center', icon: LayoutDashboard },
    { to: '/lab/agents', label: 'AI Agent Operations', icon: Bot },
    { to: '/lab/scenarios', label: 'Scenario Lab', icon: FlaskConical },
    { to: '/lab/suites', label: 'Suites & Industry Packs', icon: Layers, keywords: 'northwind bank product surface financial services' },
    { to: '/lab/coverage', label: 'Product Coverage', icon: Map, keywords: 'routes capabilities gaps unmapped' },
    { to: '/lab/findings', label: 'Security Findings', icon: ShieldAlert, keywords: 'ARC-SEC-001 ARC-SEC-002 ARC-SEC-003 vulnerability' },
    { to: '/lab/stress', label: 'Stress Lab', icon: Gauge, keywords: 'load performance' },
    { to: '/lab/faults', label: 'Fault Injection', icon: Zap, keywords: 'chaos' },
    { to: '/lab/inspector', label: 'Live Action Inspector', icon: Activity, keywords: 'trace' },
    { to: '/lab/policies', label: 'Policy & Approval Analysis', icon: Scale },
    { to: '/lab/assurance', label: 'ARC Assurance', icon: ShieldCheck, keywords: 'controls ARC-AI' },
    { to: '/lab/evidence', label: 'Evidence Explorer', icon: FileSearch, keywords: 'audit' },
    { to: '/lab/reports', label: 'Validation Reports', icon: FileText },
  ] },
  { id: 'system', label: 'System', items: [
    { to: '/system/integrations', label: 'Integrations', icon: Plug },
    { to: '/system/health', label: 'Environment Health', icon: HeartPulse },
    { to: '/system/settings', label: 'Settings', icon: Settings },
    { to: '/system/design', label: 'Design System', icon: Palette, keywords: 'tokens components status badges' },
  ] },
]

export const ALL_NAV = NAV.flatMap(g => g.items.map(i => ({ ...i, group: g })))

export function crumbsFor(pathname: string): Array<{ label: string; to?: string }> {
  const exact = ALL_NAV.find(i => i.to === pathname)
  const parent = [...ALL_NAV].sort((a, b) => b.to.length - a.to.length).find(i => pathname.startsWith(i.to + '/'))
  const hit = exact ?? parent
  if (!hit) return [{ label: 'Meridian' }]
  const out: Array<{ label: string; to?: string }> = [{ label: hit.group.label }, { label: hit.label, to: exact ? undefined : hit.to }]
  if (!exact) out.push({ label: decodeURIComponent(pathname.slice(hit.to.length + 1)) })
  return out
}

export { BarChart3, Boxes, ClipboardCheck }
