# CipherGuard Security Dashboard

A responsive operations console for the CipherGuard backend. It does not seed security data: all displayed counts, traffic events, alerts, policy values, integrations, and risk insights are requested from the configured API.

## Connect the deployed backend

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_API_BASE_URL` to the deployed CipherGuard API origin (for example, `https://api.example.com`).
3. Set the token settings if the API uses a bearer token. Cookie-authenticated backends can leave `VITE_API_TOKEN` empty.
4. If endpoint paths differ from the defaults, override the corresponding `VITE_API_*_PATH` variable.

The dashboard expects conventional JSON resources at `/api/dashboard`, `/api/integrations`, `/api/traffic`, `/api/alerts`, `/api/policies`, and `/api/analytics`. The client accepts either a top-level array or common envelopes such as `{ "data": [] }` and `{ "items": [] }`.

> **CORS:** The deployed backend needs to allow the dashboard origin and the configured authentication header. For local development, set `VITE_API_BASE_URL=/` and `VITE_API_PROXY_TARGET=https://your-api-host` to proxy browser requests through Vite.

## Run

```bash
npm install
npm run dev
```

Build verification:

```bash
npm run build
```
