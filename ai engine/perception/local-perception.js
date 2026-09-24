/**
 * PlutoAI - Local Perception Aggregator & Adaptive Resolution Engine
 * Fuses DOM structure, ARIA landmarks, Local OCR, and Set-of-Marks visual tagging with WebGPU detection.
 */

(function () {
  window.__AutoBrowserPerception = {
    webgpuSupported: false,

    async init() {
      if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
        try {
          const adapter = await navigator.gpu.requestAdapter();
          this.webgpuSupported = Boolean(adapter);
        } catch (e) {
          this.webgpuSupported = false;
        }
      }
    },

    /**
     * Executes complete local perception pass
     */
    async runPerceptionPass(options = {}) {
      const startTime = performance.now();
      await this.init();

      // 1. DOM Indexing & Tag Injection
      const domResult = window.__AutoBrowserDOM ? window.__AutoBrowserDOM.indexAndTagElements() : { url: window.location.href, title: document.title, tags: [] };

      // 2. Local OCR Text Extraction
      let ocrResult = { blocks: [], totalBlocks: 0, durationMs: 0 };
      if (window.__AutoBrowserOCR) {
        ocrResult = await window.__AutoBrowserOCR.extractVisibleText();
      }

      // 3. Multi-layer PII Detection
      let piiResult = { entities: [], totalDetected: 0, durationMs: 0 };
      if (window.__AutoBrowserPII) {
        piiResult = await window.__AutoBrowserPII.scanPage();
      }

      // 4. Adaptive resolution calculation based on DOM complexity
      const domCount = domResult.tags ? domResult.tags.length : 0;
      let adaptiveScale = 1.0;
      if (domCount > 150) {
        adaptiveScale = 0.75; // Downscale to save memory and token budget
      } else if (domCount > 80) {
        adaptiveScale = 0.85;
      }

      const totalDurationMs = Math.round(performance.now() - startTime);

      return {
        dom: domResult,
        ocr: ocrResult,
        pii: piiResult,
        adaptiveResolution: {
          scale: adaptiveScale,
          originalWidth: window.innerWidth,
          originalHeight: window.innerHeight,
          scaledWidth: Math.round(window.innerWidth * adaptiveScale),
          scaledHeight: Math.round(window.innerHeight * adaptiveScale)
        },
        webgpuAccelerated: this.webgpuSupported,
        durationMs: totalDurationMs
      };
    }
  };
})();
