/**
 * Pluto AI - Anthropic Claude Adapter
 * Implements chat and multimodal decide calls using Anthropic Messages API
 */

export class AnthropicAdapter {
  constructor() {
    this.supportsVision = true;
  }

  async chat(apiKey, messages, options = {}) {
    const model = options.model || 'claude-3-5-haiku-20241022';
    const url = 'https://api.anthropic.com/v1/messages';

    const formattedMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));

    const body = {
      model,
      max_tokens: options.maxTokens || 2048,
      temperature: options.temperature !== undefined ? options.temperature : 0.2,
      messages: formattedMessages
    };

    if (options.systemPrompt) {
      body.system = options.systemPrompt;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'dangerously-allow-browser': 'true'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Anthropic API Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.content?.map(c => c.text).join('\n') || '';
  }

  async decide(apiKey, agentContext, options = {}) {
    const model = options.model || 'claude-3-5-sonnet-20241022';
    const url = 'https://api.anthropic.com/v1/messages';

    const contextPrompt = `
Overall Goal: ${agentContext.goal}
Current Plan Step: ${JSON.stringify(agentContext.currentStep)}

Recent Action History:
${(agentContext.actionHistory || []).map((h, i) => `${i + 1}. [${h.action?.skill || 'action'}] Target: ${h.action?.target || 'none'} -> Result: ${h.observed_change || h.error || 'ok'}`).join('\n') || 'None yet'}

Interactive Page Elements (Condensed DOM):
${agentContext.condensedDom || 'No interactive elements detected.'}

Decide the next action. You MUST respond with ONLY strict JSON matching the required schema.
`.trim();

    const userContent = [];

    if (this.supportsVision && agentContext.screenshot) {
      const match = agentContext.screenshot.match(/^data:(image\/[a-z]+);base64,(.+)$/);
      if (match) {
        userContent.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: match[1],
            data: match[2]
          }
        });
      }
    }

    userContent.push({ type: 'text', text: contextPrompt });

    const body = {
      model,
      max_tokens: 1500,
      system: agentContext.systemPrompt,
      messages: [{ role: 'user', content: userContent }],
      temperature: 0.1
    };

    let attempts = 0;
    while (attempts < 2) {
      attempts++;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
            'dangerously-allow-browser': 'true'
          },
          body: JSON.stringify(body)
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Anthropic Decide Error (${res.status}): ${errText}`);
        }

        const data = await res.json();
        const text = data.content?.map(c => c.text).join('\n') || '';
        return this.cleanAndParseJson(text);
      } catch (err) {
        if (attempts >= 2) throw err;
      }
    }
  }

  cleanAndParseJson(raw) {
    let text = raw.trim();
    if (text.startsWith('```json')) {
      text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    try {
      return JSON.parse(text);
    } catch (e) {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        return JSON.parse(text.substring(start, end + 1));
      }
      throw new Error(`Failed to parse JSON from Anthropic: ${text}`);
    }
  }
}
