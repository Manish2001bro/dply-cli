"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = logsCommand;
const chalk_1 = __importDefault(require("chalk"));
const config_1 = require("../core/config");
const ssh_1 = require("../core/ssh");
async function logsCommand() {
    const config = (0, config_1.loadConfig)();
    if (!config || !config.appName) {
        console.log(chalk_1.default.red('No app found. Run `dply deploy` first.'));
        return;
    }
    console.log(chalk_1.default.bold.blue(`\n📜 Streaming logs for ${config.appName}... (Ctrl+C to exit)\n`));
    try {
        // Use tail -f on PM2 logs
        const logCmd = `pm2 logs ${config.appName} --lines 50 --raw`;
        const stream = await (0, ssh_1.execCommandWithOutput)(logCmd);
        // Actually we need a continuous stream, but our execCommandWithOutput returns once.
        // For real-time, we'll use a different approach: spawn SSH in raw mode.
        // For MVP, we can just fetch last 50 lines.
        console.log(stream);
        console.log(chalk_1.default.gray('\n(Real-time streaming coming in v2. For now, re-run `dply logs` to see new logs.)'));
    }
    catch (err) {
        console.error(chalk_1.default.red(err.message));
    }
}
