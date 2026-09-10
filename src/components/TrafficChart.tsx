import type { TimeSeriesPoint } from '../api/types'
import { formatExactNumber } from '../lib'
import { EmptyBlock } from './Ui'

export function TrafficChart({ points, title = 'Protected traffic', subtitle = 'Requests observed by CipherGuard' }: { points: TimeSeriesPoint[]; title?: string; subtitle?: string }) {
  const values = points.map((point) => point.total ?? point.value ?? 0)
  const max = Math.max(...values, 0)
  if (!points.length || max === 0) return <section className="chart-panel"><div className="panel-title"><div><h2>{title}</h2><p>{subtitle}</p></div></div><EmptyBlock title="No traffic series returned" body="A chart will appear when the analytics or traffic API returns timestamped events." /></section>

  const width = 720
  const height = 230
  const left = 4
  const right = 4
  const top = 12
  const bottom = 26
  const span = width - left - right
  const x = (index: number) => left + (points.length === 1 ? span / 2 : (index / (points.length - 1)) * span)
  const y = (value: number) => top + (height - top - bottom) * (1 - value / max)
  const totalPath = values.map((value, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(value)}`).join(' ')
  const blocked = points.map((point) => point.blocked ?? 0)
  const blockedPath = blocked.some(Boolean) ? blocked.map((value, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(value)}`).join(' ') : ''
  const area = `${totalPath} L ${x(points.length - 1)} ${height - bottom} L ${x(0)} ${height - bottom} Z`

  return <section className="chart-panel">
    <div className="panel-title chart-title">
      <div><h2>{title}</h2><p>{subtitle}</p></div>
      <div className="chart-legend"><span><i className="legend-line legend-line--total" />Total</span>{blockedPath && <span><i className="legend-line legend-line--blocked" />Blocked</span>}</div>
    </div>
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={`${title} chart`}>
        {[0.25, 0.5, 0.75, 1].map((position) => <line key={position} x1="0" x2={width} y1={y(max * position)} y2={y(max * position)} className="chart-grid" />)}
        <path d={area} className="chart-area" />
        <path d={totalPath} className="chart-line" />
        {blockedPath && <path d={blockedPath} className="chart-line chart-line--blocked" />}
        {points.map((point, index) => <g key={`${point.label}-${index}`}><circle cx={x(index)} cy={y(values[index])} r="3.7" className="chart-point" /><text x={x(index)} y={height - 4} className="chart-label" textAnchor="middle">{point.label}</text></g>)}
      </svg>
    </div>
    <div className="chart-scale"><span>Peak: {formatExactNumber(max)}</span><span>{points.length} data points</span></div>
  </section>
}
