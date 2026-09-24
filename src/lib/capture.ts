/**
 * Screen Capture & DOM Extraction Module
 * Captures the current visible tab screenshot and extracts DOM interactive elements.
 */

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DOMElement {
  index: number;
  tag: string;
  id: string;
  type: string;
  name: string;
  placeholder: string;
  textContent: string;
  ariaLabel: string;
  role: string;
  bbox: BBox;
}

export interface CapturedContext {
  tabId: number;
  title: string;
  url: string;
  screenshotBase64: string;
  domElements: DOMElement[];
  screenSize: { w: number; h: number };
  timestamp: number;
}

export class ScreenCapture {
  private static lastCaptureTime = 0;
  private static readonly THROTTLE_MS = 500; // 2fps throttle

  public static async captureCurrentTab(): Promise<CapturedContext> {
    const now = Date.now();
    const timeSinceLast = now - this.lastCaptureTime;
    if (timeSinceLast < this.THROTTLE_MS) {
      await new Promise(resolve => setTimeout(resolve, this.THROTTLE_MS - timeSinceLast));
    }
    this.lastCaptureTime = Date.now();

    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab || !activeTab.id) {
      throw new Error("No active browser tab found.");
    }

    // 1. Capture Visible Tab Screenshot
    const screenshotDataUrl = await chrome.tabs.captureVisibleTab(activeTab.windowId, {
      format: 'png'
    });

    // 2. Extract DOM Elements via Message to Content Script or executeScript
    let domElements: DOMElement[] = [];
    let pageTitle = activeTab.title || 'ISRO Classified Portal';
    let pageUrl = activeTab.url || '';

    try {
      const response = await chrome.tabs.sendMessage(activeTab.id, { type: 'GET_DOM' });
      if (response && response.success && Array.isArray(response.elements)) {
        domElements = response.elements;
        if (response.title) pageTitle = response.title;
        if (response.url) pageUrl = response.url;
      }
    } catch (e) {
      // Content script may not be loaded yet; fallback via scripting API
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: activeTab.id },
          func: () => {
            const candidates = document.querySelectorAll(
              'a, button, input, textarea, select, [role="button"], [role="link"], [role="textbox"], [tabindex]:not([tabindex="-1"])'
            );
            const list: any[] = [];
            candidates.forEach((el, index) => {
              const r = el.getBoundingClientRect();
              if (r.width === 0 || r.height === 0) return;
              list.push({
                index: index + 1,
                tag: el.tagName.toLowerCase(),
                id: el.id || '',
                type: (el as HTMLInputElement).type || '',
                name: (el as HTMLInputElement).name || '',
                placeholder: (el as HTMLInputElement).placeholder || '',
                textContent: ((el as HTMLElement).innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
                ariaLabel: el.getAttribute('aria-label') || '',
                role: el.getAttribute('role') || '',
                bbox: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
              });
            });
            return { elements: list, title: document.title, url: window.location.href };
          }
        });
        if (results && results[0] && results[0].result) {
          domElements = results[0].result.elements || [];
          pageTitle = results[0].result.title || pageTitle;
          pageUrl = results[0].result.url || pageUrl;
        }
      } catch (err) {
        console.warn("[ScreenCapture] DOM extraction fallback warning:", err);
      }
    }

    return {
      tabId: activeTab.id,
      title: pageTitle,
      url: pageUrl,
      screenshotBase64: screenshotDataUrl,
      domElements,
      screenSize: { w: activeTab.width || 1536, h: activeTab.height || 730 },
      timestamp: Date.now()
    };
  }
}
