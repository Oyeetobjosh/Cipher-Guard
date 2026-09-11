# CipherGuard Security Dashboard

A responsive operations dashboard for the included CipherGuard security gateway. The uploaded project archive has been integrated into this repository: it contains the FastAPI security API, Kong gateway configuration, simulated ShipFast/PayFlex integrations, Supabase schema, deployment manifests, and this React dashboard.

The dashboard never seeds security data. Metrics, integration inventory, traffic events, alerts, policies, and risk scores are requested from the CipherGuard management API.

## Dashboard capabilities

- **Dashboard** — `traffic/stats`, `analytics/overview`, current integrations, alerts, policies, and recent traffic
- **Integrations + detail** — inventory and individual integration telemetry / alert context
- **Traffic** — management API traffic log with decision, time-window, and text filters
- **Alerts** — live triage queue; an open alert can be moved to the backend-supported `investigating` state
- **Policies** — live policy inventory and active-state updates
- **Risk analytics** — risk-engine overview and per-integration risk breakdown

## API contract used

These are the exact routes from [`docs/API.md`](docs/API.md), all prefixed by the public CipherGuard gateway origin:

| Purpose | Route |
| --- | --- |
| Integrations | `GET /api/v1/integrations` |
| Integration detail | `GET /api/v1/integrations/{id_or_slug}` |
| Traffic events | `GET /api/v1/traffic` |
| Traffic totals | `GET /api/v1/traffic/stats` |
| Alerts | `GET /api/v1/alerts` |
| Alert triage | `PATCH /api/v1/alerts/{alert_id}` |
| Policies | `GET /api/v1/policies` |
| Policy update | `PATCH /api/v1/policies/{policy_id}` |
| Risk overview | `GET /api/v1/analytics/overview` |

The browser client sends `Authorization: Bearer <VITE_API_TOKEN>` when a token is configured. In local development the provided backend supplies a default SecOps tenant when no JWT is present. Do **not** expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

## Configure the deployed backend

```bash
cp .env.example .env.local
```

Set the public gateway origin in `.env.local`:

```env
VITE_API_BASE_URL=https://your-deployed-cipherguard-gateway.example
VITE_API_TOKEN=your_supabase_user_access_token
```

The default Vite endpoint paths already match the backend. They are individually overridable in `.env.example` only for a custom deployment. The deployed backend must allow the dashboard origin in `ALLOWED_ORIGINS` (or be proxied through the dashboard host).

## Deploy the dashboard to Vercel

This repository is Vercel-ready. The dashboard build is served as a Vite site and [`vercel.json`](vercel.json) rewrites same-origin `/api/*` requests to the included FastAPI serverless entrypoint at [`api/index.py`](api/index.py).

1. Import `Oyeetobjosh/Cipher-Guard` in Vercel with the **repository root** as the Root Directory.
2. Leave the build settings at their detected values (`npm install`, `npm run build`, output `dist`).
3. Deploy. No `VITE_API_BASE_URL` is required for this setup: it defaults to `/` and talks to the same Vercel domain.
4. For a real persistent deployment, add the backend `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_KEY`, and `SUPABASE_JWT_SECRET` values in Vercel Project Settings → Environment Variables. Never configure a service-role key as a `VITE_*` value.

> The Vercel function makes the management dashboard APIs available. The full inline blocking gateway in the archive (Kong + ShipFast/PayFlex containers) remains a Docker/VPS deployment because Vercel serverless functions cannot run the supplied multi-container Kong gateway. Use the provided `docker-compose.yml` or the deployment manifests for the full intercept-and-forward demo.

## Run the dashboard locally

```bash
npm install
npm run dev
```

For local browser requests through Vite rather than CORS, use:

```env
VITE_API_BASE_URL=/
VITE_API_PROXY_TARGET=http://localhost:8000
```

## Run the CipherGuard stack locally

The uploaded project starts Kong on port `8000`, the management API on `8003`, ShipFast on `8002`, and PayFlex on `8006`.

```bash
cp .env.example .env
docker compose up --build
```

See [`docs/API.md`](docs/API.md) for management API details, protected gateway calls, and E2E verification scenarios. The archive’s original engineering guide is retained at [`docs/backend-README.md`](docs/backend-README.md).

## Build check

```bash
npm run build
```
