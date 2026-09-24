/**
 * PlutoAI - Service Worker & Privacy-First Coordinator
 * On-Device Visual Perception for Lightweight Browser Agents
 */

import { agentEngine } from './agent-engine.js';
import { LLMProviderManager } from './providers.js';
import { privacyFirewall } from './privacy-firewall.js';
import { cryptoService } from './crypto-service.js';
import { performanceMonitor } from './performance-monitor.js';

// Default configuration settings
const DEFAULT_SETTINGS = {
  provider: 'gemini',
  geminiApiKey: '',
  geminiModel: 'gemini-3.5-flash-lite',
  openaiApiKey: '',
  openaiModel: 'gpt-4o',
  claudeApiKey: '',
  claudeModel: 'claude-3-5-sonnet-20241022',
  groqApiKey: '',
  groqModel: 'llama-3.2-90b-vision-preview',
  mistralApiKey: '',
  mistralModel: 'pixtral-12b-2409',
  deepseekApiKey: '',
  deepseekModel: 'deepseek-chat',
  togetherApiKey: '',
  togetherModel: 'meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo',
  xaiApiKey: '',
  xaiModel: 'grok-2-vision-1212',
  cohereApiKey: '',
  cohereModel: 'command-r-plus',
  customEndpoint: '',
  maxSteps: 25,
  stepDelay: 350,
  privacyMode: 'cloud', // 'cloud' (sanitized remote) | 'offline' (on-device only)
  redactionMode: 'blur', // 'blur' | 'blackout' | 'mask'
  enableVisualCursor: true,
  enableLaserRipples: true,
  autoScroll: true,
  showThoughtStream: true,
  requireSensitiveConfirm: true
};

// Initialize settings and crypto on installation
chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(null);
  const updated = { ...DEFAULT_SETTINGS, ...current };
  await chrome.storage.local.set(updated);
  await cryptoService.init();
  console.log("%c[PlutoAI Service Worker] Initialized with Multi-Provider AI Architecture.", "color: #38bdf8; font-weight: bold;");
});

// Configure Side Panel behavior to open persistent Side Panel on action click (does not reload on page change)
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
}

// Action Button Click -> Open Persistent Side Panel or fallback to in-page sidebar
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab) return;
  if (chrome.sidePanel && typeof chrome.sidePanel.open === 'function' && tab.windowId) {
    try {
      await chrome.sidePanel.open({ windowId: tab.windowId });
      return;
    } catch (e) {
      console.warn("Could not open native sidePanel, falling back to in-page toggle:", e);
    }
  }
  if (!tab.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_SIDEBAR' });
  } catch (err) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: [
          'content/dom-indexer.js',
          'content/ocr-engine.js',
          'content/onnx-runner.js',
          'content/pii-detector.js',
          'content/privacy-redactor.js',
          'content/verifier.js',
          'content/local-perception.js',
          'content/actuator.js',
          'content/visual-overlay.js',
          'content/sidebar-injector.js',
          'content/content.js'
        ]
      });
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ['content/content.css']
      });
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_SIDEBAR' }).catch(() => {});
      }, 200);
    } catch (injErr) {
      console.warn("Failed to inject content scripts on action click:", injErr);
    }
  }
});

// Broadcast Agent Engine events
agentEngine.subscribe(({ event, state, payload }) => {
  chrome.runtime.sendMessage({
    type: 'AGENT_EVENT',
    event,
    state,
    payload
  }).catch(() => {});

  if (state.activeTabId) {
    chrome.tabs.sendMessage(state.activeTabId, {
      type: 'AGENT_TAB_EVENT',
      event,
      state,
      payload
    }).catch(() => {});
  }
});

// Runtime Messaging Hub
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessageAsync(message.action, message.payload, sender)
    .then(sendResponse)
    .catch(err => {
      console.error("[PlutoAI ServiceWorker Error]", err);
      sendResponse({ status: 'error', error: err.message });
    });
  return true;
});

async function handleMessageAsync(action, payload = {}, sender) {
  switch (action) {
    case 'START_TASK': {
      const settings = await chrome.storage.local.get(null);
      const provider = payload.provider || settings.provider || 'gemini';

      let apiKey = '';
      let model = '';
      if (provider === 'gemini') {
        apiKey = settings.geminiApiKey || payload.apiKey;
        model = settings.geminiModel || 'gemini-3.5-flash-lite';
      } else if (provider === 'openai') {
        apiKey = settings.openaiApiKey || payload.apiKey;
        model = settings.openaiModel || 'gpt-4o';
      } else if (provider === 'claude') {
        apiKey = settings.claudeApiKey || payload.apiKey;
        model = settings.claudeModel || 'claude-3-5-sonnet-20241022';
      } else if (provider === 'groq') {
        apiKey = settings.groqApiKey || payload.apiKey;
        model = settings.groqModel || 'llama-3.2-90b-vision-preview';
      } else if (provider === 'mistral') {
        apiKey = settings.mistralApiKey || payload.apiKey;
        model = settings.mistralModel || 'pixtral-12b-2409';
      } else if (provider === 'deepseek') {
        apiKey = settings.deepseekApiKey || payload.apiKey;
        model = settings.deepseekModel || 'deepseek-chat';
      } else if (provider === 'together') {
        apiKey = settings.togetherApiKey || payload.apiKey;
        model = settings.togetherModel || 'meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo';
      } else if (provider === 'xai') {
        apiKey = settings.xaiApiKey || payload.apiKey;
        model = settings.xaiModel || 'grok-2-vision-1212';
      } else if (provider === 'cohere') {
        apiKey = settings.cohereApiKey || payload.apiKey;
        model = settings.cohereModel || 'command-r-plus';
      } else if (provider === 'custom') {
        apiKey = settings.customApiKey || payload.apiKey;
        model = settings.customModel || 'default';
      }

      let tabId = sender.tab ? sender.tab.id : null;
      if (!tabId) {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        tabId = activeTab?.id;
      }

      const task = await agentEngine.startTask({
        goal: payload.goal,
        tabId,
        provider,
        apiKey,
        model: payload.model || model,
        customEndpoint: settings.customEndpoint,
        maxSteps: parseInt(settings.maxSteps, 10) || 25,
        stepDelay: parseInt(settings.stepDelay, 10) || 350,
        privacyMode: payload.privacyMode || settings.privacyMode || 'cloud',
        redactionMode: payload.redactionMode || settings.redactionMode || 'blur'
      });

      return { task };
    }

    case 'PAUSE_TASK':
      await agentEngine.pauseTask();
      return { state: agentEngine.getState() };

    case 'RESUME_TASK':
      await agentEngine.resumeTask();
      return { state: agentEngine.getState() };

    case 'STOP_TASK':
      await agentEngine.stopTask(payload?.reason || "Stopped by user.");
      return { state: agentEngine.getState() };

    case 'CONFIRM_SENSITIVE_ACTION':
      await agentEngine.confirmSensitiveAction();
      return { state: agentEngine.getState() };

    case 'GET_AGENT_STATE':
      return { state: agentEngine.getState() };

    case 'RESET_AGENT_STATE':
      agentEngine.resetState();
      return { state: agentEngine.getState() };

    case 'GET_PRIVACY_METRICS':
      return { metrics: privacyFirewall.getMetrics() };

    case 'GET_SECURITY_STATUS':
      return { security: cryptoService.getStatus() };

    case 'GET_PERFORMANCE_METRICS': {
      const telemetry = await performanceMonitor.getTelemetry();
      return { telemetry };
    }

    case 'RUN_EVALUATION_BENCHMARK': {
      const benchmark = performanceMonitor.runEvaluationSuite();
      return { benchmark };
    }

    case 'RUN_LIVE_PII_SCAN': {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab?.id) throw new Error("No active tab found.");

      // Ensure content scripts are injected in active tab
      await agentEngine.ensureContentScriptsInjected(activeTab.id).catch(() => {});
      await new Promise(r => setTimeout(r, 150));

      let perceptionRes = await chrome.tabs.sendMessage(activeTab.id, { action: 'RUN_LOCAL_PERCEPTION' }).catch(() => null);
      if (!perceptionRes) {
        perceptionRes = await chrome.tabs.sendMessage(activeTab.id, { action: 'DETECT_PII' }).catch(() => null);
      }

      const perception = perceptionRes?.perception || perceptionRes;
      const piiEntities = perception?.pii?.entities || perception?.entities || perception?.piiData?.entities || [];
      const domTags = perception?.dom?.tags || perception?.tags || [];
      const mode = payload?.mode || 'blackout';

      let rawScreenshotDataUrl = null;
      let sanitizedScreenshot = null;

      try {
        rawScreenshotDataUrl = await chrome.tabs.captureVisibleTab(activeTab.windowId, { format: 'png' });
      } catch (err) {
        console.warn("[PlutoAI] captureVisibleTab error during PII scan:", err);
      }

      if (rawScreenshotDataUrl) {
        try {
          const sanitizeRes = await chrome.tabs.sendMessage(activeTab.id, {
            action: 'SANITIZE_CONTEXT',
            payload: {
              screenshotDataUrl: rawScreenshotDataUrl,
              piiEntities,
              domTags,
              mode
            }
          });
          sanitizedScreenshot = sanitizeRes?.sanitized?.sanitizedScreenshot || rawScreenshotDataUrl;
        } catch (err) {
          console.warn("[PlutoAI] SANITIZE_CONTEXT error:", err);
          sanitizedScreenshot = rawScreenshotDataUrl;
        }
      }

      const preview = {
        step: 0,
        timestamp: Date.now(),
        originalScreenshot: rawScreenshotDataUrl,
        sanitizedScreenshot: sanitizedScreenshot || rawScreenshotDataUrl,
        piiEntities,
        sanitizedTagsCount: domTags.length,
        redactionMode: mode
      };

      return { perception, preview };
    }

    case 'GET_SETTINGS': {
      const stored = await chrome.storage.local.get(null);
      return { settings: { ...DEFAULT_SETTINGS, ...stored } };
    }

    case 'SAVE_SETTINGS': {
      await chrome.storage.local.set(payload);
      return { settings: payload };
    }

    case 'TEST_API_KEY': {
      try {
        const msg = await testProviderConnection(payload);
        return { valid: true, message: msg };
      } catch (err) {
        return { valid: false, error: err.message };
      }
    }

    case 'OPEN_OPTIONS': {
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
      }
      return { success: true };
    }

    default:
      return { unhandled: true };
  }
}

async function testProviderConnection({ provider, apiKey, model, customEndpoint }) {
  if (provider === 'simulator') {
    return "Privacy Simulator is active (no remote API key required).";
  }

  if (!apiKey && provider !== 'ollama') {
    throw new Error(`API key for ${provider.toUpperCase()} is required.`);
  }

  const dummyPixel = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

  const result = await LLMProviderManager.queryModel({
    provider,
    apiKey,
    model,
    customEndpoint,
    goal: "Verify privacy-first API connection.",
    step: 1,
    history: [],
    url: "https://example.com",
    title: "Connection Test",
    tags: [{ tag: "1", tagName: "BUTTON", text: "Secure Button", rect: { x: 10, y: 10 } }],
    imageBase64: dummyPixel
  });

  return `Connected to ${provider.toUpperCase()} (${model || 'default'})! AI response: "${result.thought || result.action}"`;
}
