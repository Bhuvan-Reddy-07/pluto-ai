/**
 * Pluto AI - Ollama Local Adapter
 * Connects to local Ollama instance (default http://localhost:11434)
 */

export class OllamaAdapter {
  constructor() {
    this.supportsVision = false;
  }

  async chat(endpoint, messages, options = {}) {
    const url = `${endpoint || 'http://localhost:11434'}/api/chat`;
    const model = options.model || 'llama3:latest';

    const formattedMessages = [];
    if (options.systemPrompt) {
      formattedMessages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.forEach(m => formattedMessages.push({ role: m.role, content: m.content }));

    const body = {
      model,
      messages: formattedMessages,
      stream: false,
      format: options.json ? 'json' : undefined
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Ollama Error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.message?.content || '';
  }

  async decide(endpoint, agentContext, options = {}) {
    const url = `${endpoint || 'http://localhost:11434'}/api/chat`;
    const model = options.model || 'llama3:latest';

    const contextPrompt = `
Overall Goal: ${agentContext.goal}
Current Plan Step: ${JSON.stringify(agentContext.currentStep)}

Recent Action History:
${(agentContext.actionHistory || []).map((h, i) => `${i + 1}. [${h.action?.skill || 'action'}] Target: ${h.action?.target || 'none'} -> Result: ${h.observed_change || h.error || 'ok'}`).join('\n') || 'None yet'}

Interactive Page Elements (Condensed DOM):
${agentContext.condensedDom || 'No interactive elements detected.'}

Decide next action. Output strict JSON matching schema.
`.trim();

    const body = {
      model,
      messages: [
        { role: 'system', content: agentContext.systemPrompt },
        { role: 'user', content: contextPrompt }
      ],
      stream: false,
      format: 'json'
    };

    let attempts = 0;
    while (attempts < 2) {
      attempts++;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Ollama Decide Error (${res.status}): ${errText}`);
        }

        const data = await res.json();
        const content = data.message?.content || '';
        return JSON.parse(content);
      } catch (err) {
        if (attempts >= 2) throw err;
      }
    }
  }
}
