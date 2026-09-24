/**
 * Pluto AI - Google Gemini Adapter
 * Implements chat and multimodal decide calls using Gemini REST API with
 * automatic fallback for deprecated model identifiers.
 */

export class GeminiAdapter {
  constructor() {
    this.supportsVision = true;
  }

  normalizeModel(model) {
    if (!model) return 'gemini-3.5-flash-lite';
    // If deprecated model was supplied (e.g. gemini-2.0-flash, 1.5, or 2.5), upgrade to high-quota model
    if (model.includes('2.0') || model.includes('1.5') || model.includes('2.5')) {
      return 'gemini-3.5-flash-lite';
    }
    return model;
  }

  /**
   * General chat / text generation
   */
  async chat(apiKey, messages, options = {}) {
    let model = this.normalizeModel(options.model);
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const body = {
      contents,
      generationConfig: {
        temperature: options.temperature !== undefined ? options.temperature : 0.2,
        maxOutputTokens: options.maxTokens || 2048
      }
    };

    if (options.json) {
      body.generationConfig.responseMimeType = 'application/json';
    }

    if (options.systemPrompt) {
      body.systemInstruction = {
        parts: [{ text: options.systemPrompt }]
      };
    }

    let attempts = 0;
    while (attempts < 2) {
      attempts++;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errText = await response.text();
        // If 404 (model retired), automatically fallback to gemini-3.6-flash or gemini-3.5-flash-lite
        if (response.status === 404 && attempts === 1) {
          console.warn(`[GeminiAdapter] Model ${model} returned 404, falling back to gemini-3.6-flash...`);
          model = 'gemini-3.6-flash';
          continue;
        }
        throw new Error(`Gemini API Error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const candidate = data.candidates && data.candidates[0];
      if (!candidate || !candidate.content || !candidate.content.parts) {
        throw new Error('Gemini returned an empty candidate.');
      }

      return candidate.content.parts.map(p => p.text).join('\n');
    }
  }

  /**
   * Decide method for autonomous subagent loop
   */
  async decide(apiKey, agentContext, options = {}) {
    let model = this.normalizeModel(options.model);

    // Construct prompt parts
    const parts = [];

    // Context text
    const contextPrompt = `
Overall Goal: ${agentContext.goal}
Current Plan Step: ${JSON.stringify(agentContext.currentStep)}

Recent Action History:
${(agentContext.actionHistory || []).map((h, i) => `${i + 1}. [${h.action?.skill || 'action'}] Target: ${h.action?.target || 'none'} -> Result: ${h.observed_change || h.error || 'ok'}`).join('\n') || 'None yet'}

Interactive Page Elements (Condensed DOM):
${agentContext.condensedDom || 'No interactive elements detected.'}

Observe the current page state, compare against the current plan step and goal, and decide the next action.
Remember to respond with ONLY valid JSON according to the required schema.
`.trim();

    parts.push({ text: contextPrompt });

    // Multimodal screenshot if available and enabled
    if (this.supportsVision && agentContext.screenshot) {
      const base64Data = agentContext.screenshot.replace(/^data:image\/[a-z]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data
        }
      });
    }

    const body = {
      contents: [{ role: 'user', parts }],
      systemInstruction: {
        parts: [{ text: agentContext.systemPrompt }]
      },
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    };

    let attempts = 0;
    while (attempts < 3) {
      attempts++;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          const errText = await response.text();
          // Auto fallback if model retired (404)
          if (response.status === 404 && attempts < 3) {
            console.warn(`[GeminiAdapter] Model ${model} returned 404, falling back to gemini-3.6-flash...`);
            model = 'gemini-3.6-flash';
            continue;
          }
          throw new Error(`Gemini Decide API Error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        const candidate = data.candidates && data.candidates[0];
        if (!candidate || !candidate.content || !candidate.content.parts) {
          throw new Error('Gemini returned an empty decision candidate.');
        }

        const rawText = candidate.content.parts.map(p => p.text).join('\n').trim();
        const parsed = this.cleanAndParseJson(rawText);
        return parsed;
      } catch (err) {
        if (attempts >= 3) throw err;
        console.warn('[GeminiAdapter] JSON parse or API error, retrying...', err);
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
      throw new Error(`Failed to parse valid JSON from Gemini output: ${text}`);
    }
  }
}
