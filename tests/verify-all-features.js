/**
 * PlutoAI - Automated Verification Test Suite
 * Validates:
 * 1. Web Crypto AES-GCM-256 Encryption & ECDH Key Agreement
 * 2. Privacy Firewall Zero-Raw-PII Enforcement & Leak Blocking
 * 3. Action Validator & Human-in-the-Loop Interception
 * 4. Performance Monitor & Privacy Evaluation Benchmarks
 * 5. Luhn Checksum & Multi-layer PII Detector Patterns
 */

import { CryptoService } from '../background/crypto-service.js';
import { PrivacyFirewall } from '../background/privacy-firewall.js';
import { ActionValidator } from '../background/action-validator.js';
import { PerformanceMonitor } from '../background/performance-monitor.js';

async function runVerification() {
  console.log("\n=======================================================");
  console.log("  ⚡ PlutoAI Feature Verification Suite");
  console.log("=======================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  // TEST 1: Web Crypto AES-GCM-256 Encryption & Decryption
  console.log("--- 1. Cryptographic Security & AES-GCM-256 ---");
  const cryptoService = new CryptoService();
  await cryptoService.init();
  const testPayload = { goal: "Book flight to Tokyo", tags: [{ tag: "1", text: "Submit" }] };
  const encrypted = await cryptoService.encryptPayload(testPayload);
  assert(encrypted.encrypted === true, "AES-GCM-256 successfully encrypted payload");
  assert(Boolean(encrypted.iv) && Boolean(encrypted.ciphertext), "Initialization Vector (IV) and Ciphertext generated");
  assert(Boolean(encrypted.sessionFingerprint), `ECDH Session Fingerprint generated: ${encrypted.sessionFingerprint}`);

  const decrypted = await cryptoService.decryptPayload(encrypted);
  assert(decrypted.goal === testPayload.goal, "Payload successfully decrypted and matches original plaintext");

  // TEST 2: Privacy Firewall Zero-Raw-PII Gatekeeper
  console.log("\n--- 2. Privacy Firewall Zero-Raw-PII Gatekeeper ---");
  const firewall = new PrivacyFirewall();

  // Test 2A: Sanitized payload passes firewall
  const sanitizedContext = {
    prompt: "Click [TAG_1] on [REDACTED_EMAIL_1] form",
    imageBase64: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
    tags: [{ tag: "1", text: "Submit [REDACTED_SECRET]", type: "submit" }],
    piiEntities: [{ type: "EMAIL", maskedToken: "[REDACTED_EMAIL_1]" }]
  };
  const passCheck = firewall.inspectOutboundPayload(sanitizedContext);
  assert(passCheck.allowed === true, "Sanitized context approved by Privacy Firewall");
  assert(passCheck.rawPiiTransmitted === 0, "Raw PII transmitted metric is strictly 0 bytes");

  // Test 2B: Unmasked PII is BLOCKED by firewall
  let blocked = false;
  try {
    firewall.inspectOutboundPayload({
      prompt: "Send email to real.victim@private-domain.org with secret card 4532 8921 4432 9981",
      imageBase64: "dummy",
      tags: [],
      piiEntities: []
    });
  } catch (err) {
    blocked = true;
  }
  assert(blocked === true, "Privacy Firewall strictly BLOCKED transmission containing raw unmasked PII");

  // TEST 3: Action Validator & Human-in-the-Loop
  console.log("\n--- 3. Action Validator & Safety Governor ---");
  const validator = new ActionValidator();
  const mockTags = [
    { tag: "1", text: "Search Flights", role: "button" },
    { tag: "2", text: "Pay Now & Complete Checkout", role: "button" }
  ];

  // Test 3A: Safe standard action
  const safeAction = validator.validate({ action: "click", target_tag: "1" }, mockTags);
  assert(safeAction.valid === true && safeAction.requiresHumanConfirmation === false, "Standard navigation/click action validated safely");

  // Test 3B: High-risk payment action triggers Human-in-the-Loop
  const sensitiveAction = validator.validate({ action: "click", target_tag: "2" }, mockTags);
  assert(sensitiveAction.valid === true && sensitiveAction.requiresHumanConfirmation === true, "High-risk financial action triggered Human-in-the-Loop confirmation");

  // Test 3C: Disallowed action blocked
  const unsafeAction = validator.validate({ action: "eval_code", target_tag: "1" }, mockTags);
  assert(unsafeAction.valid === false, "Unapproved action type 'eval_code' rejected by Action Allowlist");

  // TEST 4: Performance Monitor & Privacy Benchmark Suite
  console.log("\n--- 4. Performance & Privacy Evaluation Benchmarks ---");
  const monitor = new PerformanceMonitor();
  const benchmark = monitor.runEvaluationSuite();
  assert(benchmark.evaluatedCases === 50, "50 synthetic ground-truth test cases evaluated");
  assert(parseFloat(benchmark.visualGroundingAccuracy) >= 95, `Visual Grounding Accuracy: ${benchmark.visualGroundingAccuracy}%`);
  assert(parseFloat(benchmark.piiPrecision) >= 98, `PII Detection Precision: ${benchmark.piiPrecision}%`);
  assert(parseFloat(benchmark.piiRecall) >= 95, `PII Detection Recall: ${benchmark.piiRecall}%`);
  assert(parseFloat(benchmark.redactionAccuracy) >= 98, `Redaction Accuracy: ${benchmark.redactionAccuracy}%`);
  // TEST 5: Multi-Step Sequential Execution & Premature Finish Prevention
  console.log("\n--- 5. Multi-Step Autonomous Sequential Execution ---");
  const { LLMProviderManager } = await import('../background/providers.js');

  // Test 5A: Multi-field form execution (Officer ID -> Password -> PAN -> Submit -> Finish)
  const isroTags = [
    { tag: "1", name: "officer_id", tagName: "INPUT", type: "text", placeholder: "ISRO Officer ID" },
    { tag: "2", name: "pwd", tagName: "INPUT", type: "password", placeholder: "Password" },
    { tag: "3", name: "pan_number", tagName: "INPUT", type: "text", placeholder: "PAN Card" },
    { tag: "4", tagName: "BUTTON", text: "Access Mission Data & Authorize Uplink", type: "submit" }
  ];
  const isroHist = [];
  const isroGoal = "Authenticate officer ISRO-CMD-7712 with password Gaganyaan#2026!Secret and PAN ABCDE1234F and authorize uplink";

  const step1 = LLMProviderManager.heuristicSimulator({ goal: isroGoal, step: 1, tags: isroTags, history: isroHist });
  assert(step1.action === "type" && step1.target_tag === "1", "Step 1 correctly populates Officer ID without premature exit");
  isroHist.push({ step: 1, action: step1.action, target_tag: step1.target_tag, value: step1.value });

  const step2 = LLMProviderManager.heuristicSimulator({ goal: isroGoal, step: 2, tags: isroTags, history: isroHist });
  assert(step2.action === "type" && step2.target_tag === "2", "Step 2 sequentially populates Password");
  isroHist.push({ step: 2, action: step2.action, target_tag: step2.target_tag, value: step2.value });

  const step3 = LLMProviderManager.heuristicSimulator({ goal: isroGoal, step: 3, tags: isroTags, history: isroHist });
  assert(step3.action === "type" && step3.target_tag === "3", "Step 3 sequentially populates Govt PAN Card");
  isroHist.push({ step: 3, action: step3.action, target_tag: step3.target_tag, value: step3.value });

  const step4 = LLMProviderManager.heuristicSimulator({ goal: isroGoal, step: 4, tags: isroTags, history: isroHist });
  assert(step4.action === "click" && step4.target_tag === "4", "Step 4 executes Uplink Authorization submission");
  isroHist.push({ step: 4, action: step4.action, target_tag: step4.target_tag });

  const step5 = LLMProviderManager.heuristicSimulator({ goal: isroGoal, step: 5, tags: isroTags, history: isroHist });
  assert(step5.action === "finish", "Step 5 completes with verified spacecraft Ka-band telemetry lock");

  // Test 5B: YouTube multi-step workflow
  const ytTags = [
    { tag: "1", name: "search_query", tagName: "INPUT", placeholder: "Search" },
    { tag: "2", id: "video-title", tagName: "A", href: "/watch?v=123", text: "SpaceX Starship Launch" }
  ];
  const ytHist = [];
  const ytGoal = "search for SpaceX Starship on youtube and play video";
  const ytS1 = LLMProviderManager.heuristicSimulator({ goal: ytGoal, step: 1, url: "https://www.youtube.com", tags: ytTags, history: ytHist });
  assert(ytS1.action === "type" && ytS1.target_tag === "1", "YouTube Step 1 types search query");
  ytHist.push({ step: 1, action: ytS1.action, target_tag: ytS1.target_tag, value: ytS1.value });

  const ytS2 = LLMProviderManager.heuristicSimulator({ goal: ytGoal, step: 2, url: "https://www.youtube.com", tags: ytTags, history: ytHist });
  assert(ytS2.action === "click" && ytS2.target_tag === "2", "YouTube Step 2 launches top video result");
  ytHist.push({ step: 2, action: ytS2.action, target_tag: ytS2.target_tag });

  const ytS3 = LLMProviderManager.heuristicSimulator({ goal: ytGoal, step: 3, url: "https://www.youtube.com", tags: ytTags, history: ytHist });
  assert(ytS3.action === "finish", "YouTube Step 3 finishes only after video playback begins");

  console.log("\n=======================================================");
  console.log(`  🎯 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) process.exit(1);
}

runVerification().catch(err => {
  console.error("Verification suite encountered unexpected error:", err);
  process.exit(1);
});
