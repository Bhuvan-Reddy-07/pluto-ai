/**
 * Pluto AI - Background Service Worker
 * Central lifecycle manager, keepalive watchdog, and execution coordinator.
 */

import { Storage } from '../shared/storage.js';
import { Router } from './router.js';
import { Planner } from './planner.js';
import { Subagent } from './subagent.js';
import { Memory } from './memory.js';
import { performanceMonitor } from './performance-monitor.js';
import { privacyFirewall } from './privacy-firewall.js';
import { cryptoService } from './crypto-service.js';

let activePanelPort = null;
let currentSubagent = null;
let keepaliveInterval = null;

// Configure Side Panel behavior on extension install or update
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Pluto ServiceWorker] Extension installed/updated.');
  try {
    if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    }
  } catch (err) {
    console.warn('[Pluto ServiceWorker] Side panel behavior set error:', err);
  }
});

// Watch for panel connection
chrome.runtime.onConnect.addListener(port => {
  if (port.name === 'pluto-panel') {
    activePanelPort = port;
    console.log('[Pluto ServiceWorker] Panel port connected.');

    // Start keepalive pinging over port
    startKeepalive();

    port.onMessage.addListener(async msg => {
      const response = await handleMessage(msg);
      if (response && port) {
        port.postMessage({ type: `${msg.type}_RESPONSE`, payload: response });
      }
    });

    port.onDisconnect.addListener(() => {
      console.log('[Pluto ServiceWorker] Panel port disconnected.');
      activePanelPort = null;
      stopKeepalive();
    });
  }
});

// Watch for runtime messages as fallback
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handleMessage(msg).then(result => {
    sendResponse(result || { received: true });
  }).catch(err => {
    sendResponse({ error: err.message });
  });
  return true;
});

// Keepalive Watchdog: Alarms prevent service worker sleep during active tasks
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'pluto-keepalive') {
    // Ping storage and active tab to reset the 30s idle timer
    Storage.getSettings().then(() => {
      console.debug('[Pluto Keepalive] Alarm heartbeat acknowledged.');
    });
  }
});

function startKeepalive() {
  if (!keepaliveInterval) {
    keepaliveInterval = setInterval(() => {
      if (activePanelPort) {
        try {
          activePanelPort.postMessage({ type: 'KEEPALIVE_PING' });
        } catch (e) {
          stopKeepalive();
        }
      }
    }, 20000);
  }
}

function stopKeepalive() {
  if (keepaliveInterval) {
    clearInterval(keepaliveInterval);
    keepaliveInterval = null;
  }
}

function startTaskKeepaliveAlarm() {
  chrome.alarms.create('pluto-keepalive', { periodInMinutes: 0.3 });
}

function stopTaskKeepaliveAlarm() {
  chrome.alarms.clear('pluto-keepalive');
}

/**
 * Broadcast message to the side panel
 */
export function sendToPanel(type, payload) {
  const msg = { type, payload };
  if (activePanelPort) {
    try {
      activePanelPort.postMessage(msg);
      return;
    } catch (e) {
      console.warn('[Pluto ServiceWorker] Port send failed:', e);
    }
  }
  // Fallback broadcast
  chrome.runtime.sendMessage(msg).catch(() => {});
}

/**
 * Main message handler
 */
async function handleMessage(msg) {
  if (!msg || !msg.type) return;

  switch (msg.type) {
    case 'SUBMIT_PROMPT':
      await startTaskWorkflow(msg.payload, msg.conversationId);
      break;

    case 'STOP_TASK':
      if (currentSubagent) {
        currentSubagent.abort();
      }
      stopTaskKeepaliveAlarm();
      await Storage.setCurrentTask(null);
      break;

    case 'APPROVAL_RESPONSE':
      if (currentSubagent) {
        currentSubagent.handleApproval(msg.payload.actionId, msg.payload.approved);
      }
      break;

    case 'USER_ANSWER':
      if (currentSubagent) {
        currentSubagent.handleUserAnswer(msg.payload.answer);
      }
      break;

    case 'FILE_PICKED':
      if (currentSubagent) {
        currentSubagent.handleFilePick(msg.payload.filePath);
      }
      break;

    case 'RESUME_AFTER_BLOCKED':
      if (currentSubagent) {
        currentSubagent.resumeAfterBlocked();
      }
      break;

    case 'GET_TELEMETRY':
      return await performanceMonitor.getTelemetry();

    case 'GET_PRIVACY_METRICS':
      return privacyFirewall.getMetrics();

    case 'RUN_BENCHMARKS':
      return performanceMonitor.runEvaluationSuite();

    case 'GET_CRYPTO_STATUS':
      return cryptoService.getStatus();
  }
}

/**
 * Executes the complete agent workflow:
 * 1. Router -> Classify (DIRECT_READ, NAV_EXTRACT, AGENTIC)
 * 2. If DIRECT_READ -> Extract page content, answer directly
 * 3. If NAV_EXTRACT or AGENTIC -> Generate Plan -> Run Subagent Loop
 */
async function startTaskWorkflow(payload, conversationId) {
  const { prompt, targetTabId, targetTabUrl, provider, model } = payload;
  const taskId = 'task_' + Date.now();

  startTaskKeepaliveAlarm();

  sendToPanel('TASK_STARTED', { taskId, prompt });

  try {
    // 1. Identify target tab
    let tabId = targetTabId;
    if (!tabId) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = tab ? tab.id : null;
    }

    if (!tabId) {
      throw new Error('No active browser tab detected.');
    }

    // Save initial task state
    await Storage.setCurrentTask({
      id: taskId,
      conversationId,
      prompt,
      tabId,
      status: 'executing',
      startTime: Date.now()
    });

    // 2. Classify prompt via Router
    sendToPanel('ROUTE_DETERMINED', { mode: 'Analyzing...', reason: 'Determining execution path' });
    const route = await Router.classify(prompt, { provider, model });
    sendToPanel('ROUTE_DETERMINED', { mode: route.mode, reason: route.reason });

    if (route.mode === 'DIRECT_READ') {
      // Direct read: read current tab content and answer with LLM without planning or subagent
      const answer = await Router.handleDirectRead(tabId, prompt, { provider, model });
      sendToPanel('DIRECT_READ_RESULT', { answer });
      await Storage.setCurrentTask(null);
      stopTaskKeepaliveAlarm();
      return;
    }

    // 3. Planner: For NAV_EXTRACT and AGENTIC tasks, generate sequential plan
    const plan = await Planner.createPlan(tabId, prompt, { provider, model });
    sendToPanel('PLAN_CREATED', { plan: plan.steps });

    // 4. Subagent execution loop
    currentSubagent = new Subagent({
      taskId,
      conversationId,
      goal: prompt,
      plan: plan.steps,
      tabId,
      provider,
      model,
      sendToPanel
    });

    const result = await currentSubagent.run();

    if (result.success) {
      // Generate final user-friendly summary
      const summary = await Memory.summarizeTask(prompt, currentSubagent.getActionHistory(), { provider, model, conversationId });
      sendToPanel('TASK_COMPLETED', { summary });
    } else {
      sendToPanel('TASK_FAILED', { error: result.error || 'Task execution encountered an unrecoverable failure.' });
    }

  } catch (err) {
    console.error('[Pluto ServiceWorker] Task error:', err);
    sendToPanel('TASK_FAILED', { error: err.message || 'Unknown execution error' });
  } finally {
    currentSubagent = null;
    stopTaskKeepaliveAlarm();
    await Storage.setCurrentTask(null);
  }
}
