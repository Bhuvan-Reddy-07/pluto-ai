/**
 * Pluto AI - Resilient Element Resolver
 * Implements the Resilient Selector Priority Chain:
 * 1. Direct condenser ID lookup (if valid & connected)
 * 2. data-testid (data-testid, data-test, data-cy, data-qa)
 * 3. aria-label / role + name
 * 4. Visible text match (exact then substring)
 * 5. Position / bounding-box
 * 6. Coordinates from screenshot (elementFromPoint - last resort)
 */

(function () {
  window.__PLUTO__ = window.__PLUTO__ || {};

  class ElementResolver {
    getActiveDocument() {
      return window.__PLUTO__.domCondenser?.activeDocument || document;
    }

    /**
     * Resolve target identifier to live DOM element and viewport center coordinates
     * @param {string|object} targetId - Short ID, selector, text query, or coordinate object
     * @param {object} [fallbackCoords] - Optional {x, y} coordinate fallback
     */
    resolve(targetId, fallbackCoords = null) {
      if (!targetId && !fallbackCoords) return null;

      const doc = this.getActiveDocument();
      let el = null;
      let matchedBy = 'none';

      // 0. Coordinate object directly passed: {x, y}
      if (typeof targetId === 'object' && targetId !== null && targetId.x !== undefined && targetId.y !== undefined) {
        el = doc.elementFromPoint(Number(targetId.x), Number(targetId.y));
        matchedBy = 'coordinates';
      }

      const cleanId = typeof targetId === 'string' ? String(targetId).trim().replace(/^\[|\]$/g, '') : '';

      // Check if cleanId looks like coordinates string: "x:100, y:200" or "100, 200"
      if (!el && cleanId) {
        const coordMatch = cleanId.match(/(?:x:?\s*)?(\d+)[,\s]+(?:y:?\s*)?(\d+)/i);
        if (coordMatch && !cleanId.startsWith('b') && !cleanId.startsWith('i') && !cleanId.startsWith('l') && !cleanId.startsWith('s')) {
          const px = Number(coordMatch[1]);
          const py = Number(coordMatch[2]);
          el = doc.elementFromPoint(px, py);
          if (el) matchedBy = 'coordinates-parsed';
        }
      }

      // Check direct lookup from DOM condenser map if it's a short ID
      if (!el && cleanId && window.__PLUTO__.domCondenser) {
        const condenserEl = window.__PLUTO__.domCondenser.getElement(cleanId);
        if (condenserEl && condenserEl.isConnected) {
          el = condenserEl;
          matchedBy = 'condenser-id';
        }
      }

      // Priority Chain Execution
      if (!el && cleanId) {
        // --- PRIORITY 1: data-testid attributes ---
        el = this.findByTestId(cleanId, doc);
        if (el) matchedBy = 'data-testid';

        // --- PRIORITY 2: aria-label / role + name ---
        if (!el) {
          el = this.findByAriaAndRole(cleanId, doc);
          if (el) matchedBy = 'aria-role';
        }

        // --- PRIORITY 3: Visible text match ---
        if (!el) {
          el = this.findByVisibleText(cleanId, doc);
          if (el) matchedBy = 'visible-text';
        }

        // --- PRIORITY 4: Position / Bounding Box match ---
        if (!el) {
          el = this.findByBoundingBox(cleanId, doc);
          if (el) matchedBy = 'bounding-box';
        }

        // Standard DOM ID / CSS Selector lookup fallback
        if (!el) {
          try {
            el = doc.getElementById(cleanId) || doc.querySelector(cleanId);
            if (el) matchedBy = 'id-or-selector';
          } catch (e) {}
        }
      }

      // --- PRIORITY 5: Coordinates from screenshot (Last Resort) ---
      if (!el && fallbackCoords && fallbackCoords.x !== undefined && fallbackCoords.y !== undefined) {
        el = doc.elementFromPoint(Number(fallbackCoords.x), Number(fallbackCoords.y));
        if (el) matchedBy = 'fallback-coordinates';
      }

      if (!el) {
        return null;
      }

      const rect = el.getBoundingClientRect();
      const centerX = Math.round(rect.left + rect.width / 2);
      const centerY = Math.round(rect.top + rect.height / 2);

      return {
        element: el,
        id: cleanId || el.id || 'element',
        tagName: el.tagName.toLowerCase(),
        matchedBy,
        rect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        },
        center: {
          x: Math.max(0, centerX),
          y: Math.max(0, centerY)
        }
      };
    }

    /**
     * Tier 1: data-testid attributes
     */
    findByTestId(query, doc) {
      const q = this.escapeAttributeValue(query);
      const testAttrs = ['data-testid', 'data-test', 'data-cy', 'data-qa'];
      for (const attr of testAttrs) {
        try {
          const el = doc.querySelector(`[${attr}="${q}"]`) || doc.querySelector(`[${attr}*="${q}" i]`);
          if (el) return el;
        } catch (e) {}
      }
      return null;
    }

    /**
     * Tier 2: aria-label / role + name
     */
    findByAriaAndRole(query, doc) {
      const q = query.toLowerCase();
      const candidates = Array.from(doc.querySelectorAll('[aria-label], [aria-labelledby], [role]'));

      // Exact aria-label match
      for (const el of candidates) {
        const label = (el.getAttribute('aria-label') || '').trim().toLowerCase();
        if (label === q) return el;
      }

      // Substring aria-label match
      for (const el of candidates) {
        const label = (el.getAttribute('aria-label') || '').toLowerCase();
        if (label.includes(q)) return el;
      }

      // Role + name match
      for (const el of candidates) {
        const role = (el.getAttribute('role') || '').toLowerCase();
        const text = (el.innerText || el.textContent || '').toLowerCase();
        if (q.includes(role) && text.includes(q.replace(role, '').trim())) {
          return el;
        }
      }

      return null;
    }

    /**
     * Tier 3: Visible text match
     */
    findByVisibleText(query, doc) {
      const q = query.toLowerCase().trim();
      const interactiveEls = Array.from(doc.querySelectorAll('button, a, input, textarea, select, [role="button"], [role="link"], label, span, div'));

      // Exact text match first
      for (const el of interactiveEls) {
        const text = (el.innerText || el.textContent || '').trim().toLowerCase();
        if (text === q && el.children.length <= 2) {
          return el;
        }
      }

      // Substring text match
      for (const el of interactiveEls) {
        const text = (el.innerText || el.textContent || '').toLowerCase();
        const ph = (el.getAttribute('placeholder') || '').toLowerCase();
        const val = (el.value || '').toLowerCase();

        if (text.includes(q) || ph.includes(q) || val.includes(q)) {
          return el;
        }
      }

      return null;
    }

    /**
     * Tier 4: Position / Bounding-box match
     */
    findByBoundingBox(query, doc) {
      const match = query.match(/x:?\s*(\d+).*?y:?\s*(\d+)/i);
      if (match) {
        const x = Number(match[1]);
        const y = Number(match[2]);
        const el = doc.elementFromPoint(x, y);
        if (el) return el;
      }
      return null;
    }

    heuristicSearch(query) {
      const doc = this.getActiveDocument();
      return this.findByTestId(query, doc) ||
             this.findByAriaAndRole(query, doc) ||
             this.findByVisibleText(query, doc) ||
             this.findByBoundingBox(query, doc);
    }

    escapeAttributeValue(val) {
      return String(val).replace(/["\\]/g, '\\$&');
    }
  }

  window.__PLUTO__.resolver = new ElementResolver();
})();
