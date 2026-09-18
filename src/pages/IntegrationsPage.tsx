import { ArrowRight, Boxes, Globe2, KeyRound, Plus, Search, ShieldCheck, X } from 'lucide-react'
import { FormEvent, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { cipherguardApi } from '../api/client'
import type { AuthType, Integration, TrafficEvent } from '../api/types'
import { RequestDetailsModal } from '../components/RequestDetails'
import { EmptyBlock, ErrorBlock, LoadingBlock, MetricCard, PageHeader, RefreshButton, StatusBadge } from '../components/Ui'
import { useRemote } from '../hooks/useRemote'
import { credentialStatus, formatAuthType, formatNumber, formatTime, integrationKey, isAllowed, isBlocked, isOpen } from '../lib'

type IntegrationFormState = {
  name: string
  description: string
  upstreamUrl: string
  authType: AuthType
  credential: string
}

const emptyIntegrationForm: IntegrationFormState = {
  name: '',
  description: '',
  upstreamUrl: '',
  authType: 'none',
  credential: '',
}

export function IntegrationsPage() {
  const remote = useRemote(cipherguardApi.getIntegrations, [])
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<IntegrationFormState>(emptyIntegrationForm)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string>()
  const integrations = remote.data ?? []
  const filtered = useMemo(() => integrations.filter((item) => `${item.name} ${item.type} ${item.status} ${item.upstreamUrl}`.toLowerCase().includes(query.toLowerCase())), [integrations, query])
  const active = integrations.filter((item) => ['active', 'healthy', 'connected', 'monitoring'].includes(item.status.toLowerCase())).length

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setActionError(undefined)
    try {
      await cipherguardApi.createIntegration({
        name: form.name,
        description: form.description || undefined,
        upstreamUrl: form.upstreamUrl,
        authType: form.authType,
        credential: form.authType === 'none' ? undefined : form.credential,
      })
      setForm(emptyIntegrationForm)
      setShowForm(false)
      await remote.refresh()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to save integration.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="page">
    <PageHeader
      eyebrow="INTEGRATION CONTROL"
      title="Integrations"
      description="Connect, monitor, and control your third-party API integrations. CipherGuard renders only the integrations returned by your backend."
      action={<div className="header-actions"><button className="button" onClick={() => setShowForm((value) => !value)}><Plus size={16} />Add Integration</button><RefreshButton onClick={() => void remote.refresh()} busy={remote.loading} /></div>}
    />

    {showForm && <section className="form-panel add-integration-panel">
      <div className="form-panel__head">
        <div><h2>Add Integration</h2><p>Create a generic upstream API connection. Credentials are sent to the backend once and never rendered back in plaintext.</p></div>
        <button className="icon-button" onClick={() => setShowForm(false)} aria-label="Close add integration form"><X size={19} /></button>
      </div>
      <form className="form-grid" onSubmit={submit}>
        <label><span>Integration Name</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Customer API name" /></label>
        <label><span>Description <em>optional</em></span><input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="What this integration is allowed to do" /></label>
        <label className="form-wide"><span>Upstream API Base URL</span><input required type="url" value={form.upstreamUrl} onChange={(event) => setForm({ ...form, upstreamUrl: event.target.value })} placeholder="https://api.customer-service.example" /></label>
        <label><span>Authentication Type</span><select value={form.authType} onChange={(event) => setForm({ ...form, authType: event.target.value as AuthType, credential: event.target.value === 'none' ? '' : form.credential })}><option value="none">None</option><option value="api_key">API Key</option><option value="bearer_token">Bearer Token</option><option value="basic_auth">Basic Auth</option></select></label>
        {form.authType !== 'none' && <label><span>Credential / Secret</span><input required type="password" value={form.credential} onChange={(event) => setForm({ ...form, credential: event.target.value })} placeholder="Stored securely by CipherGuard" autoComplete="new-password" /></label>}
        {actionError && <div className="form-wide"><ErrorBlock compact message={actionError} /></div>}
        <div className="form-wide form-actions"><button className="button" disabled={saving}>{saving ? 'Saving…' : 'Save Integration'}</button></div>
      </form>
    </section>}

    {remote.loading && !remote.data && <LoadingBlock rows={4} />}
    {remote.error && !remote.data && <ErrorBlock message={remote.error.message} onRetry={() => void remote.refresh()} />}
    {remote.data && <>
      <section className="metric-grid metric-grid--three">
        <MetricCard label="Total integrations" value={integrations.length} icon={<Boxes size={18} />} />
        <MetricCard label="Connected / monitoring" value={active} tone="positive" icon={<ShieldCheck size={18} />} />
        <MetricCard label="Attention needed" value={Math.max(integrations.length - active, 0)} tone="danger" />
      </section>
      <div className="filter-bar"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search integrations" aria-label="Search integrations" /><span>{filtered.length} shown</span></div>
      {filtered.length ? <section className="integration-grid">
        {filtered.map((integration) => <IntegrationCard integration={integration} key={integrationKey(integration)} />)}
      </section> : <EmptyBlock title={query ? 'No matching integrations' : 'No integrations configured'} body={query ? 'Try a different name, status, URL, or category.' : 'Add a customer-managed API integration to begin monitoring and enforcement.'} />}
    </>}
  </div>
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const authStatus = credentialStatus(integration.authType, integration.hasAuthCredential)
  return <Link to={`/integrations/${encodeURIComponent(integrationKey(integration))}`} className="integration-card">
    <div className="integration-card__top"><span className="provider-avatar">{integration.name.slice(0, 1).toUpperCase()}</span><StatusBadge value={integration.status} /></div>
    <div className="integration-card__title"><h2>{integration.name}</h2><p>{integration.description ?? 'Customer-configured third-party API integration'}</p></div>
    <div className="integration-url"><Globe2 size={14} /><span>{integration.upstreamUrl ?? 'No upstream URL returned'}</span></div>
    <div className="integration-card__metrics"><div><span>Total requests</span><strong>{formatNumber(integration.totalRequests ?? integration.protectedRequests)}</strong></div><div><span>Risk score</span><strong>{formatNumber(integration.riskScore)}</strong></div></div>
    <div className="credential-line"><KeyRound size={14} /><span>{formatAuthType(integration.authType)} · {authStatus}</span></div>
    <div className="integration-card__foot"><span>Last activity: {formatTime(integration.lastSeen)}</span><ArrowRight size={17} /></div>
  </Link>
}

interface DetailData {
  integration: Integration
  traffic: Awaited<ReturnType<typeof cipherguardApi.getTraffic>>
  alerts: Awaited<ReturnType<typeof cipherguardApi.getAlerts>>
  relatedUnavailable: string[]
}

const safeDecode = (value: string) => {
  try { return decodeURIComponent(value) } catch { return value }
}

export function IntegrationDetailPage() {
  const { id = '' } = useParams()
  const integrationId = safeDecode(id)
  const [selectedEvent, setSelectedEvent] = useState<TrafficEvent>()
  const remote = useRemote<DetailData>(async () => {
    const relatedUnavailable: string[] = []
    const [integration, traffic, alerts] = await Promise.all([
      cipherguardApi.getIntegration(integrationId),
      cipherguardApi.getTraffic({ integration_id: integrationId, limit: 250 }).catch(() => { relatedUnavailable.push('traffic'); return [] }),
      cipherguardApi.getAlerts({ integration_id: integrationId, limit: 100 }).catch(() => { relatedUnavailable.push('alerts'); return [] }),
    ])
    return { integration, traffic, alerts, relatedUnavailable }
  }, [integrationId])
  const data = remote.data
  const totalRequests = data ? data.integration.totalRequests ?? data.integration.protectedRequests ?? data.traffic.length : undefined
  const allowed = data ? data.integration.allowedRequests ?? data.traffic.filter((event) => isAllowed(event.decision)).length : undefined
  const blocked = data ? data.integration.blockedRequests ?? data.traffic.filter((event) => isBlocked(event.decision)).length : undefined
  const authStatus = data ? credentialStatus(data.integration.authType, data.integration.hasAuthCredential) : '—'

  return <div className="page integration-detail-page">
    <Link to="/integrations" className="back-link">← All integrations</Link>
    {remote.loading && !data && <LoadingBlock rows={5} />}
    {remote.error && !data && <ErrorBlock message={remote.error.message} onRetry={() => void remote.refresh()} />}
    {data && <>
      <PageHeader eyebrow="INTEGRATION DETAILS" title={data.integration.name} description="A dynamic view of the customer-configured upstream API, its authentication status, and the traffic CipherGuard observed." action={<RefreshButton onClick={() => void remote.refresh()} busy={remote.loading} />} />
      {data.relatedUnavailable.length > 0 && <ErrorBlock compact message={`The integration loaded, but related ${data.relatedUnavailable.join(' and ')} could not be retrieved.`} onRetry={() => void remote.refresh()} />}
      <section className="detail-hero">
        <div className="detail-identity"><span className="provider-avatar provider-avatar--large">{data.integration.name.slice(0, 1).toUpperCase()}</span><div><StatusBadge value={data.integration.status} /><p>{data.integration.description ?? 'Customer-configured third-party API integration'}</p></div></div>
        <div className="detail-health"><span>Risk posture</span><strong>{data.integration.riskLevel ? `${data.integration.riskLevel} · ` : ''}{formatNumber(data.integration.riskScore)}</strong></div>
      </section>
      <section className="detail-metadata-grid">
        <div><span>Connection status</span><strong><StatusBadge value={data.integration.status} /></strong></div>
        <div><span>Upstream URL</span><strong>{data.integration.upstreamUrl ?? 'Not returned'}</strong></div>
        <div><span>Authentication status</span><strong>{formatAuthType(data.integration.authType)} · {authStatus}</strong></div>
        <div><span>Gateway endpoint</span><strong>{data.integration.gatewayUrl ?? 'Not returned'}</strong></div>
      </section>
      <section className="metric-grid metric-grid--three">
        <MetricCard label="Total requests" value={totalRequests} />
        <MetricCard label="Allowed requests" value={allowed} tone="positive" />
        <MetricCard label="Blocked requests" value={blocked} tone="danger" />
      </section>
      <section className="dashboard-split dashboard-split--tables">
        <section className="table-panel api-activity-panel"><div className="panel-title"><div><h2>API Activity</h2><p>Requests observed for this integration. Select a row to inspect enforcement context.</p></div></div>
          {data.traffic.length ? <div className="data-table-scroll"><table><thead><tr><th>Method</th><th>Endpoint</th><th>Decision</th><th>Risk</th></tr></thead><tbody>
            {data.traffic.map((event) => <tr className="clickable-row" key={event.id} onClick={() => setSelectedEvent(event)}><td><code>{event.method ?? '—'}</code></td><td>{event.endpoint ?? 'Unknown endpoint'}</td><td><StatusBadge value={event.decision} /></td><td>{formatNumber(event.riskScore ?? event.risk)}</td></tr>)}
          </tbody></table></div> : <EmptyBlock title="No API activity returned" body="CipherGuard will populate this table when requests flow through this integration." />}
        </section>
        <section className="table-panel"><div className="panel-title"><div><h2>Recent security events</h2><p>Alerts generated for this integration by the backend.</p></div></div>
          {data.alerts.length ? <div className="compact-list">{data.alerts.slice(0, 8).map((alert) => <Link to="/alerts" className="alert-row" key={alert.id}><span className={`severity-dot severity-dot--${alert.severity.toLowerCase()}`} /><div><strong>{alert.title}</strong><small>{alert.policy ?? alert.endpoint ?? 'No policy supplied'} · {formatTime(alert.createdAt)}</small></div><StatusBadge value={alert.severity} /></Link>)}</div> : <EmptyBlock title="No related alerts returned" body="No security events are associated with this integration yet." />}
        </section>
      </section>
      <RequestDetailsModal event={selectedEvent} onClose={() => setSelectedEvent(undefined)} />
    </>}
  </div>
}
