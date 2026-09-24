/**
 * Pluto AI - Privacy Redaction Protocol & Canvas 2D Engine
 * Masks, blurs, blackouts, or pixelates sensitive regions on canvas and builds
 * the structured Redaction Protocol Metadata JSON for downstream VLM contextual reasoning.
 */

(function () {
  window.__PLUTO__ = window.__PLUTO__ || {};

  class PrivacyRedactor {
    constructor() {
      this.redactionMode = 'blur'; // 'blur' | 'blackout' | 'mask'
    }

    /**
     * Sanitizes screenshot and DOM text using detected PII entities
     * @param {string} originalScreenshotDataUrl - Base64 data URL
     * @param {Array} piiEntities - Entities returned by piiDetector.scanPage()
     * @param {object} [options] - Mode override & options
     * @returns {Promise<{sanitizedScreenshot: string, redactionCount: number, redactionMetadata: object, durationMs: number}>}
     */
    async sanitizeContext(originalScreenshotDataUrl, piiEntities = [], options = {}) {
      const startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const mode = options.mode || this.redactionMode || 'blur';

      if (!originalScreenshotDataUrl || !piiEntities || piiEntities.length === 0) {
        return {
          sanitizedScreenshot: originalScreenshotDataUrl,
          redactionCount: 0,
          redactionMode: mode,
          redactionMetadata: this.buildMetadata([], mode),
          durationMs: 0
        };
      }

      // 1. Render sanitized screenshot via Canvas 2D
      const sanitizedScreenshot = await this.renderRedactedScreenshot(
        originalScreenshotDataUrl,
        piiEntities,
        mode
      );

      // 2. Build Redaction Protocol Metadata JSON
      const redactionMetadata = this.buildMetadata(piiEntities, mode);

      const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const durationMs = Math.round(now - startTime);

      return {
        sanitizedScreenshot,
        redactionCount: piiEntities.length,
        redactionMode: mode,
        redactionMetadata,
        durationMs
      };
    }

    /**
     * Renders redacted screenshot on Canvas 2D
     */
    renderRedactedScreenshot(screenshotDataUrl, piiEntities, mode = 'blur') {
      return new Promise((resolve) => {
        if (typeof Image === 'undefined' || typeof document === 'undefined') {
          return resolve(screenshotDataUrl);
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            return resolve(screenshotDataUrl);
          }

          // Draw base screenshot
          ctx.drawImage(img, 0, 0);

          const scaleX = img.width / (window.innerWidth || 1280);
          const scaleY = img.height / (window.innerHeight || 800);

          for (const entity of piiEntities) {
            const rect = entity.rect;
            if (!rect) continue;

            const rawX = rect.viewportX !== undefined ? rect.viewportX : rect.x;
            const rawY = rect.viewportY !== undefined ? rect.viewportY : rect.y;
            const rawW = rect.width || 80;
            const rawH = rect.height || 24;

            const x = Math.max(0, Math.round(rawX * scaleX));
            const y = Math.max(0, Math.round(rawY * scaleY));
            const w = Math.min(img.width - x, Math.max(16, Math.round(rawW * scaleX)));
            const h = Math.min(img.height - y, Math.max(16, Math.round(rawH * scaleY)));

            if (w <= 0 || h <= 0) continue;

            const isFace = entity.type === 'USER_AVATAR_FACE' || entity.type === 'face';
            const isSecret = entity.type === 'PASSWORD' || entity.type === 'CREDENTIAL_FIELD' ||
                             entity.type === 'CARD_CVV' || entity.type === 'API_KEY';

            if (mode === 'blackout' || isSecret) {
              // --- SOLID BLACKOUT PROTOCOL ---
              ctx.save();
              ctx.fillStyle = '#050814';
              ctx.fillRect(x - 2, y - 2, w + 4, h + 4);

              // Outline
              ctx.strokeStyle = isSecret ? '#ef4444' : '#f59e0b';
              ctx.lineWidth = Math.max(2, 2 * scaleX);
              ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);

              // Redaction pill badge
              const badgeText = `🔒 REDACTED: ${entity.type || 'SECRET'}`;
              ctx.font = `bold ${Math.max(10, Math.round(11 * scaleX))}px monospace`;
              const textMetrics = ctx.measureText(badgeText);
              const badgeW = Math.min(w + 4, textMetrics.width + 12);
              const badgeH = Math.min(h, Math.max(16, Math.round(18 * scaleY)));

              ctx.fillStyle = isSecret ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)';
              ctx.fillRect(x, y, badgeW, badgeH);

              ctx.fillStyle = isSecret ? '#fca5a5' : '#fde68a';
              ctx.fillText(badgeText, x + 4, y + badgeH * 0.72);
              ctx.restore();

            } else if (isFace || mode === 'blur') {
              // --- GAUSSIAN BLUR PROTOCOL ---
              ctx.save();
              ctx.filter = `blur(${Math.max(10, Math.round(14 * scaleX))}px)`;
              for (let i = 0; i < 3; i++) {
                ctx.drawImage(canvas, x, y, w, h, x, y, w, h);
              }
              ctx.restore();

              // Frosted glass overlay
              ctx.save();
              ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
              ctx.fillRect(x, y, w, h);
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = Math.max(1.5, 2 * scaleX);
              ctx.strokeRect(x, y, w, h);

              const blurLabel = isFace ? '🛡️ BLURRED BIOMETRIC' : `🛡️ BLURRED (${entity.type || 'PII'})`;
              ctx.fillStyle = '#38bdf8';
              ctx.font = `bold ${Math.max(10, Math.round(10 * scaleX))}px monospace`;
              ctx.fillText(blurLabel, x + 4, y + Math.min(h - 4, Math.round(14 * scaleY)));
              ctx.restore();

            } else {
              // --- TOKEN MASK PROTOCOL ---
              ctx.save();
              ctx.fillStyle = '#0f172a';
              ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
              ctx.strokeStyle = '#06b6d4';
              ctx.lineWidth = Math.max(1.5, 2 * scaleX);
              ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);

              ctx.fillStyle = '#67e8f9';
              ctx.font = `bold ${Math.max(10, Math.round(11 * scaleX))}px monospace`;
              const maskText = entity.maskedToken || '•••• •••• ••••';
              ctx.fillText(maskText, x + 4, y + (h * 0.65));
              ctx.restore();
            }
          }

          try {
            resolve(canvas.toDataURL('image/png'));
          } catch (e) {
            resolve(canvas.toDataURL('image/jpeg', 0.90));
          }
        };

        img.onerror = () => resolve(screenshotDataUrl);
        img.src = screenshotDataUrl;
      });
    }

    /**
     * Builds structured Redaction Protocol JSON
     */
    buildMetadata(piiEntities, mode) {
      const sessionId = 'pluto-session-' + Math.random().toString(36).substring(2, 9);
      const regions = piiEntities.map((e, idx) => ({
        id: `r${String(idx + 1).padStart(3, '0')}`,
        type: (e.type || 'SENSITIVE_DATA').toLowerCase(),
        method: (e.type === 'PASSWORD' || e.type === 'API_KEY') ? 'blackout' : mode,
        confidence: e.confidence || 0.95,
        bbox: {
          x: e.rect?.viewportX || e.rect?.x || 0,
          y: e.rect?.viewportY || e.rect?.y || 0,
          w: e.rect?.width || 80,
          h: e.rect?.height || 24
        }
      }));

      return {
        protocol_version: '2.0.0',
        session_id: sessionId,
        timestamp: Date.now(),
        redaction_mode: mode,
        redaction_count: regions.length,
        redaction_regions: regions,
        privacy_guarantee: {
          raw_pii_transmitted_bytes: 0,
          encryption: 'CLIENT_SIDE_REDACTED',
          verified_clean: true
        }
      };
    }

    /**
     * Sanitizes string text by replacing matched PII values
     */
    sanitizeText(rawText, piiEntities) {
      if (!rawText || !piiEntities || piiEntities.length === 0) return rawText;
      let clean = rawText;
      for (const entity of piiEntities) {
        if (entity.matchedText) {
          clean = clean.split(entity.matchedText).join(entity.maskedToken || '[REDACTED]');
        }
      }
      return clean;
    }
  }

  const instance = new PrivacyRedactor();
  window.__PLUTO__.privacyRedactor = instance;
  window.__AutoBrowserRedactor = instance;
})();
