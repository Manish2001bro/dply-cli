import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from '../core/config';
import { execCommand } from '../core/ssh';

export default async function restartCommand() {
  const config = loadConfig();
  if (!config || !config.appName) {
    console.log(chalk.red('No app found. Run `dply deploy` first.'));
    return;
  }

  const spinner = ora(`Restarting ${config.appName}...`).start();
  try {
    await execCommand(`pm2 restart ${config.appName}`);
    spinner.succeed(chalk.green(`App ${config.appName} restarted successfully.`));
  } catch (err: any) {
    spinner.fail(chalk.red('Restart failed'));
    console.error(chalk.red(err.message));
  }
}