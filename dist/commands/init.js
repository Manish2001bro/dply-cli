"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = initCommand;
const inquirer_1 = __importDefault(require("inquirer"));
const config_1 = require("../core/config");
const ssh_1 = require("../core/ssh");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
async function initCommand() {
    console.log(chalk_1.default.bold.blue('\n🚀 dply - One-Command Deploy Setup\n'));
    // Check if config already exists
    if ((0, config_1.configExists)()) {
        const { overwrite } = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'overwrite',
                message: 'Configuration already exists. Overwrite?',
                default: false,
            },
        ]);
        if (!overwrite) {
            console.log(chalk_1.default.yellow('Setup cancelled. Existing config kept.'));
            return;
        }
    }
    // Ask questions
    const answers = await inquirer_1.default.prompt([
        {
            type: 'input',
            name: 'vpsIp',
            message: 'Enter your VPS IP address:',
            validate: (input) => {
                const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
                return ipRegex.test(input) || 'Please enter a valid IPv4 address';
            },
        },
        {
            type: 'input',
            name: 'sshKeyPath',
            message: 'Path to your SSH private key (e.g., ~/.ssh/id_rsa):',
            default: process.env.HOME + '/.ssh/id_rsa',
            validate: (input) => {
                // Basic check: not empty
                return input.length > 0 || 'SSH key path is required';
            },
        },
        {
            type: 'input',
            name: 'domain',
            message: 'Domain name (optional, press Enter to skip):',
            default: '',
        },
        {
            type: 'input',
            name: 'email',
            message: 'Email for Let\'s Encrypt SSL notifications:',
            validate: (input) => {
                if (!input)
                    return true; // optional
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(input) || 'Enter a valid email or leave empty';
            },
        },
    ]);
    // Test SSH connection before saving
    const spinner = (0, ora_1.default)('Testing SSH connection...').start();
    try {
        await (0, ssh_1.testSSHConnection)(answers.vpsIp, answers.sshKeyPath);
        spinner.succeed(chalk_1.default.green('SSH connection successful'));
    }
    catch (err) {
        spinner.fail(chalk_1.default.red('SSH connection failed'));
        console.error(chalk_1.default.red(err.message || 'Check IP, key path, and firewall'));
        return;
    }
    // Save config
    (0, config_1.saveConfig)({
        vpsIp: answers.vpsIp,
        sshKeyPath: answers.sshKeyPath,
        domain: answers.domain || '',
        email: answers.email || '',
        appName: '', // will be set during deploy
    });
    console.log(chalk_1.default.green('\n✅ Configuration saved to ~/.dply/config.json'));
    console.log(chalk_1.default.cyan('Next step: Run `dply deploy` inside your Node.js project folder\n'));
}
