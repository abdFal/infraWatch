/**
 * PM2 process file for production on EC2.
 *
 *   pm2 start ecosystem.config.cjs
 *
 * Runs `next start` bound to 127.0.0.1 so the app is reachable only through
 * Nginx, never directly from the internet. Next.js reads .env from this folder.
 *
 * A single instance on purpose: the login rate limiter and the short-lived
 * instance-list cache live in process memory.
 */
module.exports = {
  apps: [
    {
      name: "devops-dashboard",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start --port 3000 --hostname 127.0.0.1",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "512M",
      autorestart: true,
      time: true,
    },
  ],
};
