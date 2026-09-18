import { Navigate, Route, Routes } from 'react-router-dom'
import { BrowserRouter } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { AlertsPage } from './pages/AlertsPage'
import { DashboardPage } from './pages/DashboardPage'
import { IntegrationDetailPage, IntegrationsPage } from './pages/IntegrationsPage'
import { PoliciesPage } from './pages/PoliciesPage'
import { TrafficPage } from './pages/TrafficPage'
import './styles.css'

export default function App() {
  return <BrowserRouter><AppShell><Routes>
    <Route path="/" element={<DashboardPage />} />
    <Route path="/integrations" element={<IntegrationsPage />} />
    <Route path="/integrations/:id" element={<IntegrationDetailPage />} />
    <Route path="/traffic" element={<TrafficPage />} />
    <Route path="/policies" element={<PoliciesPage />} />
    <Route path="/alerts" element={<AlertsPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></AppShell></BrowserRouter>
}
