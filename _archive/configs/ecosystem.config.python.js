/**
 * PM2 Configuration for Python Backend (DEPRECATED)
 *
 * This configuration is for the old Python backend that has been replaced
 * by the Node.js backend. It is kept for emergency rollback purposes only.
 *
 * To use this configuration:
 *   pm2 start ecosystem.config.python.js
 *
 * For the current Node.js backend, use:
 *   pm2 start ecosystem.config.node.js
 */

module.exports = {
  apps: [
    {
      name: 'litrev-backend',
      cwd: '/home/ubuntu/litrevtool/backend-python-backup',
      script: 'venv/bin/uvicorn',
      args: 'app.main:app --host 0.0.0.0 --port 8000 --workers 1',
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
        PATH: '/home/ubuntu/litrevtool/backend-python-backup/venv/bin:' + process.env.PATH,
        PYTHONUNBUFFERED: '1'
      },
      error_file: '/home/ubuntu/litrevtool/backend-python-backup/logs/backend-error.log',
      out_file: '/home/ubuntu/litrevtool/backend-python-backup/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'litrev-celery',
      cwd: '/home/ubuntu/litrevtool/backend-python-backup',
      script: 'venv/bin/celery',
      args: '-A app.tasks.celery_app worker --loglevel=info --concurrency=1 --max-memory-per-child=200000 --task-soft-time-limit=1800 --task-time-limit=2100',
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
        PATH: '/home/ubuntu/litrevtool/backend-python-backup/venv/bin:' + process.env.PATH,
        PYTHONUNBUFFERED: '1'
      },
      error_file: '/home/ubuntu/litrevtool/backend-python-backup/logs/celery-error.log',
      out_file: '/home/ubuntu/litrevtool/backend-python-backup/logs/celery-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'litrev-frontend',
      cwd: '/home/ubuntu/litrevtool/frontend',
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
        REACT_APP_GOOGLE_CLIENT_ID: '337048330114-08bp752l61julmdpjj3o2h4df7rmeh0t.apps.googleusercontent.com'
      },
      error_file: '/home/ubuntu/litrevtool/frontend/logs/frontend-error.log',
      out_file: '/home/ubuntu/litrevtool/frontend/logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
