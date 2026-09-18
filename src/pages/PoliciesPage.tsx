import { CheckCircle2, Plus, Power, ShieldCheck } from 'lucide-react'
import { FormEvent, useMemo, useState } from 'react'
import { cipherguardApi } from '../api/client'
import type { Integration, Policy, PolicyAction } from '../api/types'
import { EmptyBlock, ErrorBlock, LoadingBlock, PageHeader, RefreshButton, StatusBadge } from '../components/Ui'
import { useRemote } from '../hooks/useRemote'
import { formatNumber, formatTime, integrationKey, titleCase } from '../lib'

interface PoliciesData {
  integrations: Integration[]
  policies: Policy[]
}

type PolicyFormState = {
  integrationId: string
  ruleType: 'allow' | 'block'
  method: string
  endpointPattern: string
  action: PolicyAction
  description: string
}

const initialPolicyForm: PolicyFormState = {
  integrationId: '',
  ruleType: 'allow',
  method: 'GET',
  endpointPattern: '',
  action: 'allow',
  description: '',
}

const methodOptions = ['ALL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE']

const compactMethods = (methods: string[]) => {
  const normalized = methods.map((method) => method.toUpperCase())
  return ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].every((method) => normalized.includes(method)) ? 'ALL' : normalized.join(', ') || 'ALL'
}

const ruleTypeForPolicy = (policy: Policy) => {
  if (policy.allowedEndpoints.length && policy.blockedEndpoints.length) return 'Allow + Block'
  return policy.blockedEndpoints.length ? 'Block' : 'Allow'
}

const endpointsForPolicy = (policy: Policy) => {
  const endpoints = [
    ...policy.allowedEndpoints.map((endpoint) => ({ endpoint, action: 'Allow' })),
    ...policy.blockedEndpoints.map((endpoint) => ({ endpoint, action: 'Block' })),
  ]
  return endpoints.length ? endpoints : [{ endpoint: policy.scope || 'Not specified', action: ruleTypeForPolicy(policy) }]
}

export function PoliciesPage() {
  const remote = useRemote<PoliciesData>(async () => {
    const [integrations, policies] = await Promise.all([
      cipherguardApi.getIntegrations(),
      cipherguardApi.getPolicies(),
    ])
    return { integrations, policies }
  }, [])
  const [selectedIntegrationId, setSelectedIntegrationId] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<PolicyFormState>(initialPolicyForm)
  const [workingId, setWorkingId] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string>()
  const data = remote.data
  const selectedId = selectedIntegrationId || data?.integrations[0]?.id || data?.integrations[0]?.slug || ''
  const integrationOptions = data?.integrations ?? []
  const selectedIntegration = integrationOptions.find((integration) => integration.id === selectedId || integration.slug === selectedId)
  const policies = useMemo(() => (data?.policies ?? []).filter((policy) => policy.integrationId === selectedId), [data?.policies, selectedId])
  const enabledCount = policies.filter((policy) => policy.enabled).length

  const toggle = async (policy: Policy) => {
    setWorkingId(policy.id)
    setActionError(undefined)
    try {
      await cipherguardApi.setPolicyEnabled(policy.id, !policy.enabled)
      await remote.refresh()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to update policy.')
    } finally {
      setWorkingId(undefined)
    }
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const integrationId = form.integrationId || selectedId
    if (!integrationId) return
    setSaving(true)
    setActionError(undefined)
    try {
      await cipherguardApi.createPolicy({
        integrationId,
        ruleType: form.ruleType,
        method: form.method,
        endpointPattern: form.endpointPattern,
        action: form.action,
        description: form.description || undefined,
      })
      setForm({ ...initialPolicyForm, integrationId })
      setSelectedIntegrationId(integrationId)
      setShowForm(false)
      await remote.refresh()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to create policy.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="page">
    <PageHeader
      eyebrow="POLICY CONTROL"
      title="Security Policies"
      description="Define what each third-party integration is allowed to access. Policy evaluation and enforcement stay in the CipherGuard backend."
      action={<div className="header-actions"><button className="button" onClick={() => setShowForm((value) => !value)} disabled={!integrationOptions.length}><Plus size={16} />Create Policy</button><RefreshButton onClick={() => void remote.refresh()} busy={remote.loading} /></div>}
    />

    {remote.loading && !data && <LoadingBlock rows={5} />}
    {remote.error && !data && <ErrorBlock message={remote.error.message} onRetry={() => void remote.refresh()} />}
    {data && <>
      <section className="selector-panel">
        <div><span>Select Integration</span><strong>{selectedIntegration?.name ?? 'No integrations configured'}</strong></div>
        <select value={selectedId} onChange={(event) => setSelectedIntegrationId(event.target.value)} disabled={!integrationOptions.length} aria-label="Select integration">
          {integrationOptions.length ? integrationOptions.map((integration) => <option key={integrationKey(integration)} value={integration.id || integration.slug}>{integration.name}</option>) : <option>No integrations configured</option>}
        </select>
      </section>

      {showForm && <section className="form-panel">
        <div className="form-panel__head"><div><h2>Create Policy</h2><p>Create and manage policy records through the backend API. The frontend does not evaluate or enforce these rules.</p></div></div>
        <form className="form-grid" onSubmit={submit}>
          <label><span>Integration</span><select required value={form.integrationId || selectedId} onChange={(event) => setForm({ ...form, integrationId: event.target.value })}>{integrationOptions.map((integration) => <option key={integrationKey(integration)} value={integration.id || integration.slug}>{integration.name}</option>)}</select></label>
          <label><span>Rule type</span><select value={form.ruleType} onChange={(event) => {
            const ruleType = event.target.value as 'allow' | 'block'
            setForm({ ...form, ruleType, action: ruleType === 'block' ? 'block' : 'allow' })
          }}><option value="allow">Allowed</option><option value="block">Blocked</option></select></label>
          <label><span>HTTP method</span><select value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value })}>{methodOptions.map((method) => <option key={method} value={method}>{method}</option>)}</select></label>
          <label><span>Endpoint pattern</span><input required value={form.endpointPattern} onChange={(event) => setForm({ ...form, endpointPattern: event.target.value })} placeholder="/resource/*" /></label>
          <label><span>Action</span><select value={form.action} onChange={(event) => setForm({ ...form, action: event.target.value as PolicyAction })}><option value="allow">Allow</option><option value="block">Block</option><option value="alert">Alert only</option><option value="log">Log only</option></select></label>
          <label><span>Reason / description</span><input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Why this access is allowed or blocked" /></label>
          {actionError && <div className="form-wide"><ErrorBlock compact message={actionError} /></div>}
          <div className="form-wide form-actions"><button className="button" disabled={saving || !integrationOptions.length}>{saving ? 'Creating…' : 'Create Policy'}</button></div>
        </form>
      </section>}

      {!integrationOptions.length ? <EmptyBlock title="No integrations configured" body="Add an integration first, then create policies for that customer-managed API." /> : <>
        <section className="policy-overview"><span><CheckCircle2 size={18} />{enabledCount} enabled</span><span>{policies.length} policies for selected integration</span><span><ShieldCheck size={18} />Backend-enforced</span></section>
        {actionError && !showForm && <ErrorBlock compact message={actionError} />}
        {policies.length ? <section className="policy-list">{policies.map((policy) => <PolicyCard key={policy.id || policy.name} policy={policy} working={workingId === policy.id} onToggle={toggle} />)}</section> : <EmptyBlock title="No policies for this integration" body="Create a policy to define the API methods and endpoint patterns this integration may access." />}
      </>}
    </>}
  </div>
}

function PolicyCard({ policy, working, onToggle }: { policy: Policy; working: boolean; onToggle: (policy: Policy) => void }) {
  const endpoints = endpointsForPolicy(policy)
  return <article className="policy-card">
    <div className="policy-card__state"><span className={`toggle toggle--${policy.enabled ? 'on' : 'off'}`}><i /></span></div>
    <div className="policy-card__main">
      <div><h2>{policy.name}</h2><StatusBadge value={policy.enabled ? 'Enabled' : 'Disabled'} /><StatusBadge value={ruleTypeForPolicy(policy)} /></div>
      <p>{policy.description ?? 'No policy description was returned by the API.'}</p>
      <div className="policy-rule-table">
        {endpoints.map((item, index) => <div className="policy-rule-row" key={`${item.action}-${item.endpoint}-${index}`}>
          <span><b>Endpoint/path</b>{item.endpoint}</span>
          <span><b>HTTP method</b>{compactMethods(policy.allowedMethods)}</span>
          <span><b>Allow/Block</b>{item.action}</span>
          <span><b>Status</b>{policy.enabled ? 'Active' : 'Disabled'}</span>
        </div>)}
      </div>
      <div className="policy-tags"><span>{titleCase(policy.action)}</span>{policy.rateLimitRpm && <span>{formatNumber(policy.rateLimitRpm)} rpm</span>}<span>Updated {formatTime(policy.updatedAt)}</span></div>
    </div>
    <div className="policy-card__count"><span>Violations</span><strong>{formatNumber(policy.violations)}</strong></div>
    <button className="button button--secondary button--small" disabled={working || !policy.id} onClick={() => void onToggle(policy)}><Power size={14} />{working ? 'Saving…' : policy.enabled ? 'Disable' : 'Enable'}</button>
  </article>
}
