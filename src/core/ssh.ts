import { Client } from 'ssh2';
import fs from 'fs';
import os from 'os';

let activeConnection: Client | null = null;

export function testSSHConnection(host: string, keyPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.end();
      resolve();
    });
    conn.on('error', (err) => {
      reject(new Error(`SSH error: ${err.message}`));
    });
    conn.connect({
      host,
      username: 'root',
      privateKey: fs.readFileSync(keyPath),
      readyTimeout: 10000,
    });
  });
}

async function getConnection(): Promise<Client> {
  return new Promise((resolve, reject) => {
    if (activeConnection) {
      resolve(activeConnection);
      return;
    }
    const configPath = os.homedir() + '/.dply/config.json';
    if (!fs.existsSync(configPath)) {
      reject(new Error('Config not found. Run `dply init` first.'));
      return;
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const conn = new Client();
    conn.on('ready', () => {
      activeConnection = conn;
      resolve(conn);
    });
    conn.on('error', reject);
    conn.connect({
      host: config.vpsIp,
      username: 'root',
      privateKey: fs.readFileSync(config.sshKeyPath),
    });
  });
}

export async function execCommandWithOutput(command: string): Promise<string> {
  const conn = await getConnection();
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let output = '';
      stream.on('data', (data: Buffer) => {
        output += data.toString();
      });
      stream.on('close', (code: number) => {
        if (code === 0) resolve(output.trim());
        else reject(new Error(`Command failed with code ${code}: ${output}`));
      });
      stream.stderr.on('data', (data: Buffer) => {
        reject(data.toString());
      });
    });
  });
}

export async function execCommand(command: string): Promise<void> {
  const conn = await getConnection();
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let stderr = '';
      stream.on('close', (code: number) => {
        if (code === 0) resolve();
        else reject(new Error(`Command failed with code ${code}: ${stderr}`));
      });
      stream.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });
    });
  });
}