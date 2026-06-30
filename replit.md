# Kidzy - نظام إدارة المبيعات والإنتاج

A full-stack ERP/management dashboard for Kidzy, an Egyptian children's clothing brand. Manages orders, inventory, production, staff, and accounts with Arabic (RTL) UI.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/kidzy run dev` — run the frontend (port assigned by Replit)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + Tailwind CSS v4 + React Router v7
- Backend: Express 5 (api-server artifact)
- DB Proxy: Supabase (optional — wired via `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` secrets)
- AI: Gemini 1.5 Flash (via `GEMINI_API_KEY` secret) for order extraction from Arabic chat/screenshots
- Fonts: Cairo, Plus Jakarta Sans, Inter (Google Fonts)
- UI: RTL Arabic layout, lucide-react icons, motion animations

## Where things live

- `artifacts/kidzy/` — React + Vite frontend (preview at `/`)
- `artifacts/api-server/` — Express API backend (preview at `/api`)
- `artifacts/api-server/src/routes/kidzy.ts` — Supabase proxy + Gemini extraction routes
- `lib/api-spec/openapi.yaml` — OpenAPI spec (healthz only for now)
- `lib/db/` — Drizzle ORM (not used by Kidzy currently — uses Supabase directly)

## Architecture decisions

- The app uses Supabase as its primary database (bypassing Drizzle). The backend acts as a proxy to avoid exposing Supabase keys on the client.
- Data also syncs to/from `localStorage` so the app works offline when Supabase is not configured.
- The Gemini AI endpoint (`/api/extract-order`) extracts order details from Arabic chat text or screenshots.
- RTL layout (`dir="rtl"`) is set at the root div level in App.tsx.
- `BrowserRouter` is used with a `basename` derived from `import.meta.env.BASE_URL` for Replit proxy compatibility.

## Product

- Login/register system with role-based permissions (owner, manager, staff)
- Dashboard with business KPIs
- Orders management (create, track, update status)
- Inventory management
- Production/workshop tracking
- Staff management
- Accounts/financials

## Secrets needed

- `VITE_SUPABASE_URL` — Supabase project URL (optional — app works with localStorage fallback)
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key (optional)
- `GEMINI_API_KEY` — Google Gemini API key for AI order extraction
- `EXTRACT_API_KEY` — Optional auth key to protect the `/api/extract-order` endpoint

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The frontend supabase client (`artifacts/kidzy/src/lib/supabase.ts`) returns `null` when env vars are missing — always check `hasSupabase` before using it.
- AppContext calls the backend API proxy (`/api/db/:table`) rather than Supabase directly from the client.
- The api-server `kidzy.ts` route handles Supabase initialization lazily (on first request).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
