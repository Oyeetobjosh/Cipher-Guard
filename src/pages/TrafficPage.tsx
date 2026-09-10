import { Clock3, Filter, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cipherguardApi } from '../api/client'
import { EmptyBlock, ErrorBlock, LoadingBlock, PageHeader, RefreshButton, StatusBadge } from '../components/Ui'
import { useRemote } from '../hooks/useRemote'
import { formatExactNumber, formatTime, isAllowed, isBlocked } from '../lib'

export function TrafficPage() {
  const [period, setPeriod] = useState('24h')
  const [decision, setDecision] = useState('all')
  const [search, setSearch] = useState('')
  const remote = useRemote(() => cipherguardApi.getTraffic({ period, decision: decision === 'all' ? undefined : decision, limit: 250 }), [period, decision])
  const traffic = useMemo(() => (remote.data ?? []).filter((event) => {
    const matchesSearch = `${event.endpoint} ${event.integration} ${event.source} ${event.policy}`.toLowerCase().includes(search.toLowerCase())
    const matchesDecision = decision === 'all' || (decision === 'blocked' ? isBlocked(event.decision) : isAllowed(event.decision))
    return matchesSearch && matchesDecision
  }), [remote.data, search, decision])
  const blocked = traffic.filter((event) => isBlocked(event.decision)).length
  const allowed = traffic.filter((event) => isAllowed(event.decision)).length

  return <div className="page">
    <PageHeader eyebrow="REQUEST TELEMETRY" title="Traffic" description="Inspect enforcement decisions made on requests observed by CipherGuard." action={<RefreshButton onClick={() => void remote.refresh()} busy={remote.loading} />} />
    <div className="control-bar">
      <div className="segmented-control" aria-label="Time range">
        {['1h', '24h', '7d'].map((range) => <button className={period === range ? 'selected' : ''} onClick={() => setPeriod(range)} key={range}>{range}</button>)}
      </div>
      <div className="filter-select"><Filter size={16} /><select value={decision} onChange={(event) => setDecision(event.target.value)} aria-label="Decision filter"><option value="all">All decisions</option><option value="allowed">Allowed</option><option value="blocked">Blocked</option></select></div>
      <label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search route, source, policy" /></label>
    </div>
    {remote.loading && !remote.data && <LoadingBlock rows={6} />}
    {remote.error && !remote.data && <ErrorBlock message={remote.error.message} onRetry={() => void remote.refresh()} />}
    {remote.data && <>
      <div className="traffic-summary"><span><strong>{formatExactNumber(traffic.length)}</strong> records returned</span><span className="allowed-text"><i />{formatExactNumber(allowed)} allowed</span><span className="blocked-text"><i />{formatExactNumber(blocked)} blocked</span><span><Clock3 size={14} /> {period} query window</span></div>
      {traffic.length ? <section className="data-table-panel"><div className="data-table-scroll"><table><thead><tr><th>Decision</th><th>Request</th><th>Integration</th><th>Source</th><th>Policy</th><th>Latency</th><th>Observed</th></tr></thead><tbody>
        {traffic.map((event) => <tr key={event.id}><td><StatusBadge value={event.decision} /></td><td><div className="request-cell"><code>{event.method ?? '—'}</code><span>{event.endpoint ?? 'Unknown route'}</span>{event.statusCode !== undefined && <small>{event.statusCode}</small>}</div></td><td>{event.integration ?? '—'}</td><td className="mono-cell">{event.source ?? '—'}</td><td>{event.policy ?? '—'}</td><td>{event.latency === undefined ? '—' : `${event.latency} ms`}</td><td className="date-cell">{formatTime(event.timestamp)}</td></tr>)}
      </tbody></table></div></section> : <EmptyBlock title={search ? 'No matching traffic' : 'No traffic records returned'} body="Adjust the filters or confirm that the deployed traffic API is receiving events." />}
    </>}
  </div>
}
