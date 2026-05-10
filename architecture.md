# dply – Architecture & Tech Design

## 1. High Level Overview

dply ek Node.js CLI tool hai jo local machine se VPS par SSH connection establish karta hai aur remote commands execute karta hai. Koi server-side component nahi hai – sab kuch CLI se directly SSH ke through hota hai.

**Data Flow (Deploy Command):**
Local CLI -> SSH -> Remote VPS (Ubuntu)
              |
              -> Install Node.js (if missing)
              -> Install PM2 & Nginx (if missing)
              -> Rsync project files to /var/www/<app>
              -> npm ci --production
              -> pm2 start/restart
              -> Generate Nginx config
              -> Obtain SSL cert (certbot)
              -> Reload Nginx

## 2. Technology Stack

| Component | Technology | Reason |
|-----------|------------|--------|
| Runtime | Node.js (v18+) | Cross-platform, good SSH libraries |
| Language | TypeScript | Type safety, better IDE support |
| CLI Framework | Commander.js | Simple, widely used |
| SSH Client | ssh2 | Pure JS, no native deps |
| File Transfer | ssh2-sftp-client | Rsync alternative via SFTP |
| Logging | Chalk + Ora | Colored output + spinners |
| Config Storage | fs + ~/.dply/config.json | Simple JSON, no DB |
| Remote Process Mgmt | PM2 (installed on VPS) | Auto-start, logs, restart |
| Web Server | Nginx (on VPS) | Reverse proxy, SSL termination |
| SSL | Certbot (Let's Encrypt) | Free certificates, auto-renewal |

## 3. Module Architecture

dply-cli/
├── src/
│   ├── cli.ts              # Commander entry point
│   ├── commands/
│   │   ├── init.ts         # Setup config, test SSH
│   │   ├── deploy.ts       # Main deploy logic
│   │   ├── logs.ts         # Stream remote logs
│   │   ├── restart.ts      # PM2 restart
│   │   ├── status.ts       # Check app status
│   │   └── destroy.ts      # Remove everything
│   ├── core/
│   │   ├── ssh.ts          # Establish connection, exec commands
│   │   ├── config.ts       # Read/write ~/.dply/config.json
│   │   ├── deployEngine.ts # Orchestrate deploy steps
│   │   ├── nginx.ts        # Generate nginx config
│   │   └── ssl.ts          # Certbot commands
│   └── utils/
│       ├── logger.ts       # Pretty console output
│       └── errors.ts       # Custom error classes
├── templates/
│   └── nginx-site.conf     # Nginx config template
├── tests/                  # Jest tests
├── package.json
├── tsconfig.json
└── README.md

## 4. Core Data Structures (Config)

**~/.dply/config.json** – created by `dply init`:
{
  "vpsIp": "123.123.123.123",
  "sshKeyPath": "C:/Users/name/.ssh/id_rsa",
  "domain": "myapp.example.com",
  "appName": "myapp",
  "email": "user@example.com"
}

**~/.dply/deploy-state.json** (optional, for rollback):
{
  "currentDeployId": "2025-05-10T10:00:00Z",
  "previousVersionPath": "/var/www/myapp_prev"
}

## 5. Deployment Sequence (Detailed)

1. Validation – Check config exists, SSH key readable, VPS reachable.
2. Pre-deploy – Connect via SSH, run `node -v`, install Node 20.x if missing. Install PM2 (`npm i -g pm2`) and Nginx (`apt install nginx`).
3. Prepare remote dir – Create `/var/www/<appName>`.
4. Transfer files – Use rsync (via SSH) or SFTP to upload all files except node_modules, .git, .env.
5. Install dependencies – `cd /var/www/<appName> && npm ci --production`.
6. Start/Restart PM2 – `pm2 start ecosystem.config.js` or `pm2 restart <appName>` (with `--update-env`).
7. Save PM2 startup – `pm2 save && pm2 startup systemd`.
8. Configure Nginx – Write config file from template to `/etc/nginx/sites-available/<appName>` and symlink to `sites-enabled`. Test config (`nginx -t`).
9. Obtain SSL – If domain provided, run `certbot --nginx -d <domain> --non-interactive --agree-tos -m <email>`.
10. Reload Nginx – `systemctl reload nginx`.
11. Verify – `curl -I http://localhost` or HTTPS equivalent. Print success URL.

## 6. Error Handling Strategy

- Each SSH command has timeout (30s) and retry (max 2).
- If any step fails, rollback: revert to previous version (if exists) or remove partial files.
- Log error with step name and command output.
- Exit codes: 0=success, 1=config error, 2=SSH error, 3=deploy failed, 4=SSL error.

## 7. Security Considerations

- SSH keys stored in plaintext locally (user's machine). No cloud, no server.
- Commands never log sensitive data (keys, passwords).
- Certbot email stored only in config – used for SSL registration.
- Nginx config does not expose source code.

## 8. Performance Goals

- Initial deploy: <3 minutes (including Node/PM2 install).
- Subsequent deploys: <30 seconds.
- Logs: Real-time streaming with <500ms latency.

## 9. Assumptions & Limitations

- VPS must be Ubuntu 22.04 LTS (or 20.04).
- User has root/sudo access without password.
- SSH default port 22.
- App must have a `package.json` with a `start` script.
- For static sites, special handling (not in MVP) – future.

## 10. Future Extensibility Points (Phase 2+)

- Support for Docker deployment.
- Multiple environments (staging/prod).
- Custom build commands (`npm run build`).
- Environment variables.
- Web dashboard.