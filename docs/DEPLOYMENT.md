# Production deployment on AWS EC2 (Ubuntu)

Architecture for the first deployment:

```
Internet ──► EC2 security group (80/443) ──► Nginx :80/:443 ──► Next.js (PM2) 127.0.0.1:3000 ──► PostgreSQL 127.0.0.1:5432
```

- **No Docker or Kubernetes yet.** Node.js runs directly, managed by PM2.
- Next.js listens only on `127.0.0.1`, so it can only be reached through Nginx.
- PostgreSQL runs on the same instance and listens only on localhost.
- AWS access uses an **IAM role** attached to the instance, never access keys.

> Do this **after** the app works locally. Use real AWS mode only once Phase 2 is complete. Until then, deploy with `MONITORING_PROVIDER=MOCK` to practise the deployment itself.

Commands marked **(Mac)** run in Terminal on your MacBook. Commands marked **(server)** run on the EC2 instance over SSH.

---

## 1. Launch the EC2 instance (AWS Console)

1. **EC2 → Launch instance**
   - AMI: **Ubuntu Server 24.04 LTS**
   - Type: `t3.small` or larger (`t3.micro` has too little memory for `next build`)
   - Key pair: create one, for example `infrawatch-key`, and download the `.pem` file
   - Storage: 20 GB gp3
2. **Security group** inbound rules:

   | Port | Source | Purpose |
   | --- | --- | --- |
   | 22 (SSH) | **My IP** only | Administration |
   | 80 (HTTP) | 0.0.0.0/0 | Let's Encrypt validation + redirect to HTTPS |
   | 443 (HTTPS) | 0.0.0.0/0 | Dashboard |

   Do **not** open 3000 or 5432.
3. **Advanced details → IAM instance profile:** select `InfraWatchEC2Role` (see [AWS_SETUP.md §5](AWS_SETUP.md#5-credentials-on-ec2-production)).
4. **Advanced details → Metadata version:** "V2 only (token required)".
5. (Recommended) Allocate an **Elastic IP** and associate it, so the address survives restarts.
6. For HTTPS, point a DNS **A record** (for example `dashboard.example.com`) to that IP.

## 2. Connect over SSH (Mac)

```bash
chmod 400 ~/Downloads/infrawatch-key.pem
```

```bash
ssh -i ~/Downloads/infrawatch-key.pem ubuntu@YOUR_ELASTIC_IP
```

## 3. Prepare Ubuntu (server)

```bash
sudo apt update && sudo apt upgrade -y
```

```bash
sudo apt install -y git curl ufw nginx
```

Basic firewall (in addition to the security group):

```bash
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw --force enable
```

`t3.small` has 2 GB RAM. Add 2 GB of swap so `next build` doesn't run out of memory:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile && echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 4. Install Node.js 24 LTS (server)

Uses the NodeSource repository:

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
```

```bash
sudo apt install -y nodejs
```

```bash
node -v && npm -v
```

Install PM2 globally:

```bash
sudo npm install -g pm2
```

## 5. Install and configure PostgreSQL (server)

Ubuntu 24.04 ships PostgreSQL 16, which works fine with this app.

```bash
sudo apt install -y postgresql
```

Generate a strong database password and copy it somewhere safe:

```bash
openssl rand -base64 24 | tr -d '/+='
```

Create a dedicated database user and database. Replace `STRONG_DB_PASSWORD`:

```bash
sudo -u postgres psql -c "CREATE USER infrawatch WITH PASSWORD 'STRONG_DB_PASSWORD';"
```

```bash
sudo -u postgres psql -c "CREATE DATABASE devops_dashboard OWNER infrawatch;"
```

PostgreSQL on Ubuntu listens on localhost only by default. Leave it that way.

## 6. Deploy the code with Git (server)

Create an app directory owned by `ubuntu`:

```bash
sudo mkdir -p /var/www/devops-dashboard && sudo chown ubuntu:ubuntu /var/www/devops-dashboard
```

For a **private** GitHub repository, create a deploy key so the server can pull:

```bash
ssh-keygen -t ed25519 -C "infrawatch-deploy" -f ~/.ssh/infrawatch_deploy -N ""
```

```bash
cat ~/.ssh/infrawatch_deploy.pub
```

Add that public key in GitHub: **Repository → Settings → Deploy keys → Add deploy key**, read-only. Then:

```bash
printf "Host github.com\n  IdentityFile ~/.ssh/infrawatch_deploy\n" >> ~/.ssh/config
```

Clone, replacing the URL with your repository:

```bash
git clone git@github.com:YOUR_USER/devops-dashboard.git /var/www/devops-dashboard
```

```bash
cd /var/www/devops-dashboard
```

## 7. Production environment (server)

```bash
cp .env.example .env && chmod 600 .env
```

```bash
nano .env
```

Set at least:

```bash
DATABASE_URL="postgresql://infrawatch:STRONG_DB_PASSWORD@localhost:5432/devops_dashboard"
AUTH_SECRET="<output of: openssl rand -base64 32>"
AUTH_TRUST_HOST=true
SEED_ADMIN_EMAIL="you@yourcompany.com"
SEED_ADMIN_PASSWORD="<a long unique password>"
MONITORING_PROVIDER=MOCK        # AWS after Phase 2
AWS_REGION=us-east-1
# AWS_PROFILE must stay UNSET on EC2: the instance role is used.
```

Use a **different** `AUTH_SECRET` from your local one.

## 8. Install, migrate, seed, build (server, in /var/www/devops-dashboard)

```bash
npm ci
```

`npm ci` installs exactly what's in `package-lock.json` and runs `prisma generate`.

Apply migrations. Use `migrate deploy` in production: it applies committed migrations and never generates new ones.

```bash
npm run db:deploy
```

```bash
npm run db:seed
```

After seeding, remove `SEED_ADMIN_PASSWORD` from `.env`. It's no longer needed.

```bash
npm run build
```

## 9. Run with PM2 (server)

The project includes [`ecosystem.config.cjs`](../ecosystem.config.cjs):

```bash
pm2 start ecosystem.config.cjs
```

```bash
pm2 status
```

```bash
curl -s http://127.0.0.1:3000/api/health
```

Expected: `{"status":"ok"}`.

Make PM2 start on boot. The first command prints a `sudo ...` line: copy and run it, then save:

```bash
pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

```bash
pm2 save
```

Optional log rotation:

```bash
pm2 install pm2-logrotate
```

Useful: `pm2 logs devops-dashboard`, `pm2 restart devops-dashboard`.

## 10. Nginx reverse proxy (server)

```bash
sudo cp deploy/nginx/devops-dashboard.conf /etc/nginx/sites-available/devops-dashboard
```

Edit `server_name` to your domain (or the Elastic IP if you have no domain yet):

```bash
sudo nano /etc/nginx/sites-available/devops-dashboard
```

```bash
sudo ln -s /etc/nginx/sites-available/devops-dashboard /etc/nginx/sites-enabled/ && sudo rm -f /etc/nginx/sites-enabled/default
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Open `http://YOUR_DOMAIN` (or the IP). You should see the login page.

The config **overwrites** `X-Forwarded-For` with the real client address, so the IPs in activity logs can't be spoofed.

## 11. HTTPS with Let's Encrypt (server)

Requires a domain whose DNS A record points to the instance.

```bash
sudo apt install -y certbot python3-certbot-nginx
```

```bash
sudo certbot --nginx -d dashboard.example.com --redirect
```

Certbot adds the `listen 443 ssl` block and an HTTP→HTTPS redirect, and installs a renewal timer. Test renewal with:

```bash
sudo certbot renew --dry-run
```

> Without a domain you can only use plain HTTP, which sends session cookies unencrypted. Use it for a short test only. Production needs HTTPS.

## 12. Deploying updates (server)

```bash
cd /var/www/devops-dashboard && git pull && npm ci && npm run db:deploy && npm run build && pm2 restart devops-dashboard
```

## 13. Backups (server)

Nightly database dump at 02:00, keeping 7 days:

```bash
mkdir -p ~/backups && (crontab -l 2>/dev/null; echo '0 2 * * * pg_dump "postgresql://infrawatch:STRONG_DB_PASSWORD@localhost/devops_dashboard" | gzip > ~/backups/db-$(date +\%a).sql.gz') | crontab -
```

Also consider EBS snapshots through **Amazon Data Lifecycle Manager**.

## 14. Production checklist

- [ ] SSH open only to your IP, ports 3000 and 5432 closed
- [ ] IAM **role** attached. No AWS keys anywhere on the server.
- [ ] IMDSv2 required
- [ ] `.env` has mode `600`, a unique `AUTH_SECRET`, and no `SEED_ADMIN_PASSWORD` after seeding
- [ ] HTTPS enabled and renewal tested
- [ ] `pm2 startup` and `pm2 save` done (survives reboot)
- [ ] `/api/health` returns `{"status":"ok"}`
- [ ] Database backups scheduled

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `502 Bad Gateway` from Nginx | The app isn't running: `pm2 status`, `pm2 logs devops-dashboard` |
| `UntrustedHost` error in logs | Set `AUTH_TRUST_HOST=true` in `.env`, then `pm2 restart devops-dashboard` |
| `next build` killed / out of memory | Add swap (§3) or use a larger instance |
| Login works but you're immediately signed out | `AUTH_SECRET` changed between restarts, or the clock is wrong (`timedatectl`) |
| AWS mode: "access denied" | The instance role is missing or lacks `InfraWatchReadOnly`. Check with `aws sts get-caller-identity` on the server. |
