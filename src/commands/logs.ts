import chalk from 'chalk';
import { loadConfig } from '../core/config';
import { execCommandWithOutput } from '../core/ssh';

export default async function logsCommand() {
  const config = loadConfig();
  if (!config || !config.appName) {
    console.log(chalk.red('No app found. Run `dply deploy` first.'));
    return;
  }

  console.log(chalk.bold.blue(`\n📜 Streaming logs for ${config.appName}... (Ctrl+C to exit)\n`));

  try {
    // Use tail -f on PM2 logs
    const logCmd = `pm2 logs ${config.appName} --lines 50 --raw`;
    const stream = await execCommandWithOutput(logCmd);
    // Actually we need a continuous stream, but our execCommandWithOutput returns once.
    // For real-time, we'll use a different approach: spawn SSH in raw mode.
    // For MVP, we can just fetch last 50 lines.
    console.log(stream);
    console.log(chalk.gray('\n(Real-time streaming coming in v2. For now, re-run `dply logs` to see new logs.)'));
  } catch (err: any) {
    console.error(chalk.red(err.message));
  }
}