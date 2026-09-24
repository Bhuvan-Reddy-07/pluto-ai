/**
 * Pluto AI - Prompt Router
 * Classifies user intent into DIRECT_READ, NAV_EXTRACT, or AGENTIC mode.
 * Handles DIRECT_READ directly without planning or browser control.
 */

import { ProviderRegistry } from '../providers/registry.js';
import { Prompts } from '../shared/prompts.js';
import { NLPEngine } from '../shared/nlp-engine.js';

export class Router {
  /**
   * Fast classification of user prompt
   */
  static async classify(prompt, options = {}) {
    const normPrompt = NLPEngine.normalizeText(prompt);

    // 0. Fast-path intent classification via NLPEngine without burning tokens
    const semantic = NLPEngine.classifyIntent(normPrompt);
    if (semantic.confidence >= 0.90) {
      if (semantic.intent === 'extract_data' && (normPrompt.includes('this page') || normPrompt.includes('summarize'))) {
        return { mode: 'DIRECT_READ', reason: 'Question pertains directly to the currently open page.' };
      }
      if (['youtube_search_play', 'doc_author', 'scholar_research', 'wikipedia_lookup', 'github_explore', 'isro_mission', 'auth_form'].includes(semantic.intent)) {
        return { mode: 'AGENTIC', reason: `Deterministic high-confidence ${semantic.intent} pipeline.` };
      }
    }

    try {
      const adapter = await ProviderRegistry.getAdapter(options.provider);
      const messages = [{ role: 'user', content: `User Prompt: "${normPrompt}"` }];

      const responseText = await adapter.chat(messages, {
        systemPrompt: Prompts.ROUTER,
        json: true,
        temperature: 0.1,
        model: options.model
      });

      const parsed = this.parseJsonSafely(responseText);
      const mode = parsed.mode?.toUpperCase();

      if (['DIRECT_READ', 'NAV_EXTRACT', 'AGENTIC'].includes(mode)) {
        return {
          mode,
          reason: parsed.reason || 'Classified based on intent structure.'
        };
      }
    } catch (err) {
      console.warn('[Pluto Router] Classification failed or errored, using rule-based fallback:', err);
    }

    // Rule-based heuristic fallback
    return this.fallbackClassify(normPrompt);
  }

  static fallbackClassify(prompt) {
    const norm = NLPEngine.normalizeText(prompt);
    const lower = norm.toLowerCase();

    // Direct Read indicators
    if (
      lower.includes('this page') ||
      lower.includes('this article') ||
      lower.includes('summarize this') ||
      lower.startsWith('what is this') ||
      lower.includes('what does this say') ||
      lower.includes('explain this')
    ) {
      return { mode: 'DIRECT_READ', reason: 'Question pertains to the currently open page.' };
    }

    // Nav Extract indicators
    if (
      (lower.startsWith('go to') || lower.startsWith('open ') || lower.startsWith('navigate to')) &&
      (lower.includes('and find') || lower.includes('and tell me') || lower.includes('and get')) &&
      !lower.includes('click') && !lower.includes('submit') && !lower.includes('fill')
    ) {
      return { mode: 'NAV_EXTRACT', reason: 'Navigates to URL and extracts public information.' };
    }

    // Default to AGENTIC
    return { mode: 'AGENTIC', reason: 'Task requires interaction, typing, clicking, or multi-step execution.' };
  }

  /**
   * Direct Read Handler: Extract text from active tab, query LLM once, and return response
   */
  static async handleDirectRead(tabId, prompt, options = {}) {
    // 1. Ensure scripts are injected
    await this.ensureInjected(tabId);

    // 2. Extract clean content
    let extracted;
    try {
      extracted = await chrome.tabs.sendMessage(tabId, { type: 'EXTRACT_PAGE_CONTENT' });
    } catch (e) {
      console.warn('[Pluto Router] Content script message failed:', e);
      extracted = { success: false, content: 'Could not extract content from current page.' };
    }

    const pageText = extracted?.content || 'No text extracted.';
    const pageTitle = extracted?.title || 'Current Page';
    const pageUrl = extracted?.url || '';

    // 3. Ask LLM directly
    const adapter = await ProviderRegistry.getAdapter(options.provider);
    const systemPrompt = `You are Pluto AI. Answer the user's question accurately using ONLY the provided content from the currently open webpage (${pageTitle}, ${pageUrl}). Format your response in clean Markdown.`;

    const userMessage = `
Webpage Title: ${pageTitle}
Webpage URL: ${pageUrl}

Page Content:
${pageText}

---------------------
User Question: ${prompt}
`.trim();

    const answer = await adapter.chat([{ role: 'user', content: userMessage }], {
      systemPrompt,
      model: options.model
    });

    return answer;
  }

  static async ensureInjected(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: [
          'content/dom-condenser.js',
          'content/resolver.js',
          'content/pii-detector.js',
          'content/privacy-redactor.js',
          'content/visual-overlay.js',
          'content/content.js'
        ]
      });
    } catch (err) {
      // May fail on restricted pages (chrome://, webstore)
      console.warn('[Pluto Router] Could not inject content scripts:', err);
    }
  }

  static parseJsonSafely(raw) {
    let text = (raw || '').trim();
    if (text.startsWith('```json')) text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    else if (text.startsWith('```')) text = text.replace(/^```\s*/, '').replace(/\s*```$/, '');

    try {
      return JSON.parse(text);
    } catch (e) {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start !== -1 && end > start) {
        return JSON.parse(text.substring(start, end + 1));
      }
      return {};
    }
  }
}
