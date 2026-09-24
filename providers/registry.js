/**
 * Pluto AI - Provider Registry & Adapter Abstraction
 * Enforces unified interface across all LLM providers (Gemini, OpenAI, Anthropic, Groq, OpenRouter, Ollama)
 */

import { Storage } from '../shared/storage.js';
import { GeminiAdapter } from './gemini.js';
import { OpenAIAdapter } from './openai.js';
import { AnthropicAdapter } from './anthropic.js';
import { GroqAdapter } from './groq.js';
import { OpenRouterAdapter } from './openrouter.js';
import { OllamaAdapter } from './ollama.js';
import { DeepSeekAdapter } from './deepseek.js';

export class ProviderRegistry {
  static adapters = {};

  static register(id, adapterInstance) {
    this.adapters[id] = adapterInstance;
  }

  /**
   * Get an adapter instance by provider ID with its validated API key
   */
  static async getAdapter(providerId = null) {
    const settings = await Storage.getSettings();
    const activeId = providerId || settings.activeProvider || 'gemini';
    const keys = await Storage.getApiKeys();

    const apiKey = keys[activeId] || (activeId === 'ollama' ? (keys.ollamaUrl || 'http://localhost:11434') : null);

    if (!apiKey && activeId !== 'ollama') {
      throw new Error(`No API key configured for ${activeId}. Please click the Settings gear icon and enter your API key.`);
    }

    const adapter = this.adapters[activeId];
    if (!adapter) {
      throw new Error(`Provider adapter "${activeId}" is not registered.`);
    }

    return {
      id: activeId,
      supportsVision: adapter.supportsVision,
      chat: (messages, options = {}) => adapter.chat(apiKey, messages, options),
      decide: (agentContext, options = {}) => adapter.decide(apiKey, agentContext, options)
    };
  }

  static isVisionSupported(providerId) {
    const adapter = this.adapters[providerId];
    return adapter ? !!adapter.supportsVision : false;
  }
}

// Register all supported adapters
ProviderRegistry.register('gemini', new GeminiAdapter());
ProviderRegistry.register('openai', new OpenAIAdapter());
ProviderRegistry.register('anthropic', new AnthropicAdapter());
ProviderRegistry.register('groq', new GroqAdapter());
ProviderRegistry.register('openrouter', new OpenRouterAdapter());
ProviderRegistry.register('ollama', new OllamaAdapter());
ProviderRegistry.register('deepseek', new DeepSeekAdapter());
