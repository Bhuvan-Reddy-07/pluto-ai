/**
 * Privacy Vision Agent - Content Script DOM Listener
 * Injected into active pages to extract interactive DOM elements and bounding boxes.
 */

(function () {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'GET_DOM') {
      try {
        const elements = extractDOMElements();
        sendResponse({ success: true, elements, title: document.title, url: window.location.href });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    }
    return true; // Keep asynchronous channel open
  });

  function extractDOMElements() {
    const candidates = document.querySelectorAll(
      'a, button, input, textarea, select, [role="button"], [role="link"], [role="textbox"], [role="checkbox"], [tabindex]:not([tabindex="-1"])'
    );

    const extracted = [];
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    candidates.forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      // Filter out zero-size or completely offscreen elements
      if (rect.width === 0 || rect.height === 0) return;
      if (rect.bottom < 0 || rect.top > viewportHeight || rect.right < 0 || rect.left > viewportWidth) return;

      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;

      extracted.push({
        index: index + 1,
        tag: el.tagName.toLowerCase(),
        id: el.id || '',
        type: el.type || el.getAttribute('type') || '',
        name: el.name || el.getAttribute('name') || '',
        placeholder: el.placeholder || el.getAttribute('placeholder') || '',
        textContent: (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
        ariaLabel: el.getAttribute('aria-label') || '',
        role: el.getAttribute('role') || '',
        bbox: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          w: Math.round(rect.width),
          h: Math.round(rect.height)
        }
      });
    });

    return extracted;
  }
})();
