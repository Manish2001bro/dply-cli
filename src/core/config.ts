import fs from 'fs';
import path from 'os';
import homedir from 'os';

const CONFIG_DIR = require('os').homedir() + '/.dply';
const CONFIG_PATH = CONFIG_DIR + '/config.json';

export interface DplyConfig {
  vpsIp: string;
  sshKeyPath: string;
  domain: string;
  email: string;
  appName: string;
}

export function saveConfig(config: DplyConfig) {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function loadConfig(): DplyConfig | null {
  if (!fs.existsSync(CONFIG_PATH)) return null;
  const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
  return JSON.parse(raw);
}

export function configExists(): boolean {
  return fs.existsSync(CONFIG_PATH);
}