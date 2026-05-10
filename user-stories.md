
---

## User Stories for `dply` CLI (with Acceptance Criteria)

### 1. Initialisation & Setup
**US‑1**  
As a developer, I want to run `dply init` on a fresh Ubuntu/Debian VPS so that Docker, Traefik, and the control plane are installed automatically.  
*Acceptance Criteria*  
- Given a VPS with only SSH access (no Docker/Node), when I execute `dply init --vps-ip <IP> --ssh-key <path>`, then Docker Engine, Traefik container, and the platform backend are installed and running.  
- Edge case: If Docker is already present, the script skips installation and validates the version.  
- Edge case: If the OS is not Ubuntu 20.04+ or Debian 11+, the command aborts with a clear message.

**US‑2**  
As a developer, I want to run `dply login` so that my VPS credentials (SSH key or API token) and user email for Let’s Encrypt are stored securely.  
*Acceptance Criteria*  
- Given I have SSH access to my VPS, when I run `dply login`, I am prompted for VPS IP, SSH private key path (or password), and an email for SSL certificates. These are stored encrypted in `~/.dply/config.json`.  
- Edge case: If the SSH connection fails (wrong IP, firewall), retry 3 times with exponential backoff, then offer to re‑enter or show troubleshooting steps.  
- Edge case: If the configuration file already exists, the command warns before overwriting.

**US‑3**  
As a developer, I want to run `dply setup` so that I can define global defaults like resource limits for builds.  
*Acceptance Criteria*  
- Given that `dply login` has been completed, when I run `dply setup`, I can set default build memory (`--build-memory`), default domain, and decide whether to enable automatic SSL renewal.  
- These defaults are used by all subsequent `dply deploy` unless overridden by flags.

---

### 2. Project Deployment (Core Feature)
**US‑4**  
As a developer, I want to run `dply deploy` inside my project directory so that my application is automatically built, containerised, and served on my VPS with zero configuration.  
*Acceptance Criteria*  
- Given a project folder containing a `package.json` with a recognizable framework (React, Next.js, Node, static), when I run `dply deploy`, the CLI detects the framework, clones the repo (or uses local directory), builds a Docker image, starts a container on the VPS, and returns a public URL (or IP:port).  
- Real‑time build logs are streamed to my terminal.  
- Edge case: If no framework is detected, the CLI defaults to a basic Node.js server and warns the user.  
- Error scenario: If the build fails (non‑zero exit code), the deployment status is set to `failed` and the last 20 lines of build output are displayed.

**US‑5**  
As a developer, I want to deploy a remote GitHub repository directly using `dply deploy --repo <URL>` so that I don’t need to clone it locally first.  
*Acceptance Criteria*  
- The CLI clones the repository with `--depth 1` into a temporary directory, then proceeds as if local.  
- Private repositories: If cloning fails due to authentication, prompt for a GitHub personal access token (PAT) or SSH key.  
- Edge case: If the branch specified by `--branch` does not exist, inform the user and list available branches.

**US‑6**  
As a developer, I want to deploy a monorepo sub‑directory using `dply deploy --root <path>` so that only that portion is built and deployed.  
*Acceptance Criteria*  
- The CLI validates that the provided `--root` exists, then treats that path as the project root.  
- Framework detection and build commands run relative to that sub‑directory.

**US‑7**  
As a developer, I want to override the automatically detected build/install/start commands via flags so that I can fine‑tune deployment for non‑standard projects.  
*Acceptance Criteria*  
- `--build-command`, `--install-command`, `--output-dir` overrides are honoured.  
- If a Dockerfile already exists in the project, the CLI asks whether to use it or generate one (unless `--dockerfile` flag forces it).

---

### 3. Environment Variables & Secrets
**US‑8**  
As a developer, I want to set environment variables for my project using `dply env set KEY=VALUE` so that they are available at runtime in my deployed container.  
*Acceptance Criteria*  
- Variables marked as `--build` are injected during the Docker build phase; otherwise they are runtime only.  
- Special characters (`$`, `"`, `\n`) are escaped correctly.  
- Edge case: Duplicate keys trigger a warning and use the last value.

**US‑9**  
As a developer, I want to import a `.env` file using `dply env import .env.production` so that I can migrate existing configurations easily.  
*Acceptance Criteria*  
- The command parses each `KEY=value` line (skipping comments), encrypts the values, and stores them on the platform.  
- Empty values are allowed but require explicit confirmation.

**US‑10**  
As a developer, I want to list and delete environment variables so that I can manage them safely.  
*Acceptance Criteria*  
- `dply env list` shows key names and whether they are build/runtime, with values truncated to 30 characters (full value never displayed).  
- `dply env remove KEY` removes the variable after confirmation.

---

### 4. Real‑time Logs & Monitoring
**US‑11**  
As a developer, I want to stream live build and runtime logs with `dply logs --follow` so that I can debug my application in real time.  
*Acceptance Criteria*  
- Build logs are streamed via WebSocket during deployment.  
- After deployment, runtime logs from the running container are also streamed.  
- Edge case: If the WebSocket connection drops, the CLI auto‑reconnects (up to 5 attempts) and resumes from the last received timestamp.  
- Performance: `--tail N` limits the initial log output.

**US‑12**  
As a developer, I want to see the status and recent history of deployments with `dply status` so that I can quickly check which version is running.  
*Acceptance Criteria*  
- Output shows the latest deployment ID, status (queued/building/deploying/success/failed), commit SHA, timestamp, and container port.  
- If a deployment is in progress, show an animated spinner.

**US‑13**  
As a developer, I want to retrieve logs from a past deployment using `dply logs --deployment <ID>` so that I can investigate historical failures.  
*Acceptance Criteria*  
- The command fetches and displays the stored log output for that deployment.  
- Edge case: If logs were rotated/deleted, show a message that logs are unavailable.

---

### 5. Custom Domains & SSL
**US‑14**  
As a developer, I want to add a custom domain with `dply domain add example.com` so that users can reach my app via a branded URL.  
*Acceptance Criteria*  
- The CLI configures Traefik to route the domain to the deployment’s container.  
- A Let’s Encrypt certificate is requested automatically.  
- Edge case: DNS check warns if the domain does not resolve to the VPS IP.  
- Error scenario: If certificate issuance fails (e.g., rate limit), the command shows a clear error and suggests using `--staging` for testing.

**US‑15**  
As a developer, I want to list and remove domains so that I can manage my project’s routing.  
*Acceptance Criteria*  
- `dply domain list` shows domain, SSL status, and whether it’s active.  
- `dply domain remove` stops routing and optionally revokes the certificate.

---

### 6. Project Management
**US‑16**  
As a developer, I want to list all deployed projects with `dply list` so that I can see what’s running on my VPS.  
*Acceptance Criteria*  
- Output includes project name, framework, last deployment status, assigned domain(s), and container port.

**US‑17**  
As a developer, I want to delete a project and all associated containers with `dply delete <project>` so that I free up resources.  
*Acceptance Criteria*  
- The command stops and removes the Docker containers, deletes any Traefik configuration, and removes the project record from the database.  
- Confirmation is required (or `--force` flag to skip).

**US‑18**  
As a developer, I want to redeploy an existing project without re‑configuring it using `dply redeploy <project>` so that I can push new code.  
*Acceptance Criteria*  
- Triggers a new deployment using the project’s stored settings (repo, branch, build commands, env vars).  
- If a deployment is already in progress, the new one is queued.

---

### 7. Local Testing & Offline Mode
**US‑19**  
As a developer, I want to simulate a deployment locally with `dply deploy --local` so that I can test the build and container without affecting my VPS.  
*Acceptance Criteria*  
- Uses local Docker daemon, builds the image, starts the container locally, and shows the access URL (localhost:random port).  
- No VPS authentication required.

---

### 8. Edge Cases & Error Recovery (System‑wide)
**US‑20**  
As a developer, I want to be warned if my VPS has low disk space before a deployment, so that I avoid build failures.  
*Acceptance Criteria*  
- The CLI checks available disk space on the VPS (≥ 1 GB).  
- If insufficient, the command aborts with a message and optionally offers to free space (future).

**US‑21**  
As a developer, I want the CLI to handle SSH connection interruptions gracefully so that deployments are not left in a broken state.  
*Acceptance Criteria*  
- If the SSH connection is lost during a build, the remote build continues. The CLI retries connecting for status updates.  
- On reconnection, it shows the last known status and continues streaming logs.

**US‑22**  
As a developer, I want the CLI to prevent simultaneous conflicting deployments of the same project to avoid version collisions.  
*Acceptance Criteria*  
- When a deployment is queued or running, a subsequent `deploy` command for the same project shows “Deployment already in progress (ID XXXX)” and optionally queues the new one.  
- Queueing behaviour is controlled by `--queue` flag.

**US‑23**  
As a developer, I want version compatibility checks between the CLI and the server so that I’m not using incompatible commands.  
*Acceptance Criteria*  
- On every command, the CLI compares its version with the server’s version (via API call).  
- If the server is too old/new, warn that some features may not work and recommend updating.

**US‑24**  
As a developer, I want a `--verbose` flag across all commands so that I can debug network calls, Docker commands, and API requests.  
*Acceptance Criteria*  
- Adding `--verbose` prints raw API payloads, Docker build output, and SSH command details to stderr.

---