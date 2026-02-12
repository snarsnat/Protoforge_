# ProtoForge

**AI-powered prototype builder with Anti-AI-Design philosophy**

ProtoForge is an AI-powered prototype builder that transforms natural language descriptions into complete, production-ready project packages. Unlike conventional AI tools with chat bubbles and soft gradients, ProtoForge embraces terminal aesthetics, high information density, and keyboard-centric workflows.

## Philosophy

While companies like OpenAI design interfaces to feel friendly and approachable, ProtoForge takes the opposite approach. This tool is built for developers, engineers, and makers who prefer:

- **Precision over polish**
- **Density over whitespace** 
- **Raw functionality over aesthetic trends**

The interface feels like a cockpit or workbench, not a consumer app.

## Features

- **Terminal User Interface (TUI)** - Built with Ink/React for a native terminal experience
- **Web Dashboard** - Express-based interface with real-time updates via Socket.IO
- **Multi-Provider AI Support** - Ollama, OpenAI, Groq, Anthropic, Gemini, DeepSeek
- **Complete Project Generation** - Code, documentation, schematics, BOMs, and build guides
- **Hardware & Software** - Support for Arduino/ESP32, web apps, APIs, and hybrid projects

## Installation

```bash
# Global installation
npm install -g protoforge

# Or run directly
npx protoforge
```

### Prerequisites

- Node.js >= 18.0.0
- For local AI: [Ollama](https://ollama.ai)
- For cloud AI: API key from your chosen provider

## Quick Start

```bash
# Interactive setup
protoforge setup

# Launch TUI
protoforge

# Or generate directly
protoforge build "ESP32 weather station with OLED display" --type hardware

# Start web interface
protoforge web
```

## Usage Examples

### Hardware Project
```bash
protoforge build "A smart doorbell with camera, motion sensor, and MQTT notifications"   --type hardware   --provider ollama   --output ./projects
```

### Software Project
```bash
protoforge build "REST API for task management with JWT auth and PostgreSQL"   --type software   --provider openai   --zip
```

### Hybrid Project
```bash
protoforge build "Smart home controller with ESP32 sensors and React dashboard"   --type hybrid   --provider groq
```

## Commands

| Command | Description |
|---------|-------------|
| `protoforge` | Launch interactive TUI |
| `protoforge build <desc>` | Generate prototype from description |
| `protoforge web` | Start web dashboard |
| `protoforge setup` | Configuration wizard |
| `protoforge config` | View/edit settings |

## Configuration

Configuration is stored in:
- macOS/Linux: `~/.config/protoforge/config.json`
- Windows: `%APPDATA%/protoforge/config.json`

```bash
# View config
protoforge config

# Set specific value
protoforge config --set aiProvider openai

# Get specific value
protoforge config --get model
```

## Project Structure

```
protoforge-output/
└── project-name-timestamp/
    ├── code/              # Source code files
    ├── docs/              # Documentation
    ├── schematics/        # Mermaid diagrams
    ├── README.md          # Project overview
    └── prototype.json     # Full metadata
```

## Design Principles

1. **Terminal-First Aesthetics** - Monospace fonts, terminal colors, hard corners
2. **High Information Density** - No excessive whitespace, organized panels
3. **Keyboard-Centric** - Vim-style navigation, complete keyboard control
4. **Raw Token Display** - Real-time progress, concrete metrics
5. **Brutalist Layout** - Visible borders, flat colors, sharp edges

## Supported AI Providers

| Provider | Local/Cloud | Models |
|----------|-------------|--------|
| Ollama | Local | llama3.2, llama3.1, codellama, mistral |
| OpenAI | Cloud | gpt-4o, gpt-4o-mini, gpt-3.5-turbo |
| Groq | Cloud | llama-3.3-70b, llama-3.1-8b, mixtral |
| Anthropic | Cloud | claude-sonnet, claude-opus, claude-haiku |
| Gemini | Cloud | gemini-2.0-flash, gemini-1.5-pro |
| DeepSeek | Cloud | deepseek-chat |

## Development

```bash
git clone <repository>
cd protoforge
npm install
npm link  # Makes 'protoforge' command available locally
```

## License

MIT

---

**ProtoForge** - Built for makers, not consumers.
