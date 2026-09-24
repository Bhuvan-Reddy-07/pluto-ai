/**
 * Pluto AI - Groq Adapter
 * Fast text-only inference via Groq OpenAI-compatible endpoint
 */

export class GroqAdapter {
  constructor() {
    this.supportsVision = false; // As per specification: Groq is text-only
  }

  async chat(apiKey, messages, options = {}) {
    const model = options.model || 'llama-3.3-70b-versatile';
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const formattedMessages = [];
    if (options.systemPrompt) {
      formattedMessages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.forEach(m => {
      formattedMessages.push({ role: m.role, content: m.content });
    });

    const body = {
      model,
      messages: formattedMessages,
      temperature: options.temperature !== undefined ? options.temperature : 0.2
    };

    if (options.json) {
      body.response_format = { type: 'json_object' };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq API Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async decide(apiKey, agentContext, options = {}) {
    const model = options.model || 'llama-3.3-70b-versatile';
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    const contextPrompt = `
Overall Goal: ${agentContext.goal}
Current Plan Step: ${JSON.stringify(agentContext.currentStep)}

Recent Action History:
${(agentContext.actionHistory || []).map((h, i) => `${i + 1}. [${h.action?.skill || 'action'}] Target: ${h.action?.target || 'none'} -> Result: ${h.observed_change || h.error || 'ok'}`).join('\n') || 'None yet'}

Interactive Page Elements (Condensed DOM):
${agentContext.condensedDom || 'No interactive elements detected.'}

Observe the current page DOM, compare against the plan step, and output the next action as strict JSON.
`.trim();

    const body = {
      model,
      messages: [
        { role: 'system', content: agentContext.systemPrompt },
        { role: 'user', content: contextPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    };

    let attempts = 0;
    while (attempts < 2) {
      attempts++;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Groq Decide Error (${res.status}): ${errText}`);
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || '';
        return this.cleanAndParseJson(content);
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
      throw new Error(`Failed to parse JSON from Groq: ${text}`);
    }
  }
}
