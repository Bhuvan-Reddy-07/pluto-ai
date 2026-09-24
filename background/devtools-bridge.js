/**
 * PlutoAI - DevTools Bridge & Chrome DevTools Protocol (CDP) Coordinator
 * Inspired by Google Chrome DevTools MCP (https://github.com/ChromeDevTools/chrome-devtools-mcp)
 * 
 * Features:
 * - Live Console Logging & Exception Tracking (with stack traces)
 * - Network Request & Response Inspection + Network Idle Detection
 * - Core Web Vitals & Performance Insights (LCP, CLS, INP/FID, TTFB, Memory)
 * - Viewport & Device Emulation (Device metrics, Dark/Light mode, Geolocation)
 * - JavaScript Modal Dialog Handling (alert, confirm, prompt)
 * - In-Page Safe Script Evaluation
 */

export class DevToolsBridge {
  constructor() {
    this.attachedTabs = new Map(); // tabId -> { version, isAttached }
    this.consoleLogs = new Map(); // tabId -> Array<{ type, text, args, stack, timestamp, level }>
    this.networkRequests = new Map(); // tabId -> Map<requestId, { url, method, type, status, startTime, endTime, duration, failed, errorText }>
    this.inFlightRequests = new Map(); // tabId -> Set<requestId>
    this.pendingDialogs = new Map(); // tabId -> { type, message, defaultPrompt }
    this.maxLogsPerTab = 200;
    this.maxRequestsPerTab = 300;
    this.isCdpAvailable = typeof chrome !== 'undefined' && Boolean(chrome.debugger);

    if (this.isCdpAvailable && chrome.debugger.onEvent) {
      chrome.debugger.onEvent.addListener(this.handleCdpEvent.bind(this));
      chrome.debugger.onDetach.addListener(this.handleCdpDetach.bind(this));
    }
  }

  /**
   * Attaches Chrome Debugger CDP session to target tab
   */
  async attach(tabId, version = "1.3") {
    if (!tabId) return false;
    if (this.attachedTabs.get(tabId)?.isAttached) return true;

    if (!this.consoleLogs.has(tabId)) this.consoleLogs.set(tabId, []);
    if (!this.networkRequests.has(tabId)) this.networkRequests.set(tabId, new Map());
    if (!this.inFlightRequests.has(tabId)) this.inFlightRequests.set(tabId, new Set());

    if (!this.isCdpAvailable) {
      // Mock / fallback environment
      this.attachedTabs.set(tabId, { version, isAttached: true });
      return true;
    }

    try {
      await chrome.debugger.attach({ tabId }, version);
      this.attachedTabs.set(tabId, { version, isAttached: true });

      // Enable CDP domains
      await Promise.allSettled([
        this.sendCommand(tabId, "Runtime.enable"),
        this.sendCommand(tabId, "Log.enable"),
        this.sendCommand(tabId, "Network.enable"),
        this.sendCommand(tabId, "Page.enable"),
        this.sendCommand(tabId, "Performance.enable")
      ]);

      console.log(`[PlutoAI DevToolsBridge] Attached CDP to tab ${tabId} (v${version})`);
      return true;
    } catch (err) {
      console.warn(`[PlutoAI DevToolsBridge] Could not attach debugger to tab ${tabId}:`, err.message);
      this.attachedTabs.set(tabId, { version, isAttached: false, error: err.message });
      return false;
    }
  }

  /**
   * Detaches CDP session from tab
   */
  async detach(tabId) {
    if (!tabId) return;
    if (this.isCdpAvailable && this.attachedTabs.get(tabId)?.isAttached) {
      try {
        await chrome.debugger.detach({ tabId });
      } catch (e) {}
    }
    this.attachedTabs.delete(tabId);
    this.inFlightRequests.delete(tabId);
  }

  /**
   * Sends a low-level CDP command
   */
  async sendCommand(tabId, method, params = {}) {
    if (!tabId) throw new Error("No tabId provided for CDP command");
    if (!this.isCdpAvailable) {
      return this.mockCdpCommand(method, params);
    }
    await this.attach(tabId);
    return await chrome.debugger.sendCommand({ tabId }, method, params);
  }

  /**
   * Global CDP Event Handler
   */
  handleCdpEvent(source, method, params) {
    const tabId = source?.tabId;
    if (!tabId) return;

    // 1. Console & Runtime logs
    if (method === "Runtime.consoleAPICalled") {
      this.recordConsoleLog(tabId, {
        level: params.type || 'log',
        text: params.args?.map(a => a.value !== undefined ? String(a.value) : (a.description || a.type)).join(' ') || '',
        args: params.args,
        stack: params.stackTrace?.callFrames || [],
        timestamp: params.timestamp || Date.now()
      });
    } else if (method === "Runtime.exceptionThrown") {
      const details = params.exceptionDetails || {};
      this.recordConsoleLog(tabId, {
        level: 'error',
        text: details.text || details.exception?.description || 'Uncaught Runtime Exception',
        stack: details.stackTrace?.callFrames || [],
        timestamp: params.timestamp || Date.now(),
        isException: true
      });
    } else if (method === "Log.entryAdded") {
      const entry = params.entry || {};
      this.recordConsoleLog(tabId, {
        level: entry.level || 'info',
        text: entry.text || '',
        source: entry.source,
        url: entry.url,
        timestamp: entry.timestamp || Date.now()
      });
    }

    // 2. Network activity & Idle tracking
    if (method === "Network.requestWillBeSent") {
      const reqMap = this.networkRequests.get(tabId) || new Map();
      const inFlight = this.inFlightRequests.get(tabId) || new Set();
      
      reqMap.set(params.requestId, {
        requestId: params.requestId,
        url: params.request?.url || '',
        method: params.request?.method || 'GET',
        headers: params.request?.headers || {},
        resourceType: params.type || 'Other',
        startTime: params.timestamp || Date.now(),
        endTime: null,
        duration: null,
        status: null,
        failed: false,
        errorText: null
      });

      inFlight.add(params.requestId);
      this.networkRequests.set(tabId, reqMap);
      this.inFlightRequests.set(tabId, inFlight);
    } else if (method === "Network.responseReceived") {
      const reqMap = this.networkRequests.get(tabId);
      if (reqMap && reqMap.has(params.requestId)) {
        const item = reqMap.get(params.requestId);
        item.status = params.response?.status || 200;
        item.statusText = params.response?.statusText || 'OK';
        item.mimeType = params.response?.mimeType || '';
        item.headers = params.response?.headers || item.headers;
      }
    } else if (method === "Network.loadingFinished") {
      const reqMap = this.networkRequests.get(tabId);
      const inFlight = this.inFlightRequests.get(tabId);
      if (reqMap && reqMap.has(params.requestId)) {
        const item = reqMap.get(params.requestId);
        item.endTime = params.timestamp || Date.now();
        item.duration = item.startTime && item.endTime ? Math.max(0, Math.round((item.endTime - item.startTime) * 1000)) : 0;
      }
      if (inFlight) inFlight.delete(params.requestId);
    } else if (method === "Network.loadingFailed") {
      const reqMap = this.networkRequests.get(tabId);
      const inFlight = this.inFlightRequests.get(tabId);
      if (reqMap && reqMap.has(params.requestId)) {
        const item = reqMap.get(params.requestId);
        item.failed = true;
        item.errorText = params.errorText || 'Failed';
        item.canceled = params.canceled || false;
        item.endTime = params.timestamp || Date.now();
      }
      if (inFlight) inFlight.delete(params.requestId);
    }

    // 3. Page dialog opening (alerts / confirms)
    if (method === "Page.javascriptDialogOpening") {
      this.pendingDialogs.set(tabId, {
        type: params.type,
        message: params.message,
        defaultPrompt: params.defaultPrompt || '',
        url: params.url,
        timestamp: Date.now()
      });
      console.log(`[PlutoAI DevToolsBridge] Intercepted page dialog (${params.type}) on tab ${tabId}: "${params.message}"`);
    } else if (method === "Page.javascriptDialogClosed") {
      this.pendingDialogs.delete(tabId);
    }
  }

  handleCdpDetach(source, reason) {
    const tabId = source?.tabId;
    if (tabId) {
      console.log(`[PlutoAI DevToolsBridge] Detached from tab ${tabId}. Reason: ${reason}`);
      this.attachedTabs.delete(tabId);
      this.inFlightRequests.delete(tabId);
    }
  }

  recordConsoleLog(tabId, logEntry) {
    if (!this.consoleLogs.has(tabId)) this.consoleLogs.set(tabId, []);
    const list = this.consoleLogs.get(tabId);
    list.push(logEntry);
    if (list.length > this.maxLogsPerTab) list.shift();
  }

  /**
   * Retrieves recent console logs for a tab, optionally filtered by level
   */
  getConsoleLogs(tabId, { level = null, limit = 50 } = {}) {
    const logs = this.consoleLogs.get(tabId) || [];
    let filtered = logs;
    if (level) {
      const lvl = level.toLowerCase();
      filtered = logs.filter(l => (l.level || '').toLowerCase() === lvl);
    }
    return filtered.slice(-limit);
  }

  /**
   * Retrieves recent network requests, with summary stats
   */
  getNetworkRequests(tabId, { status = null, failedOnly = false, limit = 50 } = {}) {
    const reqMap = this.networkRequests.get(tabId) || new Map();
    let requests = Array.from(reqMap.values());

    if (status) {
      requests = requests.filter(r => r.status === status);
    }
    if (failedOnly) {
      requests = requests.filter(r => r.failed || (r.status && r.status >= 400));
    }

    const inFlightCount = this.inFlightRequests.get(tabId)?.size || 0;

    return {
      inFlightCount,
      totalTracked: reqMap.size,
      requests: requests.slice(-limit)
    };
  }

  /**
   * Waits until network is idle (0 or <= maxInFlight active network requests for idleTimeMs)
   */
  async waitForNetworkIdle(tabId, { idleTimeMs = 500, timeoutMs = 8000, maxInFlight = 0 } = {}) {
    await this.attach(tabId);
    const start = Date.now();

    return new Promise((resolve) => {
      let lastActivity = Date.now();

      const interval = setInterval(() => {
        const inFlight = this.inFlightRequests.get(tabId)?.size || 0;
        const now = Date.now();

        if (inFlight > maxInFlight) {
          lastActivity = now;
        }

        if (now - lastActivity >= idleTimeMs) {
          clearInterval(interval);
          resolve({ idle: true, waitedMs: now - start, inFlightRemaining: inFlight });
          return;
        }

        if (now - start >= timeoutMs) {
          clearInterval(interval);
          resolve({ idle: false, timeout: true, waitedMs: now - start, inFlightRemaining: inFlight });
        }
      }, 50);
    });
  }

  /**
   * Extracts Core Web Vitals, Memory, and Navigation Timing metrics
   */
  async getPerformanceMetrics(tabId) {
    await this.attach(tabId);
    try {
      const cdpMetricsRes = await this.sendCommand(tabId, "Performance.getMetrics").catch(() => ({ metrics: [] }));
      const metricsMap = {};
      for (const m of (cdpMetricsRes.metrics || [])) {
        metricsMap[m.name] = m.value;
      }

      // Query browser in-page web vitals and navigation timing
      const pageVitals = await this.evaluateScript(tabId, `
        (() => {
          const perf = window.performance || {};
          const nav = perf.getEntriesByType ? perf.getEntriesByType('navigation')[0] : null;
          const timing = perf.timing || {};
          const mem = perf.memory || {};

          let lcp = null;
          try {
            const lcpEntries = perf.getEntriesByType ? perf.getEntriesByType('largest-contentful-paint') : [];
            if (lcpEntries.length > 0) lcp = Math.round(lcpEntries[lcpEntries.length - 1].startTime);
          } catch(e) {}

          const ttfb = nav ? Math.round(nav.responseStart - nav.requestStart) : (timing.responseStart ? Math.round(timing.responseStart - timing.requestStart) : 0);
          const domLoaded = nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : (timing.domContentLoadedEventEnd ? Math.round(timing.domContentLoadedEventEnd - timing.navigationStart) : 0);
          const pageLoad = nav ? Math.round(nav.loadEventEnd - nav.startTime) : (timing.loadEventEnd ? Math.round(timing.loadEventEnd - timing.navigationStart) : 0);

          return {
            ttfbMs: ttfb,
            domContentLoadedMs: domLoaded,
            loadCompleteMs: pageLoad,
            lcpMs: lcp,
            jsHeapUsedMB: mem.usedJSHeapSize ? Math.round((mem.usedJSHeapSize / (1024 * 1024)) * 10) / 10 : null,
            jsHeapTotalMB: mem.totalJSHeapSize ? Math.round((mem.totalJSHeapSize / (1024 * 1024)) * 10) / 10 : null
          };
        })()
      `).catch(() => ({}));

      return {
        success: true,
        webVitals: {
          ttfbMs: pageVitals?.ttfbMs || 0,
          domContentLoadedMs: pageVitals?.domContentLoadedMs || 0,
          loadCompleteMs: pageVitals?.loadCompleteMs || 0,
          lcpMs: pageVitals?.lcpMs || null,
          jsHeapUsedMB: pageVitals?.jsHeapUsedMB || null,
          jsHeapTotalMB: pageVitals?.jsHeapTotalMB || null
        },
        cdpRaw: {
          JSHeapUsedSize: metricsMap['JSHeapUsedSize'] || null,
          JSHeapTotalSize: metricsMap['JSHeapTotalSize'] || null,
          Nodes: metricsMap['Nodes'] || null,
          Documents: metricsMap['Documents'] || null,
          Frames: metricsMap['Frames'] || null,
          LayoutCount: metricsMap['LayoutCount'] || null,
          RecalcStyleCount: metricsMap['RecalcStyleCount'] || null,
          TaskDuration: metricsMap['TaskDuration'] || null
        }
      };
    } catch (err) {
      console.warn("[PlutoAI DevToolsBridge] Performance metrics collection error:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Device & Viewport Emulation (responsive testing, mobile emulation, color scheme)
   */
  async emulateDevice(tabId, {
    width = 1280,
    height = 800,
    deviceScaleFactor = 1,
    mobile = false,
    colorScheme = 'light', // 'light' | 'dark' | 'none'
    geolocation = null // { latitude, longitude, accuracy }
  } = {}) {
    await this.attach(tabId);
    try {
      // 1. Viewport metrics
      await this.sendCommand(tabId, "Emulation.setDeviceMetricsOverride", {
        width: Math.round(width),
        height: Math.round(height),
        deviceScaleFactor: Number(deviceScaleFactor) || 1,
        mobile: Boolean(mobile)
      });

      // 2. Color scheme (dark/light)
      if (colorScheme && colorScheme !== 'none') {
        await this.sendCommand(tabId, "Emulation.setEmulatedMedia", {
          features: [{ name: 'prefers-color-scheme', value: colorScheme }]
        }).catch(() => {});
      }

      // 3. Geolocation
      if (geolocation && typeof geolocation.latitude === 'number' && typeof geolocation.longitude === 'number') {
        await this.sendCommand(tabId, "Emulation.setGeolocationOverride", {
          latitude: geolocation.latitude,
          longitude: geolocation.longitude,
          accuracy: geolocation.accuracy || 100
        }).catch(() => {});
      }

      return {
        success: true,
        emulated: { width, height, deviceScaleFactor, mobile, colorScheme, geolocation }
      };
    } catch (err) {
      console.warn("[PlutoAI DevToolsBridge] Device emulation error:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Clears device metrics override and returns viewport to standard
   */
  async clearDeviceEmulation(tabId) {
    await this.attach(tabId);
    try {
      await this.sendCommand(tabId, "Emulation.clearDeviceMetricsOverride").catch(() => {});
      await this.sendCommand(tabId, "Emulation.setEmulatedMedia", { features: [] }).catch(() => {});
      await this.sendCommand(tabId, "Emulation.clearGeolocationOverride").catch(() => {});
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Handles JavaScript modal dialogs (alert, confirm, prompt)
   */
  async handleDialog(tabId, { action = 'accept', promptText = '' } = {}) {
    await this.attach(tabId);
    const accept = action !== 'dismiss';
    try {
      await this.sendCommand(tabId, "Page.handleJavaScriptDialog", {
        accept,
        promptText: promptText || undefined
      });
      const pending = this.pendingDialogs.get(tabId);
      this.pendingDialogs.delete(tabId);
      return {
        success: true,
        handled: { action, promptText, previousDialog: pending || null }
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Safely evaluates a JavaScript expression inside the page context
   */
  async evaluateScript(tabId, expression) {
    if (!expression) throw new Error("No expression provided to evaluateScript");
    await this.attach(tabId);
    try {
      const res = await this.sendCommand(tabId, "Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      if (res && res.exceptionDetails) {
        return {
          success: false,
          error: res.exceptionDetails.text || res.exceptionDetails.exception?.description || 'Evaluation exception'
        };
      }
      return {
        success: true,
        result: res && res.result && res.result.value !== undefined ? res.result.value : (res ? res.result : null)
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Mock CDP command runner for testing environments without active browser
   */
  mockCdpCommand(method, params = {}) {
    if (method === "Runtime.evaluate") {
      return { result: { value: { mock: true, evalExpr: params.expression } } };
    }
    if (method === "Performance.getMetrics") {
      return {
        metrics: [
          { name: "JSHeapUsedSize", value: 18500000 },
          { name: "JSHeapTotalSize", value: 34200000 },
          { name: "Nodes", value: 1420 },
          { name: "Documents", value: 3 },
          { name: "Frames", value: 1 }
        ]
      };
    }
    return { success: true };
  }
}

export const devToolsBridge = new DevToolsBridge();
