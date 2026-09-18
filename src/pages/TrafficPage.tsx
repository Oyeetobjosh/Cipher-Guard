import { Clock3, Filter, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cipherguardApi } from '../api/client'
import type { TrafficEvent } from '../api/types'
import { RequestDetailsModal } from '../components/RequestDetails'
import { EmptyBlock, ErrorBlock, LoadingBlock, PageHeader, RefreshButton, StatusBadge } from '../components/Ui'
import { useRemote } from '../hooks/useRemote'
import { formatExactNumber, formatNumber, formatTime, isAllowed, isBlocked, trafficStatusLabel } from '../lib'

export function TrafficPage() {
  const [period, setPeriod] = useState('24h')
  const [decision, setDecision] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedEvent, setSelectedEvent] = useState<TrafficEvent>()
  const remote = useRemote(() => cipherguardApi.getTraffic({ decision: decision === 'all' ? undefined : decision === 'blocked' ? 'BLOCK' : 'ALLOW', limit: 250 }), [decision])
  const traffic = useMemo(() => {
    const durationMs = period === '1h' ? 3_600_000 : period === '24h' ? 86_400_000 : 604_800_000
    const cutoff = Date.now() - durationMs
    return (remote.data ?? []).filter((event) => {
      const observed = event.timestamp ? new Date(event.timestamp).getTime() : NaN
      const matchesPeriod = Number.isNaN(observed) || observed >= cutoff
      const matchesSearch = `${event.endpoint} ${event.integration} ${event.source} ${event.policy} ${event.reason}`.toLowerCase().includes(search.toLowerCase())
      const matchesDecision = decision === 'all' || (decision === 'blocked' ? isBlocked(event.decision) : isAllowed(event.decision))
      return matchesPeriod && matchesSearch && matchesDecision
    })
  }, [remote.data, search, decision, period])
  const blocked = traffic.filter((event) => isBlocked(event.decision)).length
  const allowed = traffic.filter((event) => isAllowed(event.decision)).length

  return <div className="page">
    <PageHeader eyebrow="GLOBAL API TRAFFIC" title="Traffic" description="A global API traffic view across all configured integrations. Select any request to see enforcement details." action={<RefreshButton onClick={() => void remote.refresh()} busy={remote.loading} />} />
    <div className="control-bar">
      <div className="segmented-control" aria-label="Time range">
        {['1h', '24h', '7d'].map((range) => <button className={period === range ? 'selected' : ''} onClick={() => setPeriod(range)} key={range}>{range}</button>)}
      </div>
      <div className="filter-select"><Filter size={16} /><select value={decision} onChange={(event) => setDecision(event.target.value)} aria-label="Decision filter"><option value="all">All decisions</option><option value="allowed">Allowed</option><option value="blocked">Blocked</option></select></div>
      <label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search integration, endpoint, reason" /></label>
    </div>
    {remote.loading && !remote.data && <LoadingBlock rows={6} />}
    {remote.error && !remote.data && <ErrorBlock message={remote.error.message} onRetry={() => void remote.refresh()} />}
    {remote.data && <>
      <div className="traffic-summary"><span><strong>{formatExactNumber(traffic.length)}</strong> records returned</span><span className="allowed-text"><i />{formatExactNumber(allowed)} allowed</span><span className="blocked-text"><i />{formatExactNumber(blocked)} blocked</span><span><Clock3 size={14} /> {period} query window</span></div>
      {traffic.length ? <section className="data-table-panel"><div className="data-table-scroll"><table><thead><tr><th>Time</th><th>Integration</th><th>Method</th><th>Endpoint</th><th>Decision</th><th>Risk</th><th>Status</th></tr></thead><tbody>
        {traffic.map((event) => <tr className={`clickable-row ${isBlocked(event.decision) ? 'blocked-row' : ''}`} key={event.id} onClick={() => setSelectedEvent(event)}><td className="date-cell">{formatTime(event.timestamp)}</td><td>{event.integration ?? 'Unassigned'}</td><td><code>{event.method ?? '—'}</code></td><td><span className="endpoint-cell">{event.endpoint ?? 'Unknown endpoint'}</span>{event.reason && <small>{event.reason}</small>}</td><td><StatusBadge value={event.decision} /></td><td>{formatNumber(event.riskScore ?? event.risk)}</td><td className={isBlocked(event.decision) ? 'blocked-status' : ''}>{trafficStatusLabel(event)}</td></tr>)}
      </tbody></table></div></section> : <EmptyBlock title={search ? 'No matching traffic' : 'No traffic records returned'} body="Traffic will appear here when customer applications send requests through configured integrations." />}
      <RequestDetailsModal event={selectedEvent} onClose={() => setSelectedEvent(undefined)} />
    </>}
  </div>
}
