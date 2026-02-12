const axios = require('axios');
const Config = require('../core/config');

class AIAdapter {
    constructor() {
        this.provider = Config.get('aiProvider') || 'ollama';
        this.apiKey = Config.get('apiKey');
        this.baseUrl = Config.get('baseUrl');
        this.model = Config.get('model');
        this.temperature = Config.get('temperature') || 0.7;
        this.maxTokens = Config.get('maxTokens') || 4096;
    }

    async generate(prompt, systemPrompt, onToken) {
        switch (this.provider) {
            case 'ollama':
                return this._generateOllama(prompt, systemPrompt, onToken);
            case 'openai':
                return this._generateOpenAI(prompt, systemPrompt, onToken);
            case 'groq':
                return this._generateGroq(prompt, systemPrompt, onToken);
            case 'anthropic':
                return this._generateAnthropic(prompt, systemPrompt, onToken);
            case 'gemini':
                return this._generateGemini(prompt, systemPrompt, onToken);
            case 'deepseek':
                return this._generateDeepSeek(prompt, systemPrompt, onToken);
            default:
                throw new Error(`Unknown provider: ${this.provider}`);
        }
    }

    async _generateOllama(prompt, systemPrompt, onToken) {
        const url = `${this.baseUrl}/api/generate`;
        const response = await axios.post(url, {
            model: this.model,
            prompt: prompt,
            system: systemPrompt,
            stream: false,
            options: {
                temperature: this.temperature,
                num_predict: this.maxTokens
            }
        });

        return response.data.response;
    }

    async _generateOpenAI(prompt, systemPrompt, onToken) {
        const url = 'https://api.openai.com/v1/chat/completions';
        const response = await axios.post(url, {
            model: this.model || 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            temperature: this.temperature,
            max_tokens: this.maxTokens
        }, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.choices[0].message.content;
    }

    async _generateGroq(prompt, systemPrompt, onToken) {
        const url = 'https://api.groq.com/openai/v1/chat/completions';
        const response = await axios.post(url, {
            model: this.model || 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            temperature: this.temperature,
            max_tokens: this.maxTokens
        }, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.choices[0].message.content;
    }

    async _generateAnthropic(prompt, systemPrompt, onToken) {
        const url = 'https://api.anthropic.com/v1/messages';
        const response = await axios.post(url, {
            model: this.model || 'claude-sonnet-4-20250514',
            max_tokens: this.maxTokens,
            temperature: this.temperature,
            system: systemPrompt,
            messages: [
                { role: 'user', content: prompt }
            ]
        }, {
            headers: {
                'x-api-key': this.apiKey,
                'Content-Type': 'application/json',
                'anthropic-version': '2023-06-01'
            }
        });

        return response.data.content[0].text;
    }

    async _generateGemini(prompt, systemPrompt, onToken) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model || 'gemini-2.0-flash'}:generateContent?key=${this.apiKey}`;
        const response = await axios.post(url, {
            contents: [{
                parts: [
                    { text: systemPrompt + "\n\n" + prompt }
                ]
            }],
            generationConfig: {
                temperature: this.temperature,
                maxOutputTokens: this.maxTokens
            }
        });

        return response.data.candidates[0].content.parts[0].text;
    }

    async _generateDeepSeek(prompt, systemPrompt, onToken) {
        const url = 'https://api.deepseek.com/v1/chat/completions';
        const response = await axios.post(url, {
            model: this.model || 'deepseek-chat',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            temperature: this.temperature,
            max_tokens: this.maxTokens
        }, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.choices[0].message.content;
    }

    async testConnection() {
        try {
            switch (this.provider) {
                case 'ollama':
                    await axios.get(`${this.baseUrl}/api/tags`);
                    return true;
                case 'openai':
                    await axios.get('https://api.openai.com/v1/models', {
                        headers: { 'Authorization': `Bearer ${this.apiKey}` }
                    });
                    return true;
                default:
                    return true;
            }
        } catch (error) {
            return false;
        }
    }

    static getAvailableProviders() {
        return [
            { name: 'ollama', label: 'Ollama (Local)', requiresKey: false },
            { name: 'openai', label: 'OpenAI', requiresKey: true },
            { name: 'groq', label: 'Groq', requiresKey: true },
            { name: 'anthropic', label: 'Anthropic', requiresKey: true },
            { name: 'gemini', label: 'Google Gemini', requiresKey: true },
            { name: 'deepseek', label: 'DeepSeek', requiresKey: true }
        ];
    }
}

module.exports = AIAdapter;
