const AIAdapter = require('../ai/adapter');
const systemPrompts = require('../prompts/system');

class Generator {
    async generatePrototype(description, options = {}) {
        const adapter = new AIAdapter();
        const type = options.type || 'hybrid';

        try {
            const systemPrompt = systemPrompts.getPrompt(type);
            const userPrompt = this._buildUserPrompt(description, type);

            console.log('[GEN] Sending request to AI provider...');

            const response = await adapter.generate(userPrompt, systemPrompt);

            // Parse JSON response
            let parsed;
            try {
                // Try to extract JSON from markdown code blocks if present
                const jsonMatch = response.match(/```json\s*([\s\S]*?)```/) || 
                                  response.match(/```\s*([\s\S]*?)```/);
                const jsonStr = jsonMatch ? jsonMatch[1] : response;
                parsed = JSON.parse(jsonStr.trim());
            } catch (e) {
                console.error('[ERR] Failed to parse AI response as JSON');
                console.error('Raw response:', response.substring(0, 500));
                throw new Error('Invalid JSON response from AI');
            }

            return {
                success: true,
                data: parsed,
                raw: response
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    _buildUserPrompt(description, type) {
        return `Create a complete ${type} prototype project for the following idea:

${description}

Please provide the response in the exact JSON format specified in the system instructions.`;
    }
}

module.exports = new Generator();
