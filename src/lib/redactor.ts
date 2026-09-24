/**
 * Canvas 2D Redaction Engine
 * Applies local pixel redactions (Gaussian blur, blackout, partial mask) with tight bounding boxes.
 */

import { PIIRegion } from './pii_detector';

export class RedactionEngine {
  public static async redact(
    screenshotBase64: string,
    regions: PIIRegion[]
  ): Promise<{ sanitizedBase64: string; redactDurationMs: number }> {
    const startTime = performance.now();

    if (!regions || regions.length === 0) {
      return {
        sanitizedBase64: screenshotBase64,
        redactDurationMs: Math.round(performance.now() - startTime)
      };
    }

    const sanitizedBase64 = await new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(screenshotBase64);
          return;
        }

        // Draw original base image
        ctx.drawImage(img, 0, 0);

        for (const region of regions) {
          const { x, y, w, h } = region.bbox;
          if (w <= 0 || h <= 0) continue;

          // 1. Blackout Redaction
          if (region.method === 'blackout') {
            ctx.fillStyle = '#050811';
            ctx.fillRect(x - 2, y - 2, w + 4, h + 4);

            // Red border
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);

            // Redacted Label
            ctx.fillStyle = '#fca5a5';
            ctx.font = 'bold 11px monospace';
            ctx.fillText('[ REDACTED ]', x + 6, y + Math.min(h / 2 + 4, h - 4));
          }
          // 2. Gaussian Blur (3-Pass Box Blur Approximation)
          else if (region.method === 'gaussian_blur') {
            ctx.save();
            ctx.filter = 'blur(10px)';
            ctx.drawImage(canvas, x, y, w, h, x, y, w, h);
            ctx.restore();

            // Glass Overlay Border
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x, y, w, h);

            ctx.fillStyle = '#38bdf8';
            ctx.font = 'bold 10px monospace';
            ctx.fillText('[ BLURRED ]', x + 4, y + Math.min(h / 2 + 4, h - 4));
          }
          // 3. Partial Mask Redaction
          else {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.fillRect(x, y, w, h);

            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x, y, w, h);

            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 11px monospace';
            ctx.fillText(region.maskedSample || '•••• •••• ••••', x + 6, y + (h / 2 + 4));
          }
        }

        resolve(canvas.toDataURL('image/png'));
      };

      img.onerror = () => resolve(screenshotBase64);
      img.src = screenshotBase64;
    });

    const redactDurationMs = Math.round(performance.now() - startTime);

    return {
      sanitizedBase64,
      redactDurationMs
    };
  }
}
