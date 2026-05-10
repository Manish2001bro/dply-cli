import inquirer from 'inquirer';
import { saveConfig, configExists, loadConfig } from '../core/config';
import { testSSHConnection } from '../core/ssh';
import chalk from 'chalk';
import ora from 'ora';

export default async function initCommand() {
  console.log(chalk.bold.blue('\n🚀 dply - One-Command Deploy Setup\n'));

  // Check if config already exists
  if (configExists()) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'Configuration already exists. Overwrite?',
        default: false,
      },
    ]);
    if (!overwrite) {
      console.log(chalk.yellow('Setup cancelled. Existing config kept.'));
      return;
    }
  }

  // Ask questions
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'vpsIp',
      message: 'Enter your VPS IP address:',
      validate: (input) => {
        const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipRegex.test(input) || 'Please enter a valid IPv4 address';
      },
    },
    {
      type: 'input',
      name: 'sshKeyPath',
      message: 'Path to your SSH private key (e.g., ~/.ssh/id_rsa):',
      default: process.env.HOME + '/.ssh/id_rsa',
      validate: (input) => {
        // Basic check: not empty
        return input.length > 0 || 'SSH key path is required';
      },
    },
    {
      type: 'input',
      name: 'domain',
      message: 'Domain name (optional, press Enter to skip):',
      default: '',
    },
    {
      type: 'input',
      name: 'email',
      message: 'Email for Let\'s Encrypt SSL notifications:',
      validate: (input) => {
        if (!input) return true; // optional
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(input) || 'Enter a valid email or leave empty';
      },
    },
  ]);

  // Test SSH connection before saving
  const spinner = ora('Testing SSH connection...').start();
  try {
    await testSSHConnection(answers.vpsIp, answers.sshKeyPath);
    spinner.succeed(chalk.green('SSH connection successful'));
  } catch (err: any) {
    spinner.fail(chalk.red('SSH connection failed'));
    console.error(chalk.red(err.message || 'Check IP, key path, and firewall'));
    return;
  }

  // Save config
  saveConfig({
    vpsIp: answers.vpsIp,
    sshKeyPath: answers.sshKeyPath,
    domain: answers.domain || '',
    email: answers.email || '',
    appName: '', // will be set during deploy
  });

  console.log(chalk.green('\n✅ Configuration saved to ~/.dply/config.json'));
  console.log(chalk.cyan('Next step: Run `dply deploy` inside your Node.js project folder\n'));
}