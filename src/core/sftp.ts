import SftpClient from 'ssh2-sftp-client';
import fs from 'fs';
import path from 'path';
import { loadConfig } from './config';

export async function uploadDirectory(localDir: string, remoteDir: string, options: { exclude?: string[] } = {}) {
  const config = loadConfig();
  if (!config) throw new Error('No config');

  const sftp = new SftpClient();
  await sftp.connect({
    host: config.vpsIp,
    username: 'root',
    privateKey: fs.readFileSync(config.sshKeyPath),
  });

  try {
    await sftp.mkdir(remoteDir, true);
    await uploadRecursive(sftp, localDir, remoteDir, options.exclude || []);
  } finally {
    await sftp.end();
  }
}

async function uploadRecursive(sftp: SftpClient, localDir: string, remoteDir: string, exclude: string[]) {
  const items = fs.readdirSync(localDir);
  for (const item of items) {
    if (exclude.includes(item)) continue;
    const localPath = path.join(localDir, item);
    const remotePath = path.join(remoteDir, item);
    const stat = fs.statSync(localPath);
    if (stat.isDirectory()) {
      await sftp.mkdir(remotePath, true);
      await uploadRecursive(sftp, localPath, remotePath, exclude);
    } else {
      await sftp.put(localPath, remotePath);
    }
  }
}