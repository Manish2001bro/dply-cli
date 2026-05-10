"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = destroyCommand;
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const ora_1 = __importDefault(require("ora"));
const config_1 = require("../core/config");
const ssh_1 = require("../core/ssh");
async function destroyCommand() {
    const config = (0, config_1.loadConfig)();
    if (!config || !config.appName) {
        console.log(chalk_1.default.red('No app found. Run `dply deploy` first.'));
        return;
    }
    const { confirm } = await inquirer_1.default.prompt([
        {
            type: 'input',
            name: 'confirm',
            message: `Type "${config.appName}" to confirm deletion:`,
            validate: (input) => input === config.appName || 'App name does not match.',
        },
    ]);
    const spinner = (0, ora_1.default)(`Destroying ${config.appName}...`).start();
    try {
        // Stop and delete PM2 process
        await (0, ssh_1.execCommand)(`pm2 stop ${config.appName} && pm2 delete ${config.appName}`);
        // Remove app directory
        await (0, ssh_1.execCommand)(`sudo rm -rf /var/www/${config.appName}`);
        // Remove Nginx site
        await (0, ssh_1.execCommand)(`sudo rm -f /etc/nginx/sites-available/${config.appName} /etc/nginx/sites-enabled/${config.appName}`);
        // Remove SSL cert if exists
        if (config.domain) {
            await (0, ssh_1.execCommand)(`sudo certbot delete --cert-name ${config.domain} --non-interactive || true`);
        }
        // Reload Nginx
        await (0, ssh_1.execCommand)('sudo systemctl reload nginx');
        // Remove appName from config
        config.appName = '';
        (0, config_1.saveConfig)(config);
        spinner.succeed(chalk_1.default.green(`App ${config.appName} destroyed successfully.`));
    }
    catch (err) {
        spinner.fail(chalk_1.default.red('Destroy failed'));
        console.error(chalk_1.default.red(err.message));
    }
}
