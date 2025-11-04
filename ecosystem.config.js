module.exports = {
  apps: [
    {
      name: 'litrev-backend',
      cwd: '/home/ubuntu/litrevtool/backend',
      script: 'venv/bin/uvicorn',
      args: 'app.main:app --host 0.0.0.0 --port 8000',
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PATH: '/home/ubuntu/litrevtool/backend/venv/bin:' + process.env.PATH
      },
      error_file: '/home/ubuntu/litrevtool/backend/logs/backend-error.log',
      out_file: '/home/ubuntu/litrevtool/backend/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'litrev-celery',
      cwd: '/home/ubuntu/litrevtool/backend',
      script: 'venv/bin/celery',
      args: '-A app.tasks.celery_app worker --loglevel=info --concurrency=2',
      interpreter: 'none',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PATH: '/home/ubuntu/litrevtool/backend/venv/bin:' + process.env.PATH
      },
      error_file: '/home/ubuntu/litrevtool/backend/logs/celery-error.log',
      out_file: '/home/ubuntu/litrevtool/backend/logs/celery-out.log',
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
      max_memory_restart: '2G',
      kill_timeout: 5000,
      restart_delay: 3000,
      min_uptime: 10000,
      max_restarts: 10,
      env: {
        NODE_ENV: 'development',
        PORT: '3001',
        NODE_OPTIONS: '--max_old_space_size=2048',
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
