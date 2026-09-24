/**
 * PlutoAI - Google Forms, Quizzes, Google Sheets & Drone Aerodynamics Test Suite
 * Validates domain intent recognition, typo normalization, STEM formula synthesis,
 * and automated milestone decomposition for Forms, Sheets, and UAV Engineering.
 */

import { NLPEngine } from '../background/nlp-engine.js';
import { TaskPlanner } from '../background/task-planner.js';

console.log("==========================================================");
console.log("  🚁 PlutoAI Forms, Quizzes & Drone Aerodynamics Suite");
console.log("==========================================================\n");

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

// -----------------------------------------------------------------------------
// 1. Google Forms & Quiz Intent Classification & Platform Extraction
// -----------------------------------------------------------------------------
console.log("--- 1. Google Forms & Quiz Platform Extraction ---");

const formTest1 = NLPEngine.extractPlatformAndTargetUrl("open google forms quiz at https://docs.google.com/forms/d/e/1FAIpQLSc/viewform");
assert(formTest1.platform === 'google_forms', `Extracts google_forms platform: ${formTest1.platform}`);
assert(formTest1.targetUrl === 'https://docs.google.com/forms/d/e/1FAIpQLSc/viewform', `Preserves exact Form URL: ${formTest1.targetUrl}`);

const formTest2 = NLPEngine.extractPlatformAndTargetUrl("open https://forms.gle/xyz123 and complete the drone quiz");
assert(formTest2.platform === 'google_forms', `Recognizes short forms.gle link: ${formTest2.platform}`);

const formIntent = NLPEngine.classifyIntent("answer all questions in the aerodynamics quiz form");
assert(formIntent.intent === 'google_forms_quiz', `Classifies intent as google_forms_quiz: ${formIntent.intent}`);

// -----------------------------------------------------------------------------
// 2. Google Sheets Platform Extraction & Intent
// -----------------------------------------------------------------------------
console.log("\n--- 2. Google Sheets Platform & Intent ---");

const sheetTest1 = NLPEngine.extractPlatformAndTargetUrl("create a new google sheet and record experiment responses");
assert(sheetTest1.platform === 'google_sheets', `Extracts google_sheets platform: ${sheetTest1.platform}`);
assert(sheetTest1.targetUrl === 'https://sheets.new', `Resolves https://sheets.new default target: ${sheetTest1.targetUrl}`);

const sheetIntent = NLPEngine.classifyIntent("record telemetry data in a spreadsheet");
assert(sheetIntent.intent === 'google_sheets_data', `Classifies intent as google_sheets_data: ${sheetIntent.intent}`);

// -----------------------------------------------------------------------------
// 3. Drone Technology & Aerodynamics Spelling & Intent
// -----------------------------------------------------------------------------
console.log("\n--- 3. Drone & Aerodynamics Semantic Correction & Intent ---");

const droneNorm = NLPEngine.normalizeText("explain aerodinamics of a quadcoper with bernouli airfoill and avioncs propellor");
assert(droneNorm.includes("aerodynamics"), `Corrected aerodinamics -> aerodynamics: "${droneNorm}"`);
assert(droneNorm.includes("drone") || droneNorm.includes("quadcopter"), `Normalized quadcopter -> "${droneNorm}"`);
assert(droneNorm.includes("bernoulli"), `Corrected bernouli -> bernoulli`);
assert(droneNorm.includes("airfoil"), `Corrected airfoill -> airfoil`);
assert(droneNorm.includes("avionics"), `Corrected avioncs -> avionics`);
assert(droneNorm.includes("propeller"), `Corrected propellor -> propeller`);

const droneIntent = NLPEngine.classifyIntent("write a comprehensive chapter on drone aerodynamics and uav flight mechanics");
assert(droneIntent.intent === 'drone_aerodynamics_stem', `Classifies intent as drone_aerodynamics_stem: ${droneIntent.intent}`);

// -----------------------------------------------------------------------------
// 4. STEM Content Synthesis: Drone Aerodynamics Textbook
// -----------------------------------------------------------------------------
console.log("\n--- 4. Drone Aerodynamics Content Synthesis ---");

const droneContent = NLPEngine.generateComprehensiveTextbook("drone aerodynamics quadcopter flight controller");
assert(droneContent.includes("DRONE TECHNOLOGY"), `Title contains DRONE TECHNOLOGY`);
assert(droneContent.includes("L = \\frac{1}{2} \\rho v^2 S C_L") || droneContent.includes("\\rho v^2"), `Contains lift equation formula`);
assert(droneContent.includes("DShot600") || droneContent.includes("MOSFET"), `Contains ESC / motor telemetry specs`);
assert(droneContent.includes("Extended Kalman Filter") || droneContent.includes("EKF"), `Contains IMU EKF sensor fusion`);
assert(droneContent.includes("8 kHz") || droneContent.includes("PID"), `Contains high-rate PID attitude loop`);

// -----------------------------------------------------------------------------
// 5. Task Planner Decomposition for Forms & Sheets
// -----------------------------------------------------------------------------
console.log("\n--- 5. Task Planner Milestone Decomposition ---");

const formPlan = TaskPlanner.decomposeGoal("open https://docs.google.com/forms/d/123/viewform and answer the quiz questions");
assert(formPlan.length >= 4, `Form plan has at least 4 milestones (got ${formPlan.length})`);
assert(formPlan.some(m => m.type === 'perceive_quiz'), `Form plan has perceive_quiz milestone`);
assert(formPlan.some(m => m.type === 'answer_quiz'), `Form plan has answer_quiz milestone`);
assert(formPlan.some(m => m.type === 'submit_and_verify'), `Form plan has submit_and_verify milestone`);

const sheetPlan = TaskPlanner.decomposeGoal("open google sheets and log flight scores");
assert(sheetPlan.length >= 4, `Sheets plan has at least 4 milestones (got ${sheetPlan.length})`);
assert(sheetPlan.some(m => m.targetUrl === 'https://sheets.new'), `Sheets plan navigates to sheets.new`);
assert(sheetPlan.some(m => m.type === 'type_content'), `Sheets plan includes type_content milestone`);

console.log("\n==========================================================");
console.log(`  📊 Forms & Quiz Test Results: ${passed} Passed, ${failed} Failed`);
console.log("==========================================================\n");

if (failed > 0) {
  process.exit(1);
}
