import { ArrowDownRight, ArrowUpRight, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { cipherguardApi } from '../api/client'
import { TrafficChart } from '../components/TrafficChart'
import { EmptyBlock, ErrorBlock, LoadingBlock, MetricCard, PageHeader, RefreshButton, StatusBadge } from '../components/Ui'
import { useRemote } from '../hooks/useRemote'
import { formatNumber, titleCase } from '../lib'

export function RiskPage() {
  const [period, setPeriod] = useState('7d')
  const remote = useRemote(() => cipherguardApi.getAnalytics({ period }), [period])
  const analytics = remote.data

  return <div className="page">
    <PageHeader eyebrow="RISK INTELLIGENCE" title="Risk analytics" description="Backend-provided risk signals, trends, and security telemetry." action={<RefreshButton onClick={() => void remote.refresh()} busy={remote.loading} />} />
    <div className="control-bar"><div className="segmented-control" aria-label="Analytics time range">{['24h', '7d', '30d'].map((range) => <button className={period === range ? 'selected' : ''} onClick={() => setPeriod(range)} key={range}>{range}</button>)}</div></div>
    {remote.loading && !analytics && <LoadingBlock rows={5} />}
    {remote.error && !analytics && <ErrorBlock message={remote.error.message} onRetry={() => void remote.refresh()} />}
    {analytics && <>
      {analytics.metrics.length ? <section className="metric-grid">{analytics.metrics.slice(0, 4).map((metric) => <MetricCard key={metric.label} label={metric.label} value={metric.value} change={metric.change} unit={metric.unit} />)}</section> : <EmptyBlock title="No analytics metrics returned" body="The analytics endpoint did not provide a metrics summary for this time range." />}
      <section className="dashboard-split dashboard-split--chart risk-chart-row">
        <TrafficChart title="Security activity trend" subtitle="Analytics series supplied by CipherGuard" points={analytics.trafficSeries} />
        <section className="side-panel risk-explainer"><div className="panel-title"><div><h2>Risk distribution</h2><p>Calculated by your CipherGuard analytics service</p></div></div><div className="risk-count"><ShieldAlert size={24} /><strong>{analytics.risks.length}</strong><span>risk insights returned</span></div><p className="muted-copy">Scores and classifications below are displayed exactly from the analytics API; no local risk model is applied in the dashboard.</p></section>
      </section>
      <section className="insights-panel"><div className="panel-title"><div><h2>Top risk insights</h2><p>Prioritized findings from the analytics endpoint</p></div></div>{analytics.risks.length ? <div className="insight-list">{analytics.risks.map((risk) => <article className="insight-row" key={risk.id}><div className="insight-row__name"><span className={`severity-dot severity-dot--${risk.level?.toLowerCase() ?? 'unknown'}`} /><div><h3>{risk.name}</h3>{risk.description && <p>{risk.description}</p>}</div></div><div className="insight-row__trend">{risk.trend && (risk.trend.toLowerCase().includes('down') ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />)}<span>{risk.trend ? titleCase(risk.trend) : 'No trend supplied'}</span></div><div className="risk-score"><span>Risk score</span><strong>{formatNumber(risk.score)}</strong></div><StatusBadge value={risk.level} /></article>)}</div> : <EmptyBlock title="No risk insights returned" body="The analytics endpoint has not returned risk findings for this period." />}</section>
    </>}
  </div>
}
