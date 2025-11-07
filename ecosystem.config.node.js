const path = require('path');
const os = require('os');

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
      name: 'litrev-frontend',
      cwd: path.join(baseDir, 'frontend'),
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
        NODE_ENV: 'development',
        PORT: '3001',
        NODE_OPTIONS: '--max_old_space_size=1024',
        REACT_APP_API_URL: 'https://litrev.haielab.org',
        REACT_APP_GOOGLE_CLIENT_ID: '337048330114-f2kimcqsu1fi4h1unmuno10cr8gcnetp.apps.googleusercontent.com',
      },
      error_file: path.join(baseDir, 'frontend/logs/frontend-error.log'),
      out_file: path.join(baseDir, 'frontend/logs/frontend-out.log'),
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
