import chalk from 'chalk';
import ora from 'ora';
import * as path from 'path';
import * as fs from 'fs';
import { loadConfig } from '../core/config';
import { execCommand, execCommandWithOutput } from '../core/ssh';
import { uploadDirectory } from '../core/sftp';

export default async function deployCommand() {
  console.log(chalk.bold.blue('\n🚀 dply - Deploying your app\n'));

  const config = loadConfig();
  if (!config) {
    console.log(chalk.red('No configuration found. Run `dply init` first.'));
    return;
  }

  // Check if current folder has package.json
  if (!fs.existsSync('package.json')) {
    console.log(chalk.red('No package.json found. Run this command from your Node.js project root.'));
    return;
  }

  const appName = path.basename(process.cwd());
  config.appName = appName;
  const remoteDir = `/var/www/${appName}`;

  const spinner = ora('Setting up environment on VPS...').start();

  try {
    // Step 1: Ensure Node.js, PM2, Nginx installed (from Phase 4)
    const nodeCheck = await execCommandWithOutput('node -v');
    if (!nodeCheck.includes('v')) {
      spinner.text = 'Installing Node.js...';
      await execCommand('curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -');
      await execCommand('sudo apt install -y nodejs');
    }

    const pm2Check = await execCommandWithOutput('which pm2');
    if (!pm2Check.includes('pm2')) {
      spinner.text = 'Installing PM2...';
      await execCommand('sudo npm install -g pm2');
    }

    const nginxCheck = await execCommandWithOutput('which nginx');
    if (!nginxCheck.includes('nginx')) {
      spinner.text = 'Installing Nginx...';
      await execCommand('sudo apt update && sudo apt install -y nginx');
    }

    // Step 2: Create remote directory
    spinner.text = 'Creating remote directory...';
    await execCommand(`sudo mkdir -p ${remoteDir}`);
    await execCommand(`sudo chown -R root:root ${remoteDir}`);

    // Step 3: Upload files (excluding node_modules, .git, .env)
    spinner.text = 'Uploading project files...';
    await uploadDirectory(process.cwd(), remoteDir, {
      exclude: ['node_modules', '.git', '.env', 'dist', 'tests']
    });

    // Step 4: Install dependencies on VPS
    spinner.text = 'Installing dependencies on VPS (npm ci)...';
    await execCommand(`cd ${remoteDir} && npm ci --production`);

    // Step 5: Start/Restart PM2
    spinner.text = 'Starting app with PM2...';
    const pm2List = await execCommandWithOutput(`pm2 list | grep ${appName} || true`);
    if (pm2List.includes(appName)) {
      await execCommand(`cd ${remoteDir} && pm2 restart ${appName} --update-env`);
    } else {
      await execCommand(`cd ${remoteDir} && pm2 start npm --name ${appName} -- start`);
    }
    await execCommand('pm2 save');
    await execCommand('pm2 startup systemd -u root --hp /root');

    // Step 6: Configure Nginx
    spinner.text = 'Configuring Nginx...';
    const port = await getAppPort(remoteDir); // default 3000 if not found
    const nginxConfig = `
server {
    listen 80;
    server_name ${config.domain || config.vpsIp};
    location / {
        proxy_pass http://localhost:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}`;
    const nginxPath = `/etc/nginx/sites-available/${appName}`;
    await execCommand(`echo '${nginxConfig.replace(/'/g, "'\\''")}' | sudo tee ${nginxPath}`);
    await execCommand(`sudo ln -sf ${nginxPath} /etc/nginx/sites-enabled/`);
    await execCommand('sudo nginx -t');
    await execCommand('sudo systemctl reload nginx');

    // Step 7: SSL (if domain provided)
    if (config.domain && config.email) {
      spinner.text = 'Obtaining SSL certificate...';
      await execCommand(`sudo apt install -y certbot python3-certbot-nginx`);
      await execCommand(`sudo certbot --nginx -d ${config.domain} --non-interactive --agree-tos -m ${config.email}`);
    }

    spinner.succeed(chalk.green('Deployment successful!'));
    const url = config.domain ? `https://${config.domain}` : `http://${config.vpsIp}`;
    console.log(chalk.cyan(`\n✅ App live at: ${url}\n`));
  } catch (err: any) {
    spinner.fail(chalk.red('Deployment failed'));
    console.error(chalk.red(err.message || err));
  }
}

async function getAppPort(remoteDir: string): Promise<number> {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    if (packageJson.scripts?.start?.includes('PORT')) {
      // crude detection; better to ask user or default
      return 3000;
    }
  } catch (e) {}
  return 3000; // default
}