# InfraWatch: AWS Infrastructure Monitoring Dashboard

A read-only monitoring dashboard for **Amazon EC2** and **Amazon CloudWatch**, built with Next.js, TypeScript, PostgreSQL and Prisma.

It runs locally on macOS and can show **generated mock data**, **real data from your AWS account**, or **both side by side** (`HYBRID` mode, where every instance carries an `AWS` or `MOCK` badge). You choose with one environment variable; the UI doesn't change.

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
| **AWS provider** (real EC2 + CloudWatch through AWS SDK v3, AWS CLI named profile / IAM role) | ✅ Implemented (Phase 2) |
| **HYBRID mode**: real AWS and mock instances together, with a source badge, source filter and per-source status | ✅ Implemented (Phase 2) |
| Memory and disk usage for **real** instances | ⚙️ Needs the CloudWatch Agent on each instance ([docs/AWS_SETUP.md §6](docs/AWS_SETUP.md#6-memory-and-disk-usage-cloudwatch-agent)). Until then the charts say so. |
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
   ├─ src/lib/monitoring-service  → unified service: asks every enabled source in parallel,
   │     │                          merges by (source, instanceId), reports each source's status,
   │     │                          caches, searches, filters, paginates
   │     └─ MonitoringProvider    → interface (src/lib/providers/monitoring-provider.ts)
   │           ├─ MockMonitoringProvider  generated demo data            (source "MOCK")
   │           └─ AwsMonitoringProvider   AWS SDK v3 → EC2 + CloudWatch  (source "AWS")
   │                 credentials: AWS CLI profile (Mac) or IAM role (EC2), never in code/.env/DB
   └─ Prisma → PostgreSQL (users, settings, preferences, activity logs)

MONITORING_PROVIDER = HYBRID (AWS + MOCK) | MOCK | AWS
```

Key decisions (more in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)):

- **Provider abstraction.** UI and API code depend only on the unified monitoring service. Adding real AWS next to mock data didn't change the page layouts.
- **Every instance has a source.** Instances are keyed by source + ID, and URLs include the source (`/instances/aws/i-0abc…`, `/instances/mock/i-0abc…`), so demo data can never be mistaken for, or collide with, a real instance.
- **Server-only secrets.** Modules holding secrets import `server-only`, so the build fails if one ends up in the browser bundle. No variable uses the `NEXT_PUBLIC_` prefix.
- **No silent fallback.** If AWS fails in HYBRID mode, mock instances stay visible **and** a red "AWS data unavailable" banner explains why. In AWS-only mode the page shows an error. The top bar always shows **Mock data**, **AWS + Mock** or **Live AWS**.
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
| AWS CLI v2 | for AWS / HYBRID mode | Holds your AWS credentials in `~/.aws`, outside the project |

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
| `MONITORING_PROVIDER` | no (default `MOCK`) | `HYBRID`, `MOCK` or `AWS` | Which data sources to show. `HYBRID` = real AWS and mock instances together. `MOCK` makes no AWS calls at all. |
| `AWS_REGION` | no (default `us-east-1`) | `ap-southeast-2` | Region used the **first** time the database is seeded. Afterwards the region is changed in **Settings** and stored in the database. |
| `AWS_PROFILE` | for AWS/HYBRID on your Mac | `infrawatch-readonly` | The **name** of an AWS CLI profile in `~/.aws/config`. The SDK reads the credentials from there itself. Leave unset on EC2 (the instance role is used). |
| `AWS_API_TIMEOUT_MS` | no (default `10000`) | `10000` | Timeout per AWS API call, 1000 to 60000 ms. |

> **Never put AWS access keys in `.env`.** Locally, use an AWS CLI profile. On EC2, use an IAM role. See [docs/AWS_SETUP.md](docs/AWS_SETUP.md).

---

## 4. Running locally: what to explore

| Page | URL | What to try |
| --- | --- | --- |
| Overview | `/` | Summary cards, overall status (one mock instance fails its status check, so it shows **Degraded**), state distribution, recent activity |
| EC2 Instances | `/instances` | Search `web` or part of an instance ID, filter by state, page through results. In HYBRID mode, each row has an **AWS** or **MOCK** badge and you can filter by source. |
| Instance detail | click any instance | Details, status checks, tags, all 7 metric charts. Switch between 1h, 3h, 6h, 12h and 24h. |
| Monitoring | `/monitoring` | Pick any instance. Stopped instances show "No data available". Staging instances show "CloudWatch Agent required" for memory/disk. |
| Activity Logs | `/activity` | Sign-ins, failed sign-ins, setting changes. Filter by type. |
| Settings | `/settings` | Change region (the mock fleet differs per region, and real AWS instances are read from this region), refresh interval and default range |

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
| AWS errors ("credentials were not found", "rejected the credentials", "not allowed to read") | See [§6.9 AWS troubleshooting](#69-aws-troubleshooting). |
| `[auth][error] CredentialsSignin` in the terminal | Normal: Auth.js logs each failed login. |
| Changes to `.env` have no effect | Restart `npm run dev`. Environment variables are read at startup. |
| Start over with an empty database | `dropdb devops_dashboard && createdb devops_dashboard && npm run db:migrate && npm run db:seed` (**deletes all data**). |

---

## 6. Connect your AWS account (Phase 2)

What you'll set up:

```
Your Mac
  ~/.aws/config + ~/.aws/credentials      ← profile "infrawatch-readonly" (read-only IAM user)
        ▲ read by the AWS SDK's default credential provider chain
  .env:  AWS_PROFILE=infrawatch-readonly  ← only the profile NAME, never a key
        ▲
  Next.js server ── DescribeInstances / DescribeInstanceStatus / GetMetricData / ListMetrics ──► AWS
```

The app only stores the **name** of a profile. The keys stay in `~/.aws`, outside the project, so they can't be committed, shown in the browser, or written to the database.

All commands below run in **Terminal on your Mac**. Commands that use `file://docs/...` must run **in the project folder**:

```bash
cd ~/Documents/Projects/Personal\ Projects/devops-dashboard
```

### 6.1 Install the AWS CLI (if needed)

```bash
aws --version
```

If you see `command not found`, install it:

```bash
brew install awscli
```

### 6.2 Create the read-only IAM policy

You need an identity that can manage IAM **once**, to create a separate, limited identity for the app. The examples use your admin profile `default`; replace it if yours has another name.

The policy ([docs/iam-policy.json](docs/iam-policy.json)) allows exactly four read-only actions: `ec2:DescribeInstances`, `ec2:DescribeInstanceStatus`, `cloudwatch:GetMetricData`, `cloudwatch:ListMetrics`.

```bash
aws iam create-policy --policy-name InfraWatchReadOnly --policy-document file://docs/iam-policy.json --profile default
```

### 6.3 Create a dedicated IAM user for the dashboard

```bash
aws iam create-user --user-name infrawatch-readonly --profile default
```

Attach the policy. `$(...)` looks up your 12-digit account ID for you:

```bash
aws iam attach-user-policy --user-name infrawatch-readonly --policy-arn "arn:aws:iam::$(aws sts get-caller-identity --profile default --query Account --output text):policy/InfraWatchReadOnly" --profile default
```

> If your organization uses **IAM Identity Center (SSO)**, use a permission set with this policy instead of an IAM user: see [docs/AWS_SETUP.md §3, option A](docs/AWS_SETUP.md#option-a-recommended-iam-identity-center-sso).

### 6.4 Create an access key and save it in a named profile

```bash
aws iam create-access-key --user-name infrawatch-readonly --profile default --output table
```

This prints an `AccessKeyId` and a `SecretAccessKey`. The secret is shown **only once**. Copy both, then store them in a new profile:

```bash
aws configure --profile infrawatch-readonly
```

Answer the four prompts:

| Prompt | Answer |
| --- | --- |
| AWS Access Key ID | the `AccessKeyId` |
| AWS Secret Access Key | the `SecretAccessKey` |
| Default region name | your region, for example `ap-southeast-2` |
| Default output format | `json` |

The keys are now in `~/.aws/credentials`. Clear the terminal so the secret isn't left in the scrollback (**Cmd+K**). Don't paste the keys anywhere else, including `.env`.

### 6.5 Set the profile's region

Already done if you answered the prompt above. To change it later:

```bash
aws configure set region ap-southeast-2 --profile infrawatch-readonly
```

> The dashboard reads instances from the region selected in **Settings** (step 6.7). The profile region only affects the AWS CLI.

### 6.6 Verify the identity and its permissions

Who am I? The `Arn` should end with `user/infrawatch-readonly`. A brand-new key can take about 10 seconds to start working.

```bash
aws sts get-caller-identity --profile infrawatch-readonly
```

Can it read EC2? An empty table is fine if you have no instances in that region:

```bash
aws ec2 describe-instances --profile infrawatch-readonly --region ap-southeast-2 --query "Reservations[].Instances[].[InstanceId,State.Name]" --output table
```

Is it really limited? This should **fail** with `AccessDenied`, which proves least privilege:

```bash
aws s3 ls --profile infrawatch-readonly
```

### 6.7 Point the app at AWS

Open `.env` in the project folder (for example `open -e .env`) and set:

```bash
MONITORING_PROVIDER=HYBRID
AWS_PROFILE=infrawatch-readonly
AWS_REGION=ap-southeast-2
```

| `MONITORING_PROVIDER` | What the dashboard shows |
| --- | --- |
| `HYBRID` | Real AWS instances **and** mock instances together, each with an `AWS` or `MOCK` badge. If AWS fails, mock data stays visible and a banner explains the AWS problem. |
| `AWS` | Only your real AWS instances. If AWS fails, pages show the error. |
| `MOCK` | Only generated demo data. No AWS calls are made. |

### 6.8 Restart the app

In the terminal window where `npm run dev` is running, press **Ctrl+C**, then start it again:

```bash
npm run dev
```

Why restart: the AWS SDK resolves the profile's credentials once and caches them in the running server. Restart again whenever you change `~/.aws` or `AWS_PROFILE`.

Then, in the browser at http://localhost:3000:

1. **Settings → AWS Region:** choose the region your instances are in and click **Save region**. After the first run, this saved setting (not `AWS_REGION`) decides which region is read.
2. **Overview:** the top bar says **AWS + Mock**, and the **Data sources** card shows `AWS · Connected` with your instance count.
3. **EC2 Instances:** real instances appear first with an **AWS** badge. Use the source filter to show only `AWS (real)`.
4. Open an AWS instance: details come from EC2 and charts from CloudWatch. Memory and disk usage show "CloudWatch Agent required" until you install the agent ([docs/AWS_SETUP.md §6](docs/AWS_SETUP.md#6-memory-and-disk-usage-cloudwatch-agent)).

No instances in that region? Launch a small test instance (for example `t3.micro`) in the AWS Console. CPU and network metrics appear 5–10 minutes after it starts. **Stop or terminate it afterwards** to avoid charges.

### 6.9 AWS troubleshooting

AWS problems appear in the red **"AWS data unavailable"** banner and in **Activity Logs** (`Provider error`). Full AWS error details are printed in the `npm run dev` terminal only, never in the browser.

| Message in the dashboard | Cause and fix |
| --- | --- |
| "AWS credentials were not found or have expired" | `AWS_PROFILE` is missing or misspelled (`aws configure list-profiles` shows the names), or an SSO / `aws login` session expired (`aws sso login --profile NAME`). Restart `npm run dev` afterwards. |
| "AWS rejected the credentials…" | The access key is wrong, deleted or deactivated. Recreate it (step 6.4). This also happens for opt-in regions that aren't enabled in your account. |
| "Your AWS identity is not allowed to read EC2/CloudWatch data in REGION" | The policy isn't attached (step 6.3), or an **organization SCP** blocks that region. Test with the step 6.6 command and `--region REGION`. If the CLI fails the same way, choose an allowed region in Settings. |
| "AWS did not respond in time" / "Cannot reach AWS" | Network problem or VPN. The limit is `AWS_API_TIMEOUT_MS` (default 10 s). |
| AWS shows `Connected` but 0 instances | Wrong region in **Settings**. Instances are per region. |
| An AWS chart says "No data available" | The instance is stopped, was launched in the last few minutes, or (for Disk Read/Write Ops) is an EBS-only Nitro type such as `t3`, where AWS/EC2 doesn't report disk ops. |
| Memory / Disk Usage say "CloudWatch Agent required" | Expected until the agent is installed: [docs/AWS_SETUP.md §6](docs/AWS_SETUP.md#6-memory-and-disk-usage-cloudwatch-agent). |
| Fixed the problem but the banner is still there | Lists are cached for 15 seconds. Click **Refresh** after that. If you changed `~/.aws`, restart `npm run dev`. |

More detail (SSO profiles, the EC2 instance role for production, the CloudWatch Agent, metric notes) is in **[docs/AWS_SETUP.md](docs/AWS_SETUP.md)**.

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
    providers/               MonitoringProvider interface, mock + AWS providers, source selection
    aws/                     AWS SDK v3: clients, EC2 calls, CloudWatch calls, error mapping, regions
    monitoring-service.ts    Unified service: combines sources, caching, search, summaries
    validation/schemas.ts    Zod schemas for every input
    env.ts                   Validated server-side environment
    db.ts                    Prisma client
docs/                        AWS setup, deployment, architecture, IAM policy
deploy/nginx/                Nginx site config
ecosystem.config.cjs         PM2 config
```
