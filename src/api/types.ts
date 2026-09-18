export type RawRecord = Record<string, unknown>

export type AuthType = 'none' | 'api_key' | 'bearer_token' | 'basic_auth'
export type PolicyAction = 'allow' | 'block' | 'alert' | 'log'

export interface Integration {
  id: string
  slug?: string
  name: string
  type: string
  status: string
  lastSeen?: string
  observedEndpoints?: number
  protectedRequests?: number
  blockedRequests?: number
  allowedRequests?: number
  totalRequests?: number
  riskScore?: number
  riskLevel?: string
  gatewayUrl?: string
  upstreamUrl?: string
  authType?: AuthType | string
  hasAuthCredential?: boolean
  description?: string
  raw: RawRecord
}

export interface TrafficEvent {
  id: string
  timestamp?: string
  integration?: string
  integrationId?: string
  method?: string
  endpoint?: string
  source?: string
  statusCode?: number
  decision?: string
  risk?: string
  riskScore?: number
  riskLevel?: string
  latency?: number
  policy?: string
  matchedPolicies: string[]
  reason?: string
  forwardedUpstream?: boolean
  raw: RawRecord
}

export interface SecurityAlert {
  id: string
  title: string
  description?: string
  severity: string
  status: string
  createdAt?: string
  integration?: string
  integrationId?: string
  endpoint?: string
  reason?: string
  riskScore?: number
  action?: string
  policy?: string
  raw: RawRecord
}

export interface Policy {
  id: string
  name: string
  integrationId?: string
  description?: string
  enabled: boolean
  mode?: string
  scope?: string
  allowedMethods: string[]
  allowedEndpoints: string[]
  blockedEndpoints: string[]
  rateLimitRpm?: number
  action: string
  updatedAt?: string
  violations?: number
  raw: RawRecord
}

export interface IntegrationCreatePayload {
  name: string
  description?: string
  upstreamUrl: string
  authType: AuthType
  credential?: string
}

export interface PolicyCreatePayload {
  integrationId: string
  ruleType: 'allow' | 'block'
  method: string
  endpointPattern: string
  action: PolicyAction
  description?: string
}

export interface Metric {
  label: string
  value: number | string | undefined
  change?: number | string
  unit?: string
  raw: RawRecord
}

export interface TimeSeriesPoint {
  label: string
  timestamp?: string
  total?: number
  allowed?: number
  blocked?: number
  value?: number
  raw: RawRecord
}

export interface RiskInsight {
  id: string
  name: string
  score?: number
  level?: string
  trend?: string
  description?: string
  raw: RawRecord
}

export interface Analytics {
  metrics: Metric[]
  trafficSeries: TimeSeriesPoint[]
  risks: RiskInsight[]
  raw: RawRecord
}

export interface DashboardSnapshot {
  integrations: Integration[]
  traffic: TrafficEvent[]
  alerts: SecurityAlert[]
  policies: Policy[]
  analytics?: Analytics
  trafficStats?: RawRecord
  unavailable: string[]
}
