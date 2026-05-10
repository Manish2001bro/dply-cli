import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { loadConfig, saveConfig } from '../core/config';
import { execCommand } from '../core/ssh';

export default async function destroyCommand() {
  const config = loadConfig();
  if (!config || !config.appName) {
    console.log(chalk.red('No app found. Run `dply deploy` first.'));
    return;
  }

  const { confirm } = await inquirer.prompt([
    {
      type: 'input',
      name: 'confirm',
      message: `Type "${config.appName}" to confirm deletion:`,
      validate: (input) => input === config.appName || 'App name does not match.',
    },
  ]);

  const spinner = ora(`Destroying ${config.appName}...`).start();

  try {
    // Stop and delete PM2 process
    await execCommand(`pm2 stop ${config.appName} && pm2 delete ${config.appName}`);
    // Remove app directory
    await execCommand(`sudo rm -rf /var/www/${config.appName}`);
    // Remove Nginx site
    await execCommand(`sudo rm -f /etc/nginx/sites-available/${config.appName} /etc/nginx/sites-enabled/${config.appName}`);
    // Remove SSL cert if exists
    if (config.domain) {
      await execCommand(`sudo certbot delete --cert-name ${config.domain} --non-interactive || true`);
    }
    // Reload Nginx
    await execCommand('sudo systemctl reload nginx');

    // Remove appName from config
    config.appName = '';
    saveConfig(config);

    spinner.succeed(chalk.green(`App ${config.appName} destroyed successfully.`));
  } catch (err: any) {
    spinner.fail(chalk.red('Destroy failed'));
    console.error(chalk.red(err.message));
  }
}