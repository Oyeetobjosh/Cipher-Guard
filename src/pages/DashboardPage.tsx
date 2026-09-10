import { Activity, AlertTriangle, ArrowRight, Boxes, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { loadDashboard } from '../api/client'
import type { Metric } from '../api/types'
import { TrafficChart } from '../components/TrafficChart'
import { EmptyBlock, ErrorBlock, LoadingBlock, MetricCard, PageHeader, RefreshButton, StatusBadge } from '../components/Ui'
import { useRemote } from '../hooks/useRemote'
import { deriveTrafficSeries, formatTime, isBlocked, isCritical, isOpen, pickNumber } from '../lib'

const metricValue = (metrics: Metric[], terms: string[]) => metrics.find((metric) => terms.some((term) => metric.label.toLowerCase().includes(term)))?.value
const metricChange = (metrics: Metric[], terms: string[]) => metrics.find((metric) => terms.some((term) => metric.label.toLowerCase().includes(term)))?.change
const sumKnown = (numbers: Array<number | undefined>) => numbers.some((number) => number !== undefined) ? numbers.reduce<number>((total, number) => total + (number ?? 0), 0) : undefined

export function DashboardPage() {
  const remote = useRemote(loadDashboard, [])
  const snapshot = remote.data
  const analyticsMetrics = snapshot?.analytics?.metrics ?? []
  const summary = snapshot?.dashboard
  const protectedRequests = metricValue(analyticsMetrics, ['protected', 'total request', 'traffic']) ?? pickNumber(summary, ['protected_requests', 'protectedRequests', 'total_requests', 'totalRequests']) ?? sumKnown(snapshot?.integrations.map((item) => item.protectedRequests) ?? [])
  const blockedRequests = metricValue(analyticsMetrics, ['blocked', 'denied', 'rejected']) ?? pickNumber(summary, ['blocked_requests', 'blockedRequests', 'denied_requests', 'deniedRequests']) ?? sumKnown(snapshot?.integrations.map((item) => item.blockedRequests) ?? [])
  const alertsReady = !snapshot?.unavailable.includes('alerts')
  const integrationsReady = !snapshot?.unavailable.includes('integrations')
  const trafficReady = !snapshot?.unavailable.includes('traffic')
  const policiesReady = !snapshot?.unavailable.includes('policies')
  const openAlerts = metricValue(analyticsMetrics, ['open alert', 'critical alert', 'active alert']) ?? pickNumber(summary, ['open_alerts', 'openAlerts', 'critical_alerts', 'criticalAlerts']) ?? (alertsReady ? snapshot?.alerts.filter((alert) => isOpen(alert.status) && isCritical(alert.severity)).length : undefined)
  const activeIntegrations = metricValue(analyticsMetrics, ['active integration', 'integration']) ?? pickNumber(summary, ['active_integrations', 'activeIntegrations']) ?? (integrationsReady ? snapshot?.integrations.filter((integration) => ['active', 'healthy', 'connected'].includes(integration.status.toLowerCase())).length : undefined)
  const series = snapshot?.analytics?.trafficSeries.length ? snapshot.analytics.trafficSeries : trafficReady ? deriveTrafficSeries(snapshot?.traffic ?? []) : []
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
        <MetricCard label="Protected requests" value={protectedRequests} change={metricChange(analyticsMetrics, ['protected', 'total request', 'traffic'])} icon={<Activity size={18} />} />
        <MetricCard label="Blocked requests" value={blockedRequests} change={metricChange(analyticsMetrics, ['blocked', 'denied', 'rejected'])} tone="danger" icon={<ShieldAlert size={18} />} />
        <MetricCard label="Critical open alerts" value={openAlerts} tone="danger" icon={<AlertTriangle size={18} />} />
        <MetricCard label="Active integrations" value={activeIntegrations} tone="positive" icon={<Boxes size={18} />} />
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
