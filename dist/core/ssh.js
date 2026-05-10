"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testSSHConnection = testSSHConnection;
exports.execCommandWithOutput = execCommandWithOutput;
exports.execCommand = execCommand;
const ssh2_1 = require("ssh2");
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
let activeConnection = null;
function testSSHConnection(host, keyPath) {
    return new Promise((resolve, reject) => {
        const conn = new ssh2_1.Client();
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
            privateKey: fs_1.default.readFileSync(keyPath),
            readyTimeout: 10000,
        });
    });
}
async function getConnection() {
    return new Promise((resolve, reject) => {
        if (activeConnection) {
            resolve(activeConnection);
            return;
        }
        const configPath = os_1.default.homedir() + '/.dply/config.json';
        if (!fs_1.default.existsSync(configPath)) {
            reject(new Error('Config not found. Run `dply init` first.'));
            return;
        }
        const config = JSON.parse(fs_1.default.readFileSync(configPath, 'utf-8'));
        const conn = new ssh2_1.Client();
        conn.on('ready', () => {
            activeConnection = conn;
            resolve(conn);
        });
        conn.on('error', reject);
        conn.connect({
            host: config.vpsIp,
            username: 'root',
            privateKey: fs_1.default.readFileSync(config.sshKeyPath),
        });
    });
}
async function execCommandWithOutput(command) {
    const conn = await getConnection();
    return new Promise((resolve, reject) => {
        conn.exec(command, (err, stream) => {
            if (err)
                return reject(err);
            let output = '';
            stream.on('data', (data) => {
                output += data.toString();
            });
            stream.on('close', (code) => {
                if (code === 0)
                    resolve(output.trim());
                else
                    reject(new Error(`Command failed with code ${code}: ${output}`));
            });
            stream.stderr.on('data', (data) => {
                reject(data.toString());
            });
        });
    });
}
async function execCommand(command) {
    const conn = await getConnection();
    return new Promise((resolve, reject) => {
        conn.exec(command, (err, stream) => {
            if (err)
                return reject(err);
            let stderr = '';
            stream.on('close', (code) => {
                if (code === 0)
                    resolve();
                else
                    reject(new Error(`Command failed with code ${code}: ${stderr}`));
            });
            stream.stderr.on('data', (data) => {
                stderr += data.toString();
            });
        });
    });
}
