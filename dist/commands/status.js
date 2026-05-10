"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = statusCommand;
const chalk_1 = __importDefault(require("chalk"));
const config_1 = require("../core/config");
const ssh_1 = require("../core/ssh");
async function statusCommand() {
    const config = (0, config_1.loadConfig)();
    if (!config || !config.appName) {
        console.log(chalk_1.default.red('No app found. Run `dply deploy` first.'));
        return;
    }
    try {
        console.log(chalk_1.default.bold.blue(`\n📊 Status for ${config.appName}\n`));
        // PM2 status
        const pm2Status = await (0, ssh_1.execCommandWithOutput)(`pm2 show ${config.appName} || echo "not running"`);
        console.log(chalk_1.default.cyan('PM2:'));
        console.log(pm2Status.substring(0, 500));
        // Nginx site enabled?
        const nginxStatus = await (0, ssh_1.execCommandWithOutput)(`ls /etc/nginx/sites-enabled/${config.appName} 2>/dev/null && echo "enabled" || echo "not found"`);
        console.log(chalk_1.default.cyan(`\nNginx: ${nginxStatus}`));
        // SSL expiry if domain exists
        if (config.domain) {
            const sslExpiry = await (0, ssh_1.execCommandWithOutput)(`sudo certbot certificates 2>/dev/null | grep -A 2 ${config.domain} | grep Expiry || echo "No SSL or certbot not installed"`);
            console.log(chalk_1.default.cyan(`\nSSL: ${sslExpiry}`));
        }
        // App URL
        const url = config.domain ? `https://${config.domain}` : `http://${config.vpsIp}`;
        console.log(chalk_1.default.green(`\n🌐 App URL: ${url}`));
    }
    catch (err) {
        console.error(chalk_1.default.red(err.message));
    }
}
