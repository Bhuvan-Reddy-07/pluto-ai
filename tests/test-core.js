/**
 * Pluto AI - Core Unit & Integration Verification Suite
 * Tests all ~45+ skills, verification contracts, prompts, models, internal CDP capabilities, and resilience rules.
 */

import { SKILL_DEFINITIONS, SKILL_CATEGORIES, isActionSensitive, verifySkillResult } from '../shared/skills.js';
import { Prompts } from '../shared/prompts.js';
import { DEFAULT_SETTINGS } from '../shared/storage.js';
import { Subagent } from '../background/subagent.js';
import { ProviderRegistry } from '../providers/registry.js';
import { NLPEngine } from '../shared/nlp-engine.js';
import { TaskPlanner } from '../shared/task-planner.js';
import { CryptoService } from '../background/crypto-service.js';
import { PrivacyFirewall } from '../background/privacy-firewall.js';
import { ActionValidator } from '../background/action-validator.js';
import { PerformanceMonitor } from '../background/performance-monitor.js';
import fs from 'fs';
import vm from 'vm';

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

console.log('--- Test Suite 1: Expanded Skill Definitions & Categories ---');
const totalSkills = Object.keys(SKILL_DEFINITIONS).length;
assert(totalSkills >= 45, `Catalog contains expanded skills (found ${totalSkills})`);

// Check required categories
const categories = new Set(Object.values(SKILL_DEFINITIONS).map(s => s.category));
assert(categories.has(SKILL_CATEGORIES.NAVIGATION), 'Navigation category present');
assert(categories.has(SKILL_CATEGORIES.MOUSE), 'Mouse category present');
assert(categories.has(SKILL_CATEGORIES.KEYBOARD), 'Keyboard category present');
assert(categories.has(SKILL_CATEGORIES.FORMS), 'Forms category present');
assert(categories.has(SKILL_CATEGORIES.EXTRACTION), 'Extraction category present');
assert(categories.has(SKILL_CATEGORIES.PAGE_STATE), 'Page State category present');
assert(categories.has(SKILL_CATEGORIES.META), 'Meta category present');

// Check key new skills
const requiredSkills = [
  'duplicate_tab', 'zoom', 'wait', 'scroll',
  'right_click', 'double_click', 'middle_click', 'hover', 'drag_drop', 'click_at_coordinates', 'swipe_gesture',
  'key_combo', 'paste_text', 'set_value',
  'select_combobox', 'toggle_switch', 'fill_form', 'set_date', 'set_slider', 'upload_file', 'handle_autocomplete',
  'extract_all_links', 'get_page_metadata', 'download_file', 'save_screenshot_artifact',
  'dismiss_popup', 'accept_cookies', 'switch_frame', 'element_exists', 'get_scroll_position',
  'ask_user', 'request_approval', 'note', 'retry_strategy', 'done', 'blocked'
];

requiredSkills.forEach(sk => {
  assert(SKILL_DEFINITIONS[sk] !== undefined, `Skill "${sk}" is registered in catalog`);
  assert(SKILL_DEFINITIONS[sk].parameters !== undefined, `Skill "${sk}" has JSON schema parameters`);
});

console.log('\n--- Test Suite 2: CDP Flags & Escalation Ladders ---');
assert(SKILL_DEFINITIONS.zoom.requiresCdp === true, 'zoom requires CDP');
assert(SKILL_DEFINITIONS.drag_drop.requiresCdp === true, 'drag_drop requires CDP');
assert(SKILL_DEFINITIONS.hover.requiresCdp === true, 'hover requires CDP');
assert(SKILL_DEFINITIONS.click_at_coordinates.requiresCdp === true, 'click_at_coordinates requires CDP');
assert(SKILL_DEFINITIONS.upload_file.requiresCdp === true, 'upload_file requires CDP');
assert(SKILL_DEFINITIONS.click.requiresCdp === false, 'click allows DOM/synthetic first before CDP escalation');

console.log('\n--- Test Suite 3: Sensitivity Engine ---');
const checkoutAction = { skill: 'click', target: 'b1' };
assert(isActionSensitive(checkoutAction, { text: 'Complete Purchase', type: 'button' }) === true, 'Checkout identified as sensitive');
assert(isActionSensitive(checkoutAction, { text: 'Delete Account', type: 'button' }) === true, 'Delete account identified as sensitive');
assert(isActionSensitive({ skill: 'download_file' }, {}) === true, 'download_file marked sensitive');
assert(isActionSensitive({ skill: 'upload_file' }, {}) === true, 'upload_file marked sensitive');
assert(isActionSensitive(checkoutAction, { text: 'Read more', type: 'button' }) === false, 'Informational button not sensitive');

console.log('\n--- Test Suite 4: Structured Verifiers ({success, observed_change, error}) ---');
// 1. Navigation verifier
const navRes = verifySkillResult('duplicate_tab', { url: 'https://a.com' }, { url: 'https://a.com' }, { success: true, newTabCreated: true, details: 'Duplicated tab' });
assert(navRes.success === true && navRes.observed_change.includes('Duplicated'), 'duplicate_tab verified contract');

// 2. Mouse verifier
const hoverRes = verifySkillResult('hover', {}, {}, { success: true, details: 'Hovered 500ms' });
assert(hoverRes.success === true && hoverRes.observed_change.includes('Hovered'), 'hover verified contract');

const dragRes = verifySkillResult('drag_drop', {}, {}, { success: true, details: 'Drag and drop completed' });
assert(dragRes.success === true && dragRes.observed_change.includes('Drag and drop'), 'drag_drop verified contract');

// 3. Forms verifier
const fillRes = verifySkillResult('fill_form', {}, {}, { success: true, filledCount: 3, results: [] });
assert(fillRes.success === true && fillRes.observed_change.includes('3'), 'fill_form batch verified contract');

const switchRes = verifySkillResult('toggle_switch', {}, {}, { success: true, details: 'Input state updated' });
assert(switchRes.success === true && switchRes.observed_change.includes('updated'), 'toggle_switch verified contract');

// 4. Page state & overlay verifier
const dismissRes = verifySkillResult('dismiss_popup', {}, {}, { success: true, dismissed: true });
assert(dismissRes.success === true && dismissRes.observed_change.includes('closed overlay'), 'dismiss_popup verified contract');

const cookieRes = verifySkillResult('accept_cookies', {}, {}, { success: true, accepted: true });
assert(cookieRes.success === true && cookieRes.observed_change.includes('accepted cookie'), 'accept_cookies verified contract');

// 5. Meta verifier
const askRes = verifySkillResult('ask_user', {}, {}, { success: true, answer: 'Paris' });
assert(askRes.success === true && askRes.observed_change.includes('Paris'), 'ask_user verified contract');

const noteRes = verifySkillResult('note', {}, {}, { success: true, fact: 'Order #12345' });
assert(noteRes.success === true && noteRes.observed_change.includes('Order #12345'), 'note verified contract');

console.log('\n--- Test Suite 5: Prompts Vocabulary & LLM Tokens ---');
assert(Prompts.ROUTER.includes('DIRECT_READ') && Prompts.ROUTER.includes('AGENTIC'), 'Router prompt contains modes');
assert(Prompts.PLANNER.includes('done_condition'), 'Planner prompt specifies done_condition');
assert(Prompts.SUBAGENT.includes('dismiss_popup'), 'Subagent prompt includes dismiss_popup');
assert(Prompts.SUBAGENT.includes('accept_cookies'), 'Subagent prompt includes accept_cookies');
assert(Prompts.SUBAGENT.includes('fill_form'), 'Subagent prompt includes fill_form');
assert(Prompts.SUBAGENT.includes('ask_user'), 'Subagent prompt includes ask_user');

console.log('\n--- Test Suite 6: Storage Defaults & High-Quota Gemini Model ---');
assert(DEFAULT_SETTINGS.maxSteps === 25, 'Default max steps is 25');
assert(DEFAULT_SETTINGS.stepTimeoutSeconds === 60, 'Default timeout is 60s');
assert(DEFAULT_SETTINGS.approvalMode === true, 'Default approvalMode is true');
assert(DEFAULT_SETTINGS.activeModel === 'gemini-3.5-flash-lite', 'Default model set to high-quota gemini-3.5-flash-lite (500 RPD)');

console.log('\n--- Test Suite 7: Master Prompt Execution Rules & Skyvern Refinements ---');
assert(Prompts.SUBAGENT.includes('RESOLVER PRIORITY CHAIN (resolver.js):'), 'Subagent prompt specifies resolver priority chain');
assert(Prompts.SUBAGENT.includes('data-testid → aria-label/role+name → visible text match'), 'Priority chain order matches spec');
assert(Prompts.SUBAGENT.includes('ESCALATION TRIGGERS (execution engine):'), 'Subagent prompt specifies escalation triggers');
assert(Prompts.SUBAGENT.includes('CDP immediately, no retries between'), 'Anti-detection rule: CDP immediately without retries');
assert(Prompts.SUBAGENT.includes('switch to VISION-PRIMARY mode: screenshot + coordinates'), 'Vision-primary degradation trigger specified');
assert(Prompts.SUBAGENT.includes('CDP INTERNAL CAPABILITIES (beyond input):'), 'CDP internal capabilities specified in prompt');
assert(Prompts.SUBAGENT.includes('DOM.getBoxModel (exact coordinates), Emulation overrides'), 'BoxModel and Emulation listed as engine capabilities');
assert(Prompts.SUBAGENT.includes('Coordinate-Based Interaction (First-Class Path)'), 'Coordinate interaction promoted to first-class alternative');

console.log('\n--- Test Suite 8: Internal CDP Capabilities & Subagent Engine ---');
assert(typeof Subagent.prototype.cdpGetBoxModel === 'function', 'Subagent has internal cdpGetBoxModel');
assert(typeof Subagent.prototype.cdpDispatchTouchEvent === 'function', 'Subagent has internal cdpDispatchTouchEvent');
assert(typeof Subagent.prototype.cdpSetDeviceMetricsOverride === 'function', 'Subagent has internal cdpSetDeviceMetricsOverride');
assert(typeof Subagent.prototype.cdpClearDeviceMetricsOverride === 'function', 'Subagent has internal cdpClearDeviceMetricsOverride');

const mockSubagent = new Subagent({ taskId: 't1', conversationId: 'c1', goal: 'test', sendToPanel: () => {} });
assert(mockSubagent.isVisionPrimary === false, 'Subagent initializes isVisionPrimary to false');

console.log('\n--- Test Suite 9: Privacy Shield & Visual Settings Defaults ---');
assert(DEFAULT_SETTINGS.privacyShieldEnabled === true, 'Default privacyShieldEnabled is true');
assert(DEFAULT_SETTINGS.redactionMode === 'blur', 'Default redactionMode is blur');
assert(DEFAULT_SETTINGS.speechEnabled === false, 'Default speechEnabled is false');
assert(DEFAULT_SETTINGS.visualOverlayEnabled === true, 'Default visualOverlayEnabled is true');

console.log('\n--- Test Suite 10: Multi-Provider Expansion & DeepSeek ---');
assert(!!ProviderRegistry.adapters['deepseek'], 'DeepSeek provider is registered in ProviderRegistry');
assert(ProviderRegistry.adapters['deepseek'].supportsVision === false, 'DeepSeek is configured as text-only inference');
assert(!!ProviderRegistry.adapters['gemini'], 'Gemini provider is registered');
assert(!!ProviderRegistry.adapters['groq'], 'Groq provider is registered');
assert(!!ProviderRegistry.adapters['ollama'], 'Ollama provider is registered');
assert(!!ProviderRegistry.adapters['openai'], 'OpenAI provider is registered');
assert(!!ProviderRegistry.adapters['anthropic'], 'Anthropic provider is registered');

console.log('\n--- Test Suite 11: On-Device PII Detector & Luhn Algorithm ---');
const mockWindow = {
  __PLUTO__: {},
  innerWidth: 1920,
  innerHeight: 1080,
  scrollX: 0,
  scrollY: 0
};
const mockDocument = {
  querySelectorAll: () => [],
  createTreeWalker: () => ({ nextNode: () => null })
};
const piiCode = fs.readFileSync('content/pii-detector.js', 'utf8');
vm.runInNewContext(piiCode, {
  window: mockWindow,
  document: mockDocument,
  Node: { ELEMENT_NODE: 1 },
  NodeFilter: { SHOW_TEXT: 4, FILTER_ACCEPT: 1, FILTER_REJECT: 2 }
});

const piiDetector = mockWindow.__PLUTO__.piiDetector;
assert(typeof piiDetector === 'object', 'PII detector loaded and namespaced under window.__PLUTO__.piiDetector');
assert(mockWindow.__AutoBrowserPII === piiDetector, 'PII detector also exposed as window.__AutoBrowserPII for page bridge compatibility');
assert(typeof piiDetector.isValidLuhn === 'function', 'PII detector has Luhn checksum validation function');
assert(piiDetector.isValidLuhn('4532015112830366') === true, 'Luhn validates real Visa test card');
assert(piiDetector.isValidLuhn('4532015112830367') === false, 'Luhn rejects corrupted/fake credit card');
assert(piiDetector.isValidLuhn('invalid123') === false, 'Luhn rejects non-numeric strings');
assert(piiDetector.domMarkers.includes('password') && piiDetector.domMarkers.includes('cvv'), 'DOM markers cover passwords and CVVs');

// Test Regex patterns directly
assert(piiDetector.patterns.email.regex.test('test@example.com'), 'Email pattern matches standard email');
assert(piiDetector.patterns.truncatedEmail.regex.test('labour12@g...'), 'Truncated email pattern matches labour12@g...');
assert(piiDetector.patterns.firebaseUid.regex.test('yb272QUfxwPir983kdjsla0921'), 'Firebase UID pattern matches 28-char user UID');
assert(piiDetector.patterns.panNumber.regex.test('ABCDE1234F'), 'PAN number pattern matches Indian PAN');
assert(piiDetector.patterns.googleApiKey.regex.test('AIzaSyD983jsda09-xkasd_asldk2981ka'), 'Google API key pattern matches AIza...');

// Test DOM scan simulation with table and attributes
const mockTableDoc = {
  querySelectorAll: (selector) => {
    if (selector.includes('input')) {
      return [{
        closest: () => null,
        getBoundingClientRect: () => ({ x: 10, y: 10, width: 100, height: 30 }),
        getAttribute: (attr) => attr === 'type' ? 'password' : null,
        value: 'SecretPass123!'
      }];
    }
    if (selector.includes('td')) {
      return [
        {
          closest: () => null,
          getBoundingClientRect: () => ({ x: 50, y: 50, width: 150, height: 30 }),
          getAttribute: (attr) => attr === 'title' ? 'pranavreddy@gmail.com' : null,
          innerText: 'pranavredd...'
        },
        {
          closest: () => null,
          getBoundingClientRect: () => ({ x: 220, y: 50, width: 150, height: 30 }),
          getAttribute: (attr) => null,
          innerText: 'yb272QUfxwPir983kdsla9'
        }
      ];
    }
    return [];
  },
  createTreeWalker: () => ({ nextNode: () => null })
};

const mockWindow2 = { __PLUTO__: {}, scrollX: 0, scrollY: 0, innerHeight: 800 };
vm.runInNewContext(piiCode, {
  window: mockWindow2,
  document: mockTableDoc,
  Node: { ELEMENT_NODE: 1 },
  NodeFilter: { SHOW_TEXT: 4, FILTER_ACCEPT: 1, FILTER_REJECT: 2 }
});

const scanResults = await mockWindow2.__PLUTO__.piiDetector.scanPage();
assert(scanResults.totalDetected >= 3, `Table & DOM attribute scanning detects elements (found ${scanResults.totalDetected})`);
assert(scanResults.entities.some(e => e.type === 'PASSWORD'), 'Password field detected');
assert(scanResults.entities.some(e => e.type === 'EMAIL' || e.type === 'EMAIL_TRUNCATED'), 'Truncated/attribute email detected');
assert(scanResults.entities.some(e => e.type === 'USER_UID'), 'Firebase user UID detected');


console.log('\n--- Test Suite 12: Canvas Privacy Redactor & Protocol Metadata ---');
const redactorCode = fs.readFileSync('content/privacy-redactor.js', 'utf8');
vm.runInNewContext(redactorCode, {
  window: mockWindow,
  document: mockDocument
});
const redactor = mockWindow.__PLUTO__.privacyRedactor;
assert(typeof redactor === 'object', 'Privacy redactor loaded and namespaced under window.__PLUTO__.privacyRedactor');
assert(typeof redactor.sanitizeContext === 'function', 'Privacy redactor has sanitizeContext method');

const testMetadata = redactor.buildMetadata([
  { type: 'PASSWORD', confidence: 0.99, rect: { x: 10, y: 20, width: 100, height: 30 } },
  { type: 'CREDIT_CARD', confidence: 0.97, rect: { x: 10, y: 60, width: 200, height: 30 } }
], 'blur');

assert(testMetadata.protocol_version === '2.0.0', 'Redaction protocol version is 2.0.0');
assert(testMetadata.redaction_count === 2, 'Metadata tracks all 2 redaction regions');
assert(testMetadata.privacy_guarantee.raw_pii_transmitted_bytes === 0, 'Privacy guarantee specifies 0 raw PII bytes transmitted');
assert(testMetadata.privacy_guarantee.verified_clean === true, 'Privacy guarantee verified_clean is true');

const cleanText = redactor.sanitizeText('User email is test@example.com', [
  { matchedText: 'test@example.com', maskedToken: '[REDACTED_EMAIL_1]' }
]);
assert(cleanText === 'User email is [REDACTED_EMAIL_1]', 'sanitizeText replaces sensitive string with masked token');

console.log('\n--- Test Suite 13: In-Page Sci-Fi Visual Overlays ---');
const visualsCode = fs.readFileSync('content/visual-overlay.js', 'utf8');
vm.runInNewContext(visualsCode, {
  window: mockWindow,
  document: mockDocument
});
const visuals = mockWindow.__PLUTO__.visuals;
assert(typeof visuals === 'object', 'Visual overlay loaded and namespaced under window.__PLUTO__.visuals');
assert(typeof visuals.moveCursorTo === 'function', 'Visuals has moveCursorTo method');
assert(typeof visuals.triggerClickRipple === 'function', 'Visuals has triggerClickRipple method');
assert(typeof visuals.highlightElement === 'function', 'Visuals has highlightElement method');
assert(typeof visuals.showHUD === 'function', 'Visuals has showHUD method');
assert(typeof visuals.setScreenGlow === 'function', 'Visuals has setScreenGlow method');
assert(typeof visuals.cleanupAll === 'function', 'Visuals has cleanupAll method');

console.log('\n--- Test Suite 14: NLP Engine & Semantic Intent Classifier ---');
const cleanPreamble = NLPEngine.normalizeText('hey pluto can you please search for quantum computing on youtube?');
assert(cleanPreamble === 'search for quantum computing on youtube?', 'Conversational preamble stripped cleanly');

const cleanTypos = NLPEngine.normalizeText('open you tub and search for computer netwroks and machne learning');
assert(cleanTypos === 'open youtube and search for computer networks and machine learning', 'Domain typos and phonetic replacements auto-corrected');

const clauses = NLPEngine.segmentClauses('open youtube and search for computer networks and then play second video');
assert(clauses.length === 3, 'Multi-clause prompt segmented into 3 logical steps');

const ytIntent = NLPEngine.classifyIntent('watch lex fridman podcast with sam altman on youtube');
assert(ytIntent.intent === 'youtube_search_play' && ytIntent.confidence > 0.9, 'YouTube intent classified with high confidence');

const docIntent = NLPEngine.classifyIntent('in a new doc write an essay about cybersecurity');
assert(docIntent.intent === 'doc_author', 'Google Docs authoring intent classified correctly');

const extractedQ1 = NLPEngine.extractSearchQuery('open youtube and search for "computer networks" and then play the second video');
assert(extractedQ1 === 'computer networks', 'Quoted query extracted accurately');

const extractedQ2 = NLPEngine.extractSearchQuery('search quantum physics on google and click the second link');
assert(extractedQ2 === 'quantum physics', 'Delimited query extracted accurately');

const ordinal1 = NLPEngine.extractTargetOrdinal('play the second video');
assert(ordinal1.index === 1, 'Target ordinal #2 extracted as index 1');

const ordinal2 = NLPEngine.extractTargetOrdinal('click the 3rd result');
assert(ordinal2.index === 2, 'Target ordinal #3 extracted as index 2');

const ordinal3 = NLPEngine.extractTargetOrdinal('play the last video');
assert(ordinal3.isLast === true, 'Last ordinal recognized correctly');

const formEntities = NLPEngine.extractFormEntities('officer isro-cmd-9021 password Rocket#2026! pan ABCDE1234F email commander@isro.gov.in under ₹50000');
assert(formEntities.officer_id === 'isro-cmd-9021', 'Officer ID extracted');
assert(formEntities.password === 'Rocket#2026!', 'Password extracted');
assert(formEntities.pan === 'ABCDE1234F', 'PAN extracted');
assert(formEntities.email === 'commander@isro.gov.in', 'Email extracted');
assert(formEntities.max_price === 50000, 'Price budget extracted');

const aimlContent = NLPEngine.generateComprehensiveContent('write textbook on aiml and neural networks');
assert(aimlContent.includes('FOUNDATIONS OF ARTIFICIAL INTELLIGENCE'), 'AIML textbook content generated');

console.log('\n--- Test Suite 15: Task Planner & Milestone Organizer ---');
const ytPlan = TaskPlanner.decomposeGoal('open youtube and search for "computer networks" and play the second video', 'https://www.google.com');
assert(ytPlan.length === 4, 'YouTube goal decomposed into 4 verifiable milestones');
assert(ytPlan[0].type === 'navigate' && ytPlan[0].targetUrl === 'https://www.youtube.com', 'Milestone 1 navigates to YouTube');
assert(ytPlan[1].type === 'search' && ytPlan[1].query === 'computer networks', 'Milestone 2 searches for query');
assert(ytPlan[2].type === 'click_result' && ytPlan[2].ordinalIndex === 1, 'Milestone 3 targets ordinal index 1 (second video)');
assert(ytPlan[3].type === 'verify_playback', 'Milestone 4 verifies playback');

const docPlan = TaskPlanner.decomposeGoal('in a new doc write an essay about cybersecurity');
assert(docPlan.some(m => m.targetUrl === 'https://docs.new'), 'Docs plan includes docs.new initialization');
assert(docPlan.some(m => m.type === 'type_content'), 'Docs plan includes content authoring step');

const updatedPlan = TaskPlanner.updateMilestoneProgress(ytPlan, 'https://www.youtube.com/results?search_query=test', [
  { action: 'navigate' },
  { action: 'type', thought: 'search' }
]);
assert(updatedPlan.plan[0].status === 'completed', 'Milestone 1 marked completed after navigation');
assert(updatedPlan.activeIndex >= 1, 'Active milestone advances sequentially');

const formattedPrompt = TaskPlanner.formatPlanForPrompt(ytPlan, 1);
assert(formattedPrompt.includes('STRUCTURED EXECUTION PLAN'), 'Formatted prompt contains plan header');
assert(formattedPrompt.includes('CURRENT ACTIVE MILESTONE: #2'), 'Formatted prompt highlights active milestone #2');

console.log('\n--- Test Suite 16: Cryptographic Security & AES-GCM-256 ---');
const cryptoService = new CryptoService();
await cryptoService.init();
const sampleData = { goal: 'Book train ticket', user: 'vikram' };
const encryptedPkg = await cryptoService.encryptPayload(sampleData);
assert(encryptedPkg.encrypted === true, 'Payload encrypted with AES-GCM-256');
assert(Boolean(encryptedPkg.iv) && Boolean(encryptedPkg.ciphertext), 'IV and Ciphertext generated');
assert(Boolean(encryptedPkg.integrityHash), 'SHA-256 integrity hash generated');
assert(Boolean(encryptedPkg.sessionFingerprint), 'ECDH session fingerprint generated');

const decryptedData = await cryptoService.decryptPayload(encryptedPkg);
assert(decryptedData.goal === sampleData.goal && decryptedData.user === sampleData.user, 'Decrypted payload matches original plaintext');
const cryptoStatus = cryptoService.getStatus();
assert(cryptoStatus.active === true && cryptoStatus.zeroRawPIIGuarantee === true, 'Crypto service status confirmed active and secure');

console.log('\n--- Test Suite 17: Privacy Firewall & Outbound Zero-Leak Gatekeeper ---');
const firewall = new PrivacyFirewall();
const sanitizedContext = {
  prompt: 'Click [TAG_1] with sanitized token [REDACTED_EMAIL_1]',
  imageBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  tags: [
    { tag: '1', name: 'user_email', text: 'Submit [REDACTED_EMAIL_1]' },
    { tag: '2', name: 'pwd_field', type: 'password', value: 'secret' }
  ],
  piiEntities: [{ type: 'EMAIL', maskedToken: '[REDACTED_EMAIL_1]' }]
};
const firewallCheck = firewall.inspectOutboundPayload(sanitizedContext);
assert(firewallCheck.allowed === true, 'Sanitized payload approved by Privacy Firewall');
assert(firewallCheck.rawPiiTransmitted === 0, 'Zero raw PII transmitted metric is strictly 0');
assert(sanitizedContext.tags[1].value === '[REDACTED_PASSWORD_FIELD]', 'Password tag automatically masked to [REDACTED_PASSWORD_FIELD]');

let rawLeakBlocked = false;
try {
  firewall.inspectOutboundPayload({
    prompt: 'Please transfer funds to secret account holder victim@target-corp.com using card 4532 8921 4432 9981',
    imageBase64: 'dummy',
    tags: [],
    piiEntities: []
  });
} catch (e) {
  rawLeakBlocked = true;
}
assert(rawLeakBlocked === true, 'Privacy Firewall strictly blocked transmission containing unmasked raw PII');
const firewallMetrics = firewall.getMetrics();
assert(firewallMetrics.blockedTransmissions >= 1, 'Firewall metrics track blocked violation');
assert(firewallMetrics.zeroPiiGuaranteed === true, 'Firewall zeroPiiGuaranteed is strictly true');

console.log('\n--- Test Suite 18: Action Validator & Safety Governor ---');
const validator = new ActionValidator();
const mockTags = [
  { tag: '1', text: 'Search Flight Options', role: 'button' },
  { tag: '2', text: 'Pay Now & Complete Checkout', role: 'button' },
  { tag: '3', text: 'Delete Account & Erase All Data', role: 'button' }
];

const safeNav = validator.validate({ action: 'navigate', value: 'https://www.google.com' });
assert(safeNav.valid === true && safeNav.requiresHumanConfirmation === false, 'Safe web navigation validated with LOW risk');

const dangerousNav = validator.validate({ action: 'navigate', value: 'javascript:alert(1)' });
assert(dangerousNav.valid === false && dangerousNav.riskLevel === 'CRITICAL', 'Dangerous javascript: protocol URL blocked with CRITICAL risk');

const safeClick = validator.validate({ action: 'click', target_tag: '1' }, mockTags);
assert(safeClick.valid === true && safeClick.requiresHumanConfirmation === false, 'Standard button click validated safely');

const paymentClick = validator.validate({ action: 'click', target_tag: '2' }, mockTags);
assert(paymentClick.valid === true && paymentClick.requiresHumanConfirmation === true, 'Payment action intercepted requiring Human-in-the-Loop confirmation');
assert(paymentClick.riskLevel === 'HIGH', 'Financial action categorized as HIGH risk');

const deleteClick = validator.validate({ action: 'click', target_tag: '3' }, mockTags);
assert(deleteClick.valid === true && deleteClick.requiresHumanConfirmation === true, 'Account deletion intercepted requiring Human-in-the-Loop confirmation');

const invalidAction = validator.validate({ action: 'format_hard_drive' });
assert(invalidAction.valid === false, 'Disallowed command outside allowlist rejected');

console.log('\n--- Test Suite 19: Performance Monitor & Evaluation Suite ---');
const perfMon = new PerformanceMonitor();
perfMon.startTimer('step_1', 'perception');
perfMon.endTimer('step_1', 'perception');
perfMon.startTimer('step_1', 'redaction');
perfMon.endTimer('step_1', 'redaction');
perfMon.startTimer('step_1', 'vlm');
perfMon.endTimer('step_1', 'vlm');
perfMon.startTimer('step_1', 'actuation');
perfMon.endTimer('step_1', 'actuation');
perfMon.startTimer('step_1', 'verification');
perfMon.endTimer('step_1', 'verification');

const finalizedMetric = perfMon.finalizeStepMetrics('step_1');
assert(finalizedMetric !== null, 'finalizeStepMetrics produced complete step metrics record');
assert(typeof finalizedMetric.totalE2EMs === 'number', 'Step record tracks totalE2EMs');

const telemetry = await perfMon.getTelemetry();
assert(typeof telemetry.memoryHeapMB === 'number', 'Telemetry tracks client memoryHeapMB');
assert(typeof telemetry.averages === 'object', 'Telemetry tracks latency phase averages');

const benchmarkEval = perfMon.runEvaluationSuite();
assert(benchmarkEval.evaluatedCases === 50, 'Evaluation benchmark ran 50 synthetic test cases');
assert(benchmarkEval.zeroRawPiiTransmitted === true, 'Benchmark confirms zero raw PII transmitted');
assert(Number(benchmarkEval.f1Score) >= 95, `PII F1-Score meets production threshold (${benchmarkEval.f1Score}%)`);

console.log(`\n========================================`);
console.log(`Tests Finished: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}

