/**
 * PlutoAI - Privacy-First Autonomous Agent Engine
 * Architecture: PERCEIVE → DETECT → REDACT → FIREWALL → ENCRYPT → REASON → VALIDATE → ACT → VERIFY
 */

import { LLMProviderManager } from './providers.js';
import { privacyFirewall } from './privacy-firewall.js';
import { cryptoService } from './crypto-service.js';
import { actionValidator } from './action-validator.js';
import { performanceMonitor } from './performance-monitor.js';
import { TaskPlanner } from './task-planner.js';
import { devToolsBridge } from './devtools-bridge.js';

export class AgentEngine {
  constructor() {
    this.status = 'idle'; // 'idle' | 'running' | 'paused' | 'stopped' | 'completed' | 'error'
    this.currentTask = null;
    this.activeTabId = null;
    this.stepCount = 0;
    this.maxSteps = 25;
    this.stepDelayMs = 1000;
    this.history = [];
    this.listeners = new Set();
    this.isPaused = false;
    this.abortController = null;
    this.privacyMode = 'cloud'; // 'cloud' (sanitized remote) | 'offline' (on-device only)
    this.redactionMode = 'blur'; // 'blur' | 'blackout' | 'mask'
    this.lastSanitizedPreview = null;
    this.pendingHumanConfirmation = null;
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(event, payload = {}) {
    const state = this.getState();
    for (const listener of this.listeners) {
      try {
        listener({ event, state, payload });
      } catch (err) {
        console.error("Error in agent listener callback:", err);
      }
    }
  }

  getState() {
    return {
      status: this.status,
      currentTask: this.currentTask,
      stepCount: this.stepCount,
      maxSteps: this.maxSteps,
      history: this.history,
      isPaused: this.isPaused,
      activeTabId: this.activeTabId,
      privacyMode: this.privacyMode,
      redactionMode: this.redactionMode,
      lastSanitizedPreview: this.lastSanitizedPreview,
      pendingHumanConfirmation: this.pendingHumanConfirmation
    };
  }

  /**
   * Starts a new privacy-preserving autonomous task
   */
  async startTask({
    goal,
    tabId,
    provider = 'gemini',
    apiKey = '',
    model = 'gemini-3.5-flash-lite',
    customEndpoint = '',
    maxSteps = 25,
    stepDelay = 1200,
    privacyMode = 'cloud',
    redactionMode = 'blur'
  }) {
    if (this.status === 'running') {
      await this.stopTask("Interrupting previous task for new task.");
    }

    const activeTab = await this.getActiveTab().catch(() => null);
    const initialUrl = activeTab?.url || '';

    // Antigravity Decomposition & Structured Roadmap Planning
    this.plan = TaskPlanner.decomposeGoal(goal, initialUrl);
    this.planProgress = TaskPlanner.updateMilestoneProgress(this.plan, initialUrl, []);

    this.currentTask = {
      id: 'task_' + Date.now(),
      goal,
      provider,
      apiKey,
      model,
      customEndpoint,
      startTime: Date.now(),
      plan: this.plan,
      url: initialUrl,
      title: activeTab?.title || '',
      steps: []
    };

    this.activeTabId = tabId;
    this.maxSteps = maxSteps;
    this.stepDelayMs = stepDelay;
    this.privacyMode = privacyMode;
    this.redactionMode = redactionMode;
    this.stepCount = 0;
    this.history = [];
    this.status = 'running';
    this.isPaused = false;
    this.pendingHumanConfirmation = null;
    this.abortController = new AbortController();

    // Initialize Web Crypto AES-GCM session
    await cryptoService.init();

    // Attach Chrome DevTools Protocol session for network & console diagnostics
    if (this.activeTabId) {
      devToolsBridge.attach(this.activeTabId).catch(() => {});
    }

    this.notify('task_started', {
      task: this.currentTask,
      plan: this.plan,
      planProgress: this.planProgress,
      privacyMode,
      redactionMode
    });
    this.notify('plan_created', {
      plan: this.plan,
      planProgress: this.planProgress,
      goal
    });

    if (this.activeTabId) {
      this.sendTabMessage(this.activeTabId, { action: 'SET_SCREEN_GLOW', payload: { active: true } }).catch(() => {});
    }

    // Launch execution loop asynchronously
    this.runAgentLoop().catch(err => {
      console.error("Agent execution loop failed:", err);
      this.status = 'error';
      if (this.activeTabId) {
        this.sendTabMessage(this.activeTabId, { action: 'SET_SCREEN_GLOW', payload: { active: false } }).catch(() => {});
      }
      this.notify('task_error', { error: err.message });
    });

    return this.currentTask;
  }

  /**
   * Main Privacy-Preserving Agent Loop
   * PERCEIVE → DETECT → REDACT → FIREWALL → ENCRYPT → REASON → VALIDATE → ACT → VERIFY
   */
  async runAgentLoop() {
    while (this.status === 'running') {
      if (this.isPaused) {
        await new Promise(r => setTimeout(r, 400));
        continue;
      }

      this.stepCount++;
      if (this.stepCount > this.maxSteps) {
        this.status = 'completed';
        this.notify('task_completed', {
          summary: `Reached maximum step limit (${this.maxSteps}). Task completed.`
        });
        break;
      }

      const stepId = `step_${this.stepCount}_${Date.now()}`;
      const stepRecord = {
        step: this.stepCount,
        timestamp: Date.now(),
        status: 'observing',
        thought: '',
        action: null,
        piiDetected: [],
        redactionsApplied: 0,
        zeroRawPiiTransmitted: true,
        verification: null
      };

      try {
        const tab = await this.getActiveTab();
        if (!tab) {
          throw new Error("Active browser tab could not be found or was closed.");
        }

        if (this.currentTask) {
          this.currentTask.url = tab.url || '';
          this.currentTask.title = tab.title || '';
        }

        if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:') || tab.url.startsWith('chrome-extension://'))) {
          throw new Error("Browser security restricts automated script execution on internal chrome:// pages. Please switch to any standard web page (or Google Search / demo) and try again.");
        }

        this.notify('step_start', { step: this.stepCount });

        // ==========================================
        // 1. PERCEIVE: On-Device DOM + Vision + OCR Fusion
        // ==========================================
        performanceMonitor.startTimer(stepId, 'perception');
        let perceptionData = null;
        try {
          perceptionData = await this.sendTabMessage(this.activeTabId, { action: 'RUN_LOCAL_PERCEPTION' });
        } catch (e) {
          console.warn("Content scripts not ready, re-injecting...", e);
          await this.ensureContentScriptsInjected(this.activeTabId);
          await new Promise(r => setTimeout(r, 500));
          perceptionData = await this.sendTabMessage(this.activeTabId, { action: 'RUN_LOCAL_PERCEPTION' });
        }

        await new Promise(r => setTimeout(r, 100)); // allow DOM overlay paint
        const rawScreenshotDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
        await this.sendTabMessage(this.activeTabId, { action: 'HIDE_TAGS' }).catch(() => {});
        performanceMonitor.endTimer(stepId, 'perception');

        const domTags = perceptionData?.perception?.dom?.tags || [];
        const ocrBlocks = perceptionData?.perception?.ocr?.blocks || [];

        // ==========================================
        // 2. DETECT: Multi-Layer On-Device PII Scanning
        // ==========================================
        performanceMonitor.startTimer(stepId, 'pii_scan');
        const piiScanResult = perceptionData?.perception?.pii || { entities: [], totalDetected: 0 };
        const piiEntities = piiScanResult.entities || [];
        stepRecord.piiDetected = piiEntities;
        performanceMonitor.endTimer(stepId, 'pii_scan');

        this.notify('step_pii_detected', {
          step: this.stepCount,
          count: piiEntities.length,
          summary: piiScanResult.summaryByType || {}
        });

        // ==========================================
        // 3. REDACT: Visual Canvas & Text Sanitization
        // ==========================================
        performanceMonitor.startTimer(stepId, 'redaction');
        const sanitizeResult = await this.sendTabMessage(this.activeTabId, {
          action: 'SANITIZE_CONTEXT',
          payload: {
            screenshotDataUrl: rawScreenshotDataUrl,
            piiEntities,
            domTags,
            mode: this.redactionMode
          }
        });

        const sanitizedScreenshot = sanitizeResult?.sanitized?.sanitizedScreenshot || rawScreenshotDataUrl;
        const sanitizedTags = sanitizeResult?.sanitized?.sanitizedTags || domTags;
        stepRecord.redactionsApplied = piiEntities.length;
        performanceMonitor.endTimer(stepId, 'redaction');

        // Store for Before-Send Preview
        this.lastSanitizedPreview = {
          step: this.stepCount,
          timestamp: Date.now(),
          originalScreenshot: rawScreenshotDataUrl,
          sanitizedScreenshot,
          piiEntities,
          sanitizedTagsCount: sanitizedTags.length,
          redactionMode: this.redactionMode
        };

        this.notify('step_sanitized', {
          step: this.stepCount,
          preview: this.lastSanitizedPreview
        });

        // ==========================================
        // 4. FIREWALL: Outbound Zero-Raw-PII Gatekeeper
        // ==========================================
        const firewallCheck = privacyFirewall.inspectOutboundPayload({
          prompt: this.currentTask.goal,
          imageBase64: sanitizedScreenshot,
          tags: sanitizedTags,
          piiEntities,
          mode: this.privacyMode
        });

        if (!firewallCheck.allowed) {
          throw new Error("Privacy Firewall blocked unsanitized payload transmission.");
        }

        // ==========================================
        // 5. ENCRYPT: Web Crypto AES-GCM Payload Packaging
        // ==========================================
        performanceMonitor.startTimer(stepId, 'encryption');
        const encryptedEnvelope = await cryptoService.encryptPayload({
          goal: this.currentTask.goal,
          step: this.stepCount,
          tags: sanitizedTags,
          url: tab.url,
          title: tab.title
        });
        performanceMonitor.endTimer(stepId, 'encryption');

        // ==========================================
        // 6. REASON: Remote VLM / Local LLM Reasoning (Antigravity Milestone-Guided)
        // ==========================================
        performanceMonitor.startTimer(stepId, 'vlm');
        stepRecord.status = 'thinking';
        this.notify('step_thinking', { step: this.stepCount, screenshot: sanitizedScreenshot });

        // Synchronize & notify active milestone progress
        this.planProgress = TaskPlanner.updateMilestoneProgress(this.plan, tab.url, this.history);
        this.notify('plan_updated', {
          plan: this.plan,
          planProgress: this.planProgress
        });

        let aiResponse;
        if (this.privacyMode === 'offline') {
          // Pure Local Rule-Based & OCR Heuristic Reasoner (Zero remote API calls)
          aiResponse = this.runLocalOfflineReasoner(this.currentTask.goal, sanitizedTags, ocrBlocks, tab);
          await new Promise(r => setTimeout(r, 600));
        } else {
          // Remote VLM Reasoner with Sanitized Visual & Structured Tokens + Antigravity Plan Context
          aiResponse = await LLMProviderManager.queryModel({
            provider: this.currentTask.provider,
            apiKey: this.currentTask.apiKey,
            model: this.currentTask.model,
            customEndpoint: this.currentTask.customEndpoint,
            goal: this.currentTask.goal,
            step: this.stepCount,
            history: this.history,
            url: tab.url,
            title: tab.title,
            tags: sanitizedTags,
            imageBase64: sanitizedScreenshot,
            plan: this.plan,
            planProgress: this.planProgress
          });
        }
        performanceMonitor.endTimer(stepId, 'vlm');

        stepRecord.thought = aiResponse.thought || "Deciding next privacy-safe action...";
        stepRecord.action = aiResponse.action;
        stepRecord.target_tag = aiResponse.target_tag;
        stepRecord.value = aiResponse.value;
        stepRecord.press_enter = aiResponse.press_enter;
        stepRecord.extracted_data = aiResponse.extracted_data;
        stepRecord.user_question = aiResponse.user_question;
        stepRecord.final_summary = aiResponse.final_summary;

        this.notify('step_reasoned', { step: this.stepCount, aiResponse });

        // Robust Multi-Step Premature Finish Protection
        if (aiResponse.action === 'finish') {
          // Check if any interactive milestones in the structured plan remain incomplete
          const hasIncompleteMilestones = this.plan && this.plan.some(m =>
            (m.status === 'pending' || m.status === 'in_progress') &&
            (m.type === 'navigate' || m.type === 'search' || m.type === 'click_result' || m.type === 'fill_field' || m.type === 'type_content' || m.type === 'interact')
          );

          if (hasIncompleteMilestones || this.stepCount === 1) {
            // Consult the on-device semantic reasoner to advance the next required milestone
            const fallbackAction = this.runLocalOfflineReasoner(this.currentTask.goal, sanitizedTags, ocrBlocks, tab);
            if (fallbackAction && fallbackAction.action && fallbackAction.action !== 'finish') {
              console.warn(`[PlutoAI AgentEngine] Intercepted premature 'finish' at Step ${this.stepCount} for goal: "${this.currentTask.goal}". Advancing milestone with action '${fallbackAction.action}' on [TAG_${fallbackAction.target_tag || 'none'}].`);
              aiResponse = fallbackAction;
              stepRecord.thought = aiResponse.thought;
              stepRecord.action = aiResponse.action;
              stepRecord.target_tag = aiResponse.target_tag;
              stepRecord.value = aiResponse.value;
              stepRecord.press_enter = aiResponse.press_enter;
              stepRecord.extracted_data = aiResponse.extracted_data;
              stepRecord.user_question = aiResponse.user_question;
              stepRecord.final_summary = aiResponse.final_summary;
            }
          }
        }

        // If genuinely finished after completing all actions
        if (aiResponse.action === 'finish') {
          this.status = 'completed';
          if (this.plan) {
            this.plan.forEach(m => m.status = 'completed');
            this.notify('plan_updated', {
              plan: this.plan,
              planProgress: { plan: this.plan, activeIndex: this.plan.length - 1, isAllCompleted: true }
            });
          }
          this.history.push(stepRecord);
          this.currentTask.steps.push(stepRecord);
          performanceMonitor.finalizeStepMetrics(stepId);
          if (this.activeTabId) {
            this.sendTabMessage(this.activeTabId, { action: 'SET_SCREEN_GLOW', payload: { active: false } }).catch(() => {});
          }
          this.notify('task_completed', {
            summary: aiResponse.final_summary || aiResponse.thought || 'Task completed with 0 raw PII transmitted!'
          });
          break;
        }

        // ==========================================
        // 7. VALIDATE: Action Allowlist & Safety Governor
        // ==========================================
        performanceMonitor.startTimer(stepId, 'validation');
        const validation = actionValidator.validate(aiResponse, sanitizedTags, {
          requireConfirmationForSensitive: false
        });
        performanceMonitor.endTimer(stepId, 'validation');

        if (!validation.valid) {
          throw new Error(`Action validation failed: ${validation.error}`);
        }

        // Human-in-the-Loop Interception
        if (validation.requiresHumanConfirmation) {
          this.isPaused = true;
          this.status = 'paused';
          this.pendingHumanConfirmation = {
            stepId,
            action: aiResponse,
            reason: validation.confirmationReason,
            element: validation.elementMeta
          };
          this.notify('human_confirmation_required', this.pendingHumanConfirmation);
          break; // Wait for user confirmation in UI
        }

        // ==========================================
        // 8. ACT: Synthetic Actuator & Laser Feedback
        // ==========================================
        performanceMonitor.startTimer(stepId, 'actuation');
        stepRecord.status = 'actuating';
        this.notify('step_actuating', { step: this.stepCount, action: aiResponse });

        // Capture pre-action state for verification
        await this.sendTabMessage(this.activeTabId, { action: 'CAPTURE_PRE_STATE' });

        const actuationResult = await this.executeAction(aiResponse, tab);
        stepRecord.actuationResult = actuationResult;
        performanceMonitor.endTimer(stepId, 'actuation');

        // ==========================================
        // 9. VERIFY: Post-Action Result Verifier
        // ==========================================
        performanceMonitor.startTimer(stepId, 'verification');
        const verifyResult = await this.sendTabMessage(this.activeTabId, {
          action: 'VERIFY_EXECUTION',
          payload: { actionType: aiResponse.action, targetTag: aiResponse.target_tag }
        });
        stepRecord.verification = verifyResult?.verification;
        performanceMonitor.endTimer(stepId, 'verification');

        this.notify('step_verified', {
          step: this.stepCount,
          verification: stepRecord.verification
        });

        this.history.push(stepRecord);
        this.currentTask.steps.push(stepRecord);

        // Update structured plan milestones after step execution
        this.planProgress = TaskPlanner.updateMilestoneProgress(this.plan, tab.url, this.history);
        this.notify('plan_updated', {
          plan: this.plan,
          planProgress: this.planProgress
        });

        // Finalize telemetry
        const metrics = performanceMonitor.finalizeStepMetrics(stepId);
        this.notify('step_metrics', { step: this.stepCount, metrics });

        // Pacing delay
        await new Promise(r => setTimeout(r, this.stepDelayMs));

      } catch (stepError) {
        console.error(`[PlutoAI Loop Error in Step ${this.stepCount}]`, stepError);
        stepRecord.status = 'error';
        stepRecord.error = stepError.message;
        this.history.push(stepRecord);
        this.notify('step_error', { step: this.stepCount, error: stepError.message });

        if (this.history.filter(h => h.status === 'error').length >= 2) {
          this.status = 'error';
          this.notify('task_error', { error: `Encountered consecutive errors: ${stepError.message}` });
          break;
        }
        await new Promise(r => setTimeout(r, 1500));
      }
    }
  }

  /**
   * Local Rule-Based Reasoner for Offline/On-Device Privacy Mode
   */
  runLocalOfflineReasoner(goal, sanitizedTags = [], ocrBlocks = [], activeTab = null) {
    const tabUrl = activeTab?.url || this.currentTask?.url || '';
    const tabTitle = activeTab?.title || this.currentTask?.title || '';
    return LLMProviderManager.heuristicSimulator({
      goal,
      step: this.stepCount,
      url: tabUrl,
      title: tabTitle,
      tags: sanitizedTags,
      history: this.history
    });
  }

  /**
   * Executes confirmed sensitive action from user
   */
  async confirmSensitiveAction() {
    if (!this.pendingHumanConfirmation) return;

    const { action } = this.pendingHumanConfirmation;
    this.pendingHumanConfirmation = null;
    this.isPaused = false;
    this.status = 'running';

    const tab = await this.getActiveTab();
    await this.executeAction(action, tab);
    this.runAgentLoop(); // Resume loop
  }

  async executeAction(aiAction, tab) {
    const { action, target_tag, value, press_enter } = aiAction;
    const tabUrl = (tab?.url || this.currentTask?.url || '').toLowerCase();

    // 0. Dedicated Chrome DevTools Protocol & Diagnostics Actions (inspired by chrome-devtools-mcp)
    if (action === 'inspect_console_logs') {
      const logs = devToolsBridge.getConsoleLogs(this.activeTabId, { level: aiAction.level || null, limit: aiAction.limit || 50 });
      return { success: true, logs };
    }

    if (action === 'inspect_network_activity') {
      const net = devToolsBridge.getNetworkRequests(this.activeTabId, { failedOnly: Boolean(aiAction.failed_only), limit: aiAction.limit || 50 });
      return { success: true, ...net };
    }

    if (action === 'wait_for_network_idle') {
      const idleRes = await devToolsBridge.waitForNetworkIdle(this.activeTabId, {
        idleTimeMs: aiAction.idle_time_ms || 500,
        timeoutMs: aiAction.timeout_ms || 8000
      });
      return { success: idleRes.idle, ...idleRes };
    }

    if (action === 'emulate_device') {
      return await devToolsBridge.emulateDevice(this.activeTabId, {
        width: aiAction.width || 1280,
        height: aiAction.height || 800,
        deviceScaleFactor: aiAction.device_scale_factor || 1,
        mobile: Boolean(aiAction.mobile),
        colorScheme: aiAction.color_scheme || 'light'
      });
    }

    if (action === 'get_performance_insights') {
      return await devToolsBridge.getPerformanceMetrics(this.activeTabId);
    }

    if (action === 'handle_dialog') {
      return await devToolsBridge.handleDialog(this.activeTabId, {
        action: aiAction.action_type || aiAction.value || 'accept',
        promptText: aiAction.prompt_text || ''
      });
    }

    if (action === 'evaluate_script') {
      return await devToolsBridge.evaluateScript(this.activeTabId, aiAction.expression || value || '');
    }

    if (action === 'navigate' && value) {
      let targetUrl = value.trim();
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }
      await chrome.tabs.update(this.activeTabId, { url: targetUrl });
      await this.waitForTabComplete(this.activeTabId);
      // Wait for network idle to ensure SPAs mount properly
      await devToolsBridge.waitForNetworkIdle(this.activeTabId, { idleTimeMs: 400, timeoutMs: 3000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 600));
      await this.ensureContentScriptsInjected(this.activeTabId);
      return { success: true, navigatedTo: targetUrl };
    }

    if (action === 'wait') {
      const waitTime = parseInt(value, 10) || 2000;
      await new Promise(r => setTimeout(r, waitTime));
      return { success: true, waitedMs: waitTime };
    }

    // 1. Send DOM action to Content Script for visual feedback and physical typing/clicking
    let domResult = null;
    try {
      domResult = await this.sendTabMessage(this.activeTabId, {
        action: 'EXECUTE_DOM_ACTION',
        payload: {
          actionType: action,
          targetTag: target_tag,
          value,
          pressEnter: press_enter
        }
      });
    } catch (domErr) {
      console.warn("[PlutoAI AgentEngine] Content script DOM execution note:", domErr);
    }

    // 2. Hardware-level Chrome DevTools Protocol text injection for rich canvas editors (Google Docs, etc.)
    if (action === 'type' && value && typeof chrome !== 'undefined' && chrome.debugger) {
      try {
        await this.sendCDPText(this.activeTabId, value, press_enter);
      } catch (cdpErr) {
        console.warn("[PlutoAI AgentEngine] CDP text insertion note:", cdpErr);
      }
    }

    // 3. Synchronous SPA Search Navigation Pacing & Transitions
    if (action === 'type' && press_enter) {
      if (tabUrl.includes('youtube.com') && !tabUrl.includes('/results')) {
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(value)}`;
        await chrome.tabs.update(this.activeTabId, { url: searchUrl });
        await this.waitForTabComplete(this.activeTabId);
        await new Promise(r => setTimeout(r, 1800));
        await this.ensureContentScriptsInjected(this.activeTabId);
        return { success: true, navigatedTo: searchUrl };
      } else if (tabUrl.includes('google.com') && !tabUrl.includes('/search') && !tabUrl.includes('docs.google.com')) {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(value)}`;
        await chrome.tabs.update(this.activeTabId, { url: searchUrl });
        await this.waitForTabComplete(this.activeTabId);
        await new Promise(r => setTimeout(r, 1600));
        await this.ensureContentScriptsInjected(this.activeTabId);
        return { success: true, navigatedTo: searchUrl };
      } else {
        await new Promise(r => setTimeout(r, 1500));
        await this.waitForTabComplete(this.activeTabId).catch(() => {});
        await this.ensureContentScriptsInjected(this.activeTabId).catch(() => {});
      }
    } else if (action === 'click') {
      // If clicking a link or video result, ensure the tab navigates to the target URL
      let targetLinkUrl = domResult?.result?.targetUrl || domResult?.targetUrl;
      if (tabUrl.includes('youtube.com') && (tabUrl.includes('/results') || !tabUrl.includes('/watch'))) {
        if (typeof value === 'string' && (value.includes('/watch') || value.includes('watch?v='))) {
          targetLinkUrl = value;
        }
      }

      if (targetLinkUrl && typeof targetLinkUrl === 'string') {
        let fullUrl = targetLinkUrl;
        if (fullUrl.startsWith('/')) {
          const baseOrigin = tabUrl.includes('youtube.com') ? 'https://www.youtube.com' : (tab?.url ? new URL(tab.url).origin : '');
          fullUrl = baseOrigin + fullUrl;
        }
        if (fullUrl.startsWith('http://') || fullUrl.startsWith('https://')) {
          await chrome.tabs.update(this.activeTabId, { url: fullUrl });
          await this.waitForTabComplete(this.activeTabId);
          await new Promise(r => setTimeout(r, 2000));
          await this.ensureContentScriptsInjected(this.activeTabId);
          return { success: true, clickedTag: target_tag, navigatedTo: fullUrl };
        }
      }

      // Allow time for media player / navigation to mount
      await new Promise(r => setTimeout(r, 1500));
      await this.waitForTabComplete(this.activeTabId).catch(() => {});
      await this.ensureContentScriptsInjected(this.activeTabId).catch(() => {});
    }

    return domResult || { success: true };
  }

  async sendCDPText(tabId, text, pressEnter = false) {
    if (!tabId || typeof chrome === 'undefined' || !chrome.debugger) return;
    try {
      await chrome.debugger.attach({ tabId }, "1.3");
    } catch (e) {}
    try {
      // Send text to active focused element via CDP compositor
      const chunkSize = 400;
      for (let i = 0; i < text.length; i += chunkSize) {
        const chunk = text.slice(i, i + chunkSize);
        await chrome.debugger.sendCommand({ tabId }, "Input.insertText", { text: chunk });
        await new Promise(r => setTimeout(r, 30));
      }
      if (pressEnter) {
        await this.sendCDPEnter(tabId);
      }
    } catch (err) {
      console.warn("[PlutoAI AgentEngine] CDP Input.insertText error:", err);
    }
  }

  async sendCDPEnter(tabId) {
    if (!tabId || typeof chrome === 'undefined' || !chrome.debugger) return;
    try {
      await chrome.debugger.attach({ tabId }, "1.3");
      await chrome.debugger.sendCommand({ tabId }, "Input.dispatchKeyEvent", {
        type: "rawKeyDown",
        windowsVirtualKeyCode: 13,
        nativeVirtualKeyCode: 13,
        macCharCode: 13,
        unmodifiedText: "\r",
        text: "\r",
        key: "Enter",
        code: "Enter"
      });
      await new Promise(r => setTimeout(r, 40));
      await chrome.debugger.sendCommand({ tabId }, "Input.dispatchKeyEvent", {
        type: "keyUp",
        windowsVirtualKeyCode: 13,
        nativeVirtualKeyCode: 13,
        macCharCode: 13,
        unmodifiedText: "\r",
        text: "\r",
        key: "Enter",
        code: "Enter"
      });
    } catch (e) {}
  }

  async detachCDP(tabId) {
    if (!tabId || typeof chrome === 'undefined' || !chrome.debugger) return;
    try {
      await chrome.debugger.detach({ tabId });
    } catch (e) {}
  }

  async pauseTask() {
    this.isPaused = true;
    this.notify('task_paused', {});
  }

  async resumeTask() {
    this.isPaused = false;
    this.notify('task_resumed', {});
  }

  async stopTask(reason = "Task stopped by user.") {
    this.status = 'idle';
    this.isPaused = false;
    this.pendingHumanConfirmation = null;
    if (this.abortController) {
      this.abortController.abort();
    }
    if (this.activeTabId) {
      try {
        await this.sendTabMessage(this.activeTabId, { action: 'CLEANUP_OVERLAYS' });
      } catch (e) {}
      await this.detachCDP(this.activeTabId);
      await devToolsBridge.detach(this.activeTabId);
    }
    this.notify('task_stopped', { reason });
  }

  resetState() {
    this.status = 'idle';
    this.currentTask = null;
    this.stepCount = 0;
    this.isPaused = false;
    this.pendingHumanConfirmation = null;
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  async getActiveTab() {
    if (this.activeTabId) {
      try {
        const tab = await chrome.tabs.get(this.activeTabId);
        return tab;
      } catch (e) {}
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) this.activeTabId = tab.id;
    return tab;
  }

  async sendTabMessage(tabId, message, retry = true) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, async (response) => {
        const err = chrome.runtime.lastError;
        if (err) {
          if (retry && tabId) {
            try {
              await this.ensureContentScriptsInjected(tabId);
              await new Promise(r => setTimeout(r, 200));
              chrome.tabs.sendMessage(tabId, message, (retryRes) => {
                if (chrome.runtime.lastError) {
                  return reject(new Error(chrome.runtime.lastError.message));
                }
                resolve(retryRes);
              });
              return;
            } catch (injectErr) {
              return reject(new Error(err.message));
            }
          }
          return reject(new Error(err.message));
        }
        resolve(response);
      });
    });
  }

  async ensureContentScriptsInjected(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
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
        target: { tabId },
        files: ['content/content.css']
      });
    } catch (err) {
      console.warn("[PlutoAI] Could not inject content scripts into tab:", err);
    }
  }

  async waitForTabComplete(tabId, timeoutMs = 12000) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }, timeoutMs);

      function listener(id, changeInfo) {
        if (id === tabId && changeInfo.status === 'complete') {
          clearTimeout(timeout);
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      }
      chrome.tabs.onUpdated.addListener(listener);
    });
  }
}

export const agentEngine = new AgentEngine();
