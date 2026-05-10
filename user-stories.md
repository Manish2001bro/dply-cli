# dply – User Stories with Acceptance Criteria

## Story 1: Initialize Configuration (Happy Path)
**As a** Node.js developer who just bought a VPS,  
**I want** to run `npx dply init` and answer a few questions (IP, SSH key path, domain),  
**so that** my configuration is saved and I don’t have to type it again.

**Acceptance Criteria:**
- Command creates `~/.dply/config.json` with valid JSON.
- Config includes: `vpsIp`, `sshKeyPath`, `domain` (empty if not provided), `appName` (defaults to folder name).
- If file already exists, asks “Overwrite? (y/n)”.
- Validates SSH key exists locally before saving.
- Validates IP format (basic regex).

---

## Story 2: Deploy App – First Time (Happy Path)
**As a** developer with a working Node.js app,  
**I want** to run `npx dply deploy` in my project folder,  
**so that** my app gets deployed to the VPS and becomes accessible via HTTP/HTTPS without me manually configuring Nginx or SSL.

**Acceptance Criteria:**
- Connects to VPS via SSH using saved config.
- Installs Node.js 20.x if not present.
- Installs PM2 and Nginx if not present.
- Uploads project folder (excluding node_modules, .git) to `/var/www/<appName>`.
- Runs `npm ci --production`.
- Starts app with PM2 (name = appName).
- Creates Nginx config routing traffic to app port.
- Obtains SSL cert via Let's Encrypt if domain provided.
- Prints “Deployment successful! App live at http://<IP or domain>” at the end.

---

## Story 3: Deploy App – Subsequent Deployments (Update)
**As a** developer who made code changes,  
**I want** to run `dply deploy` again,  
**so that** the new version replaces the old one with zero downtime.

**Acceptance Criteria:**
- Pulls latest code (or rsync) to same folder.
- Runs `npm ci` again.
- Restarts PM2 gracefully (`pm2 reload`).
- If deployment fails, rolls back to previous version.
- Old logs are preserved under `pm2 logs`.

---

## Story 4: View Live Logs
**As a** developer debugging a runtime error,  
**I want** to run `dply logs`,  
**so that** I can see real-time stdout/stderr from my app on the VPS.

**Acceptance Criteria:**
- Runs `pm2 logs <appName> --lines 100` on remote.
- Streams output to local terminal.
- Exits with Ctrl+C without killing the app.

---

## Story 5: Restart App Remotely
**As a** developer who changed environment variables,  
**I want** to run `dply restart`,  
**so that** the app restarts without me SSH-ing into the server.

**Acceptance Criteria:**
- Runs `pm2 restart <appName>` on VPS.
- Shows “App restarted successfully” message.
- If app is not running, starts it.

---

## Story 6: Check Status
**As a** developer who forgets if the app is running or SSL is valid,  
**I want** to run `dply status`,  
**so that** I get a summary of PM2 status, Nginx site status, and SSL expiry.

**Acceptance Criteria:**
- Output includes:
  - PM2: online/stopped/errored, uptime.
  - Nginx config: loaded/not loaded.
  - SSL: expiry date (if domain set) or “No SSL”.
- Exits with non-zero code if app is not running.

---

## Story 7: Destroy Deployment (Cleanup)
**As a** developer who no longer needs the app,  
**I want** to run `dply destroy`,  
**so that** everything (files, PM2 process, Nginx & SSL config) is removed from VPS.

**Acceptance Criteria:**
- Prompts “Are you sure? Type app name to confirm: ”.
- Stops PM2 process and removes from pm2 list.
- Removes `/var/www/<appName>` folder.
- Removes Nginx site file from `sites-available` and `sites-enabled`.
- Removes SSL cert files (if any).
- Prints “App completely removed”.

---

## Story 8: Edge Case – SSH Connection Failure
**As a** user with wrong IP or broken network,  
**I want** `dply deploy` to fail gracefully with a clear error message,  
**so that** I know it’s a connection issue and not my app.

**Acceptance Criteria:**
- After 10 seconds timeout, prints “SSH connection failed. Check IP and firewall.”
- Does not modify any files on VPS.
- Exits with code 1.

---

## Story 9: Edge Case – Missing SSH Key or Permission Denied
**As a** user who provided wrong key path or wrong permissions,  
**I want** to see a specific error message,  
**so that** I can fix the key.

**Acceptance Criteria:**
- If key file not found: “SSH key not found at path: /path/to/key”.
- If permission denied on VPS: “Permission denied. Ensure your key is added to root authorized_keys and you have root/sudo access.”
- Exits with code 1.

---

## Story 10: Edge Case – Port 80/443 Already Used
**As a** user whose VPS already runs another web server (e.g., Apache),  
**I want** deployment to fail with instruction to free the port,  
**so that** I don’t accidentally break existing services.

**Acceptance Criteria:**
- Before configuring Nginx, checks if ports 80/443 are in use by another process.
- If yes, prints “Port 80/443 already in use. Stop other web server first.”
- Deployment aborts.

---

## Story 11: Edge Case – Domain Not Resolving
**As a** user who provided a domain but forgot to point DNS to VPS IP,  
**I want** SSL issuance to fail gracefully,  
**so that** I can go update DNS and retry.

**Acceptance Criteria:**
- Before calling Let’s Encrypt, performs DNS lookup.
- If domain does not resolve to VPS IP, prints “Domain does not point to this server. Fix DNS and run `dply deploy --ssl-only`.”
- Continues with HTTP deployment only.

---

## Story 12: Edge Case – App Crashes Immediately on Start
**As a** user whose code has a syntax error,  
**I want** the deploy command to detect that PM2 started and then crashed,  
**so that** the old version remains running and I get the error log.

**Acceptance Criteria:**
- After PM2 start, waits 5 seconds and checks `pm2 show <appName>` for status.
- If status is “errored”, prints last 20 lines of error log.
- Automatically runs `pm2 restart` on previous version (if any) to roll back.
- Exits with code 1.