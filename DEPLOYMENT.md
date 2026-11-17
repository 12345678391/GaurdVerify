# AutoGuard Enterprise — Production Deployment & Security Guide

**Platform:** AutoGuard Guard Shift & Verification System  
**Repository Path:** `C:\GuardVerify`  
**Runtime:** Node.js (Express), React (SPA), MongoDB  

---

## 1. System Architecture Overview

AutoGuard is a multi-company security operations platform supporting single-entry authentication, company-level data isolation, automated shift management, guard tracking, and telephony verification (via Plivo).

```
                      Internet / Client Devices
                                │
                                ▼
                   ┌─────────────────────────┐
                   │  Reverse Proxy (Nginx)  │  <-- SSL/TLS Termination (443)
                   └────────────┬────────────┘
                                │ HTTP (Internal Loopback)
            ┌───────────────────┴───────────────────┐
            ▼                                       ▼
 ┌──────────────────────┐                ┌──────────────────────┐
 │ React Web Client     │                │ Express Backend API  │
 │ (Static / Port 3000) │                │ (Port 5000)          │
 └──────────────────────┘                └──────────┬───────────┘
                                                    │
                                                    ▼
                                         ┌──────────────────────┐
                                         │   MongoDB Database   │
                                         │ (127.0.0.1:27017)    │
                                         └──────────────────────┘
```

---

## 2. Environment Configuration

All backend environment settings are loaded from `server/.env`. A complete configuration template is provided in `server/.env.example`.

### Core Environment Variables

| Variable | Description | Example / Recommended Value |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment mode | `production` |
| `PORT` | Backend listening port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/guardconnect` |
| `JWT_SECRET` | Cryptographic secret for signing tokens | High-entropy 64+ char random string |
| `ALLOWED_ORIGINS` | Comma-separated trusted web origins | `https://autoguard.yourdomain.com` |
| `TRUST_PROXY` | Reverse proxy hop count or CIDR | `1` or `loopback` |
| `ENABLE_HSTS` | Enable HTTP Strict Transport Security | `true` (only with valid SSL) |
| `ENABLE_DAILY_BACKUP` | Internal automated backup scheduler | `true` |
| `BACKUP_DIR` | Local directory for database snapshots | `C:\GuardVerify\backups` |
| `BACKUP_RETENTION_DAYS`| Retention window for automated snapshots | `7` |

> [!CAUTION]
> Never commit production secrets (such as `JWT_SECRET` or Plivo credentials) to version control. Maintain distinct secrets across development, staging, and production environments.

---

## 3. Production CORS Configuration

The backend implements an origin-validation policy in `server/server.js`:
- In **development** mode, local development origins (`http://localhost:3000`, `http://127.0.0.1:3000`, etc.) are permitted.
- In **production** mode, only origins specified in the `ALLOWED_ORIGINS` environment variable are permitted.
- Credentials (`Access-Control-Allow-Credentials: true`) are supported for secure cookie/header exchange.
- Unauthorized cross-origin requests are rejected with `HTTP 403 Forbidden`.

### Configuring Trusted Origins

In `server/.env`:
```ini
NODE_ENV=production
ALLOWED_ORIGINS=https://app.yourdomain.com,https://admin.yourdomain.com
```

---

## 4. HTTPS / SSL Deployment (Reverse Proxy)

The Express backend is engineered to run behind a secure reverse proxy (such as Nginx, Caddy, or AWS ALB) that terminates SSL/TLS.

### Trust Proxy & Security Headers
- `trust proxy` is configured via `TRUST_PROXY` (defaulting to `1` hop in production).
- Security headers are automatically enforced:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `X-XSS-Protection: 1; mode=block`
- HSTS (`Strict-Transport-Security: max-age=31536000; includeSubDomains`) is conditionally emitted **only** when incoming traffic is confirmed HTTPS (`req.secure` or `X-Forwarded-Proto: https`) and `ENABLE_HSTS=true`.

### Sample Nginx Configuration (`/etc/nginx/sites-available/autoguard.conf`)

```nginx
# HTTP - Redirect all traffic to HTTPS
server {
    listen 80;
    server_name app.yourdomain.com;
    return 301 https://$host$request_uri;
}

# HTTPS - Terminate SSL and reverse proxy to AutoGuard
server {
    listen 443 ssl http2;
    server_name app.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/app.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Static Frontend Assets
    location / {
        root /var/www/autoguard/client/build;
        try_files $uri $uri/ /index.html;
    }

    # Backend API Endpoints
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL Certificate Renewal (Certbot)
To issue and automatically renew free Let's Encrypt certificates:
```bash
sudo certbot --nginx -d app.yourdomain.com
sudo certbot renew --dry-run
```

---

## 5. MongoDB Automated Backup & Disaster Recovery

AutoGuard includes a built-in, native MongoDB driver backup engine in `server/services/backupService.js`. It performs atomic, non-blocking snapshots without requiring external command-line utilities.

### 1. Automated Daily Backups
When `ENABLE_DAILY_BACKUP=true` in `server/.env`, the scheduler automatically runs every day at 02:00 AM server time. Old backups older than `BACKUP_RETENTION_DAYS` (default: 7 days) are automatically pruned.

### 2. Manual Backup (On-Demand CLI)
To generate an immediate database snapshot:
```powershell
node server/scripts/backupDatabase.js
```
Snapshots are written to `C:\GuardVerify\backups\backup-<ISO-TIMESTAMP>` with:
- JSON collection exports (`users.json`, `companies.json`, `guards.json`, etc.)
- A verification manifest (`manifest.json`) containing record counts and document metrics.

### 3. Safe Database Restoration
To restore a snapshot into an environment:
```powershell
# Restore into an isolated verification/staging database (Recommended)
node server/scripts/restoreDatabase.js --dir "C:\GuardVerify\backups\backup-2026-11-17T04-43-02-525Z" --target-db "guardconnect_restore_test"

# Restore directly into production database (CAUTION: Replaces target collection records)
node server/scripts/restoreDatabase.js --dir "C:\GuardVerify\backups\backup-2026-11-17T04-43-02-525Z" --target-db "guardconnect"
```

---

## 6. Starting & Managing the Production Services

### Step 1: Build the React Frontend
```powershell
cd C:\GuardVerify\client
npm run build
```

### Step 2: Start the Backend Service
Using PM2 for process monitoring and automatic restarts:
```powershell
# Install PM2 globally if not present
npm install -g pm2

# Start the server process
cd C:\GuardVerify
pm2 start server/server.js --name "autoguard-api"

# Configure PM2 to restart on system boot
pm2 startup
pm2 save
```

Alternatively, direct Node.js startup:
```powershell
node server/server.js
```

---

## 7. Multi-Company Security Architecture

AutoGuard enforces strict tenant isolation:
- **Single Common Login:** Authenticates all roles through `/login`. Users are routed based on role (`super_admin` to Platform Dashboard; `company_owner` / `company_admin` to Company Workspace).
- **Server-Derived Identity:** In `server/middleware/auth.js`, user tokens bind the authenticated `companyId`. Controllers query strictly using `req.user.companyId`.
- **Parameter Override Immunity:** Query parameters or payload fields attempting to inject an alternate `companyId` are stripped and rejected.
- **Cross-Tenant Guarding:** Access to resources belonging to another company returns `HTTP 404` or `HTTP 403 Forbidden`.
- **Platform Authorization:** Company Management APIs (`/api/companies/*`) strictly enforce `super_admin` authorization.

---

## 8. Pre-Flight Production Checklist

Before opening the platform to end users, verify the following:

- [x] Environment variable `NODE_ENV` set to `production`.
- [x] High-entropy `JWT_SECRET` generated and configured.
- [x] `ALLOWED_ORIGINS` restricted to verified production domains.
- [x] Reverse proxy configured for HTTPS with valid SSL certificates.
- [x] HSTS enabled (`ENABLE_HSTS=true`) after SSL is operational.
- [x] Daily automated backups active (`ENABLE_DAILY_BACKUP=true`).
- [x] Automated regression suite passes with 100% compliance (`node server/scripts/testMultiCompanyWorkflow.js`).
- [x] Production client bundle built (`npm run build --prefix client`).
