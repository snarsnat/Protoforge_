#!/usr/bin/env node
const React = { useState, useEffect } = require('react');
const { render, Box, Text, useInput, useApp } = require('ink');
const TextInput = require('ink-text-input').default;
const SelectInput = require('ink-select-input').default;
const Spinner = require('ink-spinner').default;

const Generator = require('../core/generator');
const Output = require('../core/output');
const Config = require('../core/config');
const WebServer = require('../web/server');

// Main App Component
const App = () => {
    const [screen, setScreen] = useState('welcome');
    const [projectType, setProjectType] = useState('hybrid');
    const [description, setDescription] = useState('');
    const [generationResult, setGenerationResult] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const { exit } = useApp();

    const renderScreen = () => {
        switch (screen) {
            case 'welcome':
                return <WelcomeScreen onContinue={() => setScreen('menu')} />;
            case 'menu':
                return <MainMenu 
                    onSelect={(item) => {
                        if (item.value === 'new') setScreen('type');
                        else if (item.value === 'web') startWebInterface();
                        else if (item.value === 'setup') setScreen('setup');
                        else if (item.value === 'quit') exit();
                    }} 
                />;
            case 'type':
                return <TypeSelector 
                    onSelect={(type) => {
                        setProjectType(type);
                        setScreen('input');
                    }}
                    onBack={() => setScreen('menu')}
                />;
            case 'input':
                return <ProjectInput 
                    value={description}
                    onChange={setDescription}
                    onSubmit={handleGenerate}
                    onBack={() => setScreen('type')}
                />;
            case 'generating':
                return <GeneratingScreen type={projectType} />;
            case 'result':
                return <ResultScreen 
                    result={generationResult}
                    onNew={() => {
                        setDescription('');
                        setScreen('menu');
                    }}
                    onExit={exit}
                />;
            case 'setup':
                return <SetupScreen onComplete={() => setScreen('menu')} />;
            default:
                return <WelcomeScreen onContinue={() => setScreen('menu')} />;
        }
    };

    const handleGenerate = async () => {
        setScreen('generating');
        setIsGenerating(true);

        const result = await Generator.generatePrototype(description, {
            type: projectType
        });

        if (result.success) {
            const outputPath = await Output.createProjectStructure(
                result.data, 
                Config.get('outputDir') || './protoforge-output'
            );
            result.outputPath = outputPath;
        }

        setGenerationResult(result);
        setIsGenerating(false);
        setScreen('result');
    };

    const startWebInterface = async () => {
        console.log('\nStarting web interface on http://localhost:3000');
        await WebServer.start();
    };

    return (
        <Box flexDirection="column" padding={1}>
            {renderScreen()}
        </Box>
    );
};

// Welcome Screen with ASCII Art
const WelcomeScreen = ({ onContinue }) => {
    useInput(() => onContinue());

    return (
        <Box flexDirection="column" alignItems="center">
            <Text color="cyan">
                {'╔══════════════════════════════════════════╗'}\n
                {'║     PROTOFORGE v1.0.0                    ║'}\n
                {'║     AI PROTOTYPE BUILDER                 ║'}\n
                {'╚══════════════════════════════════════════╝'}
            </Text>
            <Box marginTop={1}>
                <Text color="gray">Press any key to continue...</Text>
            </Box>
        </Box>
    );
};

// Main Menu
const MainMenu = ({ onSelect }) => {
    const items = [
        { label: 'New Prototype', value: 'new' },
        { label: 'Recent Projects', value: 'recent' },
        { label: 'Web Interface', value: 'web' },
        { label: 'Settings', value: 'setup' },
        { label: 'Help', value: 'help' },
        { label: 'Quit', value: 'quit' }
    ];

    return (
        <Box flexDirection="column">
            <Text color="cyan" bold>MAIN MENU</Text>
            <Box marginTop={1}>
                <SelectInput 
                    items={items} 
                    onSelect={onSelect}
                    indicatorComponent={({ isSelected }) => (
                        <Text color={isSelected ? 'yellow' : 'gray'}>
                            {isSelected ? '>' : ' '}
                        </Text>
                    )}
                    itemComponent={({ isSelected, label }) => (
                        <Text color={isSelected ? 'yellow' : 'white'}>
                            {label}
                        </Text>
                    )}
                />
            </Box>
            <Box marginTop={1}>
                <Text color="gray">Use arrow keys to navigate, Enter to select</Text>
            </Box>
        </Box>
    );
};

// Project Type Selector
const TypeSelector = ({ onSelect, onBack }) => {
    useInput((input, key) => {
        if (key.escape) onBack();
    });

    const items = [
        { label: 'Hardware (Arduino/ESP32/Raspberry Pi)', value: 'hardware' },
        { label: 'Software (Web/API/Mobile)', value: 'software' },
        { label: 'Hybrid (Hardware + Software)', value: 'hybrid' }
    ];

    return (
        <Box flexDirection="column">
            <Text color="cyan" bold>SELECT PROJECT TYPE</Text>
            <Box marginTop={1}>
                <SelectInput 
                    items={items} 
                    onSelect={(item) => onSelect(item.value)}
                />
            </Box>
            <Box marginTop={1}>
                <Text color="gray">Press ESC to go back</Text>
            </Box>
        </Box>
    );
};

// Project Input Screen
const ProjectInput = ({ value, onChange, onSubmit, onBack }) => {
    useInput((input, key) => {
        if (key.escape) onBack();
        if (key.return && value.trim()) onSubmit();
    });

    return (
        <Box flexDirection="column">
            <Text color="cyan" bold>DESCRIBE YOUR PROJECT</Text>
            <Box marginTop={1}>
                <Text color="gray">Example: "A weather station using ESP32 that...</Text>
            </Box>
            <Box marginTop={1} borderStyle="single" paddingX={1}>
                <TextInput 
                    value={value}
                    onChange={onChange}
                    placeholder="Enter project description..."
                />
            </Box>
            <Box marginTop={1}>
                <Text color="gray">Press Enter to generate, ESC to go back</Text>
            </Box>
        </Box>
    );
};

// Generating Screen
const GeneratingScreen = ({ type }) => (
    <Box flexDirection="column" alignItems="center">
        <Text color="cyan"><Spinner type="dots" /></Text>
        <Box marginTop={1}>
            <Text>Generating {type} prototype...</Text>
        </Box>
        <Box marginTop={1}>
            <Text color="gray">This may take 30-60 seconds</Text>
        </Box>
    </Box>
);

// Result Screen
const ResultScreen = ({ result, onNew, onExit }) => {
    useInput((input, key) => {
        if (input === 'n') onNew();
        if (input === 'q') onExit();
    });

    if (!result.success) {
        return (
            <Box flexDirection="column">
                <Text color="red" bold>✗ GENERATION FAILED</Text>
                <Box marginTop={1}>
                    <Text>{result.error}</Text>
                </Box>
                <Box marginTop={1}>
                    <Text color="gray">Press N for new project, Q to quit</Text>
                </Box>
            </Box>
        );
    }

    return (
        <Box flexDirection="column">
            <Text color="green" bold>✓ GENERATION COMPLETE</Text>
            <Box marginTop={1}>
                <Text>Project: {result.data.overview?.projectName}</Text>
            </Box>
            <Box marginTop={1}>
                <Text color="gray">Output: {result.outputPath}</Text>
            </Box>
            <Box marginTop={1}>
                <Text>Files generated:</Text>
                {result.data.codeSnippets?.map((file, i) => (
                    <Text key={i} color="gray">  • {file.filename}</Text>
                ))}
            </Box>
            <Box marginTop={1}>
                <Text color="cyan">Press N for new project, Q to quit</Text>
            </Box>
        </Box>
    );
};

// Setup Screen (simplified)
const SetupScreen = ({ onComplete }) => {
    const [step, setStep] = useState(0);
    const [provider, setProvider] = useState(Config.get('aiProvider') || 'ollama');
    const [apiKey, setApiKey] = useState('');

    const providers = [
        { label: 'Ollama (Local)', value: 'ollama' },
        { label: 'OpenAI', value: 'openai' },
        { label: 'Groq', value: 'groq' },
        { label: 'Anthropic', value: 'anthropic' },
        { label: 'Google Gemini', value: 'gemini' },
        { label: 'DeepSeek', value: 'deepseek' }
    ];

    const handleProviderSelect = (item) => {
        setProvider(item.value);
        Config.set('aiProvider', item.value);
        if (item.value === 'ollama') {
            setStep(2);
        } else {
            setStep(1);
        }
    };

    const handleApiKeySubmit = () => {
        if (apiKey.trim()) {
            Config.set('apiKey', apiKey);
            setStep(2);
        }
    };

    if (step === 0) {
        return (
            <Box flexDirection="column">
                <Text color="cyan" bold>SETUP: SELECT AI PROVIDER</Text>
                <Box marginTop={1}>
                    <SelectInput items={providers} onSelect={handleProviderSelect} />
                </Box>
            </Box>
        );
    }

    if (step === 1) {
        return (
            <Box flexDirection="column">
                <Text color="cyan" bold>SETUP: ENTER API KEY</Text>
                <Box marginTop={1}>
                    <TextInput 
                        value={apiKey}
                        onChange={setApiKey}
                        placeholder="Paste your API key here..."
                    />
                </Box>
                <Box marginTop={1}>
                    <Text color="gray">Press Enter to save</Text>
                </Box>
            </Box>
        );
    }

    return (
        <Box flexDirection="column">
            <Text color="green" bold>✓ SETUP COMPLETE</Text>
            <Box marginTop={1}>
                <Text>Provider: {provider}</Text>
            </Box>
            <Box marginTop={1}>
                <Text color="gray">Press any key to continue...</Text>
            </Box>
            <Box marginTop={1}>
                <TextInput value="" onChange={() => onComplete()} />
            </Box>
        </Box>
    );
};

// Render the app
render(<App />);
