import chalk from 'chalk';
import { loadConfig } from '../core/config';
import { execCommandWithOutput } from '../core/ssh';

export default async function statusCommand() {
  const config = loadConfig();
  if (!config || !config.appName) {
    console.log(chalk.red('No app found. Run `dply deploy` first.'));
    return;
  }

  try {
    console.log(chalk.bold.blue(`\n📊 Status for ${config.appName}\n`));

    // PM2 status
    const pm2Status = await execCommandWithOutput(`pm2 show ${config.appName} || echo "not running"`);
    console.log(chalk.cyan('PM2:'));
    console.log(pm2Status.substring(0, 500));

    // Nginx site enabled?
    const nginxStatus = await execCommandWithOutput(`ls /etc/nginx/sites-enabled/${config.appName} 2>/dev/null && echo "enabled" || echo "not found"`);
    console.log(chalk.cyan(`\nNginx: ${nginxStatus}`));

    // SSL expiry if domain exists
    if (config.domain) {
      const sslExpiry = await execCommandWithOutput(`sudo certbot certificates 2>/dev/null | grep -A 2 ${config.domain} | grep Expiry || echo "No SSL or certbot not installed"`);
      console.log(chalk.cyan(`\nSSL: ${sslExpiry}`));
    }

    // App URL
    const url = config.domain ? `https://${config.domain}` : `http://${config.vpsIp}`;
    console.log(chalk.green(`\n🌐 App URL: ${url}`));
  } catch (err: any) {
    console.error(chalk.red(err.message));
  }
}