# dply – One-Command Deploy CLI
## Requirements Document v1.0

### 1. Problem Statement
A Node.js developer knows how to code but doesn’t want to learn server administration, Nginx, SSL, PM2, or Docker. He wants to deploy his app on a cheap VPS (₹500-1000/month) with a single command.

### 2. User Persona
- **Name**: Rohan
- **Skill**: React / Node.js developer (3 years experience)
- **Server knowledge**: Zero (doesn't know what is Nginx, reverse proxy, Let's Encrypt)
- **Goal**: Deploy a working Node.js app (e.g., Express, Next.js) on his own VPS, accessible via `https://hisdomain.com`

### 3. Core Commands (MVP)

| Command | Description |
|---------|-------------|
| `npx dply init` | Interactive setup: asks VPS IP, SSH key path, domain name (optional). Saves config to `~/.dply/config.json` |
| `npx dply deploy` | Reads config, SSH into VPS, installs Node.js/PM2/Nginx if missing, uploads current folder code, starts app with PM2, configures Nginx reverse proxy, obtains SSL certificate (if domain provided) |
| `npx dply logs` | Streams `pm2 logs` from remote VPS to local terminal |
| `npx dply restart` | Runs `pm2 restart <app>` on VPS |
| `npx dply status` | Shows PM2 status, Nginx site status, SSL expiry date |
| `npx dply destroy` | Removes app, Nginx config, SSL cert, stops PM2 process (prompts for confirmation) |

### 4. Workflow (User Journey)
1. User buys a VPS (Ubuntu 22.04) from DigitalOcean / Linode / AWS Lightsayt.
2. User sets up SSH key and notes the IP address.
3. User runs `npx dply init` and answers questions (IP, SSH key path, domain).
4. User goes to his project folder (where `package.json` exists) and runs `npx dply deploy`.
5. After 2-3 minutes, his app is live at `http://<IP>` or `https://<domain>`.
6. User can run `dply logs` to see realtime output.

### 5. Technical Assumptions (Server side)
- Target server OS: Ubuntu 22.04 LTS (fresh install)
- Architecture: x86_64 (AMD64)
- User has root access (or sudo without password)
- SSH key already added to VPS (user's responsibility)
- Node.js version: 18.x or 20.x (auto-installed if missing)
- Domain (optional) must be pointed to VPS IP before SSL step

### 6. Success Criteria (Must Have)
- ✅ Fresh VPS – from zero to deployed app in under 5 minutes (manual time).
- ✅ App runs on port 80 (HTTP) and 443 (HTTPS) if domain provided.
- ✅ After VPS reboot, app restarts automatically (PM2 save + startup).
- ✅ Failed deployment does not break existing running app (safe rollback).
- ✅ All commands work on Windows, Mac, Linux (local machine).

### 7. Out of Scope (for MVP)
- Docker / Kubernetes support
- Custom build commands (e.g., `npm run build` automatically detected)
- Multiple environment support (staging/production)
- Team collaboration features
- Web dashboard

### 8. Edge Cases to Handle
- SSH connection timeout
- Invalid private key (wrong path / permissions)
- Port 80/443 already in use by another process
- Domain not resolvable (DNS not pointed)
- Let's Encrypt rate limiting
- User forgot to `npm install` locally (we will run `npm ci` on server)
- App crashes immediately after start (detect and rollback)