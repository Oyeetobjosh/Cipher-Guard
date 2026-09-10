import { ArrowRight, Boxes, Search, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { cipherguardApi } from '../api/client'
import type { Integration } from '../api/types'
import { EmptyBlock, ErrorBlock, LoadingBlock, MetricCard, PageHeader, RefreshButton, StatusBadge } from '../components/Ui'
import { useRemote } from '../hooks/useRemote'
import { formatNumber, formatTime, isBlocked, isOpen } from '../lib'

export function IntegrationsPage() {
  const remote = useRemote(cipherguardApi.getIntegrations, [])
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => (remote.data ?? []).filter((item) => `${item.name} ${item.provider} ${item.type} ${item.status}`.toLowerCase().includes(query.toLowerCase())), [remote.data, query])
  const active = (remote.data ?? []).filter((item) => ['active', 'healthy', 'connected'].includes(item.status.toLowerCase())).length

  return <div className="page">
    <PageHeader eyebrow="SURFACE AREA" title="Integrations" description="The services CipherGuard is actively monitoring and enforcing." action={<RefreshButton onClick={() => void remote.refresh()} busy={remote.loading} />} />
    {remote.loading && !remote.data && <LoadingBlock rows={4} />}
    {remote.error && !remote.data && <ErrorBlock message={remote.error.message} onRetry={() => void remote.refresh()} />}
    {remote.data && <>
      <section className="metric-grid metric-grid--three">
        <MetricCard label="Integrations returned" value={remote.data.length} icon={<Boxes size={18} />} />
        <MetricCard label="Active connections" value={active} tone="positive" icon={<ShieldCheck size={18} />} />
        <MetricCard label="Attention needed" value={remote.data.length - active} tone="danger" />
      </section>
      <div className="filter-bar"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search integrations" aria-label="Search integrations" /><span>{filtered.length} shown</span></div>
      {filtered.length ? <section className="integration-grid">
        {filtered.map((integration) => <IntegrationCard integration={integration} key={integration.id || integration.name} />)}
      </section> : <EmptyBlock title={query ? 'No matching integrations' : 'No integrations returned'} body={query ? 'Try a different name, provider, or status.' : 'Connect an integration in the CipherGuard backend, then refresh this page.'} />}
    </>}
  </div>
}

function IntegrationCard({ integration }: { integration: Integration }) {
  return <Link to={`/integrations/${encodeURIComponent(integration.id)}`} className="integration-card">
    <div className="integration-card__top"><span className="provider-avatar">{integration.provider.slice(0, 1).toUpperCase()}</span><StatusBadge value={integration.status} /></div>
    <div className="integration-card__title"><h2>{integration.name}</h2><p>{integration.provider} · {integration.type}</p></div>
    <div className="integration-card__metrics"><div><span>Protected</span><strong>{formatNumber(integration.protectedRequests)}</strong></div><div><span>Blocked</span><strong>{formatNumber(integration.blockedRequests)}</strong></div></div>
    <div className="integration-card__foot"><span>Last activity: {formatTime(integration.lastSeen)}</span><ArrowRight size={17} /></div>
  </Link>
}

interface DetailData {
  integration: Integration
  traffic: Awaited<ReturnType<typeof cipherguardApi.getTraffic>>
  alerts: Awaited<ReturnType<typeof cipherguardApi.getAlerts>>
  relatedUnavailable: string[]
}

export function IntegrationDetailPage() {
  const { id = '' } = useParams()
  const remote = useRemote<DetailData>(async () => {
    const relatedUnavailable: string[] = []
    const [integration, traffic, alerts] = await Promise.all([
      cipherguardApi.getIntegration(id),
      cipherguardApi.getTraffic({ integration_id: id, limit: 20 }).catch(() => { relatedUnavailable.push('traffic'); return [] }),
      cipherguardApi.getAlerts({ integration_id: id, limit: 20 }).catch(() => { relatedUnavailable.push('alerts'); return [] }),
    ])
    return { integration, traffic, alerts, relatedUnavailable }
  }, [id])
  const data = remote.data

  return <div className="page integration-detail-page">
    <Link to="/integrations" className="back-link">← All integrations</Link>
    {remote.loading && !data && <LoadingBlock rows={5} />}
    {remote.error && !data && <ErrorBlock message={remote.error.message} onRetry={() => void remote.refresh()} />}
    {data && <>
      <PageHeader eyebrow="INTEGRATION DETAIL" title={data.integration.name} description={`${data.integration.provider} · ${data.integration.type}`} action={<RefreshButton onClick={() => void remote.refresh()} busy={remote.loading} />} />
      {data.relatedUnavailable.length > 0 && <ErrorBlock compact message={`The integration responded, but related ${data.relatedUnavailable.join(' and ')} could not be loaded.`} onRetry={() => void remote.refresh()} />}
      <section className="detail-hero">
        <div className="detail-identity"><span className="provider-avatar provider-avatar--large">{data.integration.provider.slice(0, 1).toUpperCase()}</span><div><StatusBadge value={data.integration.status} /><p>Last activity: {formatTime(data.integration.lastSeen)}</p></div></div>
        <div className="detail-health"><span>Risk score</span><strong>{formatNumber(data.integration.riskScore)}</strong></div>
      </section>
      <section className="metric-grid metric-grid--three">
        <MetricCard label="Protected requests" value={data.integration.protectedRequests} />
        <MetricCard label="Blocked requests" value={data.integration.blockedRequests} tone="danger" />
        <MetricCard label="Open related alerts" value={data.alerts.filter((alert) => isOpen(alert.status)).length} tone="danger" />
      </section>
      <section className="dashboard-split dashboard-split--tables">
        <section className="table-panel"><div className="panel-title"><div><h2>Recent traffic</h2><p>Events returned for this integration</p></div></div>
          {data.traffic.length ? <div className="compact-list">{data.traffic.slice(0, 7).map((event) => <div className="traffic-row traffic-row--plain" key={event.id}><span className={`decision-mark ${isBlocked(event.decision) ? 'decision-mark--blocked' : ''}`} /><div><strong>{event.method ?? 'REQUEST'} <span>{event.endpoint ?? 'Unknown route'}</span></strong><small>{formatTime(event.timestamp)} · {event.source ?? 'Unknown source'}</small></div><StatusBadge value={event.decision} /></div>)}</div> : <EmptyBlock title="No related traffic returned" />}
        </section>
        <section className="table-panel"><div className="panel-title"><div><h2>Related alerts</h2><p>Findings returned for this integration</p></div></div>
          {data.alerts.length ? <div className="compact-list">{data.alerts.slice(0, 7).map((alert) => <div className="alert-row alert-row--plain" key={alert.id}><span className={`severity-dot severity-dot--${alert.severity.toLowerCase()}`} /><div><strong>{alert.title}</strong><small>{alert.policy ?? 'No policy supplied'} · {formatTime(alert.createdAt)}</small></div><StatusBadge value={alert.severity} /></div>)}</div> : <EmptyBlock title="No related alerts returned" />}
        </section>
      </section>
    </>}
  </div>
}
