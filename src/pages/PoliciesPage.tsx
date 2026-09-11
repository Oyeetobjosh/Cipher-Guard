import { CheckCircle2, Power, Search, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cipherguardApi } from '../api/client'
import type { Policy } from '../api/types'
import { EmptyBlock, ErrorBlock, LoadingBlock, PageHeader, RefreshButton, StatusBadge } from '../components/Ui'
import { useRemote } from '../hooks/useRemote'
import { formatNumber, formatTime } from '../lib'

export function PoliciesPage() {
  const remote = useRemote(cipherguardApi.getPolicies, [])
  const [search, setSearch] = useState('')
  const [workingId, setWorkingId] = useState<string>()
  const [actionError, setActionError] = useState<string>()
  const policies = useMemo(() => (remote.data ?? []).filter((policy) => `${policy.name} ${policy.description} ${policy.mode} ${policy.scope}`.toLowerCase().includes(search.toLowerCase())), [remote.data, search])

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

  return <div className="page">
    <PageHeader eyebrow="ENFORCEMENT" title="Policies" description="Policy configuration and enforcement state are read from your CipherGuard API." action={<RefreshButton onClick={() => void remote.refresh()} busy={remote.loading} />} />
    <section className="policy-overview"><span><CheckCircle2 size={18} />{remote.data?.filter((policy) => policy.enabled).length ?? '—'} enabled</span><span>{remote.data?.length ?? '—'} policies returned</span></section>
    <div className="filter-bar"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search policy name or scope" aria-label="Search policies" /><span>{policies.length} shown</span></div>
    {actionError && <ErrorBlock compact message={actionError} />}
    {remote.loading && !remote.data && <LoadingBlock rows={5} />}
    {remote.error && !remote.data && <ErrorBlock message={remote.error.message} onRetry={() => void remote.refresh()} />}
    {remote.data && (policies.length ? <section className="policy-list">{policies.map((policy) => <article className="policy-card" key={policy.id || policy.name}>
      <div className="policy-card__state"><span className={`toggle toggle--${policy.enabled ? 'on' : 'off'}`}><i /></span></div>
      <div className="policy-card__main"><div><h2>{policy.name}</h2><StatusBadge value={policy.enabled ? 'Enabled' : 'Disabled'} /></div><p>{policy.description ?? 'No policy description was returned by the API.'}</p><div className="policy-tags">{policy.mode && <span>{policy.mode}</span>}{policy.scope && <span>{policy.scope}</span>}<span>Updated {formatTime(policy.updatedAt)}</span></div></div>
      <div className="policy-card__count"><span>Violations</span><strong>{formatNumber(policy.violations)}</strong></div>
      <button className="button button--secondary button--small" disabled={workingId === policy.id || !policy.id} onClick={() => void toggle(policy)}><Power size={14} />{workingId === policy.id ? 'Saving…' : policy.enabled ? 'Disable' : 'Enable'}</button>
    </article>)}</section> : <EmptyBlock title={search ? 'No matching policies' : 'No policies returned'} body="Create or configure policies in the CipherGuard backend, then refresh this view." />)}
  </div>
}
