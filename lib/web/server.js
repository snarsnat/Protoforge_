const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs').promises;

const Generator = require('../core/generator');
const Output = require('../core/output');
const Config = require('../core/config');

class WebServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = new Server(this.server);
        this.setupRoutes();
        this.setupSocketIO();
    }

    setupRoutes() {
        // Static files
        this.app.use(express.static(path.join(__dirname, 'public')));
        this.app.use(express.json());

        // API Routes
        this.app.get('/api/projects', async (req, res) => {
            try {
                const outputDir = Config.get('outputDir') || './protoforge-output';
                const projects = await fs.readdir(outputDir, { withFileTypes: true });
                const projectList = projects
                    .filter(d => d.isDirectory())
                    .map(d => ({
                        name: d.name,
                        path: path.join(outputDir, d.name),
                        created: (await fs.stat(path.join(outputDir, d.name))).birthtime
                    }));
                res.json(projectList);
            } catch (error) {
                res.json([]);
            }
        });

        this.app.get('/api/project/:name', async (req, res) => {
            try {
                const outputDir = Config.get('outputDir') || './protoforge-output';
                const projectPath = path.join(outputDir, req.params.name);
                const metadata = await fs.readFile(
                    path.join(projectPath, 'prototype.json'), 
                    'utf8'
                );
                res.json(JSON.parse(metadata));
            } catch (error) {
                res.status(404).json({ error: 'Project not found' });
            }
        });

        this.app.post('/api/generate', async (req, res) => {
            const { description, type, provider } = req.body;

            if (provider) {
                Config.set('aiProvider', provider);
            }

            // Start generation
            res.json({ status: 'started', id: Date.now() });
        });

        this.app.get('/api/project/:name/download', async (req, res) => {
            try {
                const outputDir = Config.get('outputDir') || './protoforge-output';
                const zipPath = path.join(outputDir, `${req.params.name}.zip`);
                res.download(zipPath);
            } catch (error) {
                res.status(404).json({ error: 'Archive not found' });
            }
        });

        // Main HTML
        this.app.get('/', (req, res) => {
            res.send(this.generateHTML());
        });
    }

    setupSocketIO() {
        this.io.on('connection', (socket) => {
            console.log('Client connected:', socket.id);

            socket.on('generate', async (data) => {
                const { description, type } = data;

                socket.emit('status', { 
                    message: 'Initializing generation...', 
                    progress: 10 
                });

                try {
                    const result = await Generator.generatePrototype(description, { type });

                    if (result.success) {
                        socket.emit('status', { 
                            message: 'Creating project files...', 
                            progress: 70 
                        });

                        const outputPath = await Output.createProjectStructure(
                            result.data,
                            Config.get('outputDir') || './protoforge-output'
                        );

                        socket.emit('status', { 
                            message: 'Finalizing...', 
                            progress: 90 
                        });

                        socket.emit('complete', {
                            success: true,
                            outputPath,
                            data: result.data
                        });
                    } else {
                        socket.emit('error', { message: result.error });
                    }
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
            });
        });
    }

    generateHTML() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ProtoForge Dashboard</title>
    <script src="/socket.io/socket.io.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background-color: #0a0a0a;
            color: #e0e0e0;
            font-family: 'Courier New', Courier, monospace;
            font-size: 14px;
            line-height: 1.6;
            overflow-x: hidden;
        }

        /* Header */
        .header {
            border-bottom: 1px solid #333;
            padding: 10px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #111;
        }

        .logo {
            color: #00ff88;
            font-weight: bold;
            font-size: 18px;
        }

        .header-controls {
            display: flex;
            gap: 10px;
        }

        button {
            background: #1a1a1a;
            border: 1px solid #444;
            color: #e0e0e0;
            padding: 6px 12px;
            cursor: pointer;
            font-family: inherit;
            font-size: 12px;
            text-transform: uppercase;
        }

        button:hover {
            background: #252525;
            border-color: #00ff88;
            color: #00ff88;
        }

        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        select {
            background: #1a1a1a;
            border: 1px solid #444;
            color: #e0e0e0;
            padding: 6px;
            font-family: inherit;
            font-size: 12px;
        }

        /* Main Layout */
        .container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            height: calc(100vh - 50px);
        }

        .panel {
            border-right: 1px solid #333;
            padding: 20px;
            overflow-y: auto;
        }

        .panel:last-child {
            border-right: none;
        }

        .panel-header {
            border-bottom: 1px solid #333;
            padding-bottom: 10px;
            margin-bottom: 20px;
            color: #00ff88;
            font-weight: bold;
            text-transform: uppercase;
        }

        /* Input Section */
        .input-group {
            margin-bottom: 20px;
        }

        label {
            display: block;
            margin-bottom: 5px;
            color: #888;
            text-transform: uppercase;
            font-size: 11px;
        }

        textarea {
            width: 100%;
            min-height: 120px;
            background: #111;
            border: 1px solid #333;
            color: #e0e0e0;
            padding: 10px;
            font-family: inherit;
            font-size: 13px;
            resize: vertical;
        }

        textarea:focus {
            outline: none;
            border-color: #00ff88;
        }

        .type-selector {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }

        .type-option {
            flex: 1;
            padding: 10px;
            border: 1px solid #333;
            text-align: center;
            cursor: pointer;
            background: #111;
        }

        .type-option:hover,
        .type-option.active {
            border-color: #00ff88;
            background: #1a1a1a;
        }

        .type-option.active {
            color: #00ff88;
        }

        /* Progress */
        .progress-container {
            margin-top: 20px;
            padding: 15px;
            background: #111;
            border: 1px solid #333;
            display: none;
        }

        .progress-container.active {
            display: block;
        }

        .progress-bar {
            width: 100%;
            height: 20px;
            background: #1a1a1a;
            border: 1px solid #333;
            margin-top: 10px;
        }

        .progress-fill {
            height: 100%;
            background: #00ff88;
            width: 0%;
            transition: width 0.3s;
        }

        .progress-text {
            color: #888;
            font-size: 12px;
            margin-top: 5px;
        }

        /* Output Tabs */
        .tabs {
            display: flex;
            border-bottom: 1px solid #333;
            margin-bottom: 20px;
        }

        .tab {
            padding: 8px 16px;
            cursor: pointer;
            border: 1px solid transparent;
            border-bottom: none;
            background: #111;
            margin-right: 5px;
        }

        .tab:hover {
            background: #1a1a1a;
        }

        .tab.active {
            background: #1a1a1a;
            border-color: #333;
            color: #00ff88;
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
        }

        /* File Tree */
        .file-tree {
            font-size: 12px;
        }

        .file-item {
            padding: 4px 0;
            cursor: pointer;
            color: #888;
        }

        .file-item:hover {
            color: #00ff88;
        }

        .file-item.directory {
            color: #e0e0e0;
            font-weight: bold;
        }

        /* Code Viewer */
        .code-viewer {
            background: #111;
            border: 1px solid #333;
            padding: 15px;
            overflow-x: auto;
            font-size: 12px;
            line-height: 1.4;
        }

        .code-viewer pre {
            margin: 0;
            white-space: pre-wrap;
            word-wrap: break-word;
        }

        /* BOM Table */
        .bom-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }

        .bom-table th,
        .bom-table td {
            border: 1px solid #333;
            padding: 8px;
            text-align: left;
        }

        .bom-table th {
            background: #1a1a1a;
            color: #00ff88;
            text-transform: uppercase;
            font-size: 11px;
        }

        .bom-table tr:hover {
            background: #111;
        }

        /* Status Bar */
        .status-bar {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: #111;
            border-top: 1px solid #333;
            padding: 5px 20px;
            font-size: 11px;
            color: #666;
            display: flex;
            justify-content: space-between;
        }

        .status-bar .status-online {
            color: #00ff88;
        }

        .status-bar .status-offline {
            color: #ff4444;
        }

        /* Mermaid Diagrams */
        .mermaid {
            background: #fff;
            padding: 20px;
            border-radius: 0;
        }

        /* Scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }

        ::-webkit-scrollbar-track {
            background: #0a0a0a;
        }

        ::-webkit-scrollbar-thumb {
            background: #333;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: #444;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">[ PROTOFORGE ]</div>
        <div class="header-controls">
            <select id="provider">
                <option value="ollama">Ollama (Local)</option>
                <option value="openai">OpenAI</option>
                <option value="groq">Groq</option>
                <option value="anthropic">Anthropic</option>
                <option value="gemini">Gemini</option>
            </select>
            <button onclick="exportZip()">Export ZIP</button>
            <button onclick="newProject()">New Project</button>
        </div>
    </div>

    <div class="container">
        <div class="panel">
            <div class="panel-header">Command Interface</div>

            <div class="input-group">
                <label>Project Type</label>
                <div class="type-selector">
                    <div class="type-option active" data-type="hardware" onclick="selectType('hardware')">
                        HARDWARE
                    </div>
                    <div class="type-option" data-type="software" onclick="selectType('software')">
                        SOFTWARE
                    </div>
                    <div class="type-option" data-type="hybrid" onclick="selectType('hybrid')">
                        HYBRID
                    </div>
                </div>
            </div>

            <div class="input-group">
                <label>Project Description</label>
                <textarea id="description" placeholder="Describe your project idea...

Example: A smart weather station using ESP32 that measures temperature, humidity, and pressure, displays data on an OLED screen, and sends readings to a cloud dashboard via MQTT."></textarea>
            </div>

            <button onclick="generateProject()" id="generateBtn" style="width: 100%; padding: 12px;">
                EXECUTE GENERATION
            </button>

            <div class="progress-container" id="progressContainer">
                <div class="progress-text" id="progressText">Initializing...</div>
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill"></div>
                </div>
            </div>

            <div id="history" style="margin-top: 30px;">
                <label>History</label>
                <div style="color: #666; font-size: 12px; margin-top: 10px;">
                    No recent generations
                </div>
            </div>
        </div>

        <div class="panel">
            <div class="panel-header">Output Viewer</div>

            <div class="tabs">
                <div class="tab active" onclick="showTab('files')">Files</div>
                <div class="tab" onclick="showTab('code')">Code</div>
                <div class="tab" onclick="showTab('schematic')">Schematic</div>
                <div class="tab" onclick="showTab('bom')">BOM</div>
                <div class="tab" onclick="showTab('guide')">Build Guide</div>
            </div>

            <div id="tab-files" class="tab-content active">
                <div class="file-tree" id="fileTree">
                    <div style="color: #666;">No files generated yet</div>
                </div>
            </div>

            <div id="tab-code" class="tab-content">
                <div class="code-viewer" id="codeViewer">
                    <pre>No code to display</pre>
                </div>
            </div>

            <div id="tab-schematic" class="tab-content">
                <div class="mermaid" id="schematicViewer">
                    No schematic available
                </div>
            </div>

            <div id="tab-bom" class="tab-content">
                <table class="bom-table" id="bomTable">
                    <tr>
                        <th>Part Number</th>
                        <th>Description</th>
                        <th>Qty</th>
                    </tr>
                    <tr>
                        <td colspan="3" style="text-align: center; color: #666;">No BOM data</td>
                    </tr>
                </table>
            </div>

            <div id="tab-guide" class="tab-content">
                <div id="buildGuide" style="white-space: pre-wrap; font-size: 12px; line-height: 1.6;">
                    No build guide available
                </div>
            </div>
        </div>
    </div>

    <div class="status-bar">
        <div>
            <span id="connectionStatus" class="status-offline">●</span>
            <span id="providerStatus">Disconnected</span>
        </div>
        <div id="outputPath"></div>
    </div>

    <script>
        const socket = io();
        let currentProject = null;
        let selectedType = 'hardware';

        socket.on('connect', () => {
            document.getElementById('connectionStatus').className = 'status-online';
            document.getElementById('providerStatus').textContent = 'Connected';
        });

        socket.on('disconnect', () => {
            document.getElementById('connectionStatus').className = 'status-offline';
            document.getElementById('providerStatus').textContent = 'Disconnected';
        });

        socket.on('status', (data) => {
            document.getElementById('progressText').textContent = data.message;
            document.getElementById('progressFill').style.width = data.progress + '%';
        });

        socket.on('complete', (data) => {
            currentProject = data;
            document.getElementById('progressContainer').classList.remove('active');
            document.getElementById('generateBtn').disabled = false;
            document.getElementById('generateBtn').textContent = 'EXECUTE GENERATION';

            document.getElementById('outputPath').textContent = 'Output: ' + data.outputPath;

            renderProject(data.data);
            addToHistory(data.data.overview.projectName);
        });

        socket.on('error', (data) => {
            alert('Error: ' + data.message);
            document.getElementById('progressContainer').classList.remove('active');
            document.getElementById('generateBtn').disabled = false;
            document.getElementById('generateBtn').textContent = 'EXECUTE GENERATION';
        });

        function selectType(type) {
            selectedType = type;
            document.querySelectorAll('.type-option').forEach(el => {
                el.classList.remove('active');
            });
            document.querySelector('[data-type="' + type + '"]').classList.add('active');
        }

        function generateProject() {
            const description = document.getElementById('description').value;
            if (!description.trim()) {
                alert('Please enter a project description');
                return;
            }

            document.getElementById('generateBtn').disabled = true;
            document.getElementById('generateBtn').textContent = 'GENERATING...';
            document.getElementById('progressContainer').classList.add('active');
            document.getElementById('progressFill').style.width = '0%';

            socket.emit('generate', {
                description: description,
                type: selectedType,
                provider: document.getElementById('provider').value
            });
        }

        function renderProject(data) {
            // Files
            const fileTree = document.getElementById('fileTree');
            fileTree.innerHTML = '';
            if (data.codeSnippets) {
                data.codeSnippets.forEach(file => {
                    const div = document.createElement('div');
                    div.className = 'file-item';
                    div.textContent = '└── ' + file.filename;
                    div.onclick = () => showCode(file);
                    fileTree.appendChild(div);
                });
            }

            // Schematic
            if (data.schematic) {
                document.getElementById('schematicViewer').innerHTML = data.schematic;
                mermaid.init();
            }

            // BOM
            if (data.bom && data.bom.length > 0) {
                const tbody = document.getElementById('bomTable');
                tbody.innerHTML = '<tr><th>Part Number</th><th>Description</th><th>Qty</th></tr>';
                data.bom.forEach(item => {
                    tbody.innerHTML += '<tr><td>' + (item.partNumber || '') + '</td><td>' + 
                        (item.description || '') + '</td><td>' + (item.quantity || '') + '</td></tr>';
                });
            }

            // Build Guide
            if (data.buildGuide) {
                document.getElementById('buildGuide').textContent = data.buildGuide;
            }
        }

        function showCode(file) {
            document.getElementById('codeViewer').innerHTML = '<pre>' + 
                escapeHtml(file.code || '') + '</pre>';
            showTab('code');
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function showTab(tabName) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));

            event.target.classList.add('active');
            document.getElementById('tab-' + tabName).classList.add('active');
        }

        function addToHistory(projectName) {
            const history = document.getElementById('history');
            const div = document.createElement('div');
            div.style.cssText = 'padding: 8px; border: 1px solid #333; margin-top: 5px; font-size: 12px;';
            div.innerHTML = '<span style="color: #00ff88;">✓</span> ' + projectName;
            history.appendChild(div);
        }

        function newProject() {
            document.getElementById('description').value = '';
            currentProject = null;
            document.getElementById('fileTree').innerHTML = '<div style="color: #666;">No files generated yet</div>';
            document.getElementById('codeViewer').innerHTML = '<pre>No code to display</pre>';
            document.getElementById('schematicViewer').innerHTML = 'No schematic available';
            document.getElementById('bomTable').innerHTML = '<tr><th>Part Number</th><th>Description</th><th>Qty</th></tr><tr><td colspan="3" style="text-align: center; color: #666;">No BOM data</td></tr>';
            document.getElementById('buildGuide').textContent = 'No build guide available';
        }

        function exportZip() {
            if (!currentProject) {
                alert('No project to export');
                return;
            }
            window.location.href = '/api/project/' + encodeURIComponent(currentProject.outputPath.split('/').pop()) + '/download';
        }

        // Initialize mermaid
        mermaid.initialize({ startOnLoad: false });
    </script>
</body>
</html>`;
    }

    async start(outputPath = null, port = 3000) {
        return new Promise((resolve) => {
            this.server.listen(port, () => {
                console.log(`ProtoForge web interface running at http://localhost:${port}`);
                if (outputPath) {
                    console.log(`View project at: http://localhost:${port}`);
                }
                resolve();
            });
        });
    }
}

module.exports = new WebServer();
