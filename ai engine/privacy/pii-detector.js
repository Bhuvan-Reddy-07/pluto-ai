/**
 * Pluto AI - Multi-Layer On-Device PII Detection Engine
 * Scans DOM form attributes, Shadow DOM web components, Regex checksums,
 * table/grid columns, metadata attributes, input values, and visual regions on-device.
 * Identifies sensitive content locally before ANY visual or textual payload is transmitted.
 */

(function () {
  window.__PLUTO__ = window.__PLUTO__ || {};

  class PiiDetector {
    constructor() {
      // Regex detection patterns for PII
      this.patterns = {
        email: {
          regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
          type: 'EMAIL',
          confidence: 0.98
        },
        truncatedEmail: {
          regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]*\.\.\.|\b[A-Za-z0-9._%+-]{4,}@\.\.\./g,
          type: 'EMAIL_TRUNCATED',
          confidence: 0.96
        },
        truncatedIdentifier: {
          regex: /\b[a-zA-Z0-9._%+-]{5,}\.\.\./g,
          type: 'IDENTIFIER_TRUNCATED',
          confidence: 0.93
        },
        phone: {
          regex: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b|(?:\+91[\s-]?)?[6-9]\d{9}\b/g,
          type: 'PHONE_NUMBER',
          confidence: 0.94
        },
        creditCard: {
          regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
          type: 'CREDIT_CARD',
          confidence: 0.97
        },
        maskedCard: {
          regex: /(?:[•\*]{4}[\s-]?){3}\d{4}|(?:[•\*]{4}[\s-]?){2}[•\*]{4}[\s-]?\d{4}|\b\d{4}[\s-]?[•\*]{4}[\s-]?[•\*]{4}[\s-]?\d{4}\b/g,
          type: 'CREDIT_CARD_MASKED',
          confidence: 0.96
        },
        panNumber: {
          regex: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g,
          type: 'GOVT_PAN',
          confidence: 0.97
        },
        ssn: {
          regex: /\b\d{3}-\d{2}-\d{4}\b/g,
          type: 'SSN',
          confidence: 0.96
        },
        aadhaar: {
          regex: /\b\d{4}\s?\d{4}\s?\d{4}\b/g,
          type: 'NATIONAL_ID',
          confidence: 0.95
        },
        cvv: {
          regex: /\b\d{3,4}\b/g,
          type: 'CARD_CVV',
          confidence: 0.90
        },
        jwtToken: {
          regex: /\beyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_.]+\b/g,
          type: 'JWT_TOKEN',
          confidence: 0.99
        },
        googleApiKey: {
          regex: /\bAIza[0-9A-Za-z-_]{30,40}\b/g,
          type: 'API_KEY',
          confidence: 0.99
        },
        openAiApiKey: {
          regex: /\bsk-[a-zA-Z0-9_-]{20,}\b/g,
          type: 'API_KEY',
          confidence: 0.99
        },
        genericApiKey: {
          regex: /(?:api[_-]?key|auth[_-]?token|bearer|secret)\s*[:=]\s*['"]?[a-zA-Z0-9_-]{16,}['"]?/gi,
          type: 'API_KEY',
          confidence: 0.98
        },
        firebaseUid: {
          regex: /\b[a-zA-Z0-9_-]{18,40}\b/g,
          type: 'USER_UID',
          confidence: 0.92
        },
        truncatedUid: {
          regex: /\b[a-zA-Z0-9_-]{10,24}\.\.\./g,
          type: 'USER_UID_TRUNCATED',
          confidence: 0.91
        },
        uuid: {
          regex: /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g,
          type: 'UUID_IDENTIFIER',
          confidence: 0.93
        },
        ipAddress: {
          regex: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
          type: 'IP_ADDRESS',
          confidence: 0.92
        }
      };

      // Sensitive DOM attribute markers
      this.domMarkers = [
        'password',
        'current-password',
        'new-password',
        'cc-number',
        'cc-exp',
        'cc-csc',
        'cc-type',
        'creditcard',
        'cardnumber',
        'cvv',
        'ssn',
        'tax-id',
        'pan',
        'pan_number',
        'officer_id',
        'aadhaar',
        'pin',
        'secret',
        'token',
        'auth-token',
        'api-key'
      ];
    }

    /**
     * Deep query selector that pierces open Shadow DOM roots across web components
     */
    querySelectorAllDeep(selector, root = document) {
      const results = [];
      try {
        if (root.querySelectorAll) {
          results.push(...Array.from(root.querySelectorAll(selector)));
        }
      } catch (e) {}

      try {
        if (root.querySelectorAll) {
          const allEls = root.querySelectorAll('*');
          for (const el of allEls) {
            if (el.shadowRoot) {
              results.push(...this.querySelectorAllDeep(selector, el.shadowRoot));
            }
          }
        }
      } catch (e) {}

      return results;
    }

    /**
     * Scans active page for sensitive PII entities across DOM attributes, visible text,
     * Shadow DOM, tables, grid cells, attributes, input values, and avatars.
     * @returns {Promise<{entities: Array, totalDetected: number, durationMs: number, summaryByType: object}>}
     */
    async scanPage() {
      const startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const detectedEntities = [];
      const seenTexts = new Set();
      const scrollX = window.scrollX || window.pageXOffset || 0;
      const scrollY = window.scrollY || window.pageYOffset || 0;
      const viewportHeight = window.innerHeight || 800;

      function addEntity(entity) {
        // Deduplicate overlapping identical entities
        const normKey = `${entity.type}_${entity.matchedText || entity.rawPreview}_${Math.round((entity.rect?.x || 0) / 10)}_${Math.round((entity.rect?.y || 0) / 10)}`;
        if (seenTexts.has(normKey)) return;
        seenTexts.add(normKey);
        detectedEntities.push(entity);
      }

      // ==========================================
      // Layer 1: DOM Form & Credential Analysis (Deep)
      // ==========================================
      const formElements = this.querySelectorAllDeep('input, select, textarea');
      formElements.forEach((el, index) => {
        if (el.closest && (el.closest('#pluto-panel-container') || el.closest('#autobrowser-action-hud') || el.closest('#autobrowser-sidebar-container'))) return;

        const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : { x: 0, y: 0, width: 0, height: 0 };
        if (rect.width === 0 && rect.height === 0) return;

        const type = (el.getAttribute('type') || '').toLowerCase();
        const name = (el.getAttribute('name') || '').toLowerCase();
        const id = (el.getAttribute('id') || '').toLowerCase();
        const autocomplete = (el.getAttribute('autocomplete') || '').toLowerCase();
        const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
        const val = el.value || '';

        const isPassword = type === 'password' || this.domMarkers.some(m =>
          autocomplete.includes(m) || name.includes(m) || id.includes(m) || placeholder.includes(m)
        );

        if (isPassword) {
          addEntity({
            id: `pii_dom_${index + 1}`,
            layer: 'DOM_ATTRIBUTE',
            type: type === 'password' ? 'PASSWORD' : 'CREDENTIAL_FIELD',
            confidence: 0.99,
            rawPreview: val ? '••••••••' : `[Sensitive ${type || 'credential'} field]`,
            maskedToken: `[REDACTED_${(type || 'SECRET').toUpperCase()}_${detectedEntities.length + 1}]`,
            element: el,
            rect: {
              x: Math.round(rect.x + scrollX),
              y: Math.round(rect.y + scrollY),
              viewportX: Math.round(rect.x),
              viewportY: Math.round(rect.y),
              width: Math.round(rect.width || 120),
              height: Math.round(rect.height || 32)
            }
          });
        } else if (val && val.length >= 3) {
          // Check if value itself contains PII (email, phone, PAN, CC)
          this.scanTextString(val, el, scrollX, scrollY, rect, addEntity, `pii_input_${index + 1}`);
        }
      });

      // ==========================================
      // Layer 2: Table Rows, Grid Cells, Custom Angular/Material & Metadata Scan
      // (Handles Firebase Console, AWS, Google Cloud, tables with truncated text & tooltips)
      // ==========================================
      const dataElements = this.querySelectorAllDeep('td, th, tr, mat-cell, mat-row, mat-header-cell, cdk-cell, cdk-row, [role="row"], [role="cell"], [role="gridcell"], [role="columnheader"], .user-row, .table-row, [data-email], [data-uid], [data-user-id], [title], [aria-label]');
      dataElements.forEach((el, index) => {
        if (el.closest && (el.closest('#pluto-panel-container') || el.closest('#autobrowser-action-hud') || el.closest('#autobrowser-sidebar-container'))) return;

        const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : { x: 0, y: 0, width: 0, height: 0 };
        if (rect.width === 0 && rect.height === 0) return;

        // Check attributes: title, aria-label, data-email, data-uid
        const titleAttr = el.getAttribute('title') || '';
        const ariaAttr = el.getAttribute('aria-label') || '';
        const dataEmail = el.getAttribute('data-email') || '';
        const dataUid = el.getAttribute('data-uid') || el.getAttribute('data-user-id') || '';

        const attrTexts = [titleAttr, ariaAttr, dataEmail, dataUid].filter(t => t && t.length >= 4);
        for (const attrText of attrTexts) {
          this.scanTextString(attrText, el, scrollX, scrollY, rect, addEntity, `pii_attr_${index + 1}`);
        }

        // Check inner text of table cells
        const inner = (el.innerText || el.textContent || '').trim();
        if (inner && inner.length >= 3 && inner.length < 500) {
          // Determine column semantics
          let colHeader = '';
          try {
            if (el.cellIndex !== undefined && el.closest) {
              const table = el.closest('table');
              colHeader = table?.querySelector(`th:nth-child(${el.cellIndex + 1})`)?.innerText?.toLowerCase() || '';
            }
          } catch (e) {}

          const isIdentifierCol = colHeader.includes('identifier') || colHeader.includes('email') || colHeader.includes('user') || colHeader.includes('account');
          const isUidCol = colHeader.includes('uid') || colHeader.includes('user id') || colHeader.includes('key');

          // Detect Firebase/Cloud identifiers or truncated emails like "pranavredd..." or "labour12@g..." or "yb272QUfxwPir..."
          if (/\b[a-zA-Z0-9._%+-]{4,}\.\.\./.test(inner) || (isIdentifierCol && inner.length >= 4) || (isUidCol && inner.length >= 8) || /^[a-zA-Z0-9_-]{18,40}$/.test(inner)) {
            const isEmail = inner.includes('@') || isIdentifierCol;
            const isUid = isUidCol || /^[a-zA-Z0-9_-]{18,40}$/.test(inner) || (/^[a-zA-Z0-9_-]{10,}\.\.\./.test(inner) && !inner.includes('@'));

            let entityType = 'IDENTIFIER';
            if (isEmail) entityType = inner.includes('...') ? 'EMAIL_TRUNCATED' : 'EMAIL';
            else if (isUid) entityType = inner.includes('...') ? 'USER_UID_TRUNCATED' : 'USER_UID';

            addEntity({
              id: `pii_cell_${index + 1}`,
              layer: 'TABLE_CELL_SCAN',
              type: entityType,
              confidence: 0.95,
              rawPreview: inner,
              maskedToken: `[REDACTED_${entityType}_${detectedEntities.length + 1}]`,
              matchedText: inner,
              rect: {
                x: Math.round(rect.x + scrollX),
                y: Math.round(rect.y + scrollY),
                viewportX: Math.round(rect.x),
                viewportY: Math.round(rect.y),
                width: Math.round(rect.width || 120),
                height: Math.round(rect.height || 24)
              }
            });
          }
        }
      });

      // ==========================================
      // Layer 3: Visible Text Node Regex Scan (Deep & Shadow DOM)
      // ==========================================
      const textNodes = this.getVisibleTextNodes();
      for (const node of textNodes) {
        const text = node.textContent;
        if (!text || text.length < 3) continue;

        const parentEl = node.parentElement;
        const rect = parentEl && parentEl.getBoundingClientRect ? parentEl.getBoundingClientRect() : { x: 0, y: 0, width: 0, height: 0 };

        this.scanTextString(text, node, scrollX, scrollY, rect, addEntity, `pii_text_${detectedEntities.length + 1}`);
      }

      // ==========================================
      // Layer 4: Visual Avatar / Face Region Scan
      // ==========================================
      const avatars = this.querySelectorAllDeep('img[src*="avatar"], img[src*="profile"], img[src*="user"], .avatar, .profile-pic, [data-avatar]');
      avatars.forEach((img, idx) => {
        if (img.closest && (img.closest('#pluto-panel-container') || img.closest('#autobrowser-action-hud') || img.closest('#autobrowser-sidebar-container'))) return;
        const rect = img.getBoundingClientRect ? img.getBoundingClientRect() : { x: 0, y: 0, width: 0, height: 0 };
        if (rect.width > 16 && rect.height > 16 && rect.top < viewportHeight && rect.bottom > 0) {
          addEntity({
            id: `pii_visual_${idx + 1}`,
            layer: 'VISUAL_REGION',
            type: 'USER_AVATAR_FACE',
            confidence: 0.92,
            rawPreview: '[User Profile Face/Avatar]',
            maskedToken: `[REDACTED_AVATAR_${detectedEntities.length + 1}]`,
            element: img,
            rect: {
              x: Math.round(rect.x + scrollX),
              y: Math.round(rect.y + scrollY),
              viewportX: Math.round(rect.x),
              viewportY: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            }
          });
        }
      });

      const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const durationMs = Math.round(now - startTime);

      return {
        entities: detectedEntities,
        totalDetected: detectedEntities.length,
        durationMs,
        summaryByType: this.summarizeEntities(detectedEntities)
      };
    }

    /**
     * Scans a single string of text against all regex patterns
     */
    scanTextString(text, domRef, scrollX, scrollY, defaultRect, addEntity, idPrefix) {
      if (!text || typeof text !== 'string') return;

      for (const [key, patternObj] of Object.entries(this.patterns)) {
        patternObj.regex.lastIndex = 0;
        let match;
        while ((match = patternObj.regex.exec(text)) !== null) {
          const matchedStr = match[0];

          // Validate credit cards with Luhn checksum
          if (key === 'creditCard' && !this.isValidLuhn(matchedStr)) {
            continue;
          }

          // Filter out generic short words for uuid / firebaseUid
          if ((key === 'firebaseUid' || key === 'uuid' || key === 'truncatedIdentifier') && /^(true|false|undefined|null|submit|button|cancel|delete|update|created|signed|action|loading)$/i.test(matchedStr)) {
            continue;
          }

          // Calculate precise bounding client rect
          let rect = {
            x: Math.round((defaultRect?.x || 0) + scrollX),
            y: Math.round((defaultRect?.y || 0) + scrollY),
            viewportX: Math.round(defaultRect?.x || 0),
            viewportY: Math.round(defaultRect?.y || 0),
            width: Math.round(defaultRect?.width || 100),
            height: Math.round(defaultRect?.height || 20)
          };

          if (domRef && domRef.nodeType === 3 && typeof document !== 'undefined' && document.createRange) {
            try {
              const range = document.createRange();
              range.setStart(domRef, match.index);
              range.setEnd(domRef, match.index + matchedStr.length);
              const r = range.getBoundingClientRect();
              if (r && r.width > 0 && r.height > 0) {
                rect = {
                  x: Math.round(r.x + scrollX),
                  y: Math.round(r.y + scrollY),
                  viewportX: Math.round(r.x),
                  viewportY: Math.round(r.y),
                  width: Math.round(r.width),
                  height: Math.round(r.height)
                };
              }
            } catch (e) {}
          }

          addEntity({
            id: `${idPrefix}_${match.index}`,
            layer: 'REGEX_TEXT_SCAN',
            type: patternObj.type,
            confidence: patternObj.confidence,
            rawPreview: this.generateMaskedPreview(matchedStr, patternObj.type),
            maskedToken: `[REDACTED_${patternObj.type}]`,
            matchedText: matchedStr,
            rect
          });
        }
      }
    }

    /**
     * Collects visible text nodes across document and all open Shadow DOM trees
     */
    getVisibleTextNodes(root = typeof document !== 'undefined' ? document.body : null) {
      if (!root) return [];
      const nodes = [];
      const maxNodes = 3000;

      const collect = (container) => {
        if (!container || nodes.length >= maxNodes) return;
        if (container.closest && (container.closest('#pluto-panel-container') || container.closest('#autobrowser-action-hud') || container.closest('#autobrowser-sidebar-container'))) {
          return;
        }

        try {
          if (!document.createTreeWalker) return;
          const walker = document.createTreeWalker(
            container,
            (typeof NodeFilter !== 'undefined' ? (NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT) : 5),
            {
              acceptNode(node) {
                if (node.nodeType === 3) {
                  const parent = node.parentElement;
                  if (!parent) return 2; // FILTER_REJECT
                  const tag = (parent.tagName || '').toLowerCase();
                  if (['script', 'style', 'noscript', 'svg', 'canvas'].includes(tag)) {
                    return 2;
                  }
                  if (parent.closest && (parent.closest('#pluto-panel-container') || parent.closest('#autobrowser-action-hud') || parent.closest('#autobrowser-sidebar-container'))) {
                    return 2;
                  }
                  return 1; // FILTER_ACCEPT
                }
                if (node.nodeType === 1) {
                  if (node.id === 'pluto-panel-container' || node.id === 'autobrowser-action-hud' || node.id === 'autobrowser-sidebar-container') {
                    return 2;
                  }
                  return 1;
                }
                return 1;
              }
            }
          );

          while (walker.nextNode() && nodes.length < maxNodes) {
            const cur = walker.currentNode;
            if (cur.nodeType === 3) {
              const text = (cur.textContent || '').trim();
              if (text.length >= 3) {
                nodes.push(cur);
              }
            } else if (cur.nodeType === 1 && cur.shadowRoot) {
              collect(cur.shadowRoot);
            }
          }
        } catch (e) {}
      };

      collect(root);
      return nodes;
    }

    /**
     * Standard Luhn algorithm for Credit Card number validation
     */
    isValidLuhn(numberStr) {
      if (!numberStr) return false;
      const clean = numberStr.replace(/[\s-]/g, '');
      if (clean.length < 13 || clean.length > 19 || !/^\d+$/.test(clean)) return false;

      let sum = 0;
      let shouldDouble = false;
      for (let i = clean.length - 1; i >= 0; i--) {
        let digit = parseInt(clean.charAt(i), 10);
        if (isNaN(digit)) return false;
        if (shouldDouble) {
          digit *= 2;
          if (digit > 9) digit -= 9;
        }
        sum += digit;
        shouldDouble = !shouldDouble;
      }
      return (sum % 10) === 0;
    }

    generateMaskedPreview(str, type) {
      if (type === 'EMAIL' || type === 'EMAIL_TRUNCATED' || type === 'IDENTIFIER_TRUNCATED') {
        if (str.includes('@')) {
          const parts = str.split('@');
          return (parts[0] ? parts[0].slice(0, 2) : 'xx') + '***@' + (parts[1] || '***');
        }
        return str.slice(0, 3) + '••••' + str.slice(-3);
      }
      if (type === 'CREDIT_CARD' || type === 'CREDIT_CARD_MASKED') {
        return '•••• •••• •••• ' + str.slice(-4);
      }
      if (type === 'PHONE_NUMBER') {
        return '***-***-' + str.slice(-4);
      }
      if (type === 'SSN' || type === 'NATIONAL_ID') {
        return '•••-••-••••';
      }
      if (type === 'GOVT_PAN') {
        return str.slice(0, 2) + '••••••' + str.slice(-2);
      }
      if (type === 'USER_UID' || type === 'USER_UID_TRUNCATED' || type === 'UUID_IDENTIFIER') {
        return str.slice(0, 4) + '••••••••' + (str.length > 8 ? str.slice(-3) : '');
      }
      if (type === 'API_KEY' || type === 'JWT_TOKEN') {
        return '[PROTECTED_SECRET_KEY]';
      }
      return '••••••••';
    }

    summarizeEntities(entities) {
      const summary = {};
      for (const e of entities) {
        summary[e.type] = (summary[e.type] || 0) + 1;
      }
      return summary;
    }
  }

  // Register globally under all interoperability namespaces
  const instance = new PiiDetector();
  window.__PLUTO__.piiDetector = instance;
  window.__AutoBrowserPII = instance;
})();
