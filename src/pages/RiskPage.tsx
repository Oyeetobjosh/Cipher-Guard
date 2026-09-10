import { ArrowDownRight, ArrowUpRight, ShieldAlert } from 'lucide-react'
import { cipherguardApi } from '../api/client'
import type { Analytics, TrafficEvent } from '../api/types'
import { TrafficChart } from '../components/TrafficChart'
import { EmptyBlock, ErrorBlock, LoadingBlock, MetricCard, PageHeader, RefreshButton, StatusBadge } from '../components/Ui'
import { useRemote } from '../hooks/useRemote'
import { deriveTrafficSeries, formatNumber, titleCase } from '../lib'

interface RiskData {
  analytics: Analytics
  traffic: TrafficEvent[]
  trafficUnavailable: boolean
}

export function RiskPage() {
  const remote = useRemote<RiskData>(async () => {
    const analytics = await cipherguardApi.getAnalytics()
    try {
      const traffic = await cipherguardApi.getTraffic({ limit: 250 })
      return { analytics, traffic, trafficUnavailable: false }
    } catch {
      return { analytics, traffic: [], trafficUnavailable: true }
    }
  }, [])
  const data = remote.data

  return <div className="page">
    <PageHeader eyebrow="RISK INTELLIGENCE" title="Risk analytics" description="Current organizational risk posture and integration intelligence from the CipherGuard management API." action={<RefreshButton onClick={() => void remote.refresh()} busy={remote.loading} />} />
    {remote.loading && !data && <LoadingBlock rows={5} />}
    {remote.error && !data && <ErrorBlock message={remote.error.message} onRetry={() => void remote.refresh()} />}
    {data && <>
      {data.analytics.metrics.length ? <section className="metric-grid">{data.analytics.metrics.slice(0, 4).map((metric) => <MetricCard key={metric.label} label={metric.label} value={metric.value} change={metric.change} unit={metric.unit} />)}</section> : <EmptyBlock title="No analytics metrics returned" body="The analytics endpoint did not provide a risk summary." />}
      {data.trafficUnavailable && <ErrorBlock compact message="The risk overview loaded, but related traffic telemetry could not be retrieved." />}
      <section className="dashboard-split dashboard-split--chart risk-chart-row">
        <TrafficChart title="Recent security activity" subtitle="Timestamped telemetry returned by the CipherGuard traffic API" points={deriveTrafficSeries(data.traffic)} />
        <section className="side-panel risk-explainer"><div className="panel-title"><div><h2>Risk distribution</h2><p>Calculated by the CipherGuard risk engine</p></div></div><div className="risk-count"><ShieldAlert size={24} /><strong>{data.analytics.risks.length}</strong><span>integration risk profiles</span></div><p className="muted-copy">Risk scores and levels below are produced by the backend risk engine. The dashboard does not apply a separate local risk model.</p></section>
      </section>
      <section className="insights-panel"><div className="panel-title"><div><h2>Integration risk breakdown</h2><p>Prioritized risk profiles from the analytics overview</p></div></div>{data.analytics.risks.length ? <div className="insight-list">{data.analytics.risks.map((risk) => <article className="insight-row" key={risk.id}><div className="insight-row__name"><span className={`severity-dot severity-dot--${risk.level?.toLowerCase() ?? 'unknown'}`} /><div><h3>{risk.name}</h3>{risk.description && <p>{risk.description}</p>}</div></div><div className="insight-row__trend">{risk.trend && (risk.trend.toLowerCase().includes('down') ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />)}<span>{risk.trend ? titleCase(risk.trend) : 'No trend supplied'}</span></div><div className="risk-score"><span>Risk score</span><strong>{formatNumber(risk.score)}</strong></div><StatusBadge value={risk.level} /></article>)}</div> : <EmptyBlock title="No risk profiles returned" body="The analytics endpoint has not returned integration risk data." />}</section>
    </>}
  </div>
}
