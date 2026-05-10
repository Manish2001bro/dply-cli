"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveConfig = saveConfig;
exports.loadConfig = loadConfig;
exports.configExists = configExists;
const fs_1 = __importDefault(require("fs"));
const CONFIG_DIR = require('os').homedir() + '/.dply';
const CONFIG_PATH = CONFIG_DIR + '/config.json';
function saveConfig(config) {
    if (!fs_1.default.existsSync(CONFIG_DIR)) {
        fs_1.default.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs_1.default.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}
function loadConfig() {
    if (!fs_1.default.existsSync(CONFIG_PATH))
        return null;
    const raw = fs_1.default.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw);
}
function configExists() {
    return fs_1.default.existsSync(CONFIG_PATH);
}
