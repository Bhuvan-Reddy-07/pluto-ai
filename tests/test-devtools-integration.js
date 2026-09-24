/**
 * PlutoAI - Chrome DevTools & CDP Capabilities Verification Suite
 * Tests DevToolsBridge, CDP diagnostics, Network Idle, Console Logs,
 * Emulation, Web Vitals, and Skill Verification Contracts.
 */

import { devToolsBridge, DevToolsBridge } from '../background/devtools-bridge.js';
import { SKILL_CATEGORIES, SKILL_DEFINITIONS, verifySkillResult } from '../shared/skills.js';
import { ActionValidator } from '../background/action-validator.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log("\n========================================");
console.log(" PlutoAI - Chrome DevTools MCP Integration Tests");
console.log("========================================\n");

// --- Suite 1: DevTools Skills Definition & Categorization ---
console.log("--- Suite 1: DevTools Skills Definition & Categorization ---");
assert(SKILL_CATEGORIES.DEVTOOLS === 'devtools', "SKILL_CATEGORIES contains DEVTOOLS");
assert(SKILL_DEFINITIONS.inspect_console_logs !== undefined, "inspect_console_logs skill is defined");
assert(SKILL_DEFINITIONS.inspect_console_logs.category === 'devtools', "inspect_console_logs belongs to devtools category");
assert(SKILL_DEFINITIONS.inspect_console_logs.requiresCdp === true, "inspect_console_logs requires CDP");

assert(SKILL_DEFINITIONS.inspect_network_activity !== undefined, "inspect_network_activity skill is defined");
assert(SKILL_DEFINITIONS.wait_for_network_idle !== undefined, "wait_for_network_idle skill is defined");
assert(SKILL_DEFINITIONS.emulate_device !== undefined, "emulate_device skill is defined");
assert(SKILL_DEFINITIONS.get_performance_insights !== undefined, "get_performance_insights skill is defined");
assert(SKILL_DEFINITIONS.handle_dialog !== undefined, "handle_dialog skill is defined");
assert(SKILL_DEFINITIONS.evaluate_script !== undefined, "evaluate_script skill is defined");

// --- Suite 2: DevToolsBridge Console & Exception Tracking ---
console.log("\n--- Suite 2: DevToolsBridge Console & Exception Tracking ---");
const bridge = new DevToolsBridge();
const testTabId = 9991;

// Simulate CDP attach
await bridge.attach(testTabId);
assert(bridge.attachedTabs.has(testTabId), "DevToolsBridge attached to test tab");

// Simulate Console Logs via CDP events
bridge.handleCdpEvent({ tabId: testTabId }, "Runtime.consoleAPICalled", {
  type: 'log',
  args: [{ value: 'Page initialized successfully' }],
  timestamp: 1000
});

bridge.handleCdpEvent({ tabId: testTabId }, "Runtime.consoleAPICalled", {
  type: 'warn',
  args: [{ value: 'Deprecated API called in form-control.js' }],
  timestamp: 1001
});

bridge.handleCdpEvent({ tabId: testTabId }, "Runtime.exceptionThrown", {
  exceptionDetails: {
    text: 'Uncaught TypeError: Cannot read property submit of null',
    stackTrace: {
      callFrames: [{ functionName: 'onSubmit', url: 'https://example.com/app.js', lineNumber: 42 }]
    }
  },
  timestamp: 1002
});

const allLogs = bridge.getConsoleLogs(testTabId);
assert(allLogs.length === 3, `Retrieved all 3 console log entries (got ${allLogs.length})`);

const errorLogs = bridge.getConsoleLogs(testTabId, { level: 'error' });
assert(errorLogs.length === 1, "Filtered error logs contains 1 uncaught exception");
assert(errorLogs[0].text.includes('TypeError'), "Error log contains exception description");
assert(errorLogs[0].stack.length > 0, "Error log contains stack frames");

// --- Suite 3: DevToolsBridge Network Activity & Idle Detection ---
console.log("\n--- Suite 3: DevToolsBridge Network Activity & Idle Detection ---");
bridge.handleCdpEvent({ tabId: testTabId }, "Network.requestWillBeSent", {
  requestId: 'req_1',
  request: { url: 'https://api.example.com/v1/auth', method: 'POST' },
  type: 'XHR',
  timestamp: 2000
});

bridge.handleCdpEvent({ tabId: testTabId }, "Network.requestWillBeSent", {
  requestId: 'req_2',
  request: { url: 'https://cdn.example.com/bundle.js', method: 'GET' },
  type: 'Script',
  timestamp: 2001
});

let netStatus = bridge.getNetworkRequests(testTabId);
assert(netStatus.inFlightCount === 2, `In-flight count tracks 2 active requests (got ${netStatus.inFlightCount})`);
assert(netStatus.totalTracked === 2, `Total tracked requests is 2`);

// Simulate response & finished
bridge.handleCdpEvent({ tabId: testTabId }, "Network.responseReceived", {
  requestId: 'req_1',
  response: { status: 200, statusText: 'OK', mimeType: 'application/json' }
});
bridge.handleCdpEvent({ tabId: testTabId }, "Network.loadingFinished", {
  requestId: 'req_1',
  timestamp: 2002
});

netStatus = bridge.getNetworkRequests(testTabId);
assert(netStatus.inFlightCount === 1, "In-flight count decremented to 1 after request 1 finished");

// Simulate failure on request 2
bridge.handleCdpEvent({ tabId: testTabId }, "Network.loadingFailed", {
  requestId: 'req_2',
  errorText: 'net::ERR_CONNECTION_REFUSED',
  timestamp: 2003
});

netStatus = bridge.getNetworkRequests(testTabId);
assert(netStatus.inFlightCount === 0, "In-flight count is 0 after all requests complete");

const failedReqs = bridge.getNetworkRequests(testTabId, { failedOnly: true });
assert(failedReqs.requests.length === 1, "failedOnly filter returns 1 failed request");
assert(failedReqs.requests[0].errorText === 'net::ERR_CONNECTION_REFUSED', "Failed request details preserved");

// Test Network Idle Waiter
const idlePromise = bridge.waitForNetworkIdle(testTabId, { idleTimeMs: 100, timeoutMs: 1000 });
const idleRes = await idlePromise;
assert(idleRes.idle === true, "waitForNetworkIdle resolved true when no requests in flight");

// --- Suite 4: Device & Viewport Emulation ---
console.log("\n--- Suite 4: Device & Viewport Emulation ---");
const emulateRes = await bridge.emulateDevice(testTabId, {
  width: 390,
  height: 844,
  deviceScaleFactor: 3,
  mobile: true,
  colorScheme: 'dark'
});
assert(emulateRes.success === true, "emulateDevice executed successfully");
assert(emulateRes.emulated.mobile === true, "Mobile emulation enabled");
assert(emulateRes.emulated.colorScheme === 'dark', "Dark color scheme emulated");

const clearEmulateRes = await bridge.clearDeviceEmulation(testTabId);
assert(clearEmulateRes.success === true, "clearDeviceEmulation returned success");

// --- Suite 5: Performance Metrics & In-Page Script Evaluation ---
console.log("\n--- Suite 5: Performance Metrics & Script Evaluation ---");
const perfRes = await bridge.getPerformanceMetrics(testTabId);
assert(perfRes.success === true, "getPerformanceMetrics executed successfully");
assert(perfRes.cdpRaw !== undefined, "cdpRaw metrics populated");

const scriptRes = await bridge.evaluateScript(testTabId, "document.title");
assert(scriptRes.success === true, "evaluateScript returned success");

// --- Suite 6: Page Modal Dialog Handling ---
console.log("\n--- Suite 6: Modal Dialog Handling ---");
bridge.handleCdpEvent({ tabId: testTabId }, "Page.javascriptDialogOpening", {
  type: 'confirm',
  message: 'Are you sure you want to proceed?',
  defaultPrompt: ''
});
assert(bridge.pendingDialogs.has(testTabId), "Pending dialog intercepted");

const dialogRes = await bridge.handleDialog(testTabId, { action: 'accept' });
assert(dialogRes.success === true, "handleDialog handled modal dialog");
assert(!bridge.pendingDialogs.has(testTabId), "Pending dialog cleared after handling");

// --- Suite 7: Structured Verifier Contracts for DevTools Skills ---
console.log("\n--- Suite 7: Structured Verifier Contracts for DevTools Skills ---");
const v1 = verifySkillResult('inspect_console_logs', {}, {}, { logs: [{ level: 'error', text: 'Boom' }] });
assert(v1.success === true, "inspect_console_logs verifier returns success");
assert(v1.observed_change.includes('1 console logs'), "inspect_console_logs observed change formatted");

const v2 = verifySkillResult('wait_for_network_idle', {}, {}, { idle: true, waitedMs: 250 });
assert(v2.success === true, "wait_for_network_idle verifier returns success");
assert(v2.observed_change.includes('Network reached idle'), "wait_for_network_idle observed change formatted");

const v3 = verifySkillResult('emulate_device', {}, {}, {
  success: true,
  emulated: { width: 375, height: 667, mobile: true, colorScheme: 'dark' }
});
assert(v3.success === true, "emulate_device verifier returns success");
assert(v3.observed_change.includes('375x667'), "emulate_device observed change formatted");

const v4 = verifySkillResult('get_performance_insights', {}, {}, {
  success: true,
  webVitals: { ttfbMs: 120, lcpMs: 800, jsHeapUsedMB: 15.2 }
});
assert(v4.success === true, "get_performance_insights verifier returns success");
assert(v4.observed_change.includes('TTFB 120ms'), "get_performance_insights observed change formatted");

const v5 = verifySkillResult('handle_dialog', {}, {}, { success: true, handled: { action: 'dismiss' } });
assert(v5.success === true, "handle_dialog verifier returns success");

const v6 = verifySkillResult('evaluate_script', {}, {}, { success: true, result: 'Search completed' });
assert(v6.success === true, "evaluate_script verifier returns success");

// --- Suite 8: Action Validator Allowlist & Security ---
console.log("\n--- Suite 8: Action Validator Allowlist & Security ---");
const validator = new ActionValidator();

const valLog = validator.validate({ action: 'inspect_console_logs' });
assert(valLog.valid === true, "inspect_console_logs action validated as valid");
assert(valLog.riskLevel === 'LOW', "inspect_console_logs classified as LOW risk");

const valIdle = validator.validate({ action: 'wait_for_network_idle' });
assert(valIdle.valid === true, "wait_for_network_idle action validated as valid");

const valEmulate = validator.validate({ action: 'emulate_device' });
assert(valEmulate.valid === true, "emulate_device action validated as valid");

const valPerf = validator.validate({ action: 'get_performance_insights' });
assert(valPerf.valid === true, "get_performance_insights action validated as valid");

const valDialog = validator.validate({ action: 'handle_dialog' });
assert(valDialog.valid === true, "handle_dialog action validated as valid");

const valEval = validator.validate({ action: 'evaluate_script', expression: 'window.innerWidth' });
assert(valEval.valid === true, "evaluate_script action validated as valid");

// Clean up
await bridge.detach(testTabId);
assert(!bridge.attachedTabs.has(testTabId), "DevToolsBridge cleanly detached");

console.log("\n========================================");
console.log(`DevTools Integration Tests: ${passed} passed, ${failed} failed.`);
console.log("========================================\n");

if (failed > 0) process.exit(1);
