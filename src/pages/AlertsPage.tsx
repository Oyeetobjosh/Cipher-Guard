import { Check, Search, ShieldAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cipherguardApi } from '../api/client'
import type { SecurityAlert } from '../api/types'
import { EmptyBlock, ErrorBlock, LoadingBlock, PageHeader, RefreshButton, StatusBadge } from '../components/Ui'
import { useRemote } from '../hooks/useRemote'
import { formatTime, isOpen, titleCase } from '../lib'

export function AlertsPage() {
  const remote = useRemote(() => cipherguardApi.getAlerts({ limit: 250 }), [])
  const [filter, setFilter] = useState('open')
  const [search, setSearch] = useState('')
  const [workingId, setWorkingId] = useState<string>()
  const [actionError, setActionError] = useState<string>()
  const alerts = useMemo(() => (remote.data ?? []).filter((alert) => {
    const matchesFilter = filter === 'all' || (filter === 'open' ? isOpen(alert.status) : alert.severity.toLowerCase() === filter)
    return matchesFilter && `${alert.title} ${alert.description} ${alert.integration} ${alert.policy}`.toLowerCase().includes(search.toLowerCase())
  }), [remote.data, filter, search])

  const acknowledge = async (alert: SecurityAlert) => {
    setWorkingId(alert.id)
    setActionError(undefined)
    try {
      await cipherguardApi.acknowledgeAlert(alert.id)
      await remote.refresh()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to acknowledge alert.')
    } finally {
      setWorkingId(undefined)
    }
  }

  return <div className="page">
    <PageHeader eyebrow="DETECTION QUEUE" title="Alerts" description="Triage live security findings surfaced by CipherGuard policies." action={<RefreshButton onClick={() => void remote.refresh()} busy={remote.loading} />} />
    <div className="control-bar control-bar--alerts">
      <div className="segmented-control" aria-label="Alert filter">
        {[['open', 'Open'], ['critical', 'Critical'], ['high', 'High'], ['all', 'All']].map(([value, label]) => <button key={value} className={filter === value ? 'selected' : ''} onClick={() => setFilter(value)}>{label}</button>)}
      </div>
      <label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search alerts" /></label>
    </div>
    {actionError && <ErrorBlock compact message={actionError} />}
    {remote.loading && !remote.data && <LoadingBlock rows={5} />}
    {remote.error && !remote.data && <ErrorBlock message={remote.error.message} onRetry={() => void remote.refresh()} />}
    {remote.data && (alerts.length ? <section className="alerts-list">{alerts.map((alert) => <AlertCard key={alert.id} alert={alert} onAcknowledge={acknowledge} working={workingId === alert.id} />)}</section> : <EmptyBlock title="No matching alerts" body="The live alert API has no findings matching this view." />)}
  </div>
}

function AlertCard({ alert, onAcknowledge, working }: { alert: SecurityAlert; onAcknowledge: (alert: SecurityAlert) => void; working: boolean }) {
  const open = isOpen(alert.status)
  return <article className={`alert-card alert-card--${alert.severity.toLowerCase()}`}>
    <div className="alert-card__icon"><ShieldAlert size={20} /></div>
    <div className="alert-card__main"><div className="alert-card__title"><h2>{alert.title}</h2><StatusBadge value={alert.severity} /><StatusBadge value={alert.status} /></div>{alert.description && <p>{alert.description}</p>}<div className="alert-card__meta"><span>{alert.integration ?? 'No integration supplied'}</span><span>{alert.policy ?? 'No policy supplied'}</span><span>{formatTime(alert.createdAt)}</span></div></div>
    <div className="alert-card__action">{open ? <button className="button button--secondary button--small" disabled={working} onClick={() => void onAcknowledge(alert)}><Check size={15} />{working ? 'Saving…' : 'Acknowledge'}</button> : <span className="resolved-label">{titleCase(alert.status)}</span>}</div>
  </article>
}
