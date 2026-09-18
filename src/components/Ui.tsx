import { AlertCircle, ArrowDownRight, ArrowUpRight, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatNumber, titleCase } from '../lib'

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-header">
    <div>
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
    {action && <div className="page-action">{action}</div>}
  </div>
}

export function StatusBadge({ value }: { value?: string }) {
  const normalized = (value ?? 'unknown').toLowerCase()
  let tone = 'neutral'
  if (['active', 'healthy', 'connected', 'enabled', 'allowed', 'allow', 'low', 'resolved', 'acknowledged'].some((item) => normalized.includes(item))) tone = 'positive'
  if (['critical', 'high', 'blocked', 'block', 'denied', 'deny', 'rejected', 'error', 'failed'].some((item) => normalized.includes(item))) tone = 'critical'
  if (['medium', 'warning', 'pending', 'degraded', 'open', 'flag'].some((item) => normalized.includes(item))) tone = 'warning'
  return <span className={`status-badge status-badge--${tone}`}><i />{titleCase(value)}</span>
}

export function MetricCard({ label, value, unit, change, tone = 'default', icon }: { label: string; value?: number | string; unit?: string; change?: number | string; tone?: 'default' | 'danger' | 'positive'; icon?: ReactNode }) {
  const numericalChange = typeof change === 'number' ? change : Number(change)
  const hasChange = change !== undefined && change !== '' && !Number.isNaN(numericalChange)
  const up = numericalChange >= 0
  return <article className={`metric-card metric-card--${tone}`}>
    <div className="metric-card__head"><span>{label}</span>{icon && <span className="metric-icon">{icon}</span>}</div>
    <div className="metric-card__value">{formatNumber(value)}{unit && value !== undefined && <small>{unit}</small>}</div>
    {hasChange ? <div className={`metric-change ${up ? 'metric-change--up' : 'metric-change--down'}`}>
      {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(numericalChange)}% <span>vs previous period</span>
    </div> : <div className="metric-source">Live API value</div>}
  </article>
}

export function LoadingBlock({ rows = 3 }: { rows?: number }) {
  return <div className="loading-block" aria-label="Loading live security data">
    {Array.from({ length: rows }).map((_, index) => <span className="skeleton" key={index} style={{ width: `${88 - index * 12}%` }} />)}
  </div>
}

export function ErrorBlock({ message, onRetry, compact = false }: { message: string; onRetry?: () => void; compact?: boolean }) {
  return <div className={`error-block ${compact ? 'error-block--compact' : ''}`}>
    <AlertCircle size={compact ? 17 : 21} />
    <div><strong>Live data unavailable</strong><p>{message}</p></div>
    {onRetry && <button className="button button--secondary button--small" onClick={onRetry}><RefreshCw size={14} />Retry</button>}
  </div>
}

export function EmptyBlock({ title = 'No records returned', body = 'The CipherGuard API returned no records for this view.' }: { title?: string; body?: string }) {
  return <div className="empty-block"><strong>{title}</strong><p>{body}</p></div>
}

export function RefreshButton({ onClick, busy = false }: { onClick: () => void; busy?: boolean }) {
  return <button className="button button--secondary" onClick={onClick} disabled={busy}><RefreshCw size={16} className={busy ? 'spin' : ''} />Refresh</button>
}
