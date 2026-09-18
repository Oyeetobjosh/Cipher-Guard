import { X } from 'lucide-react'
import type { TrafficEvent } from '../api/types'
import { formatFullTime, formatNumber, forwardedLabel, trafficStatusLabel } from '../lib'
import { StatusBadge } from './Ui'

function DetailField({ label, value, wide = false }: { label: string; value?: string | number; wide?: boolean }) {
  return <div className={`detail-field ${wide ? 'detail-field--wide' : ''}`}>
    <span>{label}</span>
    <strong>{value === undefined || value === '' ? '—' : value}</strong>
  </div>
}

export function RequestDetailsModal({ event, onClose }: { event?: TrafficEvent; onClose: () => void }) {
  if (!event) return null
  const matchedPolicy = event.matchedPolicies.length ? event.matchedPolicies.join(', ') : event.policy

  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="request-modal" role="dialog" aria-modal="true" aria-label="Request details" onMouseDown={(event) => event.stopPropagation()}>
      <div className="modal-head">
        <div>
          <span className="eyebrow">REQUEST FORENSICS</span>
          <h2>{event.method ?? 'REQUEST'} {event.endpoint ?? 'Unknown endpoint'}</h2>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close request details"><X size={20} /></button>
      </div>
      <div className="decision-strip">
        <StatusBadge value={event.decision} />
        <strong>{trafficStatusLabel(event)}</strong>
      </div>
      <div className="detail-field-grid">
        <DetailField label="Integration" value={event.integration} />
        <DetailField label="HTTP method" value={event.method} />
        <DetailField label="Endpoint" value={event.endpoint} wide />
        <DetailField label="Timestamp" value={formatFullTime(event.timestamp)} wide />
        <DetailField label="Decision" value={event.decision} />
        <DetailField label="Risk score" value={formatNumber(event.riskScore ?? event.risk)} />
        <DetailField label="Matched policy" value={matchedPolicy} wide />
        <DetailField label="Reason" value={event.reason} wide />
        <DetailField label="Response status" value={trafficStatusLabel(event)} />
        <DetailField label="Forwarded upstream" value={forwardedLabel(event)} />
      </div>
    </section>
  </div>
}
