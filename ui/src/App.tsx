import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { DataProvider } from './api/DataProvider'
import { ReportsProvider } from './api/ReportsProvider'
import { LiveProvider } from './api/LiveProvider'
import { DesignSystem } from './screens/system/DesignSystem'
import { UIProvider } from './components/shell/UIContext'
import { Shell } from './components/shell/Shell'
import { CommandCenter } from './screens/lab/CommandCenter'
import { AgentOps } from './screens/lab/AgentOps'
import { AgentDetail } from './screens/lab/AgentDetail'
import { ScenarioLab } from './screens/lab/ScenarioLab'
import { Findings } from './screens/lab/Findings'
import { FindingDetail } from './screens/lab/FindingDetail'
import { Inspector } from './screens/lab/Inspector'
import { StressLab } from './screens/lab/StressLab'
import { FaultInjection } from './screens/lab/FaultInjection'
import { PolicyAnalysis } from './screens/lab/PolicyAnalysis'
import { Assurance } from './screens/lab/Assurance'
import { Evidence } from './screens/lab/Evidence'
import { Reports } from './screens/lab/Reports'
import { Suites } from './screens/lab/Suites'
import { Coverage } from './screens/lab/Coverage'
import { LiveOps } from './screens/lab/LiveOps'
import { CompanyWebsite } from './screens/enterprise/CompanyWebsite'
import { EnterpriseOverview } from './screens/enterprise/EnterpriseOverview'
import { DepartmentScreen } from './screens/enterprise/DepartmentScreen'
import { Integrations } from './screens/system/Integrations'
import { EnvironmentHealth } from './screens/system/EnvironmentHealth'
import { Settings } from './screens/system/Settings'

export function App() {
  return (
    <DataProvider>
      <LiveProvider>
      <ReportsProvider>
      <HashRouter>
        <UIProvider>
          <Routes>
            <Route element={<Shell />}>
              <Route index element={<Navigate to="/lab" replace />} />
              <Route path="lab" element={<CommandCenter />} />
              <Route path="lab/live" element={<LiveOps />} />
              <Route path="lab/agents" element={<AgentOps />} />
              <Route path="lab/agents/:name" element={<AgentDetail />} />
              <Route path="lab/scenarios" element={<ScenarioLab />} />
              <Route path="lab/findings" element={<Findings />} />
              <Route path="lab/findings/:id" element={<FindingDetail />} />
              <Route path="lab/inspector" element={<Inspector />} />
              <Route path="lab/stress" element={<StressLab />} />
              <Route path="lab/faults" element={<FaultInjection />} />
              <Route path="lab/policies" element={<PolicyAnalysis />} />
              <Route path="lab/assurance" element={<Assurance />} />
              <Route path="lab/evidence" element={<Evidence />} />
              <Route path="lab/reports" element={<Reports />} />
              <Route path="lab/suites" element={<Suites />} />
              <Route path="lab/coverage" element={<Coverage />} />
              <Route path="company" element={<CompanyWebsite />} />
              <Route path="enterprise" element={<EnterpriseOverview />} />
              <Route path="enterprise/:dept" element={<DepartmentScreen />} />
              <Route path="system/integrations" element={<Integrations />} />
              <Route path="system/health" element={<EnvironmentHealth />} />
              <Route path="system/settings" element={<Settings />} />
              <Route path="system/design" element={<DesignSystem />} />
              <Route path="*" element={<Navigate to="/lab" replace />} />
            </Route>
          </Routes>
        </UIProvider>
      </HashRouter>
      </ReportsProvider>
      </LiveProvider>
    </DataProvider>
  )
}
