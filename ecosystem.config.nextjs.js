/**
 * PM2 Ecosystem Configuration for LitRevTool with Next.js
 * This configuration manages the Node.js backend, BullMQ worker, and Next.js frontend
 */

module.exports = {
  apps: [
    // 1. Node.js Backend API Server
    {
      name: 'litrev-backend',
      cwd: './backend-node',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 8000,
      },
      error_file: './backend-node/logs/pm2-error.log',
      out_file: './backend-node/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },

    // 2. BullMQ Worker for Background Scraping
    {
      name: 'litrev-worker',
      cwd: './backend-node',
      script: 'dist/tasks/worker.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './backend-node/logs/worker-error.log',
      out_file: './backend-node/logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },

    // 3. Next.js Frontend (SSR)
    {
      name: 'litrev-frontend',
      cwd: './frontend-nextjs',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      instances: 1,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: './frontend-nextjs/logs/pm2-error.log',
      out_file: './frontend-nextjs/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
