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
    const normalized = value.toLowerCase()
    if (['true', 'enabled', 'active', 'on', 'enforced', 'yes'].includes(normalized)) return true
    if (['false', 'disabled', 'inactive', 'off', 'no'].includes(normalized)) return false
  }
  return undefined
}

export const stringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((item) => text(item)).filter((item): item is string => Boolean(item))
  if (typeof value === 'string' && value.trim()) return value.split(',').map((item) => item.trim()).filter(Boolean)
  return []
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
  slug: text(first(raw, ['slug', 'key', 'identifier'])),
  name: text(first(raw, ['name', 'display_name', 'displayName', 'integration_name'])) ?? 'Unnamed integration',
  type: text(first(raw, ['category', 'type', 'integration_type', 'integrationType'])) ?? 'Integration',
  status: text(first(raw, ['status', 'state', 'health'])) ?? 'unknown',
  lastSeen: text(first(raw, ['last_seen', 'lastSeen', 'last_activity', 'lastActivity', 'last_activity_at', 'lastActivityAt', 'updated_at', 'updatedAt'])),
  observedEndpoints: number(first(raw, ['observed_endpoints_count', 'observedEndpointsCount', 'observed_endpoints', 'observedEndpoints'])),
  protectedRequests: number(first(raw, ['protected_requests', 'protectedRequests', 'requests', 'request_count', 'requestCount'])),
  totalRequests: number(first(raw, ['total_requests', 'totalRequests', 'requests', 'request_count', 'requestCount'])),
  allowedRequests: number(first(raw, ['allowed_requests', 'allowedRequests', 'allowed', 'allow_count', 'allowCount'])),
  blockedRequests: number(first(raw, ['blocked_requests', 'blockedRequests', 'blocked', 'block_count', 'blockCount'])),
  riskScore: number(first(raw, ['risk_score', 'riskScore', 'risk'])),
  riskLevel: text(first(raw, ['risk_level', 'riskLevel', 'risk_posture', 'riskPosture'])),
  gatewayUrl: text(first(raw, ['gateway_url', 'gatewayUrl', 'protected_endpoint', 'protectedEndpoint'])),
  upstreamUrl: text(first(raw, ['upstream_url', 'upstreamUrl', 'base_url', 'baseUrl', 'url'])),
  authType: text(first(raw, ['auth_type', 'authType', 'authentication_type', 'authenticationType'])),
  hasAuthCredential: boolean(first(raw, ['has_auth_credential', 'hasAuthCredential', 'auth_configured', 'authConfigured', 'credential_configured', 'credentialConfigured'])),
  description: text(first(raw, ['description', 'summary', 'details'])),
  raw,
})

export const normalizeTraffic = (raw: RawRecord): TrafficEvent => {
  const matchedPolicies = stringArray(first(raw, ['matched_policies', 'matchedPolicies', 'policies', 'policy_matches', 'policyMatches']))
  const decision = text(first(raw, ['decision', 'action', 'verdict', 'outcome']))
  return {
    id: text(first(raw, ['id', '_id', 'event_id', 'eventId', 'request_id', 'requestId'])) ?? crypto.randomUUID(),
    timestamp: text(first(raw, ['timestamp', 'created_at', 'createdAt', 'time', 'occurred_at', 'occurredAt'])),
    integration: text(first(raw, ['integration_name', 'integrationName', 'integration', 'service', 'provider'])),
    integrationId: text(first(raw, ['integration_id', 'integrationId'])),
    method: text(first(raw, ['method', 'http_method', 'httpMethod'])),
    endpoint: text(first(raw, ['endpoint', 'path', 'route', 'url', 'resource'])),
    source: text(first(raw, ['source', 'client_ip', 'clientIp', 'origin', 'ip_address', 'ipAddress'])),
    statusCode: number(first(raw, ['status_code', 'statusCode', 'response_status', 'responseStatus'])),
    decision,
    risk: text(first(raw, ['risk_level', 'riskLevel', 'risk', 'severity'])),
    riskLevel: text(first(raw, ['risk_level', 'riskLevel', 'risk', 'severity'])),
    riskScore: number(first(raw, ['risk_score', 'riskScore', 'score'])),
    latency: number(first(raw, ['latency', 'latency_ms', 'latencyMs', 'duration_ms', 'durationMs'])),
    policy: text(first(raw, ['policy_name', 'policyName', 'policy', 'matched_policy', 'matchedPolicy'])) ?? matchedPolicies[0],
    matchedPolicies,
    reason: text(first(raw, ['reason', 'description', 'message', 'blocked_reason', 'blockedReason'])),
    forwardedUpstream: boolean(first(raw, ['forwarded_upstream', 'forwardedUpstream', 'forwarded', 'was_forwarded', 'wasForwarded', 'upstream_called', 'upstreamCalled'])),
    raw,
  }
}

export const normalizeAlert = (raw: RawRecord): SecurityAlert => ({
  id: text(first(raw, ['id', '_id', 'alert_id', 'alertId', 'uuid'])) ?? crypto.randomUUID(),
  title: text(first(raw, ['title', 'name', 'message', 'rule_name', 'ruleName'])) ?? 'Security alert',
  description: text(first(raw, ['description', 'details', 'summary', 'reason'])),
  severity: text(first(raw, ['severity', 'priority', 'risk_level', 'riskLevel'])) ?? 'unknown',
  status: text(first(raw, ['status', 'state'])) ?? 'open',
  createdAt: text(first(raw, ['created_at', 'createdAt', 'timestamp', 'time', 'detected_at', 'detectedAt'])),
  integration: text(first(raw, ['integration_name', 'integrationName', 'integration', 'service'])),
  integrationId: text(first(raw, ['integration_id', 'integrationId'])),
  endpoint: text(first(raw, ['endpoint', 'path', 'route', 'resource'])),
  reason: text(first(raw, ['reason', 'description', 'details', 'summary'])),
  riskScore: number(first(raw, ['risk_score', 'riskScore', 'score'])),
  action: text(first(raw, ['decision', 'action', 'outcome', 'verdict'])),
  policy: text(first(raw, ['policy_name', 'policyName', 'policy', 'rule', 'rule_violated', 'ruleViolated'])),
  raw,
})

export const normalizePolicy = (raw: RawRecord): Policy => {
  const allowedMethods = stringArray(first(raw, ['allowed_methods', 'allowedMethods', 'methods', 'http_methods', 'httpMethods']))
  const allowedEndpoints = stringArray(first(raw, ['allowed_endpoints', 'allowedEndpoints', 'allow_paths', 'allowPaths']))
  const blockedEndpoints = stringArray(first(raw, ['blocked_endpoints', 'blockedEndpoints', 'blocked_paths', 'blockedPaths', 'deny_paths', 'denyPaths']))
  const action = text(first(raw, ['action_on_violation', 'actionOnViolation', 'action', 'decision'])) ?? (blockedEndpoints.length ? 'block' : 'allow')

  return {
    id: text(first(raw, ['id', '_id', 'policy_id', 'policyId', 'uuid'])) ?? '',
    name: text(first(raw, ['name', 'title', 'policy_name', 'policyName'])) ?? 'Untitled policy',
    integrationId: text(first(raw, ['integration_id', 'integrationId'])),
    description: text(first(raw, ['description', 'summary', 'details', 'reason'])),
    enabled: boolean(first(raw, ['enabled', 'is_enabled', 'isEnabled', 'is_active', 'isActive', 'active', 'status'])) ?? false,
    mode: action,
    scope: text(first(raw, ['scope', 'applies_to', 'appliesTo', 'target'])) ?? [...allowedEndpoints, ...blockedEndpoints].join(', '),
    allowedMethods,
    allowedEndpoints,
    blockedEndpoints,
    rateLimitRpm: number(first(raw, ['rate_limit_rpm', 'rateLimitRpm', 'rate_limit', 'rateLimit'])),
    action,
    updatedAt: text(first(raw, ['updated_at', 'updatedAt', 'modified_at', 'modifiedAt'])),
    violations: number(first(raw, ['violations', 'violation_count', 'violationCount', 'matches'])),
    raw,
  }
}

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
      : ([
          ['Overall risk score', first(raw, ['overall_risk_score', 'overallRiskScore'])],
          ['Overall risk posture', first(raw, ['overall_risk_level', 'overallRiskLevel'])],
          ['Active alerts', first(raw, ['total_active_alerts', 'totalActiveAlerts'])],
          ['Critical alerts', first(raw, ['critical_alerts_count', 'criticalAlertsCount'])],
          ['Observed events (24h)', first(raw, ['total_observed_events_24h', 'totalObservedEvents24h'])],
          ['Violations (24h)', first(raw, ['violations_count_24h', 'violationsCount24h'])],
        ] as Array<[string, unknown]>).filter(([, value]) => value !== undefined).map(([label, value]) => ({
          label,
          value: number(value) ?? text(value),
          raw: { [label]: value },
        }))

  const seriesInput = first(raw, ['traffic_series', 'trafficSeries', 'timeseries', 'time_series', 'series', 'chart', 'recent_activity_timeline', 'recentActivityTimeline'])
  const trafficSeries: TimeSeriesPoint[] = Array.isArray(seriesInput)
    ? seriesInput.filter(isRecord).map((item) => ({
        label: text(first(item, ['label', 'date', 'bucket', 'period', 'timestamp', 'time'])) ?? '',
        timestamp: text(first(item, ['timestamp', 'date', 'time'])),
        total: number(first(item, ['total', 'requests', 'count', 'value'])),
        allowed: number(first(item, ['allowed', 'permitted', 'passed'])),
        blocked: number(first(item, ['blocked', 'denied', 'rejected', 'violations'])),
        value: number(first(item, ['value', 'count'])),
        raw: item,
      }))
    : []

  const risksInput = first(raw, ['risks', 'risk_insights', 'riskInsights', 'top_risks', 'topRisks', 'integration_risk_breakdown', 'integrationRiskBreakdown'])
  const risks: RiskInsight[] = Array.isArray(risksInput)
    ? risksInput.filter(isRecord).map((item, index) => ({
        id: text(first(item, ['id', '_id', 'name', 'label', 'slug', 'integration_id', 'integrationId'])) ?? String(index),
        name: text(first(item, ['name', 'title', 'label', 'category', 'slug', 'integration_name', 'integrationName'])) ?? 'Risk finding',
        score: number(first(item, ['score', 'risk_score', 'riskScore', 'value'])),
        level: text(first(item, ['level', 'severity', 'risk_level', 'riskLevel'])),
        trend: text(first(item, ['trend', 'direction'])),
        description: text(first(item, ['description', 'details', 'summary'])),
        raw: item,
      }))
    : []

  return { metrics, trafficSeries, risks, raw }
}
