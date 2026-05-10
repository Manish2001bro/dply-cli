"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadDirectory = uploadDirectory;
const ssh2_sftp_client_1 = __importDefault(require("ssh2-sftp-client"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
async function uploadDirectory(localDir, remoteDir, options = {}) {
    const config = (0, config_1.loadConfig)();
    if (!config)
        throw new Error('No config');
    const sftp = new ssh2_sftp_client_1.default();
    await sftp.connect({
        host: config.vpsIp,
        username: 'root',
        privateKey: fs_1.default.readFileSync(config.sshKeyPath),
    });
    try {
        await sftp.mkdir(remoteDir, true);
        await uploadRecursive(sftp, localDir, remoteDir, options.exclude || []);
    }
    finally {
        await sftp.end();
    }
}
async function uploadRecursive(sftp, localDir, remoteDir, exclude) {
    const items = fs_1.default.readdirSync(localDir);
    for (const item of items) {
        if (exclude.includes(item))
            continue;
        const localPath = path_1.default.join(localDir, item);
        const remotePath = path_1.default.join(remoteDir, item);
        const stat = fs_1.default.statSync(localPath);
        if (stat.isDirectory()) {
            await sftp.mkdir(remotePath, true);
            await uploadRecursive(sftp, localPath, remotePath, exclude);
        }
        else {
            await sftp.put(localPath, remotePath);
        }
    }
}
