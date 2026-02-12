#!/usr/bin/env node
const { program } = require('commander');
const chalk = require('chalk');
const figlet = require('figlet');
const { spawn } = require('child_process');
const path = require('path');

const Config = require('../lib/core/config');
const Generator = require('../lib/core/generator');
const Output = require('../lib/core/output');
const WebServer = require('../lib/web/server');
const Setup = require('../lib/ui/setup');

const VERSION = '1.0.0';

// ASCII Art Banner
function showBanner() {
    console.log(chalk.cyan(figlet.textSync('ProtoForge', {
        font: 'Standard',
        horizontalLayout: 'default'
    })));
    console.log(chalk.gray('v' + VERSION) + ' | ' + chalk.green('AI Prototype Builder'));
    console.log(chalk.gray('─'.repeat(60)));
}

// Helper to run TUI
async function runTUI() {
    const tuiPath = path.join(__dirname, '..', 'lib', 'ui', 'tui.js');
    const child = spawn('node', [tuiPath], {
        stdio: 'inherit',
        cwd: process.cwd()
    });

    return new Promise((resolve) => {
        child.on('close', (code) => {
            resolve(code);
        });
    });
}

program
    .name('protoforge')
    .description('AI-powered prototype builder with Anti-AI-Design philosophy')
    .version(VERSION, '-v, --version');

// Default command - launch TUI
program
    .action(async () => {
        showBanner();
        console.log(chalk.gray('Launching Terminal Interface...\n'));
        await runTUI();
    });

// Start command - alias for default
program
    .command('start')
    .alias('run')
    .description('Launch the interactive TUI')
    .option('-p, --provider <provider>', 'AI provider to use')
    .option('-m, --model <model>', 'Model name')
    .action(async (options) => {
        if (options.provider) {
            Config.set('aiProvider', options.provider);
        }
        if (options.model) {
            Config.set('model', options.model);
        }
        await runTUI();
    });

// Build command
program
    .command('build <description>')
    .alias('generate')
    .alias('create')
    .description('Generate a prototype from description')
    .option('-t, --type <type>', 'Project type (hardware|software|hybrid)', 'hybrid')
    .option('-p, --provider <provider>', 'AI provider')
    .option('-o, --output <dir>', 'Output directory')
    .option('--no-web', 'Do not open web interface after generation')
    .option('--zip', 'Create ZIP archive')
    .action(async (description, options) => {
        showBanner();

        try {
            console.log(chalk.cyan('\n[INIT]') + ' Starting generation...');
            console.log(chalk.gray('Description: ') + description);
            console.log(chalk.gray('Type: ') + options.type);
            console.log(chalk.gray('Provider: ') + (options.provider || Config.get('aiProvider') || 'ollama'));

            const result = await Generator.generatePrototype(description, {
                type: options.type,
                provider: options.provider,
                outputDir: options.output
            });

            if (result.success) {
                console.log(chalk.green('\n[OK]') + ' Generation complete!');
                console.log(chalk.gray('Output: ') + result.outputPath);

                if (options.zip) {
                    const zipPath = await Output.createZip(result.outputPath);
                    console.log(chalk.gray('Archive: ') + zipPath);
                }

                if (options.web) {
                    console.log(chalk.cyan('\n[WEB]') + ' Starting web interface...');
                    await WebServer.start(result.outputPath);
                }
            } else {
                console.error(chalk.red('\n[ERR]') + ' Generation failed:');
                console.error(result.error);
                process.exit(1);
            }
        } catch (error) {
            console.error(chalk.red('\n[ERR]') + ' ' + error.message);
            process.exit(1);
        }
    });

// Setup command
program
    .command('setup')
    .description('Run interactive configuration wizard')
    .action(async () => {
        showBanner();
        await Setup.run();
    });

// Web command
program
    .command('web')
    .description('Start the web interface')
    .option('-p, --port <port>', 'Port to run on', '3000')
    .action(async (options) => {
        showBanner();
        console.log(chalk.cyan('\n[WEB]') + ' Starting server on port ' + options.port);
        await WebServer.start(null, parseInt(options.port));
    });

// Config command
program
    .command('config')
    .alias('settings')
    .description('Manage configuration')
    .option('--get <key>', 'Get configuration value')
    .option('--set <key> <value>', 'Set configuration value')
    .option('--reset', 'Reset all configuration')
    .action((options) => {
        showBanner();

        if (options.reset) {
            Config.reset();
            console.log(chalk.green('[OK]') + ' Configuration reset');
            return;
        }

        if (options.get) {
            const value = Config.get(options.get);
            console.log(chalk.cyan(options.get + ':') + ' ' + (value || chalk.gray('(not set)')));
            return;
        }

        if (options.set) {
            // Commander parses this weirdly, so we handle it manually
            const args = process.argv.slice(process.argv.indexOf('--set') + 1);
            if (args.length >= 2) {
                Config.set(args[0], args[1]);
                console.log(chalk.green('[OK]') + ' Set ' + args[0] + ' = ' + args[1]);
            }
            return;
        }

        // Show all config
        console.log(chalk.cyan('\n[CONFIGURATION]'));
        const config = Config.getAll();
        Object.keys(config).forEach(key => {
            let value = config[key];
            if (key.toLowerCase().includes('key')) {
                value = value ? '*****' : chalk.gray('(not set)');
            }
            console.log('  ' + chalk.gray(key + ':') + ' ' + value);
        });
    });

// Install command
program
    .command('install')
    .alias('i')
    .description('Show installation instructions')
    .action(() => {
        showBanner();
        console.log(chalk.cyan('\n[INSTALLATION]'));
        console.log('\nPrerequisites:');
        console.log('  • Node.js >= 18.0.0');
        console.log('  • For local AI: Ollama (https://ollama.ai)');
        console.log('  • For cloud AI: API key from provider');
        console.log('\nGlobal installation:');
        console.log(chalk.gray('  npm install -g protoforge'));
        console.log('\nLocal development:');
        console.log(chalk.gray('  git clone <repo>'));
        console.log(chalk.gray('  cd protoforge'));
        console.log(chalk.gray('  npm install'));
        console.log(chalk.gray('  npm link'));
        console.log('\nFirst run:');
        console.log(chalk.gray('  protoforge setup'));
    });

program.parse();
