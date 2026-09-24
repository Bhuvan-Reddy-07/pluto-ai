/**
 * Pluto AI - In-Page Sci-Fi Visual Overlays, Animated Laser Pointer, Ripple Effects & HUD
 * Provides instant in-page visual feedback whenever the autonomous agent acts.
 */

(function () {
  window.__PLUTO__ = window.__PLUTO__ || {};

  class VisualOverlay {
    constructor() {
      this.cursorEl = null;
      this.hudEl = null;
      this.glowFrameEl = null;
      this.currentHighlightedEl = null;
      this.hudTimeout = null;
      this.stylesInjected = false;
    }

    ensureStyles() {
      if (this.stylesInjected && document.getElementById('pluto-visual-styles')) return;

      let styleEl = document.getElementById('pluto-visual-styles');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'pluto-visual-styles';
        styleEl.textContent = `
          /* Pluto AI Laser Cursor */
          #pluto-laser-cursor {
            position: fixed !important;
            width: 32px !important;
            height: 32px !important;
            z-index: 2147483647 !important;
            pointer-events: none !important;
            transform: translate(-4px, -4px) !important;
            transition: top 0.4s cubic-bezier(0.22, 1, 0.36, 1), left 0.4s cubic-bezier(0.22, 1, 0.36, 1), transform 0.2s ease, opacity 0.25s ease !important;
            filter: drop-shadow(0 0 10px rgba(6, 182, 212, 0.95)) drop-shadow(0 0 20px rgba(99, 102, 241, 0.6)) !important;
            display: flex !important;
            align-items: flex-start !important;
            user-select: none !important;
          }

          #pluto-laser-cursor.cursor-pressed {
            transform: translate(-4px, -4px) scale(0.82) rotate(-8deg) !important;
          }

          .pluto-cursor-svg {
            width: 28px !important;
            height: 28px !important;
            flex-shrink: 0 !important;
          }

          .pluto-cursor-halo {
            position: absolute !important;
            top: 2px !important;
            left: 2px !important;
            width: 18px !important;
            height: 18px !important;
            border-radius: 50% !important;
            border: 2px solid #06B6D4 !important;
            background: rgba(6, 182, 212, 0.25) !important;
            transform: translate(-50%, -50%) !important;
            animation: pluto-halo-pulse 1.2s infinite alternate !important;
            pointer-events: none !important;
          }

          @keyframes pluto-halo-pulse {
            0% { transform: translate(-50%, -50%) scale(0.6); opacity: 0.9; }
            100% { transform: translate(-50%, -50%) scale(1.6); opacity: 0.2; }
          }

          .pluto-cursor-badge {
            margin-left: 18px !important;
            margin-top: 14px !important;
            background: rgba(15, 23, 42, 0.92) !important;
            backdrop-filter: blur(8px) !important;
            -webkit-backdrop-filter: blur(8px) !important;
            border: 1px solid rgba(6, 182, 212, 0.7) !important;
            color: #38bdf8 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            font-size: 11px !important;
            font-weight: 700 !important;
            padding: 3px 8px !important;
            border-radius: 20px !important;
            white-space: nowrap !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5), 0 0 8px rgba(6, 182, 212, 0.4) !important;
            letter-spacing: 0.3px !important;
            pointer-events: none !important;
          }

          /* Click Ripple Wave */
          .pluto-click-ripple {
            position: fixed !important;
            width: 24px !important;
            height: 24px !important;
            border-radius: 50% !important;
            background: radial-gradient(circle, rgba(6, 182, 212, 0.9) 0%, rgba(99, 102, 241, 0.4) 40%, rgba(6, 182, 212, 0) 75%) !important;
            border: 2px solid #06B6D4 !important;
            z-index: 2147483646 !important;
            pointer-events: none !important;
            transform: translate(-50%, -50%) scale(0.2) !important;
            animation: pluto-ripple-wave 0.65s cubic-bezier(0.1, 0.9, 0.2, 1) forwards !important;
          }

          @keyframes pluto-ripple-wave {
            0% { transform: translate(-50%, -50%) scale(0.2); opacity: 1; border-width: 3px; }
            100% { transform: translate(-50%, -50%) scale(4.2); opacity: 0; border-width: 1px; }
          }

          /* Neon Target Element Highlight */
          .pluto-target-highlight {
            outline: 3px solid #06b6d4 !important;
            outline-offset: 3px !important;
            box-shadow: 0 0 18px rgba(6, 182, 212, 0.85), inset 0 0 10px rgba(6, 182, 212, 0.35) !important;
            transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
            animation: pluto-target-pulse 1.1s infinite alternate !important;
          }

          @keyframes pluto-target-pulse {
            0% { outline-color: #06b6d4; box-shadow: 0 0 10px rgba(6, 182, 212, 0.6); }
            100% { outline-color: #818cf8; box-shadow: 0 0 24px rgba(129, 140, 248, 0.95); }
          }

          /* Action HUD */
          #pluto-action-hud {
            position: fixed !important;
            top: 20px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            z-index: 2147483645 !important;
            background: rgba(15, 23, 42, 0.94) !important;
            backdrop-filter: blur(14px) !important;
            -webkit-backdrop-filter: blur(14px) !important;
            border: 1px solid rgba(6, 182, 212, 0.5) !important;
            color: #f8fafc !important;
            padding: 8px 20px !important;
            border-radius: 30px !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            display: flex !important;
            align-items: center !important;
            gap: 10px !important;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(6, 182, 212, 0.35) !important;
            pointer-events: none !important;
            animation: pluto-hud-slide 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
          }

          @keyframes pluto-hud-slide {
            from { transform: translate(-50%, -24px); opacity: 0; }
            to { transform: translate(-50%, 0); opacity: 1; }
          }

          .pluto-hud-dot {
            width: 8px !important;
            height: 8px !important;
            border-radius: 50% !important;
            background: #06b6d4 !important;
            box-shadow: 0 0 8px #06b6d4 !important;
            animation: pluto-hud-dot-pulse 1s infinite alternate !important;
            flex-shrink: 0 !important;
          }

          @keyframes pluto-hud-dot-pulse {
            0% { transform: scale(0.85); opacity: 0.75; }
            100% { transform: scale(1.35); opacity: 1; }
          }

          /* Viewport Cyber Glow Frame */
          #pluto-active-glow-frame {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            pointer-events: none !important;
            z-index: 2147483638 !important;
            box-sizing: border-box !important;
            border: 3px solid rgba(6, 182, 212, 0.65) !important;
            box-shadow: inset 0 0 30px rgba(6, 182, 212, 0.25), inset 0 0 60px rgba(99, 102, 241, 0.15) !important;
            transition: opacity 0.35s ease !important;
            animation: pluto-glow-pulse 2s infinite alternate !important;
          }

          @keyframes pluto-glow-pulse {
            0% { border-color: rgba(6, 182, 212, 0.5); }
            100% { border-color: rgba(129, 140, 248, 0.8); }
          }
        `;
        document.head.appendChild(styleEl);
      }
      this.stylesInjected = true;
    }

    initCursor() {
      this.ensureStyles();
      if (!this.cursorEl || !document.body.contains(this.cursorEl)) {
        if (this.cursorEl) this.cursorEl.remove();

        this.cursorEl = document.createElement('div');
        this.cursorEl.id = 'pluto-laser-cursor';
        this.cursorEl.innerHTML = `
          <div class="pluto-cursor-halo"></div>
          <svg class="pluto-cursor-svg" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="plutoLaserGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#38BDF8" />
                <stop offset="50%" stop-color="#06B6D4" />
                <stop offset="100%" stop-color="#6366F1" />
              </linearGradient>
            </defs>
            <path d="M4 4L14 28L18 18L28 14L4 4Z" fill="url(#plutoLaserGrad)" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"/>
            <circle cx="5.5" cy="5.5" r="3.5" fill="#FFFFFF" />
            <circle cx="5.5" cy="5.5" r="1.5" fill="#06B6D4" />
          </svg>
          <div class="pluto-cursor-badge" id="pluto-cursor-badge">⚡ Pluto AI</div>
        `;

        const startX = Math.round(window.innerWidth / 2);
        const startY = Math.round(window.innerHeight / 2);
        this.cursorEl.style.left = `${startX}px`;
        this.cursorEl.style.top = `${startY}px`;
        this.cursorEl.style.opacity = '0';

        document.body.appendChild(this.cursorEl);
        void this.cursorEl.offsetWidth;
        this.cursorEl.style.opacity = '1';
      }
    }

    /**
     * Glides the laser cursor to (x, y) with action badge
     */
    async moveCursorTo(x, y, meta = {}) {
      this.initCursor();

      const badge = this.cursorEl.querySelector('#pluto-cursor-badge');
      if (badge) {
        if (meta.action === 'type') {
          const previewVal = meta.text ? ` "${meta.text.slice(0, 14)}..."` : '';
          badge.innerHTML = `⌨️ Typing${previewVal}`;
        } else if (meta.action === 'click') {
          badge.innerHTML = `🖱️ Clicking`;
        } else if (meta.action === 'hover') {
          badge.innerHTML = `🔍 Hovering`;
        } else if (meta.action === 'scroll') {
          badge.innerHTML = `📜 Scrolling`;
        } else {
          badge.innerHTML = `⚡ Pluto AI`;
        }
      }

      this.cursorEl.classList.remove('cursor-pressed');
      this.cursorEl.style.opacity = '1';
      this.cursorEl.style.left = `${Math.round(x)}px`;
      this.cursorEl.style.top = `${Math.round(y)}px`;

      await new Promise(r => setTimeout(r, 400));

      if (meta.action === 'click') {
        this.cursorEl.classList.add('cursor-pressed');
        this.triggerClickRipple(x, y);
        await new Promise(r => setTimeout(r, 120));
        this.cursorEl.classList.remove('cursor-pressed');
      }
    }

    /**
     * Triggers expanding click ripple at (x, y)
     */
    triggerClickRipple(x, y) {
      this.ensureStyles();
      const ripple = document.createElement('div');
      ripple.className = 'pluto-click-ripple';
      ripple.style.left = `${Math.round(x)}px`;
      ripple.style.top = `${Math.round(y)}px`;
      document.body.appendChild(ripple);

      setTimeout(() => {
        ripple.remove();
      }, 700);
    }

    /**
     * Highlights target element
     */
    highlightElement(el) {
      this.ensureStyles();
      this.removeHighlight();
      if (!el) return;
      this.currentHighlightedEl = el;
      el.classList.add('pluto-target-highlight');
    }

    removeHighlight() {
      if (this.currentHighlightedEl) {
        this.currentHighlightedEl.classList.remove('pluto-target-highlight');
        this.currentHighlightedEl = null;
      }
      document.querySelectorAll('.pluto-target-highlight').forEach(el => {
        el.classList.remove('pluto-target-highlight');
      });
    }

    /**
     * Displays floating status HUD on top of screen
     */
    showHUD(message, status = 'active') {
      this.ensureStyles();
      if (!this.hudEl || !document.body.contains(this.hudEl)) {
        if (this.hudEl) this.hudEl.remove();
        this.hudEl = document.createElement('div');
        this.hudEl.id = 'pluto-action-hud';
        document.body.appendChild(this.hudEl);
      }

      const dotColor = status === 'error' ? '#EF4444' : status === 'success' ? '#10B981' : '#06B6D4';

      this.hudEl.innerHTML = `
        <div class="pluto-hud-dot" style="background: ${dotColor}; box-shadow: 0 0 8px ${dotColor};"></div>
        <span>${this.escapeHTML(message)}</span>
      `;
      this.hudEl.style.display = 'flex';

      if (this.hudTimeout) clearTimeout(this.hudTimeout);
      this.hudTimeout = setTimeout(() => {
        this.hideHUD();
      }, 4000);
    }

    hideHUD() {
      if (this.hudEl) {
        this.hudEl.style.display = 'none';
      }
    }

    escapeHTML(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    /**
     * Toggles screen glowing frame
     */
    setScreenGlow(active) {
      this.ensureStyles();
      if (active) {
        if (!this.glowFrameEl || !document.body.contains(this.glowFrameEl)) {
          this.glowFrameEl = document.getElementById('pluto-active-glow-frame');
          if (!this.glowFrameEl) {
            this.glowFrameEl = document.createElement('div');
            this.glowFrameEl.id = 'pluto-active-glow-frame';
            document.body.appendChild(this.glowFrameEl);
          }
        }
        this.glowFrameEl.style.display = 'block';
        this.glowFrameEl.style.opacity = '1';
      } else {
        const frame = this.glowFrameEl || document.getElementById('pluto-active-glow-frame');
        if (frame) {
          frame.style.opacity = '0';
          setTimeout(() => {
            if (frame) frame.remove();
            this.glowFrameEl = null;
          }, 350);
        }
      }
    }

    cleanupAll() {
      if (this.cursorEl) {
        this.cursorEl.style.opacity = '0';
        setTimeout(() => {
          if (this.cursorEl) {
            this.cursorEl.remove();
            this.cursorEl = null;
          }
        }, 300);
      }
      if (this.hudEl) {
        this.hudEl.remove();
        this.hudEl = null;
      }
      this.setScreenGlow(false);
      this.removeHighlight();
    }
  }

  const instance = new VisualOverlay();
  window.__PLUTO__.visuals = instance;
  window.__AutoBrowserVisuals = instance;
})();
