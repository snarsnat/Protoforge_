const inquirer = require('inquirer');
const chalk = require('chalk');
const AIAdapter = require('../ai/adapter');
const Config = require('../core/config');

class Setup {
    async run() {
        console.log(chalk.cyan('\n[SETUP WIZARD]'));
        console.log(chalk.gray('Configure ProtoForge settings\n'));

        const providers = AIAdapter.getAvailableProviders();

        // Provider selection
        const { provider } = await inquirer.prompt([{
            type: 'list',
            name: 'provider',
            message: 'Select AI Provider:',
            choices: providers.map(p => ({
                name: p.label + (p.requiresKey ? ' (API Key required)' : ''),
                value: p.name
            }))
        }]);

        Config.set('aiProvider', provider);

        // Provider-specific configuration
        const providerInfo = providers.find(p => p.name === provider);

        if (provider === 'ollama') {
            const { baseUrl, model } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'baseUrl',
                    message: 'Ollama Base URL:',
                    default: 'http://localhost:11434'
                },
                {
                    type: 'input',
                    name: 'model',
                    message: 'Model name:',
                    default: 'llama3.2'
                }
            ]);
            Config.set('baseUrl', baseUrl);
            Config.set('model', model);
        } else if (providerInfo.requiresKey) {
            const { apiKey, model } = await inquirer.prompt([
                {
                    type: 'password',
                    name: 'apiKey',
                    message: `Enter your ${provider} API key:`,
                    mask: '*'
                },
                {
                    type: 'input',
                    name: 'model',
                    message: 'Model name (optional, press Enter for default):'
                }
            ]);
            Config.set('apiKey', apiKey);
            if (model) Config.set('model', model);
        }

        // Test connection
        console.log(chalk.gray('\nTesting connection...'));
        const adapter = new AIAdapter();
        const isConnected = await adapter.testConnection();

        if (isConnected) {
            console.log(chalk.green('✓ Connection successful'));
        } else {
            console.log(chalk.yellow('⚠ Could not verify connection (this is normal for some providers)'));
        }

        // Additional settings
        const { outputDir, autoOpen } = await inquirer.prompt([
            {
                type: 'input',
                name: 'outputDir',
                message: 'Default output directory:',
                default: './protoforge-output'
            },
            {
                type: 'confirm',
                name: 'autoOpen',
                message: 'Auto-open web interface after generation?',
                default: true
            }
        ]);

        Config.set('outputDir', outputDir);
        Config.set('autoOpenWeb', autoOpen);

        console.log(chalk.green('\n✓ Setup complete!'));
        console.log(chalk.gray('Configuration saved to: ' + Config.path));
    }
}

module.exports = new Setup();
