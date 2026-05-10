#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const init_1 = __importDefault(require("./commands/init"));
commander_1.program
    .name('dply')
    .description('One-command deploy CLI for Node.js apps')
    .version('0.1.0');
commander_1.program
    .command('init')
    .description('Initialize configuration (VPS IP, SSH key, domain)')
    .action(init_1.default);
commander_1.program.parse();
