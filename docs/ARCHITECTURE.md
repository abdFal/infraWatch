# Architecture notes

Short explanations of the main design decisions.

## Request flow

1. **`src/proxy.ts`** (Next.js 16's new name for middleware) runs first. It redirects signed-out page requests to `/login` and answers signed-out `/api/*` requests with `401`. This is an *optimistic* check only.
2. **Pages** in `src/app/(dashboard)/` are thin. The shared layout re-verifies the session on the server, confirms the user still exists in the database, and loads settings. Each page renders a client component.
3. **Client components** fetch data from `/api/*` routes with `useApi` (`src/lib/hooks/use-api.ts`). It handles skeletons on first load, background refresh at the user's interval (paused while the tab is hidden), and toasts when a refresh fails.
4. **API routes** are wrapped in `withApi` (`src/lib/api/route-helpers.ts`), which authenticates, validates input with Zod and maps errors to safe JSON. Internal details go to server logs only.
5. **`monitoring-service.ts`** holds the provider-agnostic logic: the active region (from the database), a 15-second in-memory cache of the instance list, search, filtering, pagination, summary maths, and throttled logging of provider errors to the activity log.
6. **Providers** implement `MonitoringProvider`. Only read methods exist.

## Why the browser never calls AWS

The AWS SDK runs only in server code. Every server module that touches secrets imports `server-only`, so importing it from a client component fails the build. The API exposes fixed, validated operations (list, detail, metrics), not a generic AWS passthrough, so users can't make arbitrary AWS calls.

## Provider selection

`getMonitoringProvider()` reads `MONITORING_PROVIDER` once. There is deliberately **no automatic fallback** from AWS to MOCK: a misconfigured production server must look broken, not quietly show fake data. The top bar always shows which provider is active.

## Mock data that behaves like AWS

The mock provider is deterministic (seeded by region, instance ID and timestamp). Charts don't jump on refresh, and each region has its own fleet. It reproduces the edge cases the real integration must handle:

- stopped and pending instances have no datapoints
- memory and disk usage exist only where the "CloudWatch Agent" is installed
- disk ops are empty on EBS-only Nitro instance types
- one instance fails its status check, so "Degraded" appears
- one instance has no `Name` tag

## Metric units

CloudWatch `Sum` statistics depend on the period (5 minutes vs 15 minutes). Network and disk-ops values are divided by the period and shown **per second**, so switching from 3h to 24h doesn't change the scale.

## Authentication

- Auth.js v5 with the Credentials provider and **JWT sessions** (8 hours). The token holds only id, name, email and role.
- Passwords are hashed with **bcrypt, cost 12**. Unknown emails are still compared against a dummy hash, so response time doesn't reveal which accounts exist.
- Failed logins are rate-limited (5 per 15 minutes per email + IP), in memory. This is fine for a single PM2 process. Use Redis or PostgreSQL if you scale out.
- Logins, failed logins, logouts and setting changes are written to `activity_logs`.
- Roles: `ADMIN` can change the application-wide AWS region. Everyone can change their own refresh interval and default range.

## Rendering model

Next.js 16 scaffolds with *Cache Components* enabled. This app turns it off (`cacheComponents: false`): every page is per-user and shows live data, so there's almost nothing to prerender, and the request-time model is simpler to learn. Next.js plans to make Cache Components the default in a future major version. Migrating then means wrapping session reads in `<Suspense>`.

## Database

| Table | Purpose |
| --- | --- |
| `users` | Accounts (`passwordHash` only, never plain passwords) |
| `app_settings` | Single row: active AWS region, who changed it last |
| `monitoring_preferences` | Per-user refresh interval and default time range |
| `activity_logs` | Audit trail, indexed by time and action |

AWS credentials are never stored in the database.
