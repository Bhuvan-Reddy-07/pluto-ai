/**
 * Pluto AI - Autonomous Subagent Execution Loop
 * Implements PERCEIVE -> REASON -> ACT -> VERIFY -> ADAPT with full ~45 skills support,
 * 3-tier escalation ladder (DOM -> Synthetic -> CDP), auto-overlay dismissal,
 * notes integration, interactive user asking, and artifact recording.
 */

import { Storage } from '../shared/storage.js';
import { ProviderRegistry } from '../providers/registry.js';
import { Prompts } from '../shared/prompts.js';
import { isActionSensitive, verifySkillResult } from '../shared/skills.js';
import { Memory } from './memory.js';
import { privacyFirewall } from './privacy-firewall.js';
import { actionValidator } from './action-validator.js';
import { performanceMonitor } from './performance-monitor.js';
import { cryptoService } from './crypto-service.js';

export class Subagent {
  constructor({ taskId, conversationId, goal, plan, tabId, provider, model, sendToPanel }) {
    this.taskId = taskId;
    this.conversationId = conversationId;
    this.goal = goal;
    this.plan = plan || [];
    this.tabId = tabId;
    this.provider = provider;
    this.model = model;
    this.sendToPanel = sendToPanel;

    this.isAborted = false;
    this.isBlocked = false;
    this.blockedResolve = null;
    this.pendingApprovalResolve = null;
    this.pendingAskUserResolve = null;
    this.pendingFilePickResolve = null;

    this.actionHistory = [];
    this.userAnswers = [];
    this.cdpAttached = false;
    this.isVisionPrimary = false;
  }

  abort() {
    this.isAborted = true;
    if (this.blockedResolve) {
      this.blockedResolve(false);
      this.blockedResolve = null;
    }
    if (this.pendingApprovalResolve) {
      this.pendingApprovalResolve(false);
      this.pendingApprovalResolve = null;
    }
    if (this.pendingAskUserResolve) {
      this.pendingAskUserResolve('User aborted');
      this.pendingAskUserResolve = null;
    }
    if (this.pendingFilePickResolve) {
      this.pendingFilePickResolve(null);
      this.pendingFilePickResolve = null;
    }
    this.cleanupCdp();
  }

  handleApproval(actionId, approved) {
    if (this.pendingApprovalResolve) {
      this.pendingApprovalResolve(approved);
      this.pendingApprovalResolve = null;
    }
  }

  handleUserAnswer(answer) {
    if (this.pendingAskUserResolve) {
      this.pendingAskUserResolve(answer);
      this.pendingAskUserResolve = null;
    }
  }

  handleFilePick(filePath) {
    if (this.pendingFilePickResolve) {
      this.pendingFilePickResolve(filePath);
      this.pendingFilePickResolve = null;
    }
  }

  resumeAfterBlocked() {
    this.isBlocked = false;
    if (this.blockedResolve) {
      this.blockedResolve(true);
      this.blockedResolve = null;
    }
  }

  getActionHistory() {
    return this.actionHistory;
  }

  /**
   * Main Execution Loop
   */
  async run() {
    const settings = await Storage.getSettings();
    const maxSteps = settings.maxSteps || 25;
    const stepTimeoutSeconds = settings.stepTimeoutSeconds || 60;
    const enableVision = settings.enableVision !== false;

    await this.ensureInjected();
    if (settings.visualOverlayEnabled !== false) {
      try {
        await chrome.tabs.sendMessage(this.tabId, { type: 'SET_SCREEN_GLOW', payload: { active: true } });
      } catch (e) {}
    }

    let stepIndex = 0;
    const totalPlanSteps = this.plan.length || 1;

    while (stepIndex < totalPlanSteps && !this.isAborted) {
      if (this.actionHistory.length >= maxSteps) {
        return { success: false, error: `Reached maximum step limit (${maxSteps} steps).` };
      }

      const currentPlanStep = this.plan[stepIndex] || {
        step: stepIndex + 1,
        description: this.goal,
        done_condition: 'Goal completed'
      };

      this.sendToPanel('STEP_UPDATE', {
        stepNumber: stepIndex + 1,
        totalSteps: totalPlanSteps,
        description: currentPlanStep.description,
        status: 'running'
      });

      let stepSuccess = false;
      let stepError = null;
      let attempts = 0;

      while (attempts < 3 && !stepSuccess && !this.isAborted) {
        attempts++;

        try {
          const attemptPromise = this.executeAttempt(currentPlanStep, enableVision, attempts);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Step attempt timed out after ${stepTimeoutSeconds}s`)), stepTimeoutSeconds * 1000)
          );

          const result = await Promise.race([attemptPromise, timeoutPromise]);

          if (result.status === 'done') {
            stepSuccess = true;
            break;
          } else if (result.status === 'continue') {
            if (result.verified?.success) {
              stepSuccess = true;
              break;
            } else {
              stepError = result.verified?.error || 'Action did not produce expected effect';
            }
          } else if (result.status === 'blocked') {
            stepError = result.block_reason;
          }
        } catch (err) {
          stepError = err.message;
          console.warn(`[Pluto Subagent] Step ${stepIndex + 1} attempt ${attempts} error:`, err);
        }

        // Exponential backoff: 500ms -> 1000ms -> 2000ms
        if (!stepSuccess && attempts < 3 && !this.isAborted) {
          const backoffMs = attempts === 1 ? 500 : (attempts === 2 ? 1000 : 2000);
          await new Promise(r => setTimeout(r, backoffMs));
        }
      }

      if (this.isAborted) {
        this.cleanupCdp();
        return { success: false, error: 'Execution stopped by user.' };
      }

      if (!stepSuccess) {
        this.sendToPanel('STEP_UPDATE', {
          stepNumber: stepIndex + 1,
          totalSteps: totalPlanSteps,
          description: currentPlanStep.description,
          status: 'failed',
          error: stepError || 'Action failed after 3 attempts'
        });
        this.cleanupCdp();
        return { success: false, error: `Step ${stepIndex + 1} failed: ${stepError}` };
      }

      this.sendToPanel('STEP_UPDATE', {
        stepNumber: stepIndex + 1,
        totalSteps: totalPlanSteps,
        description: currentPlanStep.description,
        status: 'done'
      });

      stepIndex++;
      await new Promise(r => setTimeout(r, 600));
    }

    this.cleanupCdp();
    return { success: true };
  }

  /**
   * Single attempt iteration: PERCEIVE -> REASON -> ACT -> VERIFY -> ADAPT
   */
  async executeAttempt(currentPlanStep, enableVision, attemptNumber) {
    const stepId = `step_${this.actionHistory.length + 1}_att_${attemptNumber}`;

    // 1. PERCEIVE
    performanceMonitor.startTimer(stepId, 'perception');
    await this.ensureInjected();

    const domResult = await this.getCondensedDom();
    const beforeUrl = domResult.url || '';
    const beforeDomHash = domResult.domHash || '';
    performanceMonitor.endTimer(stepId, 'perception');

    if (beforeUrl.startsWith('chrome://') || beforeUrl.startsWith('edge://')) {
      throw new Error('Pluto cannot automate internal browser chrome:// pages.');
    }

    // Automatic Degradation Trigger:
    const isVisionPrimary = domResult.suggestVisionPrimary || domResult.isCanvasHeavy || (domResult.elementCount !== undefined && domResult.elementCount < 5);
    if (isVisionPrimary && !this.isVisionPrimary) {
      this.isVisionPrimary = true;
      console.warn('[Pluto Subagent] Escalation Trigger 3: Sparse DOM (<5 elements) or canvas-heavy page. Switched to VISION-PRIMARY mode.');
      this.sendToPanel('ROUTE_DETERMINED', {
        mode: 'VISION_PRIMARY',
        reason: 'Page has <5 usable DOM elements or is canvas-heavy. Switched to vision-primary mode (screenshot + coordinates).'
      });
    }

    let screenshot = null;
    const adapter = await ProviderRegistry.getAdapter(this.provider);
    const settings = await Storage.getSettings();

    if ((enableVision || this.isVisionPrimary) && adapter.supportsVision) {
      screenshot = await this.captureScreenshot();

      // Privacy Shield on-device redaction protocol
      if (screenshot && settings.privacyShieldEnabled !== false) {
        performanceMonitor.startTimer(stepId, 'redaction');
        try {
          const redactRes = await chrome.tabs.sendMessage(this.tabId, {
            type: 'REDACT_SCREENSHOT',
            payload: { screenshot, options: { mode: settings.redactionMode || 'blur' } }
          });
          if (redactRes && redactRes.success && redactRes.sanitizedScreenshot) {
            screenshot = redactRes.sanitizedScreenshot;
            this.sendToPanel('PRIVACY_STATUS', {
              active: true,
              redactionCount: redactRes.redactionCount || 0,
              mode: redactRes.redactionMode || 'blur',
              clean: true
            });
          }
        } catch (err) {
          console.warn('[Pluto Subagent] Privacy redaction skipped:', err);
        }
        performanceMonitor.endTimer(stepId, 'redaction');
      }
    }

    // Privacy Firewall: Inspect outbound payload before network dispatch
    if (settings.privacyShieldEnabled !== false) {
      try {
        privacyFirewall.inspectOutboundPayload({
          prompt: this.goal,
          imageBase64: screenshot,
          tags: domResult.elements || [],
          piiEntities: domResult.piiEntities || []
        });
      } catch (firewallErr) {
        console.warn('[Pluto Subagent] Privacy Firewall:', firewallErr.message);
      }
    }

    // Inject memorized notes and user answers
    const notes = Memory.getNotes(this.conversationId);
    let notesSection = '';
    if (notes.length > 0) {
      notesSection = `\n\nTask Notes & Memorized Facts:\n${notes.map(n => `- ${n}`).join('\n')}`;
    }
    if (this.userAnswers.length > 0) {
      notesSection += `\n\nUser Q&A History:\n${this.userAnswers.map(ua => `Q: ${ua.question} -> A: ${ua.answer}`).join('\n')}`;
    }

    // 2. REASON
    let systemPrompt = Prompts.SUBAGENT;
    if (this.isVisionPrimary) {
      systemPrompt += `\n\n[EXECUTION INTENSITY: VISION-PRIMARY MODE ACTIVE]\nNotice: The DOM condenser yielded <5 usable elements or this page is canvas-heavy. Rely PRIMARILY on the attached viewport screenshot and use "click_at_coordinates" with {"skill": "click_at_coordinates", "x": <viewport_x>, "y": <viewport_y>} based on visual layout positions. DOM element IDs are secondary.`;
    }

    const agentContext = {
      systemPrompt,
      goal: this.goal + notesSection,
      currentStep: currentPlanStep,
      condensedDom: domResult.condensedText || '',
      screenshot,
      actionHistory: this.actionHistory.slice(-8)
    };

    performanceMonitor.startTimer(stepId, 'vlm');
    const decision = await adapter.decide(agentContext, { model: this.model });
    performanceMonitor.endTimer(stepId, 'vlm');

    if (!decision || !decision.action) {
      throw new Error('LLM returned invalid action structure.');
    }

    if (decision.status === 'done' || decision.action.skill === 'done') {
      return { status: 'done' };
    }

    if (decision.status === 'blocked' || decision.action.skill === 'blocked') {
      this.sendToPanel('BLOCKED_CAPTCHA_OR_LOGIN', {
        reason: decision.block_reason || decision.action.reason || 'Authentication or CAPTCHA detected',
        instructions: 'Please complete the verification or login in the browser tab, then click Continue.'
      });

      const resumed = await new Promise(resolve => {
        this.blockedResolve = resolve;
      });

      if (!resumed || this.isAborted) {
        return { status: 'blocked', block_reason: 'User cancelled or aborted' };
      }

      return { status: 'continue', verified: { success: true, observed_change: 'User completed manual action' } };
    }

    const action = decision.action;

    // --- 3. ACT with ActionValidator Safety Governor & Escalation Ladder ---
    performanceMonitor.startTimer(stepId, 'validation');
    const safetyValidation = actionValidator.validate(action, domResult.elements || [], {
      requireConfirmationForSensitive: settings.approvalMode !== false
    });
    performanceMonitor.endTimer(stepId, 'validation');

    // Domain blocking check
    if (action.skill === 'navigate' && (action.url || action.value)) {
      const isBlocked = await this.checkBlockedDomain(action.url || action.value);
      if (isBlocked) {
        throw new Error(`Navigation to blocked domain "${action.url || action.value}" is prohibited by safety settings.`);
      }
    }

    // Sensitive action approval check (from ActionValidator or skills catalog)
    if (settings.approvalMode !== false && (safetyValidation.requiresHumanConfirmation || isActionSensitive(action))) {
      const actionId = 'appr_' + Date.now();
      this.sendToPanel('REQUIRE_APPROVAL', {
        actionId,
        description: safetyValidation.confirmationReason || `Execute sensitive action: ${action.skill} on ${action.target || 'browser'}`,
        details: action,
        riskLevel: safetyValidation.riskLevel || 'HIGH'
      });

      const approved = await new Promise(resolve => {
        this.pendingApprovalResolve = resolve;
      });

      if (!approved) {
        return {
          status: 'continue',
          verified: { success: true, observed_change: 'User skipped sensitive action.' }
        };
      }
    }

    // Execute through Escalation Ladder
    performanceMonitor.startTimer(stepId, 'actuation');
    let execResult = await this.dispatchActionWithEscalation(action, settings.enableCdpFallback !== false);
    performanceMonitor.endTimer(stepId, 'actuation');

    // Wait for page stabilization
    await new Promise(r => setTimeout(r, 800));

    // 4. VERIFY
    performanceMonitor.startTimer(stepId, 'verification');
    let afterDom = await this.getCondensedDom();
    let afterUrl = afterDom.url || '';
    let afterDomHash = afterDom.domHash || '';

    let verified = verifySkillResult(
      action.skill,
      { url: beforeUrl, domHash: beforeDomHash },
      { url: afterUrl, domHash: afterDomHash, scrollY: 0 },
      execResult
    );
    performanceMonitor.endTimer(stepId, 'verification');

    // AUTO-INVOCATION RULE:
    // If an action's verification fails AND an overlay is detected on page,
    // automatically try dismiss_popup / accept_cookies once before retrying!
    if (!verified.success && (domResult.hasOverlay || afterDom.hasOverlay)) {
      console.warn('[Pluto Subagent] Overlay detected blocking verification. Auto-invoking dismiss_popup / accept_cookies...');
      this.sendToPanel('STEP_UPDATE', {
        stepNumber: currentPlanStep.step,
        totalSteps: this.plan.length || 1,
        description: `${currentPlanStep.description} (Auto-dismissing overlay...)`,
        status: 'running'
      });

      // Try popup dismissal
      await this.dispatchActionWithEscalation({ skill: 'dismiss_popup' });
      await this.dispatchActionWithEscalation({ skill: 'accept_cookies' });
      await new Promise(r => setTimeout(r, 600));

      // Re-try original action once overlay is cleared
      execResult = await this.dispatchActionWithEscalation(action, settings.enableCdpFallback !== false);
      afterDom = await this.getCondensedDom();
      afterUrl = afterDom.url || '';
      afterDomHash = afterDom.domHash || '';

      verified = verifySkillResult(
        action.skill,
        { url: beforeUrl, domHash: beforeDomHash },
        { url: afterUrl, domHash: afterDomHash, scrollY: 0 },
        execResult
      );
    }

    // Finalize metrics for this step attempt
    const stepMetrics = performanceMonitor.finalizeStepMetrics(stepId);

    // Save record to action history & session replay
    const record = {
      stepNumber: currentPlanStep.step,
      description: currentPlanStep.description,
      action,
      result: execResult,
      observed_change: verified.observed_change,
      screenshot,
      error: verified.error || null,
      escalationLevel: execResult?.escalationLevel || 'dom',
      metrics: stepMetrics,
      timestamp: Date.now()
    };

    this.actionHistory.push(record);
    await Storage.saveReplayStep(this.conversationId, record);

    // Stream step update to panel
    this.sendToPanel('STEP_UPDATE', {
      stepNumber: currentPlanStep.step,
      totalSteps: this.plan.length || 1,
      description: currentPlanStep.description,
      status: verified.success ? 'running' : 'failed',
      action,
      result: execResult,
      screenshot,
      error: verified.error,
      escalationLevel: execResult?.escalationLevel || 'dom',
      verification: verified,
      metrics: stepMetrics
    });

    return { status: 'continue', verified };
  }

  /**
   * Action Dispatcher with 3-tier Escalation Ladder:
   * (a) Direct DOM / content script
   * (b) Synthetic browser events
   * (c) Chrome DevTools Protocol (CDP) real native input
   */
  async dispatchActionWithEscalation(action, allowCdp = true) {
    const { skill } = action;

    // --- Meta / Service Worker Handled Skills ---
    if (skill === 'ask_user') {
      this.sendToPanel('ASK_USER_QUESTION', {
        question: action.question || action.value,
        options: action.options || []
      });
      const answer = await new Promise(resolve => {
        this.pendingAskUserResolve = resolve;
      });
      this.userAnswers.push({ question: action.question || action.value, answer });
      return { success: true, answer, details: `User responded: "${answer}"`, escalationLevel: 'dom' };
    }

    if (skill === 'note') {
      const fact = action.fact || action.value || '';
      Memory.addNote(this.conversationId, fact);
      return { success: true, fact, details: `Memorized fact: "${fact}"`, escalationLevel: 'dom' };
    }

    if (skill === 'save_screenshot_artifact') {
      let shot = await this.captureScreenshot();
      const settings = await Storage.getSettings();
      if (shot && settings.privacyShieldEnabled !== false) {
        try {
          const redactRes = await chrome.tabs.sendMessage(this.tabId, {
            type: 'REDACT_SCREENSHOT',
            payload: { screenshot: shot, options: { mode: settings.redactionMode || 'blur' } }
          });
          if (redactRes && redactRes.success && redactRes.sanitizedScreenshot) {
            shot = redactRes.sanitizedScreenshot;
          }
        } catch (e) {}
      }
      const label = action.label || `Screenshot Step`;
      this.sendToPanel('SCREENSHOT_ARTIFACT', { label, screenshot: shot });
      return { success: true, label, details: `Captured artifact "${label}" (Privacy Redacted)`, escalationLevel: 'dom' };
    }

    if (skill === 'download_file') {
      try {
        const downloadUrl = action.url || (await this.extractDownloadUrl(action.target));
        if (!downloadUrl) throw new Error('Could not resolve download URL.');
        const dlId = await chrome.downloads.download({ url: downloadUrl });
        return { success: true, downloadId: dlId, details: `Download started (id: ${dlId})`, escalationLevel: 'dom' };
      } catch (e) {
        return { success: false, error: `Download failed: ${e.message}`, escalationLevel: 'dom' };
      }
    }

    // --- Tab Navigation Skills ---
    if (skill === 'duplicate_tab') {
      const newTab = await chrome.tabs.duplicate(this.tabId);
      return { success: true, newTabCreated: true, details: `Duplicated tab (new id ${newTab.id})`, escalationLevel: 'dom' };
    }

    if (skill === 'open_tab') {
      const newTab = await chrome.tabs.create({ url: action.url || action.value || 'about:blank' });
      return { success: true, newTabCreated: true, details: `Opened tab (id ${newTab.id})`, escalationLevel: 'dom' };
    }

    if (skill === 'close_tab') {
      const targetTab = action.tab_id || this.tabId;
      await chrome.tabs.remove(targetTab);
      return { success: true, details: `Closed tab ${targetTab}`, escalationLevel: 'dom' };
    }

    if (skill === 'switch_tab') {
      await chrome.tabs.update(action.tab_id, { active: true });
      this.tabId = action.tab_id;
      return { success: true, details: `Switched to tab ${action.tab_id}`, escalationLevel: 'dom' };
    }

    // --- CDP-Only Skills ---
    if (skill === 'zoom' || skill === 'drag_drop' || skill === 'hover' || skill === 'click_at_coordinates' || skill === 'upload_file') {
      const cdpRes = await this.executeWithCdp(action);
      cdpRes.escalationLevel = 'cdp';
      return cdpRes;
    }

    // --- Level 1 & 2: Content Script DOM & Synthetic Execution ---
    try {
      const response = await chrome.tabs.sendMessage(this.tabId, {
        type: 'EXECUTE_ACTION',
        payload: { action }
      });

      if (response && response.success) {
        response.escalationLevel = 'synthetic';
        return response;
      }

      // ESCALATION TRIGGER 2:
      // Synthetic events rejected/fail (or site checks isTrusted) -> CDP immediately, no retries between
      const cdpSupportedSkills = ['click', 'right_click', 'double_click', 'middle_click', 'type', 'key_combo', 'set_slider', 'swipe_gesture', 'set_value'];
      if (allowCdp && cdpSupportedSkills.includes(skill)) {
        console.warn(`[Pluto Subagent] Escalation Trigger 2: Synthetic action "${skill}" failed or site rejected synthetic events. Escalating to CDP immediately without retrying...`);
        const cdpRes = await this.executeWithCdp(action);
        cdpRes.escalationLevel = 'cdp';
        return cdpRes;
      }

      return response || { success: false, error: 'Empty response from content script', escalationLevel: 'dom' };
    } catch (err) {
      const cdpSupportedSkills = ['click', 'right_click', 'double_click', 'middle_click', 'type', 'key_combo', 'set_slider', 'swipe_gesture', 'set_value'];
      if (allowCdp && cdpSupportedSkills.includes(skill)) {
        console.warn(`[Pluto Subagent] Escalation Trigger 2: Content script error for "${skill}". Escalating to CDP immediately:`, err);
        const cdpRes = await this.executeWithCdp(action);
        cdpRes.escalationLevel = 'cdp';
        return cdpRes;
      }
      return { success: false, error: err.message, escalationLevel: 'dom' };
    }
  }

  /**
   * Native OS-level execution via chrome.debugger (CDP)
   */
  async executeWithCdp(action) {
    const { skill, target, value } = action;

    try {
      await this.attachCdp();

      // Zoom
      if (skill === 'zoom') {
        const level = Number(action.level || value) || 1.0;
        await this.sendCdpCommand('Emulation.setPageScaleFactor', { pageScaleFactor: level });
        return { success: true, level, details: `CDP set page zoom level to ${level}` };
      }

      // Click at exact coordinates (First-Class Alternative)
      if (skill === 'click_at_coordinates') {
        const x = Number(action.x);
        const y = Number(action.y);
        await this.sendCdpCommand('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
        await this.sendCdpCommand('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
        await new Promise(r => setTimeout(r, 80));
        await this.sendCdpCommand('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
        return { success: true, details: `CDP clicked coordinates (${x}, ${y})` };
      }

      // Hover
      if (skill === 'hover') {
        const coords = await this.getElementCoords(target);
        await this.sendCdpCommand('Input.dispatchMouseEvent', { type: 'mouseMoved', x: coords.center.x, y: coords.center.y });
        await new Promise(r => setTimeout(r, 500)); // 500ms dwell time per spec
        return { success: true, details: `CDP hovered over [${target}] for 500ms` };
      }

      // Drag & Drop
      if (skill === 'drag_drop') {
        const srcCoords = await this.getElementCoords(action.source || target);
        const dstCoords = await this.getElementCoords(action.destination || value);
        const sx = srcCoords.center.x, sy = srcCoords.center.y;
        const dx = dstCoords.center.x, dy = dstCoords.center.y;

        await this.sendCdpCommand('Input.dispatchMouseEvent', { type: 'mouseMoved', x: sx, y: sy });
        await this.sendCdpCommand('Input.dispatchMouseEvent', { type: 'mousePressed', x: sx, y: sy, button: 'left' });
        
        // 6 interpolated steps
        for (let i = 1; i <= 6; i++) {
          const ix = Math.round(sx + (dx - sx) * (i / 6));
          const iy = Math.round(sy + (dy - sy) * (i / 6));
          await new Promise(r => setTimeout(r, 35));
          await this.sendCdpCommand('Input.dispatchMouseEvent', { type: 'mouseMoved', x: ix, y: iy });
        }
        await new Promise(r => setTimeout(r, 80));
        await this.sendCdpCommand('Input.dispatchMouseEvent', { type: 'mouseReleased', x: dx, y: dy, button: 'left' });
        return { success: true, details: `CDP drag and drop completed from [${action.source}] to [${action.destination}]` };
      }

      // Key Combo (e.g. Ctrl+A, Ctrl+V, Shift+Enter)
      if (skill === 'key_combo') {
        const parts = String(action.combo || value).split('+').map(p => p.trim());
        const isCtrl = parts.includes('Ctrl') || parts.includes('Control');
        const isShift = parts.includes('Shift');
        const isAlt = parts.includes('Alt');
        let modifiers = 0;
        if (isAlt) modifiers |= 1;
        if (isCtrl) modifiers |= 2;
        if (isShift) modifiers |= 8;
        const mainKey = parts.find(p => !['Ctrl', 'Control', 'Shift', 'Alt'].includes(p)) || 'Enter';

        await this.sendCdpCommand('Input.dispatchKeyEvent', {
          type: 'rawKeyDown',
          windowsVirtualKeyCode: mainKey === 'Enter' ? 13 : mainKey.toUpperCase().charCodeAt(0),
          modifiers,
          key: mainKey
        });
        await this.sendCdpCommand('Input.dispatchKeyEvent', {
          type: 'keyUp',
          windowsVirtualKeyCode: mainKey === 'Enter' ? 13 : mainKey.toUpperCase().charCodeAt(0),
          modifiers,
          key: mainKey
        });
        return { success: true, combo: action.combo || value, details: `CDP dispatched key combo: ${action.combo || value}` };
      }

      // Slider
      if (skill === 'set_slider') {
        const coords = await this.getElementCoords(target);
        await this.sendCdpCommand('Input.dispatchMouseEvent', { type: 'mouseMoved', x: coords.center.x, y: coords.center.y });
        await this.sendCdpCommand('Input.dispatchMouseEvent', { type: 'mousePressed', x: coords.center.x, y: coords.center.y, button: 'left' });
        await this.sendCdpCommand('Input.dispatchMouseEvent', { type: 'mouseMoved', x: coords.center.x + 40, y: coords.center.y });
        await this.sendCdpCommand('Input.dispatchMouseEvent', { type: 'mouseReleased', x: coords.center.x + 40, y: coords.center.y, button: 'left' });
        return { success: true, value: action.value, details: `CDP dragged slider [${target}]` };
      }

      // Touch Swipe Gesture emulation via CDP Input.dispatchTouchEvent
      if (skill === 'swipe_gesture') {
        const sx = Number(action.start_x) || 100;
        const sy = Number(action.start_y) || 300;
        const ex = Number(action.end_x) || 100;
        const ey = Number(action.end_y) || 100;
        const duration = Number(action.duration) || 300;

        await this.cdpDispatchTouchEvent('touchStart', [{ x: sx, y: sy }]);
        for (let i = 1; i <= 4; i++) {
          const cx = sx + (ex - sx) * (i / 4);
          const cy = sy + (ey - sy) * (i / 4);
          await new Promise(r => setTimeout(r, Math.round(duration / 4)));
          await this.cdpDispatchTouchEvent('touchMove', [{ x: cx, y: cy }]);
        }
        await this.cdpDispatchTouchEvent('touchEnd', []);
        return { success: true, details: `CDP dispatched native touch swipe from (${sx}, ${sy}) to (${ex}, ${ey})` };
      }

      // Upload File via DOM.setFileInputFiles
      if (skill === 'upload_file') {
        let filePath = action.file_path;
        if (!filePath) {
          this.sendToPanel('REQUEST_FILE_PICKER', { target });
          filePath = await new Promise(resolve => { this.pendingFilePickResolve = resolve; });
        }
        if (!filePath) throw new Error('No file selected for upload.');

        await this.sendCdpCommand('DOM.enable', {});
        const docRes = await this.sendCdpCommand('DOM.getDocument', {});
        const nodeRes = await this.sendCdpCommand('DOM.querySelector', {
          nodeId: docRes.root.nodeId,
          selector: `input[type="file"]`
        });

        if (nodeRes && nodeRes.nodeId) {
          await this.sendCdpCommand('DOM.setFileInputFiles', {
            nodeId: nodeRes.nodeId,
            files: [filePath]
          });
          return { success: true, details: `Attached file "${filePath}" via CDP` };
        }
        throw new Error('Could not find file input element in CDP DOM tree.');
      }

      // Native Click (Left)
      if (skill === 'click') {
        const coords = await this.getElementCoords(target);
        const { x, y } = coords.center;
        await this.sendCdpCommand('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
        await this.sendCdpCommand('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
        await new Promise(r => setTimeout(r, 60));
        await this.sendCdpCommand('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
        return { success: true, details: `CDP dispatched native mouse click at (${x}, ${y})` };
      }

      // Native Right Click
      if (skill === 'right_click') {
        const coords = await this.getElementCoords(target);
        const { x, y } = coords.center;
        await this.sendCdpCommand('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
        await this.sendCdpCommand('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'right', clickCount: 1 });
        await new Promise(r => setTimeout(r, 60));
        await this.sendCdpCommand('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'right', clickCount: 1 });
        return { success: true, details: `CDP dispatched native right-click at (${x}, ${y})` };
      }

      // Native Double Click
      if (skill === 'double_click') {
        const coords = await this.getElementCoords(target);
        const { x, y } = coords.center;
        await this.sendCdpCommand('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
        await this.sendCdpCommand('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
        await this.sendCdpCommand('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
        await this.sendCdpCommand('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 2 });
        await this.sendCdpCommand('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 2 });
        return { success: true, details: `CDP dispatched native double-click at (${x}, ${y})` };
      }

      // Native Middle Click
      if (skill === 'middle_click') {
        const coords = await this.getElementCoords(target);
        const { x, y } = coords.center;
        await this.sendCdpCommand('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
        await this.sendCdpCommand('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'middle', clickCount: 1 });
        await new Promise(r => setTimeout(r, 60));
        await this.sendCdpCommand('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'middle', clickCount: 1 });
        return { success: true, details: `CDP dispatched native middle-click at (${x}, ${y})` };
      }

      // Native Type
      if (skill === 'type' || skill === 'set_value') {
        const coords = await this.getElementCoords(target);
        const { x, y } = coords.center;
        await this.sendCdpCommand('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
        await this.sendCdpCommand('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
        await new Promise(r => setTimeout(r, 80));

        const text = String(action.text !== undefined ? action.text : (value || ''));
        for (const char of text) {
          await this.sendCdpCommand('Input.dispatchKeyEvent', { type: 'keyDown', text: char });
          await this.sendCdpCommand('Input.dispatchKeyEvent', { type: 'keyUp', text: char });
        }
        return { success: true, details: `CDP typed "${text}" natively` };
      }

      return { success: false, error: `CDP does not support skill: ${skill}` };
    } catch (err) {
      return { success: false, error: `CDP execution error: ${err.message}` };
    }
  }

  // ==============================================================
  // INTERNAL CDP CAPABILITIES (Beyond standard user-facing input)
  // ==============================================================

  /**
   * Internal CDP Capability: DOM.getBoxModel
   * Obtains precise element box model and coordinates when content script cannot resolve them
   */
  async cdpGetBoxModel(targetId) {
    try {
      await this.attachCdp();
      await this.sendCdpCommand('DOM.enable', {});
      const docRes = await this.sendCdpCommand('DOM.getDocument', {});
      if (!docRes || !docRes.root) return null;

      const cleanId = String(targetId).trim().replace(/^\[|\]$/g, '');
      const selectors = [
        `[data-testid="${cleanId}"]`,
        `[data-test="${cleanId}"]`,
        `[id="${cleanId}"]`,
        `[name="${cleanId}"]`,
        cleanId.startsWith('.') || cleanId.startsWith('#') ? cleanId : null
      ].filter(Boolean);

      let nodeId = null;
      for (const sel of selectors) {
        try {
          const nodeRes = await this.sendCdpCommand('DOM.querySelector', {
            nodeId: docRes.root.nodeId,
            selector: sel
          });
          if (nodeRes && nodeRes.nodeId) {
            nodeId = nodeRes.nodeId;
            break;
          }
        } catch (e) {}
      }

      if (!nodeId) return null;

      const boxRes = await this.sendCdpCommand('DOM.getBoxModel', { nodeId });
      if (boxRes && boxRes.model && boxRes.model.content) {
        const [x1, y1, x2, y2, x3, y3, x4, y4] = boxRes.model.content;
        const centerX = Math.round((x1 + x2 + x3 + x4) / 4);
        const centerY = Math.round((y1 + y2 + y3 + y4) / 4);
        return {
          center: { x: centerX, y: centerY },
          rect: {
            x: Math.min(x1, x2, x3, x4),
            y: Math.min(y1, y2, y3, y4),
            width: boxRes.model.width,
            height: boxRes.model.height
          }
        };
      }
    } catch (err) {
      console.warn('[Pluto Subagent] cdpGetBoxModel failed:', err);
    }
    return null;
  }

  /**
   * Internal CDP Capability: Input.dispatchTouchEvent
   * Emulates multi-touch sequences natively for mobile responsive pages
   */
  async cdpDispatchTouchEvent(type, touchPoints = []) {
    await this.attachCdp();
    return await this.sendCdpCommand('Input.dispatchTouchEvent', {
      type,
      touchPoints: touchPoints.map((tp, idx) => ({
        x: Math.round(tp.x),
        y: Math.round(tp.y),
        id: tp.id !== undefined ? tp.id : idx,
        radiusX: tp.radiusX || 1,
        radiusY: tp.radiusY || 1,
        force: tp.force !== undefined ? tp.force : 1.0
      }))
    });
  }

  /**
   * Internal CDP Capability: Emulation.setDeviceMetricsOverride
   * Handles responsive layout simulation and viewport testing
   */
  async cdpSetDeviceMetricsOverride({ width = 375, height = 812, deviceScaleFactor = 2, mobile = true } = {}) {
    await this.attachCdp();
    return await this.sendCdpCommand('Emulation.setDeviceMetricsOverride', {
      width: Math.round(width),
      height: Math.round(height),
      deviceScaleFactor,
      mobile,
      screenOrientation: { angle: 0, type: 'portraitPrimary' }
    });
  }

  async cdpClearDeviceMetricsOverride() {
    if (this.cdpAttached) {
      try {
        await this.sendCdpCommand('Emulation.clearDeviceMetricsOverride', {});
      } catch (e) {}
    }
  }

  async getElementCoords(targetId) {
    // 1. Try content script resolver first
    try {
      const coords = await chrome.tabs.sendMessage(this.tabId, {
        type: 'GET_ELEMENT_COORDINATES',
        payload: { targetId }
      });
      if (coords && coords.success && coords.center) {
        return coords;
      }
    } catch (e) {}

    // 2. Fallback to CDP DOM.getBoxModel
    const boxCoords = await this.cdpGetBoxModel(targetId);
    if (boxCoords) {
      return { success: true, center: boxCoords.center, rect: boxCoords.rect };
    }

    throw new Error(`Could not resolve coordinates for ${targetId}`);
  }

  async extractDownloadUrl(targetId) {
    if (!targetId) return null;
    const res = await chrome.tabs.sendMessage(this.tabId, {
      type: 'EXECUTE_ACTION',
      payload: { action: { skill: 'extract_attribute', target: targetId, attribute: 'href' } }
    });
    return res?.extractedData || null;
  }

  async attachCdp() {
    if (this.cdpAttached) return;
    try {
      await chrome.debugger.attach({ tabId: this.tabId }, '1.3');
      this.cdpAttached = true;
      this.sendToPanel('CDP_STATUS', { active: true });
    } catch (err) {
      console.warn('[Pluto Subagent] Could not attach debugger:', err);
    }
  }

  async sendCdpCommand(method, params) {
    if (!this.cdpAttached) return null;
    return new Promise((resolve, reject) => {
      chrome.debugger.sendCommand({ tabId: this.tabId }, method, params, result => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(result);
      });
    });
  }

  async cleanupCdp() {
    try {
      await chrome.tabs.sendMessage(this.tabId, { type: 'CLEAR_VISUALS' });
    } catch (e) {}
    if (this.cdpAttached) {
      try {
        await this.cdpClearDeviceMetricsOverride();
        await chrome.debugger.detach({ tabId: this.tabId });
      } catch (e) {}
      this.cdpAttached = false;
      this.sendToPanel('CDP_STATUS', { active: false });
    }
  }

  async captureScreenshot() {
    try {
      const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 70 });
      return dataUrl;
    } catch (err) {
      console.warn('[Pluto Subagent] Screenshot capture failed:', err);
      return null;
    }
  }

  async getCondensedDom() {
    try {
      const res = await chrome.tabs.sendMessage(this.tabId, {
        type: 'GET_CONDENSED_DOM',
        payload: { maxElements: 150 }
      });
      return res || { condensedText: '' };
    } catch (err) {
      return { condensedText: '', error: err.message };
    }
  }

  async ensureInjected() {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: this.tabId },
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
      console.warn('[Pluto Subagent] Injection check warning:', err);
    }
  }

  async checkBlockedDomain(url) {
    try {
      const settings = await Storage.getSettings();
      const blocked = settings.blockedDomains || [];
      const parsed = new URL(url);
      const host = parsed.hostname.toLowerCase();
      return blocked.some(b => host.includes(b.toLowerCase()));
    } catch (e) {
      return false;
    }
  }
}
