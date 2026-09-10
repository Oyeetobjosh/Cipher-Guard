import type {
  Analytics,
  Integration,
  Metric,
  Policy,
  RawRecord,
  RiskInsight,
  SecurityAlert,
  TimeSeriesPoint,
  TrafficEvent,
} from './types'

export const isRecord = (value: unknown): value is RawRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const first = (record: RawRecord, keys: string[]): unknown => {
  for (const key of keys) {
    const value = record[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

export const text = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return undefined
}

export const number = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(/,/g, ''))
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

export const boolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    if (['true', 'enabled', 'active', 'on', 'enforced'].includes(value.toLowerCase())) return true
    if (['false', 'disabled', 'inactive', 'off'].includes(value.toLowerCase())) return false
  }
  return undefined
}

export const toRecords = (payload: unknown): RawRecord[] => {
  if (Array.isArray(payload)) return payload.filter(isRecord)
  if (!isRecord(payload)) return []
  for (const key of ['data', 'items', 'results', 'records', 'integrations', 'traffic', 'alerts', 'policies', 'events']) {
    if (Array.isArray(payload[key])) return payload[key].filter(isRecord)
  }
  return []
}

export const unwrapRecord = (payload: unknown): RawRecord => {
  if (!isRecord(payload)) return {}
  for (const key of ['data', 'item', 'result', 'integration', 'dashboard', 'analytics']) {
    if (isRecord(payload[key])) return payload[key]
  }
  return payload
}

export const normalizeIntegration = (raw: RawRecord): Integration => ({
  id: text(first(raw, ['id', '_id', 'integration_id', 'integrationId', 'uuid'])) ?? '',
  name: text(first(raw, ['name', 'display_name', 'displayName', 'integration_name'])) ?? 'Unnamed integration',
  provider: text(first(raw, ['provider', 'vendor', 'service', 'platform'])) ?? 'Custom',
  type: text(first(raw, ['type', 'category', 'integration_type', 'integrationType'])) ?? 'Integration',
  status: text(first(raw, ['status', 'state', 'health'])) ?? 'unknown',
  lastSeen: text(first(raw, ['last_seen', 'lastSeen', 'last_activity', 'lastActivity', 'updated_at', 'updatedAt'])),
  protectedRequests: number(first(raw, ['protected_requests', 'protectedRequests', 'requests', 'request_count'])),
  blockedRequests: number(first(raw, ['blocked_requests', 'blockedRequests', 'blocked', 'block_count'])),
  riskScore: number(first(raw, ['risk_score', 'riskScore', 'risk'])),
  raw,
})

export const normalizeTraffic = (raw: RawRecord): TrafficEvent => ({
  id: text(first(raw, ['id', '_id', 'event_id', 'eventId', 'request_id', 'requestId'])) ?? crypto.randomUUID(),
  timestamp: text(first(raw, ['timestamp', 'created_at', 'createdAt', 'time', 'occurred_at', 'occurredAt'])),
  integration: text(first(raw, ['integration_name', 'integrationName', 'integration', 'service', 'provider'])),
  integrationId: text(first(raw, ['integration_id', 'integrationId'])),
  method: text(first(raw, ['method', 'http_method', 'httpMethod'])),
  endpoint: text(first(raw, ['endpoint', 'path', 'route', 'url', 'resource'])),
  source: text(first(raw, ['source', 'client_ip', 'clientIp', 'origin', 'ip_address'])),
  statusCode: number(first(raw, ['status_code', 'statusCode', 'response_status', 'responseStatus'])),
  decision: text(first(raw, ['decision', 'action', 'verdict', 'outcome'])),
  risk: text(first(raw, ['risk', 'risk_level', 'riskLevel', 'severity'])),
  latency: number(first(raw, ['latency', 'latency_ms', 'latencyMs', 'duration_ms', 'durationMs'])),
  policy: text(first(raw, ['policy_name', 'policyName', 'policy', 'matched_policy', 'matchedPolicy'])),
  raw,
})

export const normalizeAlert = (raw: RawRecord): SecurityAlert => ({
  id: text(first(raw, ['id', '_id', 'alert_id', 'alertId', 'uuid'])) ?? crypto.randomUUID(),
  title: text(first(raw, ['title', 'name', 'message', 'rule_name', 'ruleName'])) ?? 'Security alert',
  description: text(first(raw, ['description', 'details', 'summary', 'reason'])),
  severity: text(first(raw, ['severity', 'priority', 'risk_level', 'riskLevel'])) ?? 'unknown',
  status: text(first(raw, ['status', 'state'])) ?? 'open',
  createdAt: text(first(raw, ['created_at', 'createdAt', 'timestamp', 'time', 'detected_at', 'detectedAt'])),
  integration: text(first(raw, ['integration_name', 'integrationName', 'integration', 'service'])),
  integrationId: text(first(raw, ['integration_id', 'integrationId'])),
  policy: text(first(raw, ['policy_name', 'policyName', 'policy', 'rule'])),
  raw,
})

export const normalizePolicy = (raw: RawRecord): Policy => ({
  id: text(first(raw, ['id', '_id', 'policy_id', 'policyId', 'uuid'])) ?? '',
  name: text(first(raw, ['name', 'title', 'policy_name', 'policyName'])) ?? 'Untitled policy',
  description: text(first(raw, ['description', 'summary', 'details'])),
  enabled: boolean(first(raw, ['enabled', 'is_enabled', 'isEnabled', 'active', 'status'])) ?? false,
  mode: text(first(raw, ['mode', 'action', 'enforcement', 'enforcement_mode', 'enforcementMode'])),
  scope: text(first(raw, ['scope', 'applies_to', 'appliesTo', 'target'])),
  updatedAt: text(first(raw, ['updated_at', 'updatedAt', 'modified_at', 'modifiedAt'])),
  violations: number(first(raw, ['violations', 'violation_count', 'violationCount', 'matches'])),
  raw,
})

const metricLabel = (key: string) => key.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

export const normalizeAnalytics = (payload: unknown): Analytics => {
  const raw = unwrapRecord(payload)
  const metricInput = first(raw, ['metrics', 'summary', 'stats', 'kpis'])
  const metrics: Metric[] = Array.isArray(metricInput)
    ? metricInput.filter(isRecord).map((item) => ({
        label: text(first(item, ['label', 'name', 'key', 'title'])) ?? 'Metric',
        value: number(first(item, ['value', 'count', 'total'])) ?? text(first(item, ['value', 'count', 'total'])),
        change: number(first(item, ['change', 'delta', 'percentage_change', 'percentageChange'])) ?? text(first(item, ['change', 'delta'])),
        unit: text(first(item, ['unit', 'suffix'])),
        raw: item,
      }))
    : isRecord(metricInput)
      ? Object.entries(metricInput).map(([label, value]) => ({
          label: metricLabel(label),
          value: number(value) ?? text(value),
          raw: { [label]: value },
        }))
      : []

  const seriesInput = first(raw, ['traffic_series', 'trafficSeries', 'timeseries', 'time_series', 'series', 'chart'])
  const trafficSeries: TimeSeriesPoint[] = Array.isArray(seriesInput)
    ? seriesInput.filter(isRecord).map((item) => ({
        label: text(first(item, ['label', 'date', 'bucket', 'period', 'timestamp', 'time'])) ?? '',
        timestamp: text(first(item, ['timestamp', 'date', 'time'])),
        total: number(first(item, ['total', 'requests', 'count', 'value'])),
        allowed: number(first(item, ['allowed', 'permitted', 'passed'])),
        blocked: number(first(item, ['blocked', 'denied', 'rejected'])),
        value: number(first(item, ['value', 'count'])),
        raw: item,
      }))
    : []

  const risksInput = first(raw, ['risks', 'risk_insights', 'riskInsights', 'top_risks', 'topRisks'])
  const risks: RiskInsight[] = Array.isArray(risksInput)
    ? risksInput.filter(isRecord).map((item, index) => ({
        id: text(first(item, ['id', '_id', 'name', 'label'])) ?? String(index),
        name: text(first(item, ['name', 'title', 'label', 'category'])) ?? 'Risk finding',
        score: number(first(item, ['score', 'risk_score', 'riskScore', 'value'])),
        level: text(first(item, ['level', 'severity', 'risk_level', 'riskLevel'])),
        trend: text(first(item, ['trend', 'direction'])),
        description: text(first(item, ['description', 'details', 'summary'])),
        raw: item,
      }))
    : []

  return { metrics, trafficSeries, risks, raw }
}
