import {
  normalizeAlert,
  normalizeAnalytics,
  normalizeIntegration,
  normalizePolicy,
  normalizeTraffic,
  toRecords,
  unwrapRecord,
} from './normalizers'
import type { Analytics, DashboardSnapshot, Integration, Policy, RawRecord, SecurityAlert, TrafficEvent } from './types'

type Endpoint = 'integrations' | 'traffic' | 'trafficStats' | 'alerts' | 'policies' | 'analytics'
type QueryValue = string | number | boolean | undefined

const env = import.meta.env
const configuredBase = (env.VITE_API_BASE_URL ?? '/').trim() || '/'
const API_BASE = configuredBase === '/' ? '' : configuredBase.replace(/\/$/, '')

/** Exact resource paths from the CipherGuard management API contract. */
const defaults: Record<Endpoint, string> = {
  integrations: '/api/v1/integrations',
  traffic: '/api/v1/traffic',
  trafficStats: '/api/v1/traffic/stats',
  alerts: '/api/v1/alerts',
  policies: '/api/v1/policies',
  analytics: '/api/v1/analytics/overview',
}
const configuredPaths: Record<Endpoint, string | undefined> = {
  integrations: env.VITE_API_INTEGRATIONS_PATH,
  traffic: env.VITE_API_TRAFFIC_PATH,
  trafficStats: env.VITE_API_TRAFFIC_STATS_PATH,
  alerts: env.VITE_API_ALERTS_PATH,
  policies: env.VITE_API_POLICIES_PATH,
  analytics: env.VITE_API_ANALYTICS_PATH,
}

export class ApiError extends Error {
  status?: number
  endpoint: string

  constructor(message: string, endpoint: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.endpoint = endpoint
    this.status = status
  }
}

const hasProtocol = (path: string) => /^https?:\/\//i.test(path)

const endpointUrl = (endpoint: Endpoint, query?: Record<string, QueryValue>): string => {
  const path = configuredPaths[endpoint]?.trim() || defaults[endpoint]
  const url = hasProtocol(path) ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
  const params = new URLSearchParams()
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })
  return params.size ? `${url}${url.includes('?') ? '&' : '?'}${params}` : url
}

const resourceUrl = (endpoint: 'integrations' | 'alerts' | 'policies', id: string): string => {
  const template = configuredPaths[endpoint]?.trim() || defaults[endpoint]
  const resource = encodeURIComponent(id)
  const path = template.includes(':id')
    ? template.replace(':id', resource)
    : template.includes('{id}')
      ? template.replace('{id}', resource)
      : `${template.replace(/\/$/, '')}/${resource}`
  return hasProtocol(path) ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
}

const headers = (hasBody = false): HeadersInit => {
  const result: Record<string, string> = { Accept: 'application/json' }
  const token = env.VITE_API_TOKEN?.trim()
  if (token) {
    const header = env.VITE_API_AUTH_HEADER?.trim() || 'Authorization'
    const scheme = env.VITE_API_AUTH_SCHEME?.trim() || 'Bearer'
    result[header] = `${scheme} ${token}`
  }
  if (hasBody) result['Content-Type'] = 'application/json'
  return result
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, {
      ...options,
      headers: { ...headers(Boolean(options.body)), ...options.headers },
      credentials: 'include',
    })
  } catch {
    throw new ApiError('CipherGuard API could not be reached. Check the API URL, network, and CORS settings.', url)
  }

  const contentType = response.headers.get('content-type') ?? ''
  const payload: unknown = contentType.includes('json') ? await response.json().catch(() => ({})) : await response.text().catch(() => '')
  if (!response.ok) {
    const detail = typeof payload === 'object' && payload !== null
      ? String((payload as RawRecord).message ?? (payload as RawRecord).error ?? response.statusText)
      : response.statusText
    throw new ApiError(detail || `Request failed with status ${response.status}`, url, response.status)
  }
  if (response.status !== 204 && !contentType.includes('json')) {
    throw new ApiError('CipherGuard API returned a non-JSON response. Check the configured API base URL and endpoint path.', url, response.status)
  }
  return payload as T
}

export const apiConfig = {
  baseUrl: API_BASE,
  isConfigured: Boolean(configuredBase || configuredPaths.integrations?.startsWith('http')),
}

export const cipherguardApi = {
  async getIntegrations(): Promise<Integration[]> {
    return toRecords(await request<unknown>(endpointUrl('integrations'))).map(normalizeIntegration)
  },

  async getIntegration(id: string): Promise<Integration> {
    return normalizeIntegration(unwrapRecord(await request<unknown>(resourceUrl('integrations', id))))
  },

  async getTraffic(query?: Record<string, QueryValue>): Promise<TrafficEvent[]> {
    return toRecords(await request<unknown>(endpointUrl('traffic', query))).map(normalizeTraffic)
  },

  async getTrafficStats(): Promise<RawRecord> {
    return unwrapRecord(await request<unknown>(endpointUrl('trafficStats')))
  },

  async getAlerts(query?: Record<string, QueryValue>): Promise<SecurityAlert[]> {
    return toRecords(await request<unknown>(endpointUrl('alerts', query))).map(normalizeAlert)
  },

  async getPolicies(query?: Record<string, QueryValue>): Promise<Policy[]> {
    return toRecords(await request<unknown>(endpointUrl('policies', query))).map(normalizePolicy)
  },

  async getAnalytics(): Promise<Analytics> {
    return normalizeAnalytics(await request<unknown>(endpointUrl('analytics')))
  },

  async startAlertInvestigation(id: string): Promise<void> {
    await request<unknown>(resourceUrl('alerts', id), {
      method: 'PATCH',
      body: JSON.stringify({ status: 'investigating' }),
    })
  },

  async setPolicyEnabled(id: string, enabled: boolean): Promise<void> {
    await request<unknown>(resourceUrl('policies', id), {
      method: 'PATCH',
      body: JSON.stringify({ is_active: enabled }),
    })
  },
}

const settled = async <T>(label: string, call: () => Promise<T>, unavailable: string[]): Promise<T | undefined> => {
  try {
    return await call()
  } catch {
    unavailable.push(label)
    return undefined
  }
}

/** Dashboard data uses the management endpoints provided by the uploaded CipherGuard API. */
export async function loadDashboard(): Promise<DashboardSnapshot> {
  const unavailable: string[] = []
  const [integrations, traffic, trafficStats, alerts, policies, analytics] = await Promise.all([
    settled('integrations', () => cipherguardApi.getIntegrations(), unavailable),
    settled('traffic', () => cipherguardApi.getTraffic({ limit: 100 }), unavailable),
    settled('traffic statistics', () => cipherguardApi.getTrafficStats(), unavailable),
    settled('alerts', () => cipherguardApi.getAlerts({ limit: 100 }), unavailable),
    settled('policies', () => cipherguardApi.getPolicies(), unavailable),
    settled('risk analytics', () => cipherguardApi.getAnalytics(), unavailable),
  ])

  return {
    integrations: integrations ?? [],
    traffic: traffic ?? [],
    trafficStats,
    alerts: alerts ?? [],
    policies: policies ?? [],
    analytics,
    unavailable,
  }
}
