# InfraWatch: AWS Infrastructure Monitoring Dashboard

A read-only monitoring dashboard for **Amazon EC2** and **Amazon CloudWatch**, built with Next.js, TypeScript, PostgreSQL and Prisma.

It runs locally on macOS with **mock data** (no AWS account needed), and is designed to switch to **real AWS data** by changing one environment variable once the AWS provider is implemented (Phase 2).

---

## Project status

| Area | Status |
| --- | --- |
| Login, logout, password hashing, protected routes (Auth.js) | ✅ Implemented |
| PostgreSQL + Prisma: users, app settings, monitoring preferences, activity logs | ✅ Implemented |
| Overview dashboard (totals, running/stopped/transitional, overall status, recent activity) | ✅ Implemented |
| EC2 instance list (pagination, search by ID/name, state filter) and detail page | ✅ Implemented |
| CloudWatch charts (CPU, network in/out, disk read/write ops, memory, disk usage) with 1h–24h ranges | ✅ Implemented |
| "No data available" states (stopped instances, metrics that need the CloudWatch Agent) | ✅ Implemented |
| Settings (AWS region, refresh interval, default time range, environment info) | ✅ Implemented |
| **MOCK provider** (generated data for local development) | ✅ Implemented |
| **AWS provider** (real EC2 + CloudWatch through AWS SDK v3) | ⏳ Phase 2: not built yet. Setting `MONITORING_PROVIDER=AWS` shows a clear error and **never** falls back to mock data. |
| EC2 deployment (Nginx + PM2), see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | 📄 Guide and config files ready (Phase 3) |
| Start/stop/reboot/terminate instances | ❌ Out of scope by design (read-only) |

---

## Architecture in one picture

```
Browser (React client components)
   │  fetch("/api/...")  ← the browser only ever talks to our own API routes
   ▼
Next.js server
   ├─ src/proxy.ts                → redirects signed-out users to /login (first check)
   ├─ src/app/api/**/route.ts     → validates input (Zod), re-checks the session
   ├─ src/lib/monitoring-service  → region, caching, search/filter/pagination
   │     └─ MonitoringProvider    → interface (src/lib/providers/monitoring-provider.ts)
   │           ├─ MockMonitoringProvider  (MONITORING_PROVIDER=MOCK)
   │           └─ AwsMonitoringProvider   (MONITORING_PROVIDER=AWS, Phase 2)
   └─ Prisma → PostgreSQL (users, settings, preferences, activity logs)
```

Key decisions (more in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)):

- **Provider abstraction.** UI and API code depend only on the `MonitoringProvider` interface. Moving from mock to real AWS doesn't touch the UI.
- **Server-only secrets.** Modules holding secrets import `server-only`, so the build fails if one ends up in the browser bundle. No variable uses the `NEXT_PUBLIC_` prefix.
- **No silent fallback.** If AWS mode fails, users see an error. The top bar always shows whether data is **Mock** or **Live AWS**.
- **Honest metrics.** Memory and disk usage need the CloudWatch Agent. Without it the dashboard says "No data available" and never invents values.

---

## 1. Prerequisites (macOS)

| Tool | Version | Why |
| --- | --- | --- |
| macOS | 13 or newer, Apple Silicon or Intel | |
| [Homebrew](https://brew.sh) | latest | Installs everything else |
| Node.js | **24 LTS** (`>= 24.0.0`) | Runs Next.js |
| npm | 11 (bundled with Node 24) | Package manager |
| PostgreSQL | **17** (16 also works) | Database |
| Git | any | Version control |
| AWS CLI v2 | optional, Phase 2 only | Local AWS credentials |

---

## 2. Installation, step by step

> Run every command below in the **Terminal** app (or the terminal in VS Code).
> When a step says "in the project folder", first run:
> ```bash
> cd ~/Documents/Projects/Personal\ Projects/devops-dashboard
> ```

### Step 1: Install Homebrew (skip if `brew --version` already works)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Step 2: Install Node.js 24, PostgreSQL 17 and Git

```bash
brew install node@24 postgresql@17 git
```

### Step 3: Add Node.js and PostgreSQL to your PATH

Both are "keg-only" in Homebrew, which means they are installed but not added to your `PATH` automatically. Add them to your shell profile once:

```bash
echo 'export PATH="/opt/homebrew/opt/node@24/bin:/opt/homebrew/opt/postgresql@17/bin:$PATH"' >> ~/.zshrc
```

```bash
source ~/.zshrc
```

Check that it worked:

```bash
node -v && npm -v && psql --version
```

You should see `v24.x`, `11.x` and `psql (PostgreSQL) 17.x`.

> On an Intel Mac, Homebrew lives in `/usr/local` instead of `/opt/homebrew`. Use `brew --prefix` to check, and adjust the path above.

### Step 4: Start PostgreSQL

```bash
brew services start postgresql@17
```

This starts PostgreSQL now and every time you log in. Check it with:

```bash
pg_isready
```

Expected output: `/tmp:5432 - accepting connections`.

### Step 5: Get the project

If the project is already on your Mac, go to its folder:

```bash
cd ~/Documents/Projects/Personal\ Projects/devops-dashboard
```

If you're cloning it from a Git repository instead:

```bash
git clone <your-repository-url> devops-dashboard && cd devops-dashboard
```

### Step 6: Install dependencies (in the project folder)

```bash
npm install
```

This also runs `prisma generate`, which creates the typed database client in `src/generated/prisma`.

> npm 11 blocks dependency install scripts unless they are approved. The project already approves the three it needs (Prisma and esbuild) in the `allowScripts` field of `package.json`.

### Step 7: Configure environment variables (in the project folder)

```bash
cp .env.example .env
```

Generate a secret for `AUTH_SECRET`:

```bash
openssl rand -base64 32
```

Find your macOS username (Homebrew PostgreSQL uses it as the database superuser, with no password):

```bash
whoami
```

Now open `.env` in your editor (for example `code .env`) and set:

- `DATABASE_URL`: replace `YOUR_MAC_USERNAME` with the output of `whoami`
- `AUTH_SECRET`: paste the output of `openssl rand -base64 32`
- `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`: the login you want (password: at least 12 characters)

See [Environment variables](#3-environment-variables) for what each one does.

### Step 8: Create the database

```bash
createdb devops_dashboard
```

### Step 9: Run the database migrations (in the project folder)

```bash
npm run db:migrate
```

This creates the tables from `prisma/migrations/`. If Prisma asks for a migration name, you've changed `schema.prisma`. Press Ctrl+C unless you meant to.

### Step 10: Seed the initial data (in the project folder)

```bash
npm run db:seed
```

This creates your admin user (from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`), the default AWS region setting and your monitoring preferences. Running it again is safe: an existing user keeps their password.

### Step 11: Start the development server (in the project folder)

```bash
npm run dev
```

Open **http://localhost:3000** in your browser and sign in with the email and password from your `.env`.

Stop the server with **Ctrl+C**.

---

## 3. Environment variables

All variables are read **only on the server**. None use the `NEXT_PUBLIC_` prefix, so none are ever sent to the browser.

| Variable | Required | Example | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | `postgresql://you@localhost:5432/devops_dashboard` | PostgreSQL connection string used by Prisma. Format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE`. |
| `AUTH_SECRET` | yes | output of `openssl rand -base64 32` | Signs and encrypts session cookies. Minimum 32 characters. Changing it signs everyone out. |
| `AUTH_TRUST_HOST` | yes in production | `true` | Lets Auth.js trust the `Host` header. Needed behind Nginx. |
| `SEED_ADMIN_EMAIL` | for seeding | `admin@example.com` | Email of the admin user created by `npm run db:seed`. |
| `SEED_ADMIN_PASSWORD` | for seeding | 12+ characters | Initial admin password. It's hashed with bcrypt before storage. You can remove it from `.env` after seeding. |
| `SEED_ADMIN_NAME` | no | `Administrator` | Display name of the admin user. |
| `MONITORING_PROVIDER` | no (default `MOCK`) | `MOCK` or `AWS` | Selects the data source. `AWS` requires Phase 2. |
| `AWS_REGION` | no (default `us-east-1`) | `ap-southeast-3` | Initial region. Afterwards, the region is changed in **Settings** and stored in the database. |
| `AWS_PROFILE` | no | `dashboard-readonly` | AWS CLI profile for **local** AWS mode. Leave unset on EC2 (the instance role is used). |
| `AWS_API_TIMEOUT_MS` | no (default `10000`) | `10000` | Timeout per AWS API call, 1000 to 60000 ms. |

> **Never put AWS access keys in `.env`.** Locally, use an AWS CLI profile. On EC2, use an IAM role. See [docs/AWS_SETUP.md](docs/AWS_SETUP.md).

---

## 4. Running locally: what to explore

| Page | URL | What to try |
| --- | --- | --- |
| Overview | `/` | Summary cards, overall status (one mock instance fails its status check, so it shows **Degraded**), state distribution, recent activity |
| EC2 Instances | `/instances` | Search `web` or part of an instance ID, filter by state, page through results |
| Instance detail | click any instance | Details, status checks, tags, all 7 metric charts. Switch between 1h, 3h, 6h, 12h and 24h. |
| Monitoring | `/monitoring` | Pick any instance. Stopped instances show "No data available". Staging instances show "CloudWatch Agent required" for memory/disk. |
| Activity Logs | `/activity` | Sign-ins, failed sign-ins, setting changes. Filter by type. |
| Settings | `/settings` | Change region (the mock fleet differs per region), refresh interval and default range |

Useful commands (in the project folder):

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run build` | Production build |
| `npm run check` | All three above |
| `npm run db:studio` | Opens Prisma Studio, a database browser, at http://localhost:5555 |
| `npm run db:reset-admin-password` | Sets the admin password to `SEED_ADMIN_PASSWORD` from `.env` |

---

## 5. Troubleshooting

| Problem | Fix |
| --- | --- |
| `zsh: command not found: node` or `psql` | Step 3 wasn't applied. Run the `echo ... >> ~/.zshrc` line, then `source ~/.zshrc`, or open a new terminal window. |
| `Can't reach database server at localhost:5432` | PostgreSQL isn't running: `brew services start postgresql@17`, then `pg_isready`. |
| `role "YOUR_MAC_USERNAME" does not exist` | `DATABASE_URL` still has the placeholder. Replace it with the output of `whoami`. |
| `database "devops_dashboard" does not exist` | Run `createdb devops_dashboard`. |
| `Cannot find module '@/generated/prisma/client'` | Run `npx prisma generate`. |
| `Invalid environment configuration: AUTH_SECRET ...` | Set `AUTH_SECRET` in `.env` to the output of `openssl rand -base64 32`. |
| `Port 3000 is already in use` | Find the process with `lsof -i :3000` and stop it, or run `npm run dev -- --port 3001`. |
| "Invalid email or password" with the right password | The user was seeded with an older password. Set the password you want in `.env`, then run `npm run db:reset-admin-password`. |
| "Too many failed attempts" | 5 failures within 15 minutes block that email + IP. Wait 15 minutes, or restart `npm run dev` (the limiter is in memory). |
| "AWS mode is not available yet" | Expected until Phase 2. Set `MONITORING_PROVIDER=MOCK` and restart the server. |
| `[auth][error] CredentialsSignin` in the terminal | Normal: Auth.js logs each failed login. |
| Changes to `.env` have no effect | Restart `npm run dev`. Environment variables are read at startup. |
| Start over with an empty database | `dropdb devops_dashboard && createdb devops_dashboard && npm run db:migrate && npm run db:seed` (**deletes all data**). |

---

## 6. AWS integration (Phase 2)

See **[docs/AWS_SETUP.md](docs/AWS_SETUP.md)** for:

- the least-privilege read-only IAM policy ([docs/iam-policy.json](docs/iam-policy.json))
- configuring an AWS CLI profile on your Mac
- switching from `MOCK` to `AWS` mode
- installing the CloudWatch Agent for memory and disk metrics

## 7. Production deployment (Phase 3)

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**: Ubuntu on EC2, Node.js, PostgreSQL, Git deployment, environment, Prisma migrations, PM2 ([ecosystem.config.cjs](ecosystem.config.cjs)), Nginx ([deploy/nginx/devops-dashboard.conf](deploy/nginx/devops-dashboard.conf)) and HTTPS.

---

## 8. Tech stack

Next.js 16 (App Router) · React 19 · TypeScript 5.9 · Tailwind CSS 4 · PostgreSQL 17 · Prisma 7 (with the `pg` driver adapter) · Auth.js v5 (`next-auth@5.0.0-beta.32`, pinned) · Zod 4 · Recharts 3 · AWS SDK for JavaScript v3 · Sonner (toasts) · Lucide (icons)

> **About Auth.js v5:** Auth.js v5 is published under npm's `beta` tag but is the version the Auth.js docs target for the App Router. The project pins an exact version so updates are deliberate.

## 9. Project structure

```
prisma/
  schema.prisma              Database models
  migrations/                SQL migrations (committed)
  seed.ts                    Creates admin user + default settings
  reset-admin-password.ts
prisma.config.ts             Prisma CLI config (Prisma 7)
src/
  proxy.ts                   Route protection (Next.js 16 "proxy", formerly middleware)
  auth.ts, auth.config.ts    Auth.js setup (credentials + bcrypt, JWT sessions)
  app/
    login/                   Login page
    (dashboard)/             Signed-in pages: overview, instances, monitoring, activity, settings
    api/                     JSON API routes (the only thing the browser calls)
    actions.ts               Server actions: login, logout
  components/                UI (layout, ui primitives, feature components)
  lib/
    providers/               MonitoringProvider interface, mock provider (+ AWS in Phase 2)
    aws/                     AWS region list (+ SDK clients in Phase 2)
    monitoring-service.ts    Provider-agnostic business logic
    validation/schemas.ts    Zod schemas for every input
    env.ts                   Validated server-side environment
    db.ts                    Prisma client
docs/                        AWS setup, deployment, architecture, IAM policy
deploy/nginx/                Nginx site config
ecosystem.config.cjs         PM2 config
```
