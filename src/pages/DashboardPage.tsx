import { Activity, AlertTriangle, ArrowRight, Boxes, CheckCircle2, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { loadDashboard } from '../api/client'
import { TrafficChart } from '../components/TrafficChart'
import { EmptyBlock, ErrorBlock, LoadingBlock, MetricCard, PageHeader, RefreshButton, StatusBadge } from '../components/Ui'
import { useRemote } from '../hooks/useRemote'
import { deriveTrafficSeries, formatNumber, formatTime, isAllowed, isBlocked, isOpen, pickNumber, pickString, titleCase } from '../lib'

export function DashboardPage() {
  const remote = useRemote(loadDashboard, [])
  const snapshot = remote.data
  const analyticsOverview = snapshot?.analytics?.raw
  const trafficStats = snapshot?.trafficStats
  const alertsReady = !snapshot?.unavailable.includes('alerts')
  const integrationsReady = !snapshot?.unavailable.includes('integrations')
  const trafficReady = !snapshot?.unavailable.includes('traffic')
  const policiesReady = !snapshot?.unavailable.includes('policies')

  const totalRequests = pickNumber(trafficStats, ['total_requests', 'totalRequests'])
    ?? pickNumber(analyticsOverview, ['total_observed_events_24h', 'totalObservedEvents24h'])
    ?? (trafficReady ? snapshot?.traffic.length : undefined)
  const allowedRequests = pickNumber(trafficStats, ['allowed_requests', 'allowedRequests'])
    ?? (trafficReady ? snapshot?.traffic.filter((event) => isAllowed(event.decision)).length : undefined)
  const blockedRequests = pickNumber(trafficStats, ['blocked_requests', 'blockedRequests'])
    ?? pickNumber(analyticsOverview, ['violations_count_24h', 'violationsCount24h'])
    ?? (trafficReady ? snapshot?.traffic.filter((event) => isBlocked(event.decision)).length : undefined)
  const activeAlerts = pickNumber(analyticsOverview, ['total_active_alerts', 'totalActiveAlerts'])
    ?? (alertsReady ? snapshot?.alerts.filter((alert) => isOpen(alert.status)).length : undefined)
  const totalIntegrations = pickNumber(analyticsOverview, ['total_monitored_integrations', 'totalMonitoredIntegrations'])
    ?? (integrationsReady ? snapshot?.integrations.length : undefined)
  const riskLevel = pickString(analyticsOverview, ['overall_risk_level', 'overallRiskLevel'])
  const riskScore = pickNumber(analyticsOverview, ['overall_risk_score', 'overallRiskScore'])
  const riskPosture = riskLevel ? titleCase(riskLevel) : riskScore !== undefined ? `${formatNumber(riskScore)}/100` : undefined
  const series = snapshot?.analytics?.trafficSeries?.length ? snapshot.analytics.trafficSeries : trafficReady ? deriveTrafficSeries(snapshot?.traffic ?? []) : []
  const recentAlerts = [...(snapshot?.alerts ?? [])].sort((a, b) => String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))).slice(0, 5)
  const latestTraffic = [...(snapshot?.traffic ?? [])].sort((a, b) => String(b.timestamp ?? '').localeCompare(String(a.timestamp ?? ''))).slice(0, 6)

  return <div className="page dashboard-page">
    <PageHeader
      eyebrow="OVERVIEW"
      title="Security overview"
      description="A live command-center view of integrations, API traffic, blocked activity, active alerts, and risk posture reported by the CipherGuard backend."
      action={<RefreshButton onClick={() => void remote.refresh()} busy={remote.loading} />}
    />

    {remote.loading && !snapshot && <LoadingBlock rows={5} />}
    {remote.error && !snapshot && <ErrorBlock message={remote.error.message} onRetry={() => void remote.refresh()} />}
    {snapshot && <>
      {snapshot.unavailable.length > 0 && <ErrorBlock compact message={`No response from: ${snapshot.unavailable.join(', ')}. Panels below use the live resources that did respond.`} onRetry={() => void remote.refresh()} />}
      <section className="metric-grid metric-grid--six">
        <MetricCard label="Total integrations" value={totalIntegrations} tone="positive" icon={<Boxes size={18} />} />
        <MetricCard label="Total API requests" value={totalRequests} icon={<Activity size={18} />} />
        <MetricCard label="Allowed requests" value={allowedRequests} tone="positive" icon={<CheckCircle2 size={18} />} />
        <MetricCard label="Blocked requests" value={blockedRequests} tone="danger" icon={<ShieldAlert size={18} />} />
        <MetricCard label="Active alerts" value={activeAlerts} tone="danger" icon={<AlertTriangle size={18} />} />
        <MetricCard label="Overall risk posture" value={riskPosture} unit={riskLevel && riskScore !== undefined ? `${formatNumber(riskScore)}/100` : undefined} icon={<ShieldCheck size={18} />} />
      </section>

      <section className="dashboard-split dashboard-split--chart">
        <TrafficChart points={series} title="API request flow" subtitle="Allowed and blocked requests reported by CipherGuard" />
        <section className="side-panel posture-panel">
          <div className="panel-title"><div><h2>Risk posture</h2><p>Backend posture and enforcement health</p></div></div>
          <div className="posture-meter">
            <span className={`severity-dot severity-dot--${riskLevel ?? 'unknown'}`} />
            <strong>{riskPosture ?? 'No risk data'}</strong>
            {riskScore !== undefined && <small>{formatNumber(riskScore)} / 100 risk score</small>}
          </div>
          <div className="posture-list">
            <div><span>Policies enabled</span><strong>{policiesReady ? snapshot.policies.filter((policy) => policy.enabled).length : '—'}{policiesReady && <small> / {snapshot.policies.length} returned</small>}</strong></div>
            <div><span>Security events open</span><strong>{alertsReady ? snapshot.alerts.filter((alert) => isOpen(alert.status)).length : '—'}</strong></div>
            <div><span>Blocked in loaded traffic</span><strong>{trafficReady ? snapshot.traffic.filter((event) => isBlocked(event.decision)).length : '—'}</strong></div>
          </div>
          <Link className="text-link" to="/policies">Review policies <ArrowRight size={15} /></Link>
        </section>
      </section>

      <section className="dashboard-split dashboard-split--tables">
        <section className="table-panel">
          <div className="panel-title"><div><h2>Recent API traffic</h2><p>Latest requests observed by the traffic API</p></div><Link to="/traffic" className="text-link">Explore traffic <ArrowRight size={15} /></Link></div>
          {latestTraffic.length ? <div className="compact-list">
            {latestTraffic.map((event) => <Link to="/traffic" className="traffic-row" key={event.id}>
              <span className={`decision-mark ${isBlocked(event.decision) ? 'decision-mark--blocked' : ''}`} />
              <div><strong>{event.method ?? 'REQUEST'} <span>{event.endpoint ?? 'Unknown endpoint'}</span></strong><small>{event.integration ?? 'Unassigned integration'} · {formatTime(event.timestamp)}</small></div>
              <StatusBadge value={event.decision} />
            </Link>)}
          </div> : <EmptyBlock title="No traffic returned" body="Requests will appear here as customer-configured integrations send traffic through CipherGuard." />}
        </section>
        <section className="table-panel">
          <div className="panel-title"><div><h2>Recent security events</h2><p>Newest alerts generated by CipherGuard</p></div><Link to="/alerts" className="text-link">View alerts <ArrowRight size={15} /></Link></div>
          {recentAlerts.length ? <div className="compact-list">
            {recentAlerts.map((alert) => <Link to="/alerts" className="alert-row" key={alert.id}>
              <span className={`severity-dot severity-dot--${alert.severity.toLowerCase()}`} />
              <div><strong>{alert.title}</strong><small>{alert.integration ?? 'Unassigned integration'} · {formatTime(alert.createdAt)}</small></div>
              <StatusBadge value={alert.severity} />
            </Link>)}
          </div> : <EmptyBlock title="No security events returned" body="Alerts generated by backend policy enforcement will appear here." />}
        </section>
      </section>
    </>}
  </div>
}
