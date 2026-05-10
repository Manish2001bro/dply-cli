"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = deployCommand;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const config_1 = require("../core/config");
const ssh_1 = require("../core/ssh");
const sftp_1 = require("../core/sftp");
async function deployCommand() {
    console.log(chalk_1.default.bold.blue('\n🚀 dply - Deploying your app\n'));
    const config = (0, config_1.loadConfig)();
    if (!config) {
        console.log(chalk_1.default.red('No configuration found. Run `dply init` first.'));
        return;
    }
    // Check if current folder has package.json
    if (!fs.existsSync('package.json')) {
        console.log(chalk_1.default.red('No package.json found. Run this command from your Node.js project root.'));
        return;
    }
    const appName = path.basename(process.cwd());
    config.appName = appName;
    const remoteDir = `/var/www/${appName}`;
    const spinner = (0, ora_1.default)('Setting up environment on VPS...').start();
    try {
        // Step 1: Ensure Node.js, PM2, Nginx installed (from Phase 4)
        const nodeCheck = await (0, ssh_1.execCommandWithOutput)('node -v');
        if (!nodeCheck.includes('v')) {
            spinner.text = 'Installing Node.js...';
            await (0, ssh_1.execCommand)('curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -');
            await (0, ssh_1.execCommand)('sudo apt install -y nodejs');
        }
        const pm2Check = await (0, ssh_1.execCommandWithOutput)('which pm2');
        if (!pm2Check.includes('pm2')) {
            spinner.text = 'Installing PM2...';
            await (0, ssh_1.execCommand)('sudo npm install -g pm2');
        }
        const nginxCheck = await (0, ssh_1.execCommandWithOutput)('which nginx');
        if (!nginxCheck.includes('nginx')) {
            spinner.text = 'Installing Nginx...';
            await (0, ssh_1.execCommand)('sudo apt update && sudo apt install -y nginx');
        }
        // Step 2: Create remote directory
        spinner.text = 'Creating remote directory...';
        await (0, ssh_1.execCommand)(`sudo mkdir -p ${remoteDir}`);
        await (0, ssh_1.execCommand)(`sudo chown -R root:root ${remoteDir}`);
        // Step 3: Upload files (excluding node_modules, .git, .env)
        spinner.text = 'Uploading project files...';
        await (0, sftp_1.uploadDirectory)(process.cwd(), remoteDir, {
            exclude: ['node_modules', '.git', '.env', 'dist', 'tests']
        });
        // Step 4: Install dependencies on VPS
        spinner.text = 'Installing dependencies on VPS (npm ci)...';
        await (0, ssh_1.execCommand)(`cd ${remoteDir} && npm ci --production`);
        // Step 5: Start/Restart PM2
        spinner.text = 'Starting app with PM2...';
        const pm2List = await (0, ssh_1.execCommandWithOutput)(`pm2 list | grep ${appName} || true`);
        if (pm2List.includes(appName)) {
            await (0, ssh_1.execCommand)(`cd ${remoteDir} && pm2 restart ${appName} --update-env`);
        }
        else {
            await (0, ssh_1.execCommand)(`cd ${remoteDir} && pm2 start npm --name ${appName} -- start`);
        }
        await (0, ssh_1.execCommand)('pm2 save');
        await (0, ssh_1.execCommand)('pm2 startup systemd -u root --hp /root');
        // Step 6: Configure Nginx
        spinner.text = 'Configuring Nginx...';
        const port = await getAppPort(remoteDir); // default 3000 if not found
        const nginxConfig = `
server {
    listen 80;
    server_name ${config.domain || config.vpsIp};
    location / {
        proxy_pass http://localhost:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}`;
        const nginxPath = `/etc/nginx/sites-available/${appName}`;
        await (0, ssh_1.execCommand)(`echo '${nginxConfig.replace(/'/g, "'\\''")}' | sudo tee ${nginxPath}`);
        await (0, ssh_1.execCommand)(`sudo ln -sf ${nginxPath} /etc/nginx/sites-enabled/`);
        await (0, ssh_1.execCommand)('sudo nginx -t');
        await (0, ssh_1.execCommand)('sudo systemctl reload nginx');
        // Step 7: SSL (if domain provided)
        if (config.domain && config.email) {
            spinner.text = 'Obtaining SSL certificate...';
            await (0, ssh_1.execCommand)(`sudo apt install -y certbot python3-certbot-nginx`);
            await (0, ssh_1.execCommand)(`sudo certbot --nginx -d ${config.domain} --non-interactive --agree-tos -m ${config.email}`);
        }
        spinner.succeed(chalk_1.default.green('Deployment successful!'));
        const url = config.domain ? `https://${config.domain}` : `http://${config.vpsIp}`;
        console.log(chalk_1.default.cyan(`\n✅ App live at: ${url}\n`));
    }
    catch (err) {
        spinner.fail(chalk_1.default.red('Deployment failed'));
        console.error(chalk_1.default.red(err.message || err));
    }
}
async function getAppPort(remoteDir) {
    try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
        if (packageJson.scripts?.start?.includes('PORT')) {
            // crude detection; better to ask user or default
            return 3000;
        }
    }
    catch (e) { }
    return 3000; // default
}
