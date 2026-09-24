/**
 * AutoBrowser AI - DOM Indexer & Set-of-Marks (SoM) Visual Grounder
 */

(function () {
  window.__AutoBrowserDOM = {
    tagMap: new Map(),
    badgeContainer: null,

    /**
     * Finds and indexes all interactive elements currently visible in the viewport
     */
    indexAndTagElements() {
      this.cleanupTags();

      // Create overlay container
      this.badgeContainer = document.createElement('div');
      this.badgeContainer.id = 'autobrowser-tag-container';
      this.badgeContainer.style.position = 'absolute';
      this.badgeContainer.style.top = '0';
      this.badgeContainer.style.left = '0';
      this.badgeContainer.style.width = '100%';
      this.badgeContainer.style.height = '100%';
      this.badgeContainer.style.pointerEvents = 'none';
      this.badgeContainer.style.zIndex = '2147483639';
      document.body.appendChild(this.badgeContainer);

      this.tagMap.clear();

      // Target interactive selectors
      const selector = [
        'a[href]',
        'button',
        'input',
        'select',
        'textarea',
        '[role="button"]',
        '[role="link"]',
        '[role="tab"]',
        '[role="checkbox"]',
        '[role="radio"]',
        '[role="switch"]',
        '[role="menuitem"]',
        '[role="option"]',
        '[role="searchbox"]',
        '[role="combobox"]',
        '[role="textbox"]',
        '[contenteditable="true"]',
        '[contenteditable=""]',
        '.kix-page',
        '.kix-canvas-tile-content',
        '.kix-appview-editor',
        '.docs-editor-container',
        '.notion-page-content',
        '.monaco-editor',
        '[tabindex]:not([tabindex="-1"])',
        '[onclick]',
        '[data-action]',
        '.btn',
        '.button',
        '.clickable'
      ].join(', ');

      // Prioritize high-value interactive targets (Search boxes, Video results, Doc Canvas, Auth fields)
      const specialDocCanvas = document.querySelector('.kix-page, .kix-canvas-tile-content, .docs-editor-container, [contenteditable="true"]');
      const ytSearchInput = document.querySelector('ytd-searchbox input#search, input#search, input[name="search_query"]');
      const gSearchInput = document.querySelector('textarea[name="q"], input[name="q"]');
      const ytVideoResults = Array.from(document.querySelectorAll('ytd-video-renderer a#video-title, a#video-title, a[href*="/watch?v="]'));
      const isroAuthFields = Array.from(document.querySelectorAll('input[name="officer_id"], input[name="pwd"], input[type="password"], input[name="pan_number"], .btn-mission-auth, button[type="submit"]'));

      let rawElements = Array.from(document.querySelectorAll(selector));
      const priorityElements = [
        specialDocCanvas,
        ytSearchInput,
        gSearchInput,
        ...isroAuthFields,
        ...ytVideoResults
      ].filter(Boolean);

      for (let i = priorityElements.length - 1; i >= 0; i--) {
        const el = priorityElements[i];
        const idx = rawElements.indexOf(el);
        if (idx > -1) rawElements.splice(idx, 1);
        rawElements.unshift(el);
      }
      rawElements = rawElements.slice(0, 180);

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;

      const tagCatalog = [];
      let tagIndex = 1;

      for (const el of rawElements) {
        // Skip sidebar itself and internal containers
        if (el.closest('#autobrowser-sidebar-container') || el.closest('#autobrowser-left-bar-container') || el.closest('#autobrowser-tag-container')) {
          continue;
        }

        // Visibility & layout checks
        const rect = el.getBoundingClientRect();
        if (rect.width <= 4 || rect.height <= 4) continue;
        
        // Element must be inside or immediately adjacent to viewport
        if (
          rect.bottom < 0 ||
          rect.top > viewportHeight ||
          rect.right < 0 ||
          rect.left > viewportWidth
        ) {
          continue;
        }

        const style = window.getComputedStyle(el);
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.opacity === '0' ||
          style.pointerEvents === 'none'
        ) {
          continue;
        }

        const currentTag = String(tagIndex++);
        this.tagMap.set(currentTag, el);
        el.setAttribute('data-autobrowser-tag', currentTag);

        // Compute badge position (absolute on page)
        const badgeTop = rect.top + scrollY;
        const badgeLeft = rect.left + scrollX;

        // Render visual badge badge
        const badge = document.createElement('div');
        badge.className = 'autobrowser-tag-badge';
        badge.textContent = currentTag;
        badge.style.top = `${badgeTop}px`;
        badge.style.left = `${badgeLeft}px`;
        this.badgeContainer.appendChild(badge);

        const isDocCanvas = el.classList?.contains('kix-page') ||
                            el.classList?.contains('kix-canvas-tile-content') ||
                            el.classList?.contains('kix-appview-editor') ||
                            el.classList?.contains('docs-editor-container') ||
                            el.classList?.contains('notion-page-content');

        // Extract metadata for the AI
        const tagMeta = {
          tag: currentTag,
          tagName: isDocCanvas ? 'DOCUMENT_EDITOR' : el.tagName,
          text: isDocCanvas ? 'Google Docs Document Canvas Editor' : this.cleanText(el.innerText || el.textContent || ''),
          placeholder: isDocCanvas ? 'Document Body' : (el.placeholder || ''),
          ariaLabel: isDocCanvas ? 'Google Docs Document Editor Canvas' : (el.getAttribute('aria-label') || el.getAttribute('title') || ''),
          name: el.getAttribute('name') || el.getAttribute('id') || (isDocCanvas ? 'docs_editor' : ''),
          id: el.id || '',
          role: isDocCanvas ? 'textbox' : (el.getAttribute('role') || ''),
          type: el.getAttribute('type') || (el.tagName === 'INPUT' ? 'text' : (isDocCanvas ? 'editor' : '')),
          href: el.getAttribute('href') || '',
          isContentEditable: Boolean(el.isContentEditable || isDocCanvas),
          value: (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') 
            ? ((el.type === 'password' || el.getAttribute('type') === 'password' || el.name?.includes('pwd') || el.id?.includes('pwd') || el.id?.includes('password')) ? '[REDACTED_PASSWORD_FIELD]' : el.value) 
            : '',
          rect: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          }
        };

        tagCatalog.push(tagMeta);
      }

      return {
        url: window.location.href,
        title: document.title,
        scrollPosition: { x: scrollX, y: scrollY },
        viewport: { width: viewportWidth, height: viewportHeight },
        tags: tagCatalog
      };
    },

    cleanText(str) {
      if (!str) return '';
      return str.replace(/\s+/g, ' ').trim().slice(0, 100);
    },

    getElementByTag(tag) {
      if (!tag) return null;
      if (this.tagMap.size === 0) {
        this.indexAndTagElements();
      }

      const cleanTag = String(tag).replace(/^TAG_/i, '').replace(/[\[\]]/g, '').trim();
      let el = this.tagMap.get(cleanTag) || document.querySelector(`[data-autobrowser-tag="${cleanTag}"]`);

      // If element was detached due to dynamic React/Vue re-render, attempt re-indexing
      if (!el || !el.isConnected) {
        this.indexAndTagElements();
        el = this.tagMap.get(cleanTag) || document.querySelector(`[data-autobrowser-tag="${cleanTag}"]`);
      }

      // Fallback 1: ID or CSS selector query
      if (!el) {
        try {
          el = document.getElementById(cleanTag) || document.querySelector(cleanTag);
        } catch (e) {}
      }

      // Fallback 2: Name / Placeholder / Aria-label
      if (!el) {
        try {
          el = document.querySelector(`[name="${cleanTag}"]`) || 
               document.querySelector(`[placeholder*="${cleanTag}"]`) ||
               document.querySelector(`[aria-label*="${cleanTag}"]`);
        } catch (e) {}
      }

      // Fallback 3: Fuzzy text match across clickable elements
      if (!el) {
        const lowerSearch = cleanTag.toLowerCase();
        for (const [_, candidate] of this.tagMap.entries()) {
          const text = (candidate.innerText || candidate.value || candidate.getAttribute('aria-label') || candidate.getAttribute('name') || candidate.id || '').toLowerCase();
          if (text && (text.includes(lowerSearch) || lowerSearch.includes(text))) {
            el = candidate;
            break;
          }
        }
      }

      // Fallback 4: Any input / button on page matching
      if (!el) {
        const allInteractive = Array.from(document.querySelectorAll('input, button, select, textarea, a'));
        const lowerSearch = cleanTag.toLowerCase();
        for (const candidate of allInteractive) {
          const text = (candidate.innerText || candidate.value || candidate.getAttribute('placeholder') || candidate.getAttribute('aria-label') || candidate.getAttribute('name') || candidate.id || '').toLowerCase();
          if (text && (text.includes(lowerSearch) || lowerSearch.includes(text))) {
            el = candidate;
            break;
          }
        }
      }

      return el;
    },

    hideTags() {
      if (this.badgeContainer) {
        this.badgeContainer.style.display = 'none';
      }
    },

    showTags() {
      if (this.badgeContainer) {
        this.badgeContainer.style.display = 'block';
      }
    },

    cleanupTags() {
      if (this.badgeContainer) {
        this.badgeContainer.remove();
        this.badgeContainer = null;
      }
      const existingBadges = document.querySelectorAll('.autobrowser-tag-badge, #autobrowser-tag-container');
      existingBadges.forEach(b => b.remove());
    }
  };

  window.__PLUTO__ = window.__PLUTO__ || {};
  window.__PLUTO__.dom = window.__AutoBrowserDOM;
  window.__PLUTO__.domCondenser = {
    condense: () => window.__AutoBrowserDOM.indexAndTagElements(),
    detectOverlay: () => false
  };
})();
