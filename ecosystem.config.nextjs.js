const path = require('path');
const os = require('os');

/**
 * PM2 Configuration for LitRevTool with Next.js SSR Frontend
 *
 * This configuration uses:
 * - backend-node: Node.js backend (port 8000)
 * - backend-node worker: Bull queue worker for background jobs
 * - frontend-nextjs: Next.js SSR frontend (port 3001)
 *
 * Start with: pm2 start ecosystem.config.nextjs.js
 */

// Detect environment - use current working directory
const baseDir = process.cwd();
const homeDir = os.homedir();

module.exports = {
  apps: [
    {
      name: 'litrev-backend',
      cwd: path.join(baseDir, 'backend-node'),
      script: 'npm',
      args: 'start',
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      exp_backoff_restart_delay: 100,
      env: {
        NODE_ENV: 'production',
        PORT: '8000',
      },
      error_file: path.join(baseDir, 'backend-node/logs/backend-error.log'),
      out_file: path.join(baseDir, 'backend-node/logs/backend-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
    {
      name: 'litrev-worker',
      cwd: path.join(baseDir, 'backend-node'),
      script: 'dist/tasks/worker.js',
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      exp_backoff_restart_delay: 100,
      env: {
        NODE_ENV: 'production',
      },
      error_file: path.join(baseDir, 'backend-node/logs/worker-error.log'),
      out_file: path.join(baseDir, 'backend-node/logs/worker-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
    {
      name: 'litrev-frontend-nextjs',
      cwd: path.join(baseDir, 'frontend-nextjs'),
      script: 'npm',
      args: 'start',
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      kill_timeout: 5000,
      restart_delay: 4000,
      min_uptime: '15s',
      max_restarts: 10,
      exp_backoff_restart_delay: 100,
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
        NODE_OPTIONS: '--max_old_space_size=1024',
        NEXT_PUBLIC_API_URL: 'http://localhost:8000',
        NEXT_PUBLIC_GOOGLE_CLIENT_ID: '337048330114-f2kimcqsu1fi4h1unmuno10cr8gcnetp.apps.googleusercontent.com',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: '3001',
        NODE_OPTIONS: '--max_old_space_size=1024',
        NEXT_PUBLIC_API_URL: 'https://litrev.haielab.org',
        NEXT_PUBLIC_GOOGLE_CLIENT_ID: '337048330114-f2kimcqsu1fi4h1unmuno10cr8gcnetp.apps.googleusercontent.com',
      },
      error_file: path.join(baseDir, 'frontend-nextjs/logs/frontend-error.log'),
      out_file: path.join(baseDir, 'frontend-nextjs/logs/frontend-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
