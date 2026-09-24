/**
 * Pluto AI - Content Script Execution Engine
 * Comprehensive executor for DOM manipulation, synthetic events, batch forms,
 * table/link/metadata extraction, popup/cookie dismissal, and frame switching.
 */

(function () {
  window.__PLUTO__ = window.__PLUTO__ || {};

  class ContentExecutor {
    constructor() {
      this.initMessageListener();
    }

    initMessageListener() {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        this.handleMessage(request)
          .then(result => sendResponse(result))
          .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
      });
    }

    async handleMessage(request) {
      const actionType = request.action || request.type;
      const payload = request.payload || {};

      switch (actionType) {
        case 'RUN_LOCAL_PERCEPTION':
          return {
            perception: await window.__AutoBrowserPerception?.runPerceptionPass(payload)
          };

        case 'DETECT_PII':
        case 'SCAN_PII': {
          const detector = window.__AutoBrowserPII || window.__PLUTO__.piiDetector;
          if (!detector) return { success: false, error: 'PII detector not loaded.' };
          const piiData = await detector.scanPage(payload);
          return { success: true, piiData, ...piiData };
        }

        case 'SANITIZE_CONTEXT': {
          const redactor = window.__AutoBrowserRedactor || window.__PLUTO__.privacyRedactor;
          if (!redactor) return { success: false, error: 'Privacy redactor not loaded.' };
          const sanitized = await redactor.sanitizeContext(
            payload.screenshotDataUrl || payload.screenshot,
            payload.piiEntities || payload.entities || [],
            payload.domTags || payload.tags || [],
            { mode: payload.mode }
          );
          return { success: true, sanitized };
        }

        case 'EXECUTE_DOM_ACTION':
          return { result: await window.__AutoBrowserActuator?.execute(payload) };

        case 'VERIFY_EXECUTION':
          return { verification: await window.__AutoBrowserVerifier?.verifyExecution(payload) };

        case 'CAPTURE_PRE_STATE':
          return { preState: window.__AutoBrowserVerifier?.capturePreActionState() };

        case 'INDEX_DOM_AND_TAG':
          return { domInfo: window.__AutoBrowserDOM?.indexAndTagElements() };

        case 'HIDE_TAGS':
          window.__AutoBrowserDOM?.hideTags();
          return { success: true };

        case 'SHOW_TAGS':
          window.__AutoBrowserDOM?.showTags();
          return { success: true };

        case 'GET_CONDENSED_DOM':
          return this.getCondensedDom(payload?.maxElements);

        case 'EXECUTE_ACTION':
          return this.executeAction(payload.action);

        case 'EXTRACT_PAGE_CONTENT':
          return this.extractPageContent();

        case 'GET_ELEMENT_COORDINATES':
          return this.getElementCoordinates(payload.targetId);

        case 'DETECT_OVERLAY':
          return { success: true, overlay: window.__PLUTO__.domCondenser?.detectOverlay() };

        case 'REDACT_SCREENSHOT':
          return this.redactScreenshot(payload);

        case 'SHOW_VISUAL_ACTION':
          return this.showVisualAction(payload);

        case 'CLEAR_VISUALS':
        case 'CLEANUP_OVERLAYS':
          window.__AutoBrowserDOM?.cleanupTags();
          window.__AutoBrowserVisuals?.cleanupAll();
          return { success: true };

        case 'SET_SCREEN_GLOW':
          window.__AutoBrowserVisuals?.setScreenGlow(payload?.active);
          return { success: true };

        case 'SHOW_HUD_MESSAGE':
          window.__AutoBrowserVisuals?.showHUD(payload?.message, payload?.status);
          return { success: true };

        case 'HIGHLIGHT_PII_ELEMENT': {
          let el = null;
          if (payload.selector) {
            try { el = document.querySelector(payload.selector); } catch (e) {}
          }
          if (!el && payload.tag) {
            el = document.querySelector(`[data-autobrowser-tag="${payload.tag}"]`) ||
                 document.querySelector(`[data-pluto-tag="${payload.tag}"]`);
          }
          if (!el && payload.value) {
            const allElements = document.querySelectorAll('td, th, span, div, p, a, button, input, label, mat-cell, cdk-cell');
            for (const item of allElements) {
              if (item.children.length === 0 && (item.textContent || item.value || item.getAttribute('title') || '').includes(payload.value)) {
                el = item;
                break;
              }
            }
          }
          if (el) {
            try {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              window.__AutoBrowserVisuals?.highlightElement(el);
              const r = el.getBoundingClientRect();
              window.__AutoBrowserVisuals?.triggerClickRipple(r.left + r.width / 2, r.top + r.height / 2);
              window.__AutoBrowserVisuals?.showHUD(`Located PII: ${payload.type || 'Sensitive Data'}`);
            } catch (e) {}
          } else if (payload.rect) {
            window.__AutoBrowserVisuals?.triggerClickRipple(payload.rect.x + (payload.rect.width || payload.rect.w || 20) / 2, payload.rect.y + (payload.rect.height || payload.rect.h || 20) / 2);
            window.__AutoBrowserVisuals?.showHUD(`Located PII: ${payload.type || 'Sensitive Data'}`);
          }
          return { success: true };
        }

        default:
          return { success: false, error: `Unknown action type: ${actionType}` };
      }
    }

    getCondensedDom(maxElements = 150) {
      if (!window.__PLUTO__.domCondenser) {
        return { success: false, error: 'DOM Condenser not loaded.' };
      }
      const data = window.__PLUTO__.domCondenser.condense(maxElements);
      return { success: true, ...data };
    }

    getElementCoordinates(targetId) {
      const resolved = window.__PLUTO__.resolver?.resolve(targetId);
      if (!resolved) {
        return { success: false, error: `Element "${targetId}" not found.` };
      }
      return {
        success: true,
        rect: resolved.rect,
        center: resolved.center,
        tag: resolved.tagName
      };
    }

    async scanPii() {
      if (!window.__PLUTO__.piiDetector) {
        return { success: false, error: 'PII Detector not loaded.' };
      }
      const scanResult = await window.__PLUTO__.piiDetector.scanPage();
      return { success: true, ...scanResult };
    }

    async redactScreenshot(payload) {
      if (!window.__PLUTO__.privacyRedactor) {
        return { success: false, error: 'Privacy Redactor not loaded.' };
      }
      const piiEntities = payload?.entities || (await window.__PLUTO__.piiDetector?.scanPage())?.entities || [];
      const redacted = await window.__PLUTO__.privacyRedactor.sanitizeContext(
        payload?.screenshot,
        piiEntities,
        payload?.options || {}
      );
      return { success: true, ...redacted };
    }

    async showVisualAction(payload) {
      if (!window.__PLUTO__.visuals) return { success: false };
      if (payload.action === 'move') {
        await window.__PLUTO__.visuals.moveCursorTo(payload.x, payload.y, payload.meta || {});
      } else if (payload.action === 'ripple') {
        window.__PLUTO__.visuals.triggerClickRipple(payload.x, payload.y);
      } else if (payload.action === 'hud') {
        window.__PLUTO__.visuals.showHUD(payload.message, payload.status || 'active');
      } else if (payload.action === 'highlight') {
        const resolved = window.__PLUTO__.resolver?.resolve(payload.target);
        if (resolved?.element) window.__PLUTO__.visuals.highlightElement(resolved.element);
      }
      return { success: true };
    }

    flashElement(el) {
      if (!el || !el.style) return;
      try {
        const prevOutline = el.style.outline;
        const prevShadow = el.style.boxShadow;
        const prevTransition = el.style.transition;

        el.style.transition = 'all 0.2s ease-in-out';
        el.style.outline = '2px solid #6366f1';
        el.style.boxShadow = '0 0 12px #38bdf8';

        setTimeout(() => {
          el.style.outline = prevOutline;
          el.style.boxShadow = prevShadow;
          el.style.transition = prevTransition;
        }, 800);
      } catch (e) {}
    }

    async executeAction(action) {
      if (!action || !action.skill) {
        return { success: false, error: 'Invalid action payload: missing skill name.' };
      }

      const { skill } = action;

      switch (skill) {
        // --- Navigation & Movement ---
        case 'navigate':
          return this.actionNavigate(action.url || action.value);
        case 'go_back':
          window.history.back();
          return { success: true, details: 'Navigated back' };
        case 'reload':
          window.location.reload();
          return { success: true, details: 'Reloaded page' };
        case 'scroll':
          return this.actionScroll(action);
        case 'wait':
          return this.actionWait(action);
        case 'get_scroll_position':
          return this.actionGetScrollPosition();

        // --- Mouse & Pointer ---
        case 'click':
          return this.actionClick(action.target, 0);
        case 'right_click':
          return this.actionClick(action.target, 2);
        case 'middle_click':
          return this.actionClick(action.target, 1);
        case 'double_click':
          return this.actionDoubleClick(action.target);
        case 'swipe_gesture':
          return this.actionSwipe(action);

        // --- Keyboard & Typing ---
        case 'type':
          return this.actionType(action.target, action.text !== undefined ? action.text : action.value, action.clear_first);
        case 'clear_field':
          return this.actionClearField(action.target);
        case 'press_key':
          return this.actionPressKey(action.key || action.value || 'Enter');
        case 'key_combo':
          return this.actionKeyCombo(action.combo || action.value);
        case 'paste_text':
          return this.actionPasteText(action.target, action.text !== undefined ? action.text : action.value);
        case 'set_value':
          return this.actionSetValue(action.target, action.value);

        // --- Forms & Inputs ---
        case 'select_option':
          return this.actionSelectOption(action.target, action.value);
        case 'select_combobox':
          return this.actionSelectCombobox(action.target, action.option || action.value);
        case 'check':
          return this.actionSetChecked(action.target, true);
        case 'uncheck':
          return this.actionSetChecked(action.target, false);
        case 'select_radio':
          return this.actionSetChecked(action.target, true);
        case 'toggle_switch':
          return this.actionToggleSwitch(action.target);
        case 'fill_form':
          return this.actionFillForm(action.fields || []);
        case 'set_date':
          return this.actionSetDate(action.target, action.date || action.value);
        case 'set_slider':
          return this.actionSetSlider(action.target, action.value);
        case 'handle_autocomplete':
          return this.actionHandleAutocomplete(action.target, action.query, action.suggestion);

        // --- Reading & Extraction ---
        case 'extract':
        case 'extract_text':
          return this.actionExtractText(action.target);
        case 'extract_table':
          return this.actionExtractTable(action.target);
        case 'extract_list':
          return this.actionExtractList(action.target);
        case 'extract_attribute':
          return this.actionExtractAttribute(action.target, action.attribute);
        case 'read_element':
          return this.actionReadElement(action.target);
        case 'extract_all_links':
          return this.actionExtractAllLinks(action.scope);
        case 'get_page_metadata':
          return this.actionGetPageMetadata();

        // --- Page State & Overlays ---
        case 'dismiss_popup':
          return this.actionDismissPopup();
        case 'accept_cookies':
          return this.actionAcceptCookies();
        case 'switch_frame':
          return this.actionSwitchFrame(action.frame_target || action.value);
        case 'element_exists':
          return this.actionElementExists(action.target, action.query);

        default:
          return { success: false, error: `Skill "${skill}" is handled in service worker or unsupported.` };
      }
    }

    // ==========================================
    // NAVIGATION & SCROLL IMPLEMENTATIONS
    // ==========================================

    actionNavigate(url) {
      if (!url) return { success: false, error: 'No URL specified.' };
      let finalUrl = String(url).trim();
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = 'https://' + finalUrl;
      }
      window.location.href = finalUrl;
      return { success: true, details: `Navigating to ${finalUrl}` };
    }

    async actionScroll(action) {
      const { direction, amount, target, variant } = action;

      // 1. Scroll to element
      if (target) {
        const resolved = window.__PLUTO__.resolver?.resolve(target);
        if (resolved) {
          resolved.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return { success: true, details: `Scrolled element [${target}] into view` };
        }
      }

      // 2. Lazy load loop: scroll_to_bottom
      if (variant === 'scroll_to_bottom' || direction === 'bottom') {
        let lastHeight = 0;
        let iterations = 0;
        while (iterations < 10) {
          iterations++;
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          await new Promise(r => setTimeout(r, 600));
          const currentHeight = document.body.scrollHeight;
          if (currentHeight === lastHeight) break;
          lastHeight = currentHeight;
        }
        return { success: true, details: `Scrolled to bottom (${iterations} lazy iterations, total height ${document.body.scrollHeight}px)` };
      }

      if (variant === 'scroll_to_top' || direction === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return { success: true, details: 'Scrolled to top of page' };
      }

      const px = Number(amount) || 450;
      let top = 0;
      if (direction === 'up') top = -px;
      else top = px;

      window.scrollBy({ top, behavior: 'smooth' });
      return { success: true, scrollY: window.scrollY, details: `Scrolled ${direction || 'down'} by ${px}px` };
    }

    async actionWait(action) {
      const duration = Number(action.duration) || Number(action.value) || 2000;
      const condition = action.condition;

      if (!condition) {
        await new Promise(r => setTimeout(r, Math.min(duration, 15000)));
        return { success: true, details: `Waited for ${duration}ms` };
      }

      const start = Date.now();
      const timeout = Math.min(duration, 15000);

      if (condition === 'url_contains' && action.value) {
        while (Date.now() - start < timeout) {
          if (window.location.href.includes(action.value)) {
            return { success: true, details: `URL contains "${action.value}"` };
          }
          await new Promise(r => setTimeout(r, 200));
        }
        return { success: false, error: `Timed out waiting for URL to contain "${action.value}"` };
      }

      if (condition === 'text_visible' && action.value) {
        while (Date.now() - start < timeout) {
          if (document.body.innerText.includes(action.value)) {
            return { success: true, details: `Text "${action.value}" is visible` };
          }
          await new Promise(r => setTimeout(r, 250));
        }
        return { success: false, error: `Timed out waiting for text "${action.value}"` };
      }

      if (condition === 'element_appears' && action.value) {
        while (Date.now() - start < timeout) {
          const resolved = window.__PLUTO__.resolver?.resolve(action.value);
          if (resolved) {
            return { success: true, details: `Element [${action.value}] appeared` };
          }
          await new Promise(r => setTimeout(r, 250));
        }
        return { success: false, error: `Timed out waiting for element [${action.value}]` };
      }

      // Default network_idle check (500ms delay)
      await new Promise(r => setTimeout(r, 800));
      return { success: true, details: 'Waited for network idle / stabilization' };
    }

    actionGetScrollPosition() {
      return {
        success: true,
        x: window.scrollX,
        y: window.scrollY,
        totalHeight: document.body.scrollHeight,
        viewportHeight: window.innerHeight
      };
    }

    // ==========================================
    // MOUSE & POINTER ACTIONS
    // ==========================================

    async actionClick(targetId, button = 0) {
      const resolved = window.__PLUTO__.resolver?.resolve(targetId);
      if (!resolved) {
        return { success: false, error: `Could not find element [${targetId}] to click.` };
      }

      const el = resolved.element;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });

      if (window.__PLUTO__.visuals && resolved.center) {
        window.__PLUTO__.visuals.highlightElement(el);
        await window.__PLUTO__.visuals.moveCursorTo(resolved.center.x, resolved.center.y, { action: 'click', text: resolved.text });
        window.__PLUTO__.visuals.showHUD(`🖱️ Clicking ${resolved.text ? `"${resolved.text.slice(0, 16)}"` : resolved.tagName}`);
      } else {
        this.flashElement(el);
      }
      await new Promise(r => setTimeout(r, 120));

      const mouseOptions = {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: resolved.center.x,
        clientY: resolved.center.y,
        button
      };

      el.dispatchEvent(new PointerEvent('pointerover', mouseOptions));
      el.dispatchEvent(new MouseEvent('mouseover', mouseOptions));
      el.dispatchEvent(new PointerEvent('pointerdown', mouseOptions));
      el.dispatchEvent(new MouseEvent('mousedown', mouseOptions));
      el.focus();
      el.dispatchEvent(new PointerEvent('pointerup', mouseOptions));
      el.dispatchEvent(new MouseEvent('mouseup', mouseOptions));

      if (button === 2) {
        el.dispatchEvent(new MouseEvent('contextmenu', mouseOptions));
        return { success: true, details: `Right-clicked on [${targetId}]` };
      }

      el.dispatchEvent(new MouseEvent('click', mouseOptions));
      if (button === 0 && typeof el.click === 'function') {
        el.click();
      }

      return { success: true, changed: true, details: `Clicked [${targetId}] <${resolved.tagName}>` };
    }

    async actionDoubleClick(targetId) {
      const resolved = window.__PLUTO__.resolver?.resolve(targetId);
      if (!resolved) return { success: false, error: `Element [${targetId}] not found.` };

      const el = resolved.element;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });

      if (window.__PLUTO__.visuals && resolved.center) {
        window.__PLUTO__.visuals.highlightElement(el);
        await window.__PLUTO__.visuals.moveCursorTo(resolved.center.x, resolved.center.y, { action: 'click' });
        window.__PLUTO__.visuals.showHUD(`🖱️ Double-clicking ${resolved.tagName}`);
      } else {
        this.flashElement(el);
      }
      await new Promise(r => setTimeout(r, 100));

      const mouseOptions = { bubbles: true, cancelable: true, view: window, clientX: resolved.center.x, clientY: resolved.center.y };
      el.dispatchEvent(new MouseEvent('mousedown', mouseOptions));
      el.dispatchEvent(new MouseEvent('mouseup', mouseOptions));
      el.dispatchEvent(new MouseEvent('click', mouseOptions));
      el.dispatchEvent(new MouseEvent('mousedown', mouseOptions));
      el.dispatchEvent(new MouseEvent('mouseup', mouseOptions));
      el.dispatchEvent(new MouseEvent('click', mouseOptions));
      el.dispatchEvent(new MouseEvent('dblclick', mouseOptions));

      return { success: true, details: `Double clicked on [${targetId}]` };
    }

    async actionSwipe(action) {
      const { start_x, start_y, end_x, end_y, duration = 300 } = action;
      const targetEl = document.elementFromPoint(start_x, start_y) || document.body;

      if (window.__PLUTO__.visuals) {
        window.__PLUTO__.visuals.showHUD(`👆 Swiping gesture`);
      }

      const createTouch = (x, y) => new Touch({
        identifier: Date.now(),
        target: targetEl,
        clientX: x,
        clientY: y
      });

      targetEl.dispatchEvent(new TouchEvent('touchstart', {
        bubbles: true, cancelable: true, touches: [createTouch(start_x, start_y)]
      }));

      // Interpolate 4 move steps
      for (let i = 1; i <= 4; i++) {
        const curX = start_x + (end_x - start_x) * (i / 4);
        const curY = start_y + (end_y - start_y) * (i / 4);
        await new Promise(r => setTimeout(r, duration / 4));
        targetEl.dispatchEvent(new TouchEvent('touchmove', {
          bubbles: true, cancelable: true, touches: [createTouch(curX, curY)]
        }));
      }

      targetEl.dispatchEvent(new TouchEvent('touchend', {
        bubbles: true, cancelable: true, touches: []
      }));

      return { success: true, details: `Swiped from (${start_x}, ${start_y}) to (${end_x}, ${end_y})` };
    }

    // ==========================================
    // KEYBOARD & TYPING ACTIONS
    // ==========================================

    async actionType(targetId, text, clearFirst = false) {
      const resolved = window.__PLUTO__.resolver?.resolve(targetId);
      if (!resolved) return { success: false, error: `Element [${targetId}] not found.` };

      const el = resolved.element;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus();

      if (window.__PLUTO__.visuals && resolved.center) {
        window.__PLUTO__.visuals.highlightElement(el);
        await window.__PLUTO__.visuals.moveCursorTo(resolved.center.x, resolved.center.y, { action: 'type', text });
        window.__PLUTO__.visuals.showHUD(`⌨️ Typing into ${resolved.tagName}`);
      } else {
        this.flashElement(el);
      }

      if (clearFirst) {
        el.value = '';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }

      const str = String(text !== undefined ? text : '');
      const prev = el.value || '';
      el.value = prev + str;

      el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));

      return { success: true, text: str, details: `Typed "${str}" into [${targetId}]` };
    }

    actionClearField(targetId) {
      const resolved = window.__PLUTO__.resolver?.resolve(targetId);
      if (!resolved) return { success: false, error: `Element [${targetId}] not found.` };

      const el = resolved.element;
      el.focus();
      el.value = '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return { success: true, details: `Cleared input [${targetId}]` };
    }

    actionPressKey(key) {
      const active = document.activeElement || document.body;
      const keyMap = {
        Enter: { key: 'Enter', code: 'Enter', keyCode: 13 },
        Escape: { key: 'Escape', code: 'Escape', keyCode: 27 },
        Tab: { key: 'Tab', code: 'Tab', keyCode: 9 },
        Backspace: { key: 'Backspace', code: 'Backspace', keyCode: 8 },
        ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
        ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 }
      };

      const info = keyMap[key] || { key, code: key, keyCode: 0 };
      active.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...info }));
      active.dispatchEvent(new KeyboardEvent('keypress', { bubbles: true, cancelable: true, ...info }));
      active.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, ...info }));

      if (key === 'Enter' && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        const form = active.closest('form');
        if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }

      return { success: true, key, details: `Pressed ${key}` };
    }

    actionKeyCombo(combo) {
      const active = document.activeElement || document.body;
      const parts = String(combo).split('+').map(p => p.trim());
      const ctrl = parts.includes('Ctrl') || parts.includes('Control');
      const shift = parts.includes('Shift');
      const alt = parts.includes('Alt');
      const mainKey = parts.find(p => !['Ctrl', 'Control', 'Shift', 'Alt'].includes(p)) || 'a';

      active.dispatchEvent(new KeyboardEvent('keydown', {
        key: mainKey, code: `Key${mainKey.toUpperCase()}`,
        ctrlKey: ctrl, shiftKey: shift, altKey: alt, bubbles: true, cancelable: true
      }));

      // If Ctrl+A, select input text
      if (ctrl && mainKey.toLowerCase() === 'a' && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        active.select();
      }

      active.dispatchEvent(new KeyboardEvent('keyup', {
        key: mainKey, code: `Key${mainKey.toUpperCase()}`,
        ctrlKey: ctrl, shiftKey: shift, altKey: alt, bubbles: true, cancelable: true
      }));

      return { success: true, combo, details: `Dispatched key combination: ${combo}` };
    }

    actionPasteText(targetId, text) {
      const resolved = window.__PLUTO__.resolver?.resolve(targetId);
      if (!resolved) return { success: false, error: `Element [${targetId}] not found.` };

      const el = resolved.element;
      el.focus();
      this.flashElement(el);

      const str = String(text || '');
      el.value = str;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));

      return { success: true, text: str, details: `Pasted ${str.length} characters into [${targetId}]` };
    }

    actionSetValue(targetId, value) {
      const resolved = window.__PLUTO__.resolver?.resolve(targetId);
      if (!resolved) return { success: false, error: `Element [${targetId}] not found.` };

      const el = resolved.element;
      // Direct DOM value assignment with prototype setter (essential for React 16+)
      const prototype = Object.getPrototypeOf(el);
      const valueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
      if (valueSetter) {
        valueSetter.call(el, value);
      } else {
        el.value = value;
      }

      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));

      return { success: true, details: `Set value directly on [${targetId}]` };
    }

    // ==========================================
    // FORMS & INPUT CONTROLS
    // ==========================================

    actionSelectOption(targetId, optionValue) {
      const resolved = window.__PLUTO__.resolver?.resolve(targetId);
      if (!resolved || resolved.tagName !== 'select') {
        return { success: false, error: `[${targetId}] is not a valid <select> element.` };
      }

      const select = resolved.element;
      const targetVal = String(optionValue).toLowerCase();

      for (const opt of select.options) {
        if (opt.value.toLowerCase() === targetVal || opt.text.toLowerCase().includes(targetVal)) {
          select.value = opt.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          return { success: true, selectedOption: opt.text, details: `Selected "${opt.text}"` };
        }
      }
      return { success: false, error: `Option "${optionValue}" not found in [${targetId}].` };
    }

    async actionSelectCombobox(targetId, optionTextOrId) {
      // 1. Click combobox trigger to open popup list
      await this.actionClick(targetId);
      await new Promise(r => setTimeout(r, 400));

      // 2. Look for option element
      let optionEl = window.__PLUTO__.resolver?.resolve(optionTextOrId)?.element;
      if (!optionEl) {
        const candidates = Array.from(document.querySelectorAll('[role="option"], .select__option, li'));
        optionEl = candidates.find(el => (el.innerText || '').toLowerCase().includes(String(optionTextOrId).toLowerCase()));
      }

      if (optionEl) {
        optionEl.click();
        return { success: true, option: optionTextOrId, details: `Selected combobox option "${optionTextOrId}"` };
      }

      return { success: false, error: `Could not find combobox option "${optionTextOrId}" after expanding.` };
    }

    actionSetChecked(targetId, checked) {
      const resolved = window.__PLUTO__.resolver?.resolve(targetId);
      if (!resolved) return { success: false, error: `Element [${targetId}] not found.` };

      const el = resolved.element;
      if (el.type === 'checkbox' || el.type === 'radio') {
        if (el.checked !== checked) {
          el.click();
        }
        return { success: true, details: `Checkbox [${targetId}] set to ${checked}` };
      }

      // ARIA role=checkbox/radio
      el.setAttribute('aria-checked', String(checked));
      el.click();
      return { success: true, details: `ARIA checkbox [${targetId}] set to ${checked}` };
    }

    actionToggleSwitch(targetId) {
      const resolved = window.__PLUTO__.resolver?.resolve(targetId);
      if (!resolved) return { success: false, error: `Switch [${targetId}] not found.` };

      const el = resolved.element;
      const current = el.getAttribute('aria-checked') === 'true';
      el.setAttribute('aria-checked', String(!current));
      el.click();
      return { success: true, details: `Toggled switch [${targetId}] to ${!current}` };
    }

    async actionFillForm(fields = []) {
      const results = [];
      let successCount = 0;

      for (const field of fields) {
        const { field_id, value, type } = field;
        let res;

        if (type === 'select') {
          res = this.actionSelectOption(field_id, value);
        } else if (type === 'checkbox') {
          res = this.actionSetChecked(field_id, value === true || value === 'true');
        } else {
          res = await this.actionType(field_id, value, true);
        }

        results.push({ field_id, success: res.success });
        if (res.success) successCount++;
        await new Promise(r => setTimeout(r, 100));
      }

      return {
        success: successCount > 0,
        filledCount: successCount,
        results,
        details: `Filled ${successCount}/${fields.length} form fields`
      };
    }

    actionSetDate(targetId, dateStr) {
      const resolved = window.__PLUTO__.resolver?.resolve(targetId);
      if (!resolved) return { success: false, error: `Date input [${targetId}] not found.` };

      const el = resolved.element;
      el.focus();
      el.value = dateStr;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return { success: true, date: dateStr, details: `Date set to "${dateStr}" on [${targetId}]` };
    }

    actionSetSlider(targetId, value) {
      const resolved = window.__PLUTO__.resolver?.resolve(targetId);
      if (!resolved) return { success: false, error: `Slider [${targetId}] not found.` };

      const el = resolved.element;
      el.focus();
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return { success: true, value, details: `Slider [${targetId}] set to ${value}` };
    }

    async actionHandleAutocomplete(targetId, query, suggestion) {
      // 1. Type query
      await this.actionType(targetId, query, true);
      await new Promise(r => setTimeout(r, 600));

      // 2. Click matching suggestion
      let item = window.__PLUTO__.resolver?.resolve(suggestion)?.element;
      if (!item) {
        const options = Array.from(document.querySelectorAll('[role="option"], .autocomplete-suggestion, li'));
        item = options.find(el => (el.innerText || '').toLowerCase().includes(String(suggestion || query).toLowerCase()));
      }

      if (item) {
        item.click();
        return { success: true, details: `Selected autocomplete suggestion "${item.innerText || suggestion}"` };
      }

      return { success: true, details: `Typed query into autocomplete field [${targetId}]` };
    }

    // ==========================================
    // READING & EXTRACTION
    // ==========================================

    actionExtractText(targetId) {
      if (targetId) {
        const resolved = window.__PLUTO__.resolver?.resolve(targetId);
        if (!resolved) return { success: false, error: `Element [${targetId}] not found.` };
        const text = (resolved.element.innerText || resolved.element.textContent || '').trim();
        return { success: true, extractedData: text, details: `Extracted text from [${targetId}]` };
      }
      return this.extractPageContent();
    }

    actionExtractTable(targetId) {
      const resolved = window.__PLUTO__.resolver?.resolve(targetId);
      const table = resolved ? resolved.element : document.querySelector('table');
      if (!table) return { success: false, error: 'No table found on page.' };

      const rows = Array.from(table.querySelectorAll('tr'));
      const tableData = rows.map(tr => {
        return Array.from(tr.querySelectorAll('th, td')).map(td => (td.innerText || '').trim());
      });

      return { success: true, extractedData: tableData, details: `Extracted table with ${tableData.length} rows` };
    }

    actionExtractList(targetId) {
      const resolved = window.__PLUTO__.resolver?.resolve(targetId);
      const listEl = resolved ? resolved.element : document.querySelector('ul, ol');
      if (!listEl) return { success: false, error: 'No list found on page.' };

      const items = Array.from(listEl.querySelectorAll('li')).map(li => (li.innerText || '').trim());
      return { success: true, extractedData: items, details: `Extracted list with ${items.length} items` };
    }

    actionExtractAttribute(targetId, attributeName) {
      const resolved = window.__PLUTO__.resolver?.resolve(targetId);
      if (!resolved) return { success: false, error: `Element [${targetId}] not found.` };

      const val = resolved.element.getAttribute(attributeName) || resolved.element[attributeName];
      return { success: true, extractedData: val, details: `Extracted attribute "${attributeName}" = "${val}"` };
    }

    actionReadElement(targetId) {
      const resolved = window.__PLUTO__.resolver?.resolve(targetId);
      if (!resolved) return { success: false, error: `Element [${targetId}] not found.` };

      const el = resolved.element;
      const data = {
        id: targetId,
        tag: el.tagName.toLowerCase(),
        text: (el.innerText || el.textContent || '').trim(),
        value: el.value,
        ariaLabel: el.getAttribute('aria-label'),
        role: el.getAttribute('role'),
        checked: el.checked || el.getAttribute('aria-checked'),
        rect: resolved.rect
      };

      return { success: true, extractedData: data, details: `Read details for <${data.tag}> [${targetId}]` };
    }

    actionExtractAllLinks(scopeId) {
      const container = scopeId ? (window.__PLUTO__.resolver?.resolve(scopeId)?.element || document) : document;
      const anchors = Array.from(container.querySelectorAll('a[href]'));

      const links = [];
      const seen = new Set();

      for (const a of anchors) {
        const href = a.href;
        const text = (a.innerText || a.textContent || '').trim();
        if (href && !seen.has(href) && !href.startsWith('javascript:')) {
          seen.add(href);
          links.push({ text: text || href, href, target: a.target || '_self' });
        }
        if (links.length >= 200) break;
      }

      return { success: true, extractedData: links, details: `Extracted ${links.length} unique links` };
    }

    actionGetPageMetadata() {
      const meta = {
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.content || '',
        ogImage: document.querySelector('meta[property="og:image"]')?.content || '',
        canonical: document.querySelector('link[rel="canonical"]')?.href || window.location.href
      };
      return { success: true, extractedData: meta, details: `Page metadata: "${meta.title}"` };
    }

    // ==========================================
    // PAGE STATE & OVERLAYS
    // ==========================================

    actionDismissPopup() {
      const overlay = window.__PLUTO__.domCondenser?.detectOverlay();
      if (!overlay?.hasOverlay || !overlay.element) {
        return { success: false, dismissed: false, details: 'No active popup overlay detected.' };
      }

      // Try finding close button inside or near overlay
      const closeSelectors = [
        'button[aria-label*="close" i]',
        'button[aria-label*="dismiss" i]',
        'button.close',
        '.modal__close',
        '.dialog-close',
        'button[title*="close" i]'
      ];

      for (const sel of closeSelectors) {
        const btn = overlay.element.querySelector(sel);
        if (btn) {
          btn.click();
          return { success: true, dismissed: true, details: 'Dismissed overlay popup via close button' };
        }
      }

      // Try finding button with "✕", "X", "Close", "Skip"
      const buttons = Array.from(overlay.element.querySelectorAll('button, a, span[role="button"]'));
      for (const b of buttons) {
        const text = (b.innerText || '').trim().toLowerCase();
        if (text === '✕' || text === 'x' || text === 'close' || text === 'skip' || text === 'not now') {
          b.click();
          return { success: true, dismissed: true, details: `Clicked dismiss button "${text}"` };
        }
      }

      // Fallback: remove modal directly from DOM if it covers the screen
      overlay.element.remove();
      return { success: true, dismissed: true, details: 'Removed modal overlay from DOM' };
    }

    actionAcceptCookies() {
      const consentWords = [
        'accept all', 'accept cookies', 'accept', 'agree', 'i agree',
        'allow all', 'allow', 'ok', 'got it', 'understand',
        'accepter', 'zustimmen', 'alle akzeptieren', 'aceptar'
      ];

      const candidates = Array.from(document.querySelectorAll('button, a, [role="button"]'));
      for (const el of candidates) {
        const text = (el.innerText || el.textContent || '').trim().toLowerCase();
        for (const w of consentWords) {
          if (text === w || (text.includes(w) && text.length < 35)) {
            el.click();
            return { success: true, accepted: true, details: `Clicked cookie consent button: "${text}"` };
          }
        }
      }

      return { success: false, accepted: false, details: 'No cookie consent banner detected' };
    }

    actionSwitchFrame(frameTarget) {
      const res = window.__PLUTO__.domCondenser?.setFrameContext(frameTarget);
      return res || { success: false, error: 'DOM condenser not available' };
    }

    actionElementExists(targetId, query) {
      if (targetId) {
        const resolved = window.__PLUTO__.resolver?.resolve(targetId);
        return { success: true, exists: !!resolved, target: targetId };
      }
      if (query) {
        const found = window.__PLUTO__.resolver?.heuristicSearch(query);
        return { success: true, exists: !!found, query };
      }
      return { success: false, error: 'Neither target nor query provided.' };
    }

    extractPageContent() {
      const clone = document.body.cloneNode(true);
      const noise = clone.querySelectorAll('script, style, svg, noscript, nav, footer, header');
      noise.forEach(s => s.remove());

      let text = clone.innerText || clone.textContent || '';
      text = text.replace(/\n\s*\n/g, '\n\n').replace(/\s+/g, ' ').trim();

      if (text.length > 12000) {
        text = text.substring(0, 11900) + '\n\n[... Remaining content truncated ...]';
      }

      return {
        success: true,
        title: document.title,
        url: window.location.href,
        content: text
      };
    }
  }

  window.__PLUTO__.executor = new ContentExecutor();
})();
