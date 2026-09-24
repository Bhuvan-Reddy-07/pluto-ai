/**
 * Pluto AI - Shared Storage Utilities
 * Provides typed, Promise-based access to chrome.storage.local
 */

export const STORAGE_KEYS = {
  API_KEYS: 'pluto_api_keys',
  ACTIVE_PROVIDER: 'pluto_active_provider',
  ACTIVE_MODEL: 'pluto_active_model',
  APPROVAL_MODE: 'pluto_approval_mode',
  BLOCKED_DOMAINS: 'pluto_blocked_domains',
  CURRENT_TASK: 'pluto_current_task',
  CONVERSATIONS: 'pluto_conversations',
  SESSION_REPLAYS: 'pluto_session_replays',
  SETTINGS: 'pluto_settings'
};

export const DEFAULT_SETTINGS = {
  activeProvider: 'gemini',
  activeModel: 'gemini-3.5-flash-lite',
  approvalMode: true,
  blockedDomains: [
    'bankofamerica.com',
    'chase.com',
    'wellsfargo.com',
    'paypal.com/signin'
  ],
  maxSteps: 25,
  stepTimeoutSeconds: 60,
  enableVision: true,
  enableCdpFallback: true,
  privacyShieldEnabled: true,
  redactionMode: 'blur', // 'blur' | 'blackout' | 'mask'
  speechEnabled: false,
  visualOverlayEnabled: true
};

export const Storage = {
  /**
   * Get value for a specific key with optional fallback
   */
  async get(key, defaultValue = null) {
    try {
      const result = await chrome.storage.local.get([key]);
      return result[key] !== undefined ? result[key] : defaultValue;
    } catch (err) {
      console.error(`[Pluto Storage] Error getting ${key}:`, err);
      return defaultValue;
    }
  },

  /**
   * Set value for a specific key
   */
  async set(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
      return true;
    } catch (err) {
      console.error(`[Pluto Storage] Error setting ${key}:`, err);
      return false;
    }
  },

  /**
   * Remove key(s) from storage
   */
  async remove(keys) {
    try {
      await chrome.storage.local.remove(keys);
      return true;
    } catch (err) {
      console.error(`[Pluto Storage] Error removing ${keys}:`, err);
      return false;
    }
  },

  /**
   * Retrieve all configured API keys
   */
  async getApiKeys() {
    return this.get(STORAGE_KEYS.API_KEYS, {});
  },

  /**
   * Save API key for a provider
   */
  async setApiKey(providerId, apiKey) {
    const keys = await this.getApiKeys();
    keys[providerId] = apiKey.trim();
    return this.set(STORAGE_KEYS.API_KEYS, keys);
  },

  /**
   * Get active settings combined with defaults
   */
  async getSettings() {
    const customSettings = await this.get(STORAGE_KEYS.SETTINGS, {});
    const merged = { ...DEFAULT_SETTINGS, ...customSettings };
    // Auto-migrate deprecated Gemini models to the highest-quota gemini-3.5-flash-lite
    if (merged.activeProvider === 'gemini' && (
      !merged.activeModel ||
      merged.activeModel.includes('1.5') ||
      merged.activeModel.includes('2.0') ||
      merged.activeModel.includes('2.5')
    )) {
      merged.activeModel = 'gemini-3.5-flash-lite';
    }
    return merged;
  },

  /**
   * Save updated settings
   */
  async updateSettings(newSettings) {
    const current = await this.getSettings();
    const merged = { ...current, ...newSettings };
    return this.set(STORAGE_KEYS.SETTINGS, merged);
  },

  /**
   * Get active task state
   */
  async getCurrentTask() {
    return this.get(STORAGE_KEYS.CURRENT_TASK, null);
  },

  /**
   * Save or clear active task state
   */
  async setCurrentTask(taskState) {
    if (taskState === null) {
      return this.remove(STORAGE_KEYS.CURRENT_TASK);
    }
    return this.set(STORAGE_KEYS.CURRENT_TASK, taskState);
  },

  /**
   * Get all conversation records
   */
  async getConversations() {
    return this.get(STORAGE_KEYS.CONVERSATIONS, []);
  },

  /**
   * Save conversation
   */
  async saveConversation(conversation) {
    const convos = await this.getConversations();
    const idx = convos.findIndex(c => c.id === conversation.id);
    if (idx >= 0) {
      convos[idx] = conversation;
    } else {
      convos.unshift(conversation);
    }
    // Cap to 20 conversations to save storage
    if (convos.length > 20) {
      convos.pop();
    }
    return this.set(STORAGE_KEYS.CONVERSATIONS, convos);
  },

  /**
   * Save session replay entry (screenshots + actions)
   */
  async saveReplayStep(conversationId, stepData) {
    const replays = await this.get(STORAGE_KEYS.SESSION_REPLAYS, {});
    if (!replays[conversationId]) {
      replays[conversationId] = [];
    }
    replays[conversationId].push(stepData);

    // Limit session replays to last 10 tasks, and max 30 steps each
    const keys = Object.keys(replays);
    if (keys.length > 10) {
      delete replays[keys[0]];
    }
    if (replays[conversationId].length > 30) {
      replays[conversationId].shift();
    }
    return this.set(STORAGE_KEYS.SESSION_REPLAYS, replays);
  },

  /**
   * Get session replay for a conversation
   */
  async getReplay(conversationId) {
    const replays = await this.get(STORAGE_KEYS.SESSION_REPLAYS, {});
    return replays[conversationId] || [];
  }
};
