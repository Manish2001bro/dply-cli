"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = restartCommand;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const config_1 = require("../core/config");
const ssh_1 = require("../core/ssh");
async function restartCommand() {
    const config = (0, config_1.loadConfig)();
    if (!config || !config.appName) {
        console.log(chalk_1.default.red('No app found. Run `dply deploy` first.'));
        return;
    }
    const spinner = (0, ora_1.default)(`Restarting ${config.appName}...`).start();
    try {
        await (0, ssh_1.execCommand)(`pm2 restart ${config.appName}`);
        spinner.succeed(chalk_1.default.green(`App ${config.appName} restarted successfully.`));
    }
    catch (err) {
        spinner.fail(chalk_1.default.red('Restart failed'));
        console.error(chalk_1.default.red(err.message));
    }
}
