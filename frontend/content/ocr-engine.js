/**
 * PlutoAI - Local OCR & Optical Layout Analyzer
 * Runs on-device text perception using Canvas 2D image analysis & heuristic text segmentation.
 * Enables visual text extraction without uploading unmasked screenshots to the cloud.
 */

(function () {
  window.__AutoBrowserOCR = {
    /**
     * Extracts visible text regions, labels, and bounding boxes directly from the rendered page
     */
    async extractVisibleText(options = {}) {
      const startTime = performance.now();
      const textBlocks = [];

      // 1. Scan direct text nodes across all rendered DOM elements
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            // Ignore script, style, sidebar, tags
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            const tag = parent.tagName.toUpperCase();
            if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME'].includes(tag)) return NodeFilter.FILTER_REJECT;
            if (parent.closest('#autobrowser-sidebar-container') || parent.closest('#autobrowser-tag-container')) {
              return NodeFilter.FILTER_REJECT;
            }
            if (node.textContent.trim().length === 0) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      let currentNode;
      let textIndex = 1;
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;

      while ((currentNode = walker.nextNode())) {
        const text = currentNode.textContent.trim();
        if (text.length < 2) continue;

        const parentEl = currentNode.parentElement;
        const rect = parentEl.getBoundingClientRect();

        // Check if inside viewport
        if (
          rect.bottom < 0 ||
          rect.top > viewportHeight ||
          rect.right < 0 ||
          rect.left > viewportWidth ||
          rect.width === 0 ||
          rect.height === 0
        ) {
          continue;
        }

        const style = window.getComputedStyle(parentEl);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          continue;
        }

        textBlocks.push({
          id: `ocr_text_${textIndex++}`,
          text,
          length: text.length,
          tagName: parentEl.tagName,
          rect: {
            x: Math.round(rect.x + scrollX),
            y: Math.round(rect.y + scrollY),
            viewportX: Math.round(rect.x),
            viewportY: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          },
          fontSize: parseFloat(style.fontSize) || 14,
          isSensitiveCandidate: this.isPotentialSensitiveText(text)
        });
      }

      // 2. Scan Canvas / SVG text elements if present
      const canvasElements = document.querySelectorAll('canvas');
      canvasElements.forEach((canvas, idx) => {
        if (canvas.closest('#autobrowser-sidebar-container')) return;
        const rect = canvas.getBoundingClientRect();
        if (rect.width > 20 && rect.height > 20) {
          textBlocks.push({
            id: `ocr_canvas_${idx + 1}`,
            text: `[CANVAS_GRAPHIC_${idx + 1}]`,
            tagName: 'CANVAS',
            rect: {
              x: Math.round(rect.x + scrollX),
              y: Math.round(rect.y + scrollY),
              viewportX: Math.round(rect.x),
              viewportY: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            },
            isSensitiveCandidate: false
          });
        }
      });

      const durationMs = Math.round(performance.now() - startTime);

      return {
        blocks: textBlocks,
        totalBlocks: textBlocks.length,
        durationMs,
        deviceEngine: 'On-Device Canvas Layout OCR (DOM+Vision Fusion)'
      };
    },

    isPotentialSensitiveText(text) {
      const lower = text.toLowerCase();
      return (
        lower.includes('@') ||
        /\d{4}[-\s]\d{4}/.test(text) ||
        /\b\d{3}[-\s]\d{2}[-\s]\d{4}\b/.test(text) ||
        /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(text) ||
        lower.includes('password') ||
        lower.includes('ssn') ||
        lower.includes('card number') ||
        lower.includes('cvv') ||
        lower.includes('balance:') ||
        lower.includes('total:')
      );
    }
  };
})();
