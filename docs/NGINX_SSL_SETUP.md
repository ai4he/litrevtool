# Nginx & SSL Configuration Summary

## ✅ Setup Complete

Your Nginx reverse proxy with SSL/HTTPS has been successfully configured for **litrev.haielab.org**.

## Configuration Details

### Nginx Installation
- **Version**: nginx/1.24.0 (Ubuntu)
- **Status**: Active and running
- **Autostart**: Enabled on system boot

### SSL Certificate
- **Provider**: Let's Encrypt
- **Domain**: litrev.haielab.org
- **Expiry Date**: 2026-02-04 (89 days from now)
- **Certificate Type**: ECDSA
- **Auto-renewal**: ✅ Enabled (certbot.timer)
- **Certificate Path**: `/etc/letsencrypt/live/litrev.haielab.org/fullchain.pem`
- **Private Key Path**: `/etc/letsencrypt/live/litrev.haielab.org/privkey.pem`

### Reverse Proxy Configuration

#### HTTP (Port 80)
- Automatically redirects to HTTPS

#### HTTPS (Port 443)
All traffic is served over secure HTTPS connection.

**Backend API Endpoints:**
- `/api/*` → http://localhost:8000
- `/health` → http://localhost:8000/health
- `/docs` → http://localhost:8000/docs
- `/redoc` → http://localhost:8000/redoc
- `/openapi.json` → http://localhost:8000/openapi.json

**Frontend:**
- `/` (all other paths) → http://localhost:3001

### Configuration Files

**Main Config:** `/etc/nginx/sites-enabled/litrev.haielab.org`

Key features:
- HTTPS on port 443
- HTTP to HTTPS redirect
- WebSocket support for React hot reload
- 100MB max upload size
- 5-minute timeouts for long-running operations
- Proper headers for proxying (X-Real-IP, X-Forwarded-For, etc.)

## Testing the Setup

### Test HTTPS Connection
```bash
curl -I https://litrev.haielab.org
```

Expected: `HTTP/1.1 502 Bad Gateway` (until application is deployed)

### Test Certificate
```bash
openssl s_client -connect litrev.haielab.org:443 -servername litrev.haielab.org < /dev/null 2>/dev/null | openssl x509 -noout -dates
```

### Check Nginx Status
```bash
sudo systemctl status nginx
```

### Check Certificate Details
```bash
sudo certbot certificates
```

### Test Nginx Configuration
```bash
sudo nginx -t
```

## Automatic Certificate Renewal

Let's Encrypt certificates expire after 90 days. Certbot has automatically configured renewal:

### Check Renewal Timer
```bash
sudo systemctl status certbot.timer
```

### Test Renewal (dry run)
```bash
sudo certbot renew --dry-run
```

The timer runs twice daily and will automatically renew certificates within 30 days of expiration.

## Logs

### Nginx Logs
- **Access log**: `/var/log/nginx/litrev.access.log`
- **Error log**: `/var/log/nginx/litrev.error.log`

View recent logs:
```bash
# Access log
sudo tail -f /var/log/nginx/litrev.access.log

# Error log
sudo tail -f /var/log/nginx/litrev.error.log
```

### Certbot Logs
- **Log file**: `/var/log/letsencrypt/letsencrypt.log`

View:
```bash
sudo tail -f /var/log/letsencrypt/letsencrypt.log
```

## Common Commands

### Reload Nginx (after config changes)
```bash
sudo nginx -t                    # Test configuration first
sudo systemctl reload nginx      # Reload if test passes
```

### Restart Nginx
```bash
sudo systemctl restart nginx
```

### Stop Nginx
```bash
sudo systemctl stop nginx
```

### Start Nginx
```bash
sudo systemctl start nginx
```

### Renew Certificate Manually
```bash
sudo certbot renew
```

### Expand Certificate (add more domains)
```bash
sudo certbot --nginx -d litrev.haielab.org -d www.litrev.haielab.org
```

## Firewall Configuration

If using UFW firewall:
```bash
# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'

# Or individually
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

## Security Features

The SSL configuration includes modern security best practices:
- ✅ TLS 1.2 and 1.3 only
- ✅ Strong cipher suites
- ✅ DH parameters for forward secrecy
- ✅ OCSP stapling
- ✅ HTTP Strict Transport Security (HSTS) ready

Configuration managed by: `/etc/letsencrypt/options-ssl-nginx.conf`

## Troubleshooting

### 502 Bad Gateway Error
This is normal until the application services are running. Deploy the application:
```bash
cd /home/ubuntu/litrevtool
npm run deploy
```

### Certificate Renewal Failed
Check logs and test renewal:
```bash
sudo tail -50 /var/log/letsencrypt/letsencrypt.log
sudo certbot renew --dry-run
```

### Nginx Won't Start
```bash
# Check configuration
sudo nginx -t

# Check for port conflicts
sudo lsof -i :80
sudo lsof -i :443

# View error logs
sudo journalctl -u nginx -n 50
```

### Check Domain DNS
```bash
host litrev.haielab.org
dig litrev.haielab.org
```

Should point to: **3.90.109.217**

## SSL Certificate Information

### View Certificate Details
```bash
# From Let's Encrypt files
sudo openssl x509 -in /etc/letsencrypt/live/litrev.haielab.org/fullchain.pem -text -noout

# From running server
echo | openssl s_client -connect litrev.haielab.org:443 2>/dev/null | openssl x509 -noout -text
```

### Check Certificate Expiry
```bash
sudo certbot certificates | grep "Expiry Date"
```

## Production Checklist

- [x] Nginx installed and running
- [x] SSL certificate generated
- [x] HTTPS enabled on port 443
- [x] HTTP to HTTPS redirect configured
- [x] Reverse proxy to backend (port 8000)
- [x] Reverse proxy to frontend (port 3001)
- [x] Auto-renewal configured
- [ ] Application deployed (run `npm run deploy`)
- [ ] Test end-to-end: https://litrev.haielab.org
- [ ] Verify Google OAuth login works with HTTPS
- [ ] Monitor logs for any issues

## Next Steps

1. **Deploy the Application**
   ```bash
   cd /home/ubuntu/litrevtool
   npm run deploy
   ```

2. **Verify Everything Works**
   - Visit https://litrev.haielab.org
   - Test Google OAuth login
   - Create a test search
   - Check both access and error logs

3. **Set Up Monitoring** (Optional)
   - Configure alerts for certificate expiry (though auto-renewal is enabled)
   - Monitor Nginx access/error logs
   - Set up uptime monitoring

4. **Regular Maintenance**
   - Nginx logs are automatically rotated
   - Certificates auto-renew
   - Keep system packages updated: `sudo apt update && sudo apt upgrade`

## Support

### Configuration Files
- Nginx config: `/etc/nginx/sites-enabled/litrev.haielab.org`
- SSL options: `/etc/letsencrypt/options-ssl-nginx.conf`
- Certificate files: `/etc/letsencrypt/live/litrev.haielab.org/`

### Useful Resources
- Nginx docs: https://nginx.org/en/docs/
- Let's Encrypt docs: https://letsencrypt.org/docs/
- Certbot docs: https://certbot.eff.org/docs/

---

**Setup Date**: 2025-11-06
**Domain**: litrev.haielab.org
**Server IP**: 3.90.109.217
**SSL Provider**: Let's Encrypt (Valid until 2026-02-04)
