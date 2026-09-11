export type RawRecord = Record<string, unknown>

export interface Integration {
  id: string
  name: string
  provider: string
  type: string
  status: string
  lastSeen?: string
  observedEndpoints?: number
  protectedRequests?: number
  blockedRequests?: number
  riskScore?: number
  gatewayUrl?: string
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
  latency?: number
  policy?: string
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
  policy?: string
  raw: RawRecord
}

export interface Policy {
  id: string
  name: string
  description?: string
  enabled: boolean
  mode?: string
  scope?: string
  updatedAt?: string
  violations?: number
  raw: RawRecord
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
