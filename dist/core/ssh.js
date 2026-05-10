"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testSSHConnection = testSSHConnection;
const ssh2_1 = require("ssh2");
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
            privateKey: require('fs').readFileSync(keyPath),
            readyTimeout: 10000,
        });
    });
}
