# Production Deployment Checklist

This checklist ensures your LitRevTool deployment at https://litrev.haielab.org is properly configured.

## ✅ Pre-Deployment Checklist

### 1. Environment Configuration
- [x] `.env` file created with production values
- [x] Google OAuth Client ID configured
- [x] Google OAuth Client Secret configured
- [x] Strong SECRET_KEY configured
- [x] Production FRONTEND_URL set (https://litrev.haielab.org)
- [x] Email SMTP configured (hello@haielab.org)
- [x] Gemini API key configured

### 2. Google OAuth Setup
Verify these redirect URIs are configured in Google Cloud Console:
- [ ] `https://litrev.haielab.org/api/v1/auth/google/callback`
- [ ] `https://litrev.haielab.org`

**How to verify:**
1. Go to https://console.cloud.google.com/apis/credentials
2. Click on your OAuth 2.0 Client ID
3. Under "Authorized redirect URIs", ensure both URLs above are listed

### 3. Server Prerequisites
- [ ] Python 3.8+ installed: `python3 --version`
- [ ] Node.js 16+ installed: `node --version`
- [ ] Redis installed and running: `redis-cli ping` (should return PONG)
- [ ] PM2 installed: `pm2 --version`
- [ ] Google Chrome installed (for scraper): `google-chrome --version`

### 4. Nginx Configuration
- [ ] Nginx installed and running
- [ ] SSL certificate configured (Let's Encrypt)
- [ ] Proxy configuration for frontend (→ localhost:3001)
- [ ] Proxy configuration for backend API (→ localhost:8000)

**Example Nginx configuration:**
```nginx
server {
    listen 80;
    server_name litrev.haielab.org;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name litrev.haielab.org;

    ssl_certificate /etc/letsencrypt/live/litrev.haielab.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/litrev.haielab.org/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:8000/health;
    }
}
```

## 🚀 Deployment Steps

### Step 1: Deploy the Application
```bash
cd /home/ubuntu/litrevtool
npm run deploy
```

This will:
- Check all prerequisites
- Install Python dependencies
- Install Node.js dependencies
- Initialize SQLite database
- Start all services with PM2
- Run health checks

### Step 2: Verify Services
```bash
npm run status
```

You should see three services running:
- litrev-backend (online)
- litrev-celery (online)
- litrev-frontend (online)

### Step 3: Check Logs
```bash
npm run logs
```

Look for:
- Backend: "Uvicorn running on http://0.0.0.0:8000"
- Frontend: "webpack compiled successfully"
- Celery: "celery@hostname ready"

### Step 4: Test Local Endpoints
```bash
# Backend health check
curl http://localhost:8000/health

# Backend API docs
curl http://localhost:8000/docs

# Frontend
curl http://localhost:3001
```

### Step 5: Test Production URLs
```bash
# Frontend (via nginx)
curl https://litrev.haielab.org

# Backend API (via nginx)
curl https://litrev.haielab.org/api/v1/

# Health check
curl https://litrev.haielab.org/health
```

### Step 6: Test Google OAuth Login
1. Open https://litrev.haielab.org in your browser
2. Click "Sign in with Google"
3. Should redirect to Google login
4. After authorization, should redirect back to dashboard

## ⚙️ Post-Deployment Configuration

### Configure PM2 Auto-Start on System Boot
```bash
# Save current PM2 processes
pm2 save

# Generate startup script
sudo pm2 startup

# Follow the command displayed (usually something like):
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

### Set Up Database Backups
Create backup script `/home/ubuntu/backup-litrevtool.sh`:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p $BACKUP_DIR

# Backup database
cp /home/ubuntu/litrevtool/backend/litrevtool.db \
   $BACKUP_DIR/litrevtool_$DATE.db

# Backup .env
cp /home/ubuntu/litrevtool/.env \
   $BACKUP_DIR/env_$DATE.txt

# Keep only last 30 days
find $BACKUP_DIR -name "litrevtool_*.db" -mtime +30 -delete
find $BACKUP_DIR -name "env_*.txt" -mtime +30 -delete

echo "Backup completed: litrevtool_$DATE.db"
```

Make executable and add to cron:
```bash
chmod +x /home/ubuntu/backup-litrevtool.sh

# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /home/ubuntu/backup-litrevtool.sh >> /home/ubuntu/backup.log 2>&1
```

### Set Up Log Rotation
Create `/etc/logrotate.d/litrevtool`:
```
/home/ubuntu/litrevtool/backend/logs/*.log
/home/ubuntu/litrevtool/frontend/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 ubuntu ubuntu
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### Configure Firewall
```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Redis should only be accessible locally (default)
# Verify: sudo ufw status
```

## 🔍 Monitoring

### Health Checks
Set up monitoring for:
- https://litrev.haielab.org/health (should return 200)
- PM2 service status: `pm2 status`

### Resource Monitoring
```bash
# Check system resources
npm run monitor

# PM2 monitoring dashboard
npm run monit
```

### Email Alerts
Consider setting up monitoring alerts for:
- Service downtime
- High CPU/memory usage
- Disk space warnings
- Failed scraping jobs

## 🐛 Troubleshooting

### Services won't start
```bash
# Check logs
npm run logs

# Full system reset
npm run reset

# Check prerequisites
python3 --version
node --version
redis-cli ping
```

### Google OAuth not working
1. Verify redirect URIs in Google Console
2. Check `.env` file has correct credentials
3. Ensure HTTPS is working
4. Check browser console for errors

### CORS errors
1. Verify FRONTEND_URL in `.env` matches your domain
2. Check nginx is proxying correctly
3. Restart backend: `pm2 restart litrev-backend`

### Database errors
```bash
# Backup current database
cp backend/litrevtool.db backend/litrevtool.db.backup

# Reinitialize database
npm run setup:db
```

### Email notifications not working
1. Verify SMTP credentials in `.env`
2. Check if Gmail requires App Password
3. Test SMTP connection: `telnet smtp.gmail.com 587`

## 📊 Performance Tuning

### Scale Celery Workers
Edit `ecosystem.config.js`:
```javascript
args: '-A app.tasks.celery_app worker --loglevel=info --concurrency=4',
```

Then restart:
```bash
pm2 restart litrev-celery
```

### Increase Memory Limits
Edit `ecosystem.config.js`:
```javascript
max_memory_restart: '1G',  // Increase as needed
```

### Optimize Database
```bash
cd backend
source venv/bin/activate
python3 -c "import sqlite3; conn = sqlite3.connect('litrevtool.db'); conn.execute('VACUUM'); conn.close()"
```

## 🔐 Security Checklist

- [x] Strong SECRET_KEY configured
- [ ] Firewall configured (only ports 80/443 open)
- [ ] SSL/TLS certificate installed and valid
- [ ] Regular security updates: `sudo apt update && sudo apt upgrade`
- [ ] Database backups configured
- [ ] Log monitoring in place
- [ ] Rate limiting configured (if needed)
- [ ] SMTP password secured (use App Password, not account password)

## 📝 Maintenance Schedule

### Daily
- Check service status: `npm run status`
- Review error logs: `npm run logs | grep ERROR`

### Weekly
- Review system resources: `npm run monitor`
- Check disk space: `df -h`
- Verify backups exist: `ls -lh /home/ubuntu/backups/`

### Monthly
- Update dependencies (if needed)
- Review and rotate logs
- Test disaster recovery procedure
- Security updates: `sudo apt update && sudo apt upgrade`

## 🎯 Success Criteria

Your deployment is successful when:
- ✅ All three PM2 services are running
- ✅ https://litrev.haielab.org loads successfully
- ✅ Google OAuth login works
- ✅ You can create and run a test search
- ✅ Papers are collected and downloadable as CSV
- ✅ Email notifications are received (if configured)
- ✅ Services auto-restart after server reboot

## 📞 Support

If you encounter issues:
1. Check logs: `npm run logs`
2. Review this checklist
3. Consult documentation in `docs/` folder
4. Check GitHub issues

---

**Last Updated:** Production deployment for https://litrev.haielab.org
**Configuration File:** `.env` (contains sensitive data - never commit to git)
