/**
 * Pluto AI - DOM Condenser
 * Walks the active page DOM (or active frame), assigns compact short IDs,
 * detects popups/overlays, filters noise, and formats a token-efficient element listing.
 */

(function () {
  window.__PLUTO__ = window.__PLUTO__ || {};

  class DomCondenser {
    constructor() {
      this.elementMap = new Map(); // id -> DOM Element
      this.reverseMap = new Map(); // DOM Element -> id
      this.counters = { b: 0, i: 0, l: 0, s: 0, h: 0, f: 0, e: 0 };
      this.activeDocument = document;
      this.activeWindow = window;
      this.currentFrameTarget = 'top';
    }

    reset() {
      this.elementMap.clear();
      this.reverseMap.clear();
      this.counters = { b: 0, i: 0, l: 0, s: 0, h: 0, f: 0, e: 0 };
    }

    setFrameContext(frameTarget) {
      if (!frameTarget || frameTarget === 'top' || frameTarget === 'parent') {
        this.activeDocument = document;
        this.activeWindow = window;
        this.currentFrameTarget = 'top';
        return { success: true, frame: 'top' };
      }

      // Try resolving iframe by element ID, index, or name
      let iframeEl = null;
      if (this.elementMap.has(frameTarget)) {
        iframeEl = this.elementMap.get(frameTarget);
      } else if (!isNaN(Number(frameTarget))) {
        const iframes = Array.from(document.querySelectorAll('iframe'));
        iframeEl = iframes[Number(frameTarget)];
      } else {
        iframeEl = document.querySelector(`iframe[name="${frameTarget}"], iframe#${frameTarget}, iframe.${frameTarget}`);
      }

      if (iframeEl && iframeEl.contentDocument) {
        try {
          this.activeDocument = iframeEl.contentDocument;
          this.activeWindow = iframeEl.contentWindow;
          this.currentFrameTarget = frameTarget;
          return { success: true, frame: frameTarget };
        } catch (e) {
          return { success: false, error: `Cross-origin iframe access restricted: ${e.message}` };
        }
      }

      return { success: false, error: `Iframe "${frameTarget}" not found or inaccessible.` };
    }

    isElementVisible(el) {
      if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;

      const win = this.activeWindow;
      const style = win.getComputedStyle(el);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.opacity === '0' ||
        el.getAttribute('aria-hidden') === 'true'
      ) {
        return false;
      }

      const rect = el.getBoundingClientRect();
      if (rect.width <= 1 && rect.height <= 1) return false;

      return true;
    }

    isInViewport(el) {
      const win = this.activeWindow;
      const rect = el.getBoundingClientRect();
      return (
        rect.top < (win.innerHeight || document.documentElement.clientHeight) &&
        rect.bottom > 0 &&
        rect.left < (win.innerWidth || document.documentElement.clientWidth) &&
        rect.right > 0
      );
    }

    generateId(el) {
      const tag = el.tagName.toLowerCase();
      const role = (el.getAttribute('role') || '').toLowerCase();
      const type = (el.getAttribute('type') || '').toLowerCase();

      let prefix = 'e';
      if (tag === 'button' || role === 'button' || type === 'button' || type === 'submit') {
        prefix = 'b';
      } else if (tag === 'input' || tag === 'textarea' || role === 'textbox') {
        prefix = 'i';
      } else if (tag === 'a' || role === 'link') {
        prefix = 'l';
      } else if (tag === 'select' || role === 'combobox' || role === 'listbox') {
        prefix = 's';
      } else if (/^h[1-6]$/.test(tag) || role === 'heading') {
        prefix = 'h';
      } else if (tag === 'iframe') {
        prefix = 'f';
      }

      this.counters[prefix]++;
      return `${prefix}${this.counters[prefix]}`;
    }

    getElementText(el) {
      const tag = el.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') {
        const val = el.value || '';
        const ph = el.getAttribute('placeholder') || '';
        const label = el.getAttribute('aria-label') || '';
        return val ? `val="${val.slice(0, 40)}"` : (ph ? `ph="${ph.slice(0, 40)}"` : (label ? `aria="${label.slice(0, 40)}"` : ''));
      }

      let text = el.innerText || el.textContent || '';
      text = text.replace(/\s+/g, ' ').trim();

      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel && !text) {
        text = ariaLabel.trim();
      }

      if (text.length > 80) {
        text = text.substring(0, 77) + '…';
      }
      return text;
    }

    /**
     * Detects whether an active popup, cookie consent banner, or modal overlay exists
     */
    detectOverlay() {
      const doc = this.activeDocument;
      const overlaySelectors = [
        '[role="dialog"]',
        '[role="alertdialog"]',
        '[aria-modal="true"]',
        '.modal.show',
        '.modal-open',
        '#onetrust-banner-sdk',
        '.cookie-banner',
        '.consent-banner',
        '.cc-banner',
        '.gdpr-banner',
        '#cmp-container'
      ];

      for (const sel of overlaySelectors) {
        const el = doc.querySelector(sel);
        if (el && this.isElementVisible(el)) {
          const isCookie = sel.includes('cookie') || sel.includes('consent') || sel.includes('onetrust') || sel.includes('gdpr');
          return { hasOverlay: true, type: isCookie ? 'cookie' : 'popup', element: el };
        }
      }

      // Check high z-index elements
      const elements = Array.from(doc.querySelectorAll('div[style*="z-index"], aside, section'));
      for (const el of elements) {
        const z = parseInt(window.getComputedStyle(el).zIndex, 10);
        if (z >= 999 && this.isElementVisible(el) && this.isInViewport(el)) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 200 && rect.height > 100) {
            return { hasOverlay: true, type: 'popup', element: el };
          }
        }
      }

      return { hasOverlay: false, type: null, element: null };
    }

    detectCanvasHeavy() {
      const doc = this.activeDocument;
      const canvases = Array.from(doc.querySelectorAll('canvas'));
      for (const c of canvases) {
        if (!this.isElementVisible(c)) continue;
        const rect = c.getBoundingClientRect();
        if (rect.width >= 280 && rect.height >= 180) {
          return true;
        }
      }
      return false;
    }

    condense(maxElements = 150) {
      this.reset();
      const doc = this.activeDocument;

      const interactiveSelector = `
        a[href], button, input, textarea, select, details, iframe,
        [role="button"], [role="link"], [role="textbox"], [role="combobox"],
        [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [role="menuitem"],
        [contenteditable="true"], [tabindex="0"],
        h1, h2, h3, [role="heading"]
      `;

      const allCandidates = Array.from(doc.querySelectorAll(interactiveSelector));

      const clickableDivs = Array.from(doc.querySelectorAll('div, span, li')).filter(el => {
        if (!this.isElementVisible(el)) return false;
        if (el.onclick || el.getAttribute('onclick')) return true;
        const style = this.activeWindow.getComputedStyle(el);
        return style.cursor === 'pointer' && el.children.length === 0 && (el.innerText || '').trim().length > 0;
      });

      const uniqueElements = Array.from(new Set([...allCandidates, ...clickableDivs]));

      const inViewport = [];
      const outOfViewport = [];

      for (const el of uniqueElements) {
        if (!this.isElementVisible(el)) continue;
        if (this.isInViewport(el)) {
          inViewport.push(el);
        } else {
          outOfViewport.push(el);
        }
      }

      const prioritized = [...inViewport, ...outOfViewport];
      const selected = prioritized.slice(0, maxElements);
      const remainingCount = prioritized.length - selected.length;

      const lines = [];
      if (this.currentFrameTarget !== 'top') {
        lines.push(`--- Context: Inside Frame [${this.currentFrameTarget}] ---`);
      }

      for (const el of selected) {
        const id = this.generateId(el);
        this.elementMap.set(id, el);
        this.reverseMap.set(el, id);

        const tag = el.tagName.toLowerCase();
        const role = el.getAttribute('role');
        const roleStr = role ? `[role=${role}]` : tag;
        const text = this.getElementText(el);
        const inViewStr = this.isInViewport(el) ? '✓view' : 'offview';

        // Layout-aware perception: send element bounding box coordinates
        const rect = el.getBoundingClientRect();
        const boxStr = `[x:${Math.round(rect.left)}, y:${Math.round(rect.top)}, w:${Math.round(rect.width)}, h:${Math.round(rect.height)}]`;

        let line = `[${id}] ${roleStr} "${text}" ${boxStr} (${inViewStr})`;
        lines.push(line);
      }

      if (remainingCount > 0) {
        lines.push(`… (${remainingCount} more elements further down the page)`);
      }

      const overlayInfo = this.detectOverlay();
      const isCanvasHeavy = this.detectCanvasHeavy();
      const isLowDom = selected.length < 5;

      return {
        condensedText: lines.join('\n'),
        elementCount: selected.length,
        totalCandidates: prioritized.length,
        url: this.activeWindow.location.href,
        title: doc.title,
        domHash: this.calculateDomHash(),
        currentFrame: this.currentFrameTarget,
        hasOverlay: overlayInfo.hasOverlay,
        overlayType: overlayInfo.type,
        isCanvasHeavy,
        isLowDom,
        suggestVisionPrimary: isCanvasHeavy || isLowDom
      };
    }

    calculateDomHash() {
      return `${this.activeDocument.title}_${this.activeDocument.body?.children?.length || 0}_${this.activeWindow.location.href}`;
    }

    getElement(id) {
      return this.elementMap.get(id);
    }

    getId(el) {
      return this.reverseMap.get(el);
    }
  }

  window.__PLUTO__.domCondenser = new DomCondenser();
})();
