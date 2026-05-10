#!/usr/bin/env node

import { program } from 'commander';
import initCommand from './commands/init';

program
  .name('dply')
  .description('One-command deploy CLI for Node.js apps')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize configuration (VPS IP, SSH key, domain)')
  .action(initCommand);

program.parse();