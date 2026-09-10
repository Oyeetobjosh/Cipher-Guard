import { Bell, ChevronDown, Menu, ShieldCheck, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { apiConfig } from '../api/client'

const navigation = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/integrations', label: 'Integrations' },
  { to: '/traffic', label: 'Traffic' },
  { to: '/alerts', label: 'Alerts' },
  { to: '/policies', label: 'Policies' },
  { to: '/risk', label: 'Risk analytics' },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const section = navigation.find((item) => item.to === location.pathname)?.label ?? 'Integration details'

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'sidebar--open' : ''}`} aria-label="Primary navigation">
        <div className="brand">
          <span className="brand-mark"><ShieldCheck size={22} strokeWidth={2.4} /></span>
          <span>Cipher<span>Guard</span></span>
          <button className="icon-button close-nav" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><X size={19} /></button>
        </div>
        <div className="workspace-label">SECURITY OPERATIONS</div>
        <nav className="nav-list">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className={`connection-dot ${apiConfig.isConfigured ? 'connection-dot--ready' : 'connection-dot--attention'}`} />
          <div>
            <strong>{apiConfig.isConfigured ? 'API configured' : 'API not configured'}</strong>
            <small>{apiConfig.isConfigured ? 'Live data connection' : 'Add VITE_API_BASE_URL'}</small>
          </div>
        </div>
      </aside>
      {menuOpen && <button className="nav-scrim" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />}
      <main className="main-content">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <div className="breadcrumb"><span>Security center</span><b>/</b><strong>{section}</strong></div>
          <div className="topbar-actions">
            <button className="notification-button" aria-label="Notifications"><Bell size={18} /><span /></button>
            <button className="profile-button" aria-label="Account menu"><span className="avatar">CG</span><span className="profile-name">Security team</span><ChevronDown size={15} /></button>
          </div>
        </header>
        {children}
      </main>
    </div>
  )
}
