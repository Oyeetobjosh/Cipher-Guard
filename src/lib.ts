import type { RawRecord, TimeSeriesPoint, TrafficEvent } from './api/types'

export const humanize = (value?: string) => (value ? value.replace(/[_-]/g, ' ') : 'Unknown')

export const titleCase = (value?: string) =>
  humanize(value).replace(/\b\w/g, (letter) => letter.toUpperCase())

export const formatNumber = (value?: number | string) => {
  if (value === undefined || value === null || value === '') return '—'
  if (typeof value === 'string') return value
  return new Intl.NumberFormat('en-US', { notation: Math.abs(value) >= 100000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value)
}

export const formatExactNumber = (value?: number) =>
  value === undefined ? '—' : new Intl.NumberFormat('en-US').format(value)

export const formatTime = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const delta = Date.now() - date.getTime()
  if (delta >= 0 && delta < 60_000) return 'Just now'
  if (delta >= 0 && delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`
  if (delta >= 0 && delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date)
}

export const normalizeWord = (value?: string) => (value ?? '').trim().toLowerCase()
export const isBlocked = (value?: string) => ['blocked', 'block', 'denied', 'deny', 'rejected', 'reject'].includes(normalizeWord(value))
export const isAllowed = (value?: string) => ['allowed', 'allow', 'permitted', 'passed', 'pass', 'success'].includes(normalizeWord(value))
export const isOpen = (value?: string) => !['acknowledged', 'resolved', 'closed', 'dismissed'].includes(normalizeWord(value))
export const isCritical = (value?: string) => ['critical', 'high', 'severe'].includes(normalizeWord(value))

export const pickNumber = (record: RawRecord | undefined, keys: string[]): number | undefined => {
  if (!record) return undefined
  for (const key of keys) {
    const input = record[key]
    if (typeof input === 'number' && Number.isFinite(input)) return input
    if (typeof input === 'string' && input.trim()) {
      const parsed = Number(input.replace(/,/g, ''))
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return undefined
}

export function deriveTrafficSeries(traffic: TrafficEvent[]): TimeSeriesPoint[] {
  const buckets = new Map<string, { timestamp: string; total: number; allowed: number; blocked: number }>()
  traffic.forEach((event) => {
    if (!event.timestamp) return
    const date = new Date(event.timestamp)
    if (Number.isNaN(date.getTime())) return
    date.setMinutes(0, 0, 0)
    const key = date.toISOString()
    const bucket = buckets.get(key) ?? { timestamp: key, total: 0, allowed: 0, blocked: 0 }
    bucket.total += 1
    if (isBlocked(event.decision)) bucket.blocked += 1
    if (isAllowed(event.decision)) bucket.allowed += 1
    buckets.set(key, bucket)
  })

  return [...buckets.values()]
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .slice(-12)
    .map((bucket) => ({
      ...bucket,
      label: new Intl.DateTimeFormat('en-US', { hour: 'numeric' }).format(new Date(bucket.timestamp)),
      raw: {},
    }))
}
