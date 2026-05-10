import { Client } from 'ssh2';

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
      privateKey: require('fs').readFileSync(keyPath),
      readyTimeout: 10000,
    });
  });
}