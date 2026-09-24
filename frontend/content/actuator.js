/**
 * PlutoAI - Browser Actuator & High-Fidelity Event Synthesizer
 * Features Visual Gliding Cursor, Action Badges, Click Ripples & Element Highlights
 */

(function () {
  window.__AutoBrowserActuator = {
    /**
     * Executes the requested action on the page
     */
    async execute({ actionType, targetTag, value, pressEnter }) {
      console.log(`[PlutoAI Actuator] Executing ${actionType} on target [${targetTag}] with value: "${value}"`);

      switch (actionType) {
        case 'click':
          return await this.click(targetTag);

        case 'type':
          return await this.type(targetTag, value, pressEnter);

        case 'select':
          return await this.select(targetTag, value);

        case 'hover':
          return await this.hover(targetTag);

        case 'press_key':
          return await this.pressKey(value);

        case 'scroll':
          return await this.scroll(value || 'down');

        case 'navigate':
          return await this.navigate(value);

        case 'wait':
          await new Promise(r => setTimeout(r, parseInt(value, 10) || 1200));
          return { success: true, waitedMs: parseInt(value, 10) || 1200 };

        case 'extract':
          return await this.extract();

        default:
          throw new Error(`Unsupported DOM action type: ${actionType}`);
      }
    },

    /**
     * Clicks an interactive element by tag identifier
     */
    async click(tag) {
      let el = window.__AutoBrowserDOM.getElementByTag(tag);
      if (!el) {
        // Re-index and try again
        window.__AutoBrowserDOM.indexAndTagElements();
        el = window.__AutoBrowserDOM.getElementByTag(tag);
      }

      if (!el) {
        throw new Error(`Element with tag [${tag}] was not found on the page.`);
      }

      // Scroll into view if not visible
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      await new Promise(r => setTimeout(r, 220));

      const rect = el.getBoundingClientRect();
      const clickX = Math.round(rect.left + rect.width / 2);
      const clickY = Math.round(rect.top + rect.height / 2);

      // Animate laser cursor & visual HUD
      const label = el.innerText || el.value || el.getAttribute('aria-label') || el.name || el.id || el.tagName;
      const cleanLabel = window.__AutoBrowserDOM.cleanText(label);
      
      window.__AutoBrowserVisuals.showHUD(`Clicking [${tag}] "${cleanLabel}"`);
      window.__AutoBrowserVisuals.highlightElement(el);
      
      await window.__AutoBrowserVisuals.moveCursorTo(clickX, clickY, { action: 'click', text: cleanLabel, tag });
      window.__AutoBrowserVisuals.triggerClickRipple(clickX, clickY);

      // Focus
      if (typeof el.focus === 'function') {
        try { el.focus(); } catch (e) {}
      }

      // Dispatch full pointer and mouse event lifecycle
      const eventOpts = {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: clickX,
        clientY: clickY,
        button: 0,
        buttons: 1
      };

      el.dispatchEvent(new PointerEvent('pointerover', eventOpts));
      el.dispatchEvent(new MouseEvent('mouseover', eventOpts));
      el.dispatchEvent(new PointerEvent('pointerenter', eventOpts));
      el.dispatchEvent(new PointerEvent('pointerdown', eventOpts));
      el.dispatchEvent(new MouseEvent('mousedown', eventOpts));

      await new Promise(r => setTimeout(r, 60));

      el.dispatchEvent(new PointerEvent('pointerup', eventOpts));
      el.dispatchEvent(new MouseEvent('mouseup', eventOpts));
      el.dispatchEvent(new MouseEvent('click', eventOpts));

      // Native click trigger
      if (typeof el.click === 'function' && el.tagName !== 'A') {
        try { el.click(); } catch (e) {}
      }

      // If button is inside form with type submit, submit form
      if ((el.type === 'submit' || el.classList.contains('btn-mission-auth') || el.id.includes('submit') || el.id.includes('access')) && el.form) {
        try {
          if (typeof el.form.requestSubmit === 'function') {
            el.form.requestSubmit(el);
          } else {
            el.form.submit();
          }
        } catch (e) {}
      }

      // If element is a link or inside a link, ensure navigation occurs
      const linkEl = el.tagName === 'A' ? el : el.closest('a');
      if (linkEl && linkEl.href && !linkEl.href.startsWith('javascript:')) {
        setTimeout(() => {
          if (linkEl.target === '_blank') {
            window.open(linkEl.href, '_blank');
          } else {
            window.location.href = linkEl.href;
          }
        }, 120);
      }

      return { success: true, clickedTag: tag, text: cleanLabel, targetUrl: linkEl?.href || null };
    },

    /**
     * Types text into input, textarea, contenteditable, or rich document editor (Google Docs)
     */
    async type(tag, text = '', pressEnter = false) {
      const isGoogleDocs = window.location.hostname.includes('docs.google.com') ||
                           Boolean(document.querySelector('.docs-texteventtarget-iframe') || document.querySelector('.kix-appview') || document.querySelector('.kix-canvas-tile-content'));

      if (isGoogleDocs) {
        return await this.typeIntoGoogleDocs(text, tag, pressEnter);
      }

      let el = null;
      if (tag) {
        el = window.__AutoBrowserDOM.getElementByTag(tag);
      }

      // Special high-precision selector for YouTube search box
      if (window.location.hostname.includes('youtube.com')) {
        const ytInput = document.querySelector('input#search, input[name="search_query"], yt-searchbox input, ytd-searchbox input, input[placeholder*="Search"]');
        if (ytInput && (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA'))) {
          el = ytInput;
        }
      }

      // Special high-precision selector for Google search box
      if (window.location.hostname.includes('google.com') && !window.location.hostname.includes('docs.google.com')) {
        const gInput = document.querySelector('textarea[name="q"], input[name="q"], input[type="search"]');
        if (gInput && (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA'))) {
          el = gInput;
        }
      }

      if (!el) {
        el = document.querySelector('[contenteditable="true"]') ||
             document.querySelector('textarea:focus') ||
             document.querySelector('input:focus') ||
             document.activeElement;
      }

      if (!el && tag) {
        window.__AutoBrowserDOM.indexAndTagElements();
        el = window.__AutoBrowserDOM.getElementByTag(tag);
      }

      if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && !el.isContentEditable)) {
        el = document.querySelector('input:not([type="hidden"]), textarea, [contenteditable="true"]') || el || document.body;
      }

      if (el && el !== document.body && typeof el.scrollIntoView === 'function') {
        try {
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        } catch (e) {}
        await new Promise(r => setTimeout(r, 180));
      }

      const rect = el ? el.getBoundingClientRect() : { left: 200, top: 200, width: 200, height: 40 };
      const clickX = Math.round(rect.left + Math.max(10, rect.width / 2));
      const clickY = Math.round(rect.top + Math.max(10, rect.height / 2));

      const snippet = text.length > 40 ? text.slice(0, 37) + '...' : text;
      window.__AutoBrowserVisuals?.showHUD(`Typing: "${snippet}"`);
      if (el && el !== document.body) {
        window.__AutoBrowserVisuals?.highlightElement(el);
      }
      
      await window.__AutoBrowserVisuals?.moveCursorTo(clickX, clickY, { action: 'type', text: snippet, tag: tag || 'editor' });
      window.__AutoBrowserVisuals?.triggerClickRipple(clickX, clickY);

      try {
        if (typeof el.focus === 'function') el.focus();
      } catch (e) {}

      // Handle standard inputs & textareas
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.value = '';
        this.setNativeValue(el, text);
        el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: text.slice(-1) || 'a' }));
        el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, cancelable: true, key: text.slice(-1) || 'a' }));
      } else if (el.isContentEditable) {
        try {
          el.focus();
          document.execCommand('insertText', false, text);
        } catch (e) {
          el.innerText = text;
        }
        el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      } else {
        // Rich editor / fallback
        try {
          document.execCommand('insertText', false, text);
        } catch (e) {}

        try {
          const inputEvent = new InputEvent('beforeinput', {
            bubbles: true,
            cancelable: true,
            inputType: 'insertText',
            data: text
          });
          el.dispatchEvent(inputEvent);
        } catch (e) {}

        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(() => {});
          }
        } catch (e) {}
      }

      // If pressEnter is requested, trigger Enter key events and submit if inside form
      if (pressEnter) {
        await new Promise(r => setTimeout(r, 180));
        await this.pressKey('Enter', el);

        // Special handling for YouTube to ensure search executes reliably
        if (window.location.hostname.includes('youtube.com')) {
          const ytSearchBtn = document.querySelector('#search-icon-legacy, button#search-icon-legacy, yt-icon-button#search-button, button.ytSearchboxComponentSearchButton, button[aria-label="Search"], ytd-searchbox button');
          if (ytSearchBtn && typeof ytSearchBtn.click === 'function') {
            try { ytSearchBtn.click(); } catch (e) {}
          }
          const searchForm = document.querySelector('form#search-form, yt-searchbox form, ytd-searchbox form');
          if (searchForm) {
            try {
              if (typeof searchForm.requestSubmit === 'function') searchForm.requestSubmit();
              else searchForm.submit();
            } catch (e) {}
          }
          if (text && !window.location.pathname.includes('/results')) {
            window.location.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(text)}`;
          }
        }

        // Special handling for Google Search to ensure submission
        if (window.location.hostname.includes('google.com') && !window.location.hostname.includes('docs.google.com')) {
          const form = el.form || document.querySelector('form[action*="search"], form');
          if (form) {
            try {
              if (typeof form.requestSubmit === 'function') form.requestSubmit();
              else form.submit();
            } catch (e) {}
          }
          const gBtn = document.querySelector('input[name="btnK"], button[type="submit"], input[type="submit"]');
          if (gBtn && typeof gBtn.click === 'function') {
            try { gBtn.click(); } catch (e) {}
          }
          if (text && !window.location.pathname.includes('/search')) {
            window.location.href = `https://www.google.com/search?q=${encodeURIComponent(text)}`;
          }
        }

        // Give the page time to fetch and render dynamic search results from network
        await new Promise(r => setTimeout(r, 1200));
      }

      return { success: true, typedTag: tag, valueLength: text.length, enterPressed: pressEnter };
    },

    /**
     * Dedicated High-Fidelity Google Docs Text Authoring Engine
     */
    async typeIntoGoogleDocs(text = '', tag = '1', pressEnter = false) {
      console.log("[PlutoAI Actuator] Initiating Google Docs text insertion engine...");
      const snippet = text.length > 40 ? text.slice(0, 37) + '...' : text;
      window.__AutoBrowserVisuals?.showHUD(`Authoring into Google Doc: "${snippet}"`);

      // 1. Locate primary document canvas / page
      const allCanvasTiles = Array.from(document.querySelectorAll('.kix-canvas-tile-content, .kix-page, canvas, .kix-appview-editor, .docs-editor-container'));
      let canvas = allCanvasTiles.find(c => {
        const r = c.getBoundingClientRect();
        return r.width > 200 && r.height > 200;
      }) || document.querySelector('.kix-page') || document.querySelector('.kix-canvas-tile-content') || document.querySelector('.docs-editor-container') || document.body;

      let clickX = Math.round(window.innerWidth / 2);
      let clickY = 320;

      if (canvas && canvas !== document.body) {
        const rect = canvas.getBoundingClientRect();
        clickX = Math.round(rect.left + rect.width / 2);
        clickY = Math.round(rect.top + Math.min(Math.max(80, rect.height / 3), 280));
        window.__AutoBrowserVisuals?.highlightElement(canvas);
      }

      await window.__AutoBrowserVisuals?.moveCursorTo(clickX, clickY, { action: 'type', text: snippet, tag: tag || 'docs' });
      window.__AutoBrowserVisuals?.triggerClickRipple(clickX, clickY);

      // 2. Focus document canvas with full pointer & mouse sequence
      if (canvas) {
        try {
          if (typeof canvas.focus === 'function') canvas.focus();
          const mouseOpts = { bubbles: true, cancelable: true, view: window, clientX: clickX, clientY: clickY, button: 0, buttons: 1 };
          canvas.dispatchEvent(new PointerEvent('pointerdown', mouseOpts));
          canvas.dispatchEvent(new MouseEvent('mousedown', mouseOpts));
          await new Promise(r => setTimeout(r, 60));
          canvas.dispatchEvent(new PointerEvent('pointerup', mouseOpts));
          canvas.dispatchEvent(new MouseEvent('mouseup', mouseOpts));
          canvas.dispatchEvent(new MouseEvent('click', mouseOpts));
        } catch (e) {}
      }

      await new Promise(r => setTimeout(r, 180));

      // 3. Inject text via Google Docs input iframe (.docs-texteventtarget-iframe)
      const iframes = Array.from(document.querySelectorAll('iframe.docs-texteventtarget-iframe, .docs-texteventtarget-iframe, iframe'));
      for (const iframe of iframes) {
        try {
          if (typeof iframe.focus === 'function') iframe.focus();
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            const target = iframeDoc.querySelector('[contenteditable="true"]') ||
                           iframeDoc.querySelector('textarea') ||
                           iframeDoc.body;
            if (target) {
              target.focus();

              // execCommand inside iframe
              try {
                iframeDoc.execCommand('insertText', false, text);
              } catch (e) {}

              // InputEvent inside iframe
              try {
                target.dispatchEvent(new InputEvent('beforeinput', {
                  bubbles: true,
                  cancelable: true,
                  inputType: 'insertText',
                  data: text
                }));
              } catch (e) {}

              // Paste event inside iframe
              try {
                const dt = new DataTransfer();
                dt.setData('text/plain', text);
                dt.setData('text/html', text.replace(/\n/g, '<br>'));
                target.dispatchEvent(new ClipboardEvent('paste', {
                  bubbles: true,
                  cancelable: true,
                  clipboardData: dt
                }));
              } catch (e) {}
            }
          }
        } catch (iframeErr) {
          console.warn("[PlutoAI Actuator] Google Docs iframe injection note:", iframeErr);
        }
      }

      // 4. Main window document execCommand & beforeinput dispatch
      try {
        document.execCommand('insertText', false, text);
      } catch (e) {}

      try {
        document.activeElement?.dispatchEvent(new InputEvent('beforeinput', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: text
        }));
      } catch (e) {}

      // 5. Copy to clipboard
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          try {
            document.execCommand('paste');
          } catch (e) {}
        }
      } catch (e) {}

      if (pressEnter) {
        await new Promise(r => setTimeout(r, 180));
        await this.pressKey('Enter');
      }

      return { success: true, typedTag: tag, valueLength: text.length, isGoogleDocs: true };
    },

    /**
     * Fix for React/Vue synthetic value trackers
     */
    setNativeValue(element, value) {
      const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
      const prototype = Object.getPrototypeOf(element);
      const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

      if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
        prototypeValueSetter.call(element, value);
      } else if (valueSetter) {
        valueSetter.call(element, value);
      } else {
        element.value = value;
      }
    },

    /**
     * Selects option in dropdown
     */
    async select(tag, valueOrText) {
      let el = window.__AutoBrowserDOM.getElementByTag(tag);
      if (!el || el.tagName !== 'SELECT') {
        window.__AutoBrowserDOM.indexAndTagElements();
        el = window.__AutoBrowserDOM.getElementByTag(tag);
      }

      if (!el || el.tagName !== 'SELECT') {
        throw new Error(`Select dropdown [${tag}] not found.`);
      }

      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise(r => setTimeout(r, 200));

      const rect = el.getBoundingClientRect();
      const x = Math.round(rect.left + rect.width / 2);
      const y = Math.round(rect.top + rect.height / 2);

      window.__AutoBrowserVisuals.showHUD(`Selecting: "${valueOrText}"`);
      window.__AutoBrowserVisuals.highlightElement(el);
      await window.__AutoBrowserVisuals.moveCursorTo(x, y, { action: 'select', tag });
      window.__AutoBrowserVisuals.triggerClickRipple(x, y);

      const options = Array.from(el.options);
      let matchedIndex = options.findIndex(o => 
        o.value.toLowerCase() === String(valueOrText).toLowerCase() ||
        o.text.toLowerCase().includes(String(valueOrText).toLowerCase())
      );

      if (matchedIndex === -1 && options.length > 0) {
        matchedIndex = 0;
      }

      if (matchedIndex !== -1) {
        el.selectedIndex = matchedIndex;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }

      return { success: true, selectedValue: el.value };
    },

    /**
     * Triggers hover on element
     */
    async hover(tag) {
      const el = window.__AutoBrowserDOM.getElementByTag(tag);
      if (!el) throw new Error(`Element [${tag}] not found for hover.`);

      const rect = el.getBoundingClientRect();
      const x = Math.round(rect.left + rect.width / 2);
      const y = Math.round(rect.top + rect.height / 2);

      window.__AutoBrowserVisuals.showHUD(`Hovering over [${tag}]`);
      window.__AutoBrowserVisuals.highlightElement(el);
      await window.__AutoBrowserVisuals.moveCursorTo(x, y, { action: 'hover', tag });

      const eventOpts = { bubbles: true, cancelable: true, clientX: x, clientY: y };
      el.dispatchEvent(new MouseEvent('mouseenter', eventOpts));
      el.dispatchEvent(new MouseEvent('mouseover', eventOpts));

      return { success: true, hoveredTag: tag };
    },

    /**
     * Dispatches key press event (e.g. Enter, Tab, Escape)
     */
    async pressKey(keyName = 'Enter', targetEl = null) {
      const el = targetEl || document.activeElement || document.body;
      window.__AutoBrowserVisuals.showHUD(`Pressing Key: [${keyName}]`);

      const keyCodes = {
        'Enter': 13,
        'Tab': 9,
        'Escape': 27,
        'Backspace': 8,
        'ArrowDown': 40,
        'ArrowUp': 38,
        'Space': 32
      };

      const code = keyCodes[keyName] || 0;

      const eventInit = {
        key: keyName,
        code: keyName,
        keyCode: code,
        which: code,
        bubbles: true,
        cancelable: true
      };

      el.dispatchEvent(new KeyboardEvent('keydown', eventInit));
      el.dispatchEvent(new KeyboardEvent('keypress', eventInit));

      // If Enter inside a form, submit form if button didn't handle it
      if (keyName === 'Enter' && el.form) {
        try {
          if (typeof el.form.requestSubmit === 'function') {
            el.form.requestSubmit();
          } else {
            el.form.submit();
          }
        } catch (e) {}
      }

      await new Promise(r => setTimeout(r, 60));
      el.dispatchEvent(new KeyboardEvent('keyup', eventInit));

      return { success: true, key: keyName };
    },

    /**
     * Scrolls page or container
     */
    async scroll(direction = 'down', amount = 480) {
      window.__AutoBrowserVisuals.showHUD(`Scrolling ${direction}...`);

      const scrollAmount = direction === 'up' ? -amount : amount;
      window.scrollBy({ top: scrollAmount, left: 0, behavior: 'smooth' });

      await new Promise(r => setTimeout(r, 450));
      return { success: true, scrolled: direction, amount: scrollAmount };
    },

    /**
     * Navigates the current browser window to a target URL
     */
    async navigate(url) {
      if (!url) return { success: false };
      let targetUrl = url.trim();
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }
      window.__AutoBrowserVisuals?.showHUD(`Navigating to ${targetUrl}...`);
      try {
        window.location.href = targetUrl;
      } catch (e) {
        console.warn("[PlutoAI Actuator] Navigate redirect:", e);
      }
      return { success: true, navigatedTo: targetUrl };
    },

    /**
     * Extracts structured text and tables from current page
     */
    async extract() {
      window.__AutoBrowserVisuals.showHUD(`Extracting structured content...`);

      const extracted = {
        title: document.title,
        url: window.location.href,
        headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => ({ level: h.tagName, text: h.innerText.trim() })).filter(h => h.text),
        tables: Array.from(document.querySelectorAll('table')).map(table => {
          const rows = Array.from(table.querySelectorAll('tr')).map(tr => 
            Array.from(tr.querySelectorAll('th, td')).map(td => td.innerText.trim())
          );
          return rows;
        }),
        links: Array.from(document.querySelectorAll('a[href]')).slice(0, 20).map(a => ({ text: a.innerText.trim(), href: a.href })).filter(l => l.text)
      };

      return { success: true, extracted };
    }
  };

  window.__PLUTO__ = window.__PLUTO__ || {};
  window.__PLUTO__.actuator = window.__AutoBrowserActuator;
})();

