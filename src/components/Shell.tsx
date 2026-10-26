import React from 'react'
import { NavLink } from 'react-router-dom'
import { Gauge, ShieldAlert, FlaskConical, ScanSearch, ExternalLink } from 'lucide-react'
import { useLab } from '../lib/LabData'
import { REPORT } from '../data/report'
import { ModeBanner } from './ModeBanner'

const NAV = [
  { to: '/', label: 'Command Center', icon: Gauge, end: true },
  { to: '/findings', label: 'Security Findings', icon: ShieldAlert, count: 2 },
  { to: '/scenarios', label: 'Scenario Lab', icon: FlaskConical },
  { to: '/inspector', label: 'Action Inspector', icon: ScanSearch },
]

export function Shell({ children }: { children: React.ReactNode }) {
  const { mode, gatewayConfigured } = useLab()
  const services = [
    { name: 'Meridian', port: ':8890', up: mode === 'live' },
    { name: 'ARC API', port: ':8787', up: mode === 'live' && gatewayConfigured },
    { name: 'ARC Console', port: ':8788', up: mode === 'live' && gatewayConfigured },
  ]
  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <aside className="flex w-[232px] shrink-0 flex-col bg-navy-900 text-white">
        <div className="flex items-center gap-2.5 px-5 pb-6 pt-5">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-teal-600 text-[13px] font-bold tracking-tight">M</div>
          <div className="leading-tight">
            <div className="text-[13px] font-semibold">Meridian Commerce</div>
            <div className="text-[11px] text-white/55">ARC Validation Lab</div>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 px-3">
          {NAV.map(({ to, label, icon: Icon, end, count }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors duration-150 ${
                  isActive ? 'bg-white/10 text-white' : 'text-white/65 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon size={15} strokeWidth={1.75} />
              <span className="flex-1 whitespace-nowrap">{label}</span>
              {count ? (
                <span className="tnum rounded bg-fail px-1.5 text-[11px] font-semibold leading-[18px] text-white">{count}</span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-white/10 px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-medium text-white/50">Environment</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10.5px] font-semibold ${
                mode === 'live' ? 'bg-teal-600 text-white' : mode === 'fixture' ? 'bg-warn-bg text-warn' : 'bg-white/10 text-white/70'
              }`}
            >
              {mode === 'live' ? 'Live' : mode === 'fixture' ? 'Design fixture' : 'Detecting…'}
            </span>
          </div>
          <ul className="space-y-1.5">
            {services.map((s) => (
              <li key={s.name} className="flex items-center gap-2 text-[12px]">
                <span className={`h-1.5 w-1.5 rounded-full ${s.up ? 'bg-teal-600' : 'bg-white/25'}`} />
                <span className="text-white/80">{s.name}</span>
                <span className="ml-auto font-mono text-[11px] text-white/40">{s.port}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 font-mono text-[10.5px] leading-relaxed text-white/40">
            ARC {REPORT.arcRevision.slice(0, 7)} · sandbox {REPORT.sandboxRevision.slice(0, 7)}
          </div>
          <a
            href="http://127.0.0.1:8788"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-[11.5px] text-white/60 transition-colors duration-150 hover:text-white"
          >
            Open ARC console <ExternalLink size={11} />
          </a>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <ModeBanner />
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  )
}
