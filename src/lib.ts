import type { AuthType, Integration, RawRecord, TimeSeriesPoint, TrafficEvent } from './api/types'

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

export const formatFullTime = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'medium' }).format(date)
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

export const pickString = (record: RawRecord | undefined, keys: string[]): string | undefined => {
  if (!record) return undefined
  for (const key of keys) {
    const input = record[key]
    if (typeof input === 'string' && input.trim()) return input
    if (typeof input === 'number' || typeof input === 'boolean') return String(input)
  }
  return undefined
}

export const slugify = (value: string) => value
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80) || `integration-${Date.now()}`

export const integrationKey = (integration: Integration) => integration.id || integration.slug || integration.name

/**
 * The public gateway is intentionally separate from the management API base.
 * Backend gateway fields may be relative or absolute; only their path is used
 * so the UI never renders an upstream host, credentials, or query parameters.
 */
const publicGatewayOrigin = () => (import.meta.env.VITE_CIPHERGUARD_PUBLIC_GATEWAY_URL?.trim() || 'https://cipher-guard-eight.vercel.app').replace(/\/+$/, '')

const proxyPath = (gatewayUrl?: string): string | undefined => {
  if (!gatewayUrl?.trim()) return undefined
  try {
    const url = new URL(gatewayUrl, publicGatewayOrigin())
    return ['http:', 'https:'].includes(url.protocol) ? url.pathname : undefined
  } catch {
    return gatewayUrl.split(/[?#]/, 1)[0]
  }
}

export const integrationProxyUrl = (integration: Integration): string => {
  const returnedPath = proxyPath(integration.gatewayUrl)
  if (returnedPath) return `${publicGatewayOrigin()}${returnedPath.startsWith('/') ? returnedPath : `/${returnedPath}`}`

  // The backend accepts a slug and returns it for integrations it creates. The
  // name fallback matches the create request's deterministic slug generation.
  const slug = integration.slug || slugify(integration.name)
  return `${publicGatewayOrigin()}/api/integrations/${encodeURIComponent(slug)}`
}

export const formatAuthType = (authType?: string) => {
  const normalized = normalizeWord(authType)
  if (!normalized || normalized === 'none') return 'None'
  if (normalized === 'api_key') return 'API Key'
  if (normalized === 'bearer_token') return 'Bearer Token'
  if (normalized === 'basic_auth') return 'Basic Auth'
  return titleCase(authType)
}

export const credentialStatus = (authType?: string | AuthType, hasCredential?: boolean) => {
  if (normalizeWord(authType) === 'none') return 'None required'
  if (hasCredential === false) return 'Not configured'
  return 'Configured ••••••••'
}

export const forwardedLabel = (event: TrafficEvent) => {
  if (event.forwardedUpstream !== undefined) return event.forwardedUpstream ? 'Yes' : 'No'
  if (isBlocked(event.decision)) return 'No — blocked before upstream'
  if (isAllowed(event.decision)) return 'Likely forwarded'
  return 'Not reported'
}

export const trafficStatusLabel = (event: TrafficEvent) => {
  if (isBlocked(event.decision)) {
    const status = event.statusCode ?? 403
    return `BLOCKED — ${status}${status === 403 ? ' Forbidden' : ''}`
  }
  return event.statusCode ? `${event.statusCode}` : '—'
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
