/**
 * AutoBrowser AI - In-Page Right Sidebar Injector (Shadow DOM Docked Drawer)
 */

(function () {
  if (window.__AutoBrowserSidebarInjected) return;
  window.__AutoBrowserSidebarInjected = true;

  class AutoBrowserSidebar {
    constructor() {
      this.isOpen = false;
      this.isPinned = false;
      this.width = 380;
      this.isResizing = false;
      this.container = null;
      this.shadow = null;
      this.drawer = null;
      this.dockTab = null;
      this.iframe = null;
      this.init();
    }

    async init() {
      // Load saved preferences
      try {
        const stored = await chrome.storage.local.get(['sidebarWidth', 'sidebarPinned', 'sidebarOpen']);
        if (stored.sidebarWidth) this.width = stored.sidebarWidth;
        if (stored.sidebarPinned !== undefined) this.isPinned = stored.sidebarPinned;
        if (stored.sidebarOpen !== undefined) this.isOpen = stored.sidebarOpen;
      } catch (e) {}

      this.createDOM();
      this.applyState();
    }

    createDOM() {
      this.container = document.createElement('div');
      this.container.id = 'autobrowser-sidebar-container';
      this.container.style.position = 'fixed';
      this.container.style.top = '0';
      this.container.style.right = '0';
      this.container.style.height = '100vh';
      this.container.style.zIndex = '2147483647';
      this.container.style.pointerEvents = 'none';

      // Create isolated Shadow Root
      this.shadow = this.container.attachShadow({ mode: 'open' });

      // Shadow DOM Styles
      const style = document.createElement('style');
      style.textContent = `
        :host {
          all: initial;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        /* Floating Right Edge Dock Handle */
        .ab-dock-tab {
          position: fixed;
          right: 0;
          top: 45%;
          transform: translateY(-50%);
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
          border: 1px solid rgba(99, 102, 241, 0.5);
          border-right: none;
          border-radius: 12px 0 0 12px;
          padding: 10px 6px 10px 8px;
          cursor: pointer;
          pointer-events: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.45), 0 0 12px rgba(6, 182, 212, 0.35);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          z-index: 2147483647;
          user-select: none;
        }

        .ab-dock-tab:hover {
          padding-left: 12px;
          border-color: #06b6d4;
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.6), 0 0 18px rgba(6, 182, 212, 0.6);
        }

        .ab-dock-icon {
          width: 22px;
          height: 22px;
          filter: drop-shadow(0 0 6px #06b6d4);
        }

        .ab-dock-status {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
        }

        .ab-dock-status.busy {
          background: #06b6d4;
          box-shadow: 0 0 10px #06b6d4;
          animation: spin-pulse 1s infinite alternate;
        }

        @keyframes spin-pulse {
          0% { transform: scale(0.8); opacity: 0.7; }
          100% { transform: scale(1.3); opacity: 1; }
        }

        .ab-dock-label {
          writing-mode: vertical-rl;
          text-orientation: mixed;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          color: #94a3b8;
          text-transform: uppercase;
        }

        /* The Main Right Sidebar Drawer */
        .ab-drawer {
          position: fixed;
          top: 0;
          right: 0;
          height: 100vh;
          width: 380px;
          background: rgba(11, 15, 25, 0.96);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-left: 1px solid rgba(99, 102, 241, 0.35);
          box-shadow: -8px 0 32px rgba(0, 0, 0, 0.65), 0 0 20px rgba(99, 102, 241, 0.15);
          transform: translateX(100%);
          transition: transform 0.32s cubic-bezier(0.16, 1, 0.3, 1);
          pointer-events: auto;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 2147483647;
        }

        .ab-drawer.open {
          transform: translateX(0);
        }

        /* Top Bar of Drawer */
        .ab-drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: rgba(15, 23, 42, 0.9);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .ab-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #f8fafc;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.4px;
        }

        .ab-brand-badge {
          background: linear-gradient(135deg, #6366f1, #06b6d4);
          color: #ffffff;
          font-size: 9px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .ab-header-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .ab-btn-icon {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #94a3b8;
          width: 26px;
          height: 26px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .ab-btn-icon:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #f8fafc;
          border-color: #06b6d4;
        }

        .ab-btn-icon.active {
          background: rgba(6, 182, 212, 0.2);
          color: #06b6d4;
          border-color: #06b6d4;
        }

        /* Embedded Iframe */
        .ab-iframe-wrapper {
          flex: 1;
          width: 100%;
          height: 100%;
          position: relative;
        }

        .ab-iframe {
          width: 100%;
          height: 100%;
          border: none;
          display: block;
        }

        /* Drag Resizer on the Left Edge of the Drawer */
        .ab-resizer {
          position: absolute;
          top: 0;
          left: 0;
          width: 5px;
          height: 100%;
          cursor: col-resize;
          background: transparent;
          transition: background 0.2s ease;
        }

        .ab-resizer:hover, .ab-resizer.active {
          background: #06b6d4;
          box-shadow: 0 0 10px #06b6d4;
        }
      `;

      // Drawer Element
      this.drawer = document.createElement('div');
      this.drawer.className = 'ab-drawer';
      this.drawer.style.width = `${this.width}px`;

      // Header
      const header = document.createElement('div');
      header.className = 'ab-drawer-header';
      header.innerHTML = `
        <div class="ab-brand">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="6" fill="#1e1b4b"/>
            <circle cx="12" cy="12" r="6" stroke="#06b6d4" stroke-width="2"/>
            <circle cx="12" cy="12" r="2.5" fill="#818cf8"/>
          </svg>
          <span>PlutoAI</span>
          <span class="ab-brand-badge">Agent</span>
        </div>
        <div class="ab-header-actions">
          <button class="ab-btn-icon" id="ab-pin-btn" title="Pin Sidebar (Reflow Webpage)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2v8M12 18v4M4.93 10.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h8M18 12h4"/>
            </svg>
          </button>
          <button class="ab-btn-icon" id="ab-options-btn" title="Open Settings">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
          <button class="ab-btn-icon" id="ab-close-btn" title="Collapse Sidebar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      `;

      // Iframe Wrapper
      const iframeWrapper = document.createElement('div');
      iframeWrapper.className = 'ab-iframe-wrapper';
      this.iframe = document.createElement('iframe');
      this.iframe.className = 'ab-iframe';
      
      let sidebarUrl = '../sidebar/sidebar.html';
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
          sidebarUrl = chrome.runtime.getURL('sidebar/sidebar.html');
        }
      } catch (e) {}
      this.iframe.src = sidebarUrl;
      this.iframe.setAttribute('allow', 'clipboard-read; clipboard-write; microphone');
      iframeWrapper.appendChild(this.iframe);

      // Resizer on the left side of the drawer
      const resizer = document.createElement('div');
      resizer.className = 'ab-resizer';

      this.drawer.appendChild(resizer);
      this.drawer.appendChild(header);
      this.drawer.appendChild(iframeWrapper);

      // Dock Tab Handle on Right Edge
      this.dockTab = document.createElement('div');
      this.dockTab.className = 'ab-dock-tab';
      this.dockTab.innerHTML = `
        <svg class="ab-dock-icon" viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#1e1b4b"/>
          <circle cx="12" cy="12" r="6" stroke="#06b6d4" stroke-width="2"/>
          <circle cx="12" cy="12" r="2.5" fill="#818cf8"/>
        </svg>
        <div class="ab-dock-status" id="ab-dock-status-dot"></div>
        <span class="ab-dock-label">AI</span>
      `;

      // Attach events
      this.dockTab.addEventListener('click', () => this.toggle());
      header.querySelector('#ab-close-btn').addEventListener('click', () => this.close());
      
      const pinBtn = header.querySelector('#ab-pin-btn');
      pinBtn.addEventListener('click', () => this.togglePin());

      header.querySelector('#ab-options-btn').addEventListener('click', () => {
        try {
          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ action: 'OPEN_OPTIONS' }).catch(() => {});
          } else {
            window.open('../options/options.html', '_blank');
          }
        } catch (e) {
          window.open('../options/options.html', '_blank');
        }
      });

      // Resizing logic from right side (pulling left increases width)
      let startX, startWidth;
      const onMouseMove = (e) => {
        if (!this.isResizing) return;
        const delta = startX - e.clientX;
        const newWidth = Math.max(300, Math.min(750, startWidth + delta));
        this.width = newWidth;
        this.drawer.style.width = `${newWidth}px`;
        if (this.isPinned) {
          document.documentElement.style.marginRight = `${newWidth}px`;
        }
      };

      const onMouseUp = () => {
        if (this.isResizing) {
          this.isResizing = false;
          resizer.classList.remove('active');
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          chrome.storage.local.set({ sidebarWidth: this.width });
        }
      };

      resizer.addEventListener('mousedown', (e) => {
        this.isResizing = true;
        startX = e.clientX;
        startWidth = this.width;
        resizer.classList.add('active');
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        e.preventDefault();
      });

      this.shadow.appendChild(style);
      this.shadow.appendChild(this.dockTab);
      this.shadow.appendChild(this.drawer);

      document.body.appendChild(this.container);
    }

    toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }

    open() {
      this.isOpen = true;
      this.applyState();
      chrome.storage.local.set({ sidebarOpen: true });
    }

    close() {
      this.isOpen = false;
      this.applyState();
      chrome.storage.local.set({ sidebarOpen: false });
    }

    togglePin() {
      this.isPinned = !this.isPinned;
      this.applyState();
      chrome.storage.local.set({ sidebarPinned: this.isPinned });
    }

    applyState() {
      if (this.isOpen) {
        this.drawer.classList.add('open');
        this.dockTab.style.display = 'none';
        if (this.isPinned) {
          document.documentElement.style.transition = 'margin-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
          document.documentElement.style.marginRight = `${this.width}px`;
          document.documentElement.style.marginLeft = '0px';
          const pinBtn = this.shadow.querySelector('#ab-pin-btn');
          if (pinBtn) pinBtn.classList.add('active');
        } else {
          document.documentElement.style.marginRight = '0px';
          document.documentElement.style.marginLeft = '0px';
          const pinBtn = this.shadow.querySelector('#ab-pin-btn');
          if (pinBtn) pinBtn.classList.remove('active');
        }
      } else {
        this.drawer.classList.remove('open');
        this.dockTab.style.display = 'flex';
        document.documentElement.style.marginRight = '0px';
        document.documentElement.style.marginLeft = '0px';
      }
    }

    updateAgentStatus(status) {
      const dot = this.shadow.querySelector('#ab-dock-status-dot');
      if (dot) {
        if (status === 'running' || status === 'actuating') {
          dot.className = 'ab-dock-status busy';
        } else if (status === 'error') {
          dot.className = 'ab-dock-status';
          dot.style.background = '#ef4444';
        } else {
          dot.className = 'ab-dock-status';
          dot.style.background = '#10b981';
        }
      }
    }
  }

  // Initialize and register globally
  window.__AutoBrowserSidebarInstance = new AutoBrowserSidebar();

  // Handle in-page message bridging from iframe
  window.addEventListener('message', async (e) => {
    if (e.data && e.data.source === 'PLUTO_SIDEBAR') {
      const { action, payload, messageId } = e.data;
      try {
        let res = {};
        switch (action) {
          case 'RUN_LOCAL_PERCEPTION':
            res = { perception: await window.__AutoBrowserPerception?.runPerceptionPass(payload) };
            break;
          case 'INDEX_DOM_AND_TAG':
            res = { domInfo: window.__AutoBrowserDOM?.indexAndTagElements() };
            break;
          case 'HIDE_TAGS':
            window.__AutoBrowserDOM?.hideTags();
            break;
          case 'SHOW_TAGS':
            window.__AutoBrowserDOM?.showTags();
            break;
          case 'DETECT_PII':
            res = { piiData: await window.__AutoBrowserPII?.scanPage(payload) };
            break;
          case 'SANITIZE_CONTEXT':
            res = {
              sanitized: await window.__AutoBrowserRedactor?.sanitizeContext(
                payload.screenshotDataUrl,
                payload.piiEntities,
                payload.domTags,
                { mode: payload.mode }
              )
            };
            break;
          case 'EXECUTE_DOM_ACTION':
            res = { result: await window.__AutoBrowserActuator?.execute(payload) };
            break;
          case 'VERIFY_EXECUTION':
            res = { verification: await window.__AutoBrowserVerifier?.verifyExecution(payload) };
            break;
          case 'SET_SCREEN_GLOW':
            window.__AutoBrowserVisuals?.setScreenGlow(payload?.active);
            window.__AutoBrowserSidebarInstance?.updateAgentStatus(payload?.active ? 'running' : 'idle');
            res = { active: payload?.active };
            break;
          case 'SHOW_HUD_MESSAGE':
            window.__AutoBrowserVisuals?.showHUD(payload?.message, payload?.status);
            break;
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
            res = { success: true };
            break;
          }
          case 'CLEANUP_OVERLAYS':
            window.__AutoBrowserDOM?.cleanupTags();
            window.__AutoBrowserVisuals?.cleanupAll();
            break;
          default:
            res = { success: true };
        }
        
        const iframe = window.__AutoBrowserSidebarInstance?.iframe;
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            source: 'PLUTO_PAGE_BRIDGE',
            messageId,
            response: res,
            success: true
          }, '*');
        }
      } catch (err) {
        const iframe = window.__AutoBrowserSidebarInstance?.iframe;
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            source: 'PLUTO_PAGE_BRIDGE',
            messageId,
            error: err.message,
            success: false
          }, '*');
        }
      }
    }
  });

  // Listen for background toggle commands (supports both TOGGLE_RIGHT_BAR, TOGGLE_SIDEBAR, and legacy TOGGLE_LEFT_BAR)
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'TOGGLE_SIDEBAR' || message.action === 'TOGGLE_RIGHT_BAR' || message.action === 'TOGGLE_LEFT_BAR') {
        window.__AutoBrowserSidebarInstance?.toggle();
        sendResponse({ success: true, isOpen: window.__AutoBrowserSidebarInstance?.isOpen });
      } else if (message.type === 'AGENT_TAB_EVENT') {
        window.__AutoBrowserSidebarInstance?.updateAgentStatus(message.state?.status);
      }
    });
  }
})();
