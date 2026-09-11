import { Activity, AlertTriangle, ArrowRight, Boxes, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { loadDashboard } from '../api/client'
import { TrafficChart } from '../components/TrafficChart'
import { EmptyBlock, ErrorBlock, LoadingBlock, MetricCard, PageHeader, RefreshButton, StatusBadge } from '../components/Ui'
import { useRemote } from '../hooks/useRemote'
import { deriveTrafficSeries, formatTime, isBlocked, isCritical, isOpen, pickNumber } from '../lib'

export function DashboardPage() {
  const remote = useRemote(loadDashboard, [])
  const snapshot = remote.data
  const analyticsOverview = snapshot?.analytics?.raw
  const trafficStats = snapshot?.trafficStats
  const alertsReady = !snapshot?.unavailable.includes('alerts')
  const integrationsReady = !snapshot?.unavailable.includes('integrations')
  const trafficReady = !snapshot?.unavailable.includes('traffic')
  const policiesReady = !snapshot?.unavailable.includes('policies')
  const protectedRequests = pickNumber(trafficStats, ['total_requests', 'totalRequests']) ?? pickNumber(analyticsOverview, ['total_observed_events_24h', 'totalObservedEvents24h'])
  const blockedRequests = pickNumber(trafficStats, ['blocked_requests', 'blockedRequests']) ?? pickNumber(analyticsOverview, ['violations_count_24h', 'violationsCount24h'])
  const openAlerts = pickNumber(analyticsOverview, ['critical_alerts_count', 'criticalAlertsCount']) ?? (alertsReady ? snapshot?.alerts.filter((alert) => isOpen(alert.status) && isCritical(alert.severity)).length : undefined)
  const activeIntegrations = pickNumber(analyticsOverview, ['total_monitored_integrations', 'totalMonitoredIntegrations']) ?? (integrationsReady ? snapshot?.integrations.length : undefined)
  const series = trafficReady ? deriveTrafficSeries(snapshot?.traffic ?? []) : []
  const recentAlerts = [...(snapshot?.alerts ?? [])].sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))).slice(0, 5)
  const latestTraffic = [...(snapshot?.traffic ?? [])].sort((a, b) => String(b.timestamp ?? '').localeCompare(String(a.timestamp ?? ''))).slice(0, 5)

  return <div className="page dashboard-page">
    <PageHeader
      eyebrow="OVERVIEW"
      title="Security, in clear view."
      description="Live posture, enforcement activity, and the issues that need attention."
      action={<RefreshButton onClick={() => void remote.refresh()} busy={remote.loading} />}
    />

    {remote.loading && !snapshot && <LoadingBlock rows={5} />}
    {remote.error && !snapshot && <ErrorBlock message={remote.error.message} onRetry={() => void remote.refresh()} />}
    {snapshot && <>
      {snapshot.unavailable.length > 0 && <ErrorBlock compact message={`No response from: ${snapshot.unavailable.join(', ')}. The remaining panels use the live resources that did respond.`} onRetry={() => void remote.refresh()} />}
      <section className="metric-grid">
        <MetricCard label="Observed requests" value={protectedRequests} icon={<Activity size={18} />} />
        <MetricCard label="Blocked requests" value={blockedRequests} tone="danger" icon={<ShieldAlert size={18} />} />
        <MetricCard label="Critical open alerts" value={openAlerts} tone="danger" icon={<AlertTriangle size={18} />} />
        <MetricCard label="Monitored integrations" value={activeIntegrations} tone="positive" icon={<Boxes size={18} />} />
      </section>

      <section className="dashboard-split dashboard-split--chart">
        <TrafficChart points={series} />
        <section className="side-panel posture-panel">
          <div className="panel-title"><div><h2>Protection posture</h2><p>Enforcement across configured policies</p></div></div>
          <div className="posture-list">
            <div><span>Policies enabled</span><strong>{policiesReady ? snapshot.policies.filter((policy) => policy.enabled).length : '—'}{policiesReady && <small> / {snapshot.policies.length} returned</small>}</strong></div>
            <div><span>Open alerts returned</span><strong>{alertsReady ? snapshot.alerts.filter((alert) => isOpen(alert.status)).length : '—'}</strong></div>
            <div><span>Blocked in loaded traffic</span><strong>{trafficReady ? snapshot.traffic.filter((event) => isBlocked(event.decision)).length : '—'}</strong></div>
          </div>
          <Link className="text-link" to="/policies">Review policies <ArrowRight size={15} /></Link>
        </section>
      </section>

      <section className="dashboard-split dashboard-split--tables">
        <section className="table-panel">
          <div className="panel-title"><div><h2>Priority alerts</h2><p>Newest findings from the alert API</p></div><Link to="/alerts" className="text-link">View all <ArrowRight size={15} /></Link></div>
          {recentAlerts.length ? <div className="compact-list">
            {recentAlerts.map((alert) => <Link to="/alerts" className="alert-row" key={alert.id}>
              <span className={`severity-dot severity-dot--${alert.severity.toLowerCase()}`} />
              <div><strong>{alert.title}</strong><small>{alert.integration ?? 'Unassigned'} · {formatTime(alert.createdAt)}</small></div>
              <StatusBadge value={alert.severity} />
            </Link>)}
          </div> : <EmptyBlock title="No alerts returned" body="The alert API has no findings to show right now." />}
        </section>
        <section className="table-panel">
          <div className="panel-title"><div><h2>Recent traffic</h2><p>Latest events returned by the traffic API</p></div><Link to="/traffic" className="text-link">Explore traffic <ArrowRight size={15} /></Link></div>
          {latestTraffic.length ? <div className="compact-list">
            {latestTraffic.map((event) => <Link to="/traffic" className="traffic-row" key={event.id}>
              <span className={`decision-mark ${isBlocked(event.decision) ? 'decision-mark--blocked' : ''}`} />
              <div><strong>{event.method ?? 'REQUEST'} <span>{event.endpoint ?? 'Unknown route'}</span></strong><small>{event.integration ?? event.source ?? 'Unknown source'} · {formatTime(event.timestamp)}</small></div>
              <StatusBadge value={event.decision} />
            </Link>)}
          </div> : <EmptyBlock title="No traffic returned" body="The traffic API has no recent events to show." />}
        </section>
      </section>
    </>}
  </div>
}
