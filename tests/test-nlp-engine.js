/**
 * PlutoAI - Advanced NLPEngine Comprehensive Test Suite
 * Validates semantic normalization, typo correction, multi-clause segmentation,
 * intent classification, slot extraction, ordinals, credentials, and collegiate content generation.
 */

import { NLPEngine } from '../background/nlp-engine.js';
import { TaskPlanner } from '../background/task-planner.js';

console.log("==========================================================");
console.log("  ⚡ PlutoAI Advanced NLP Engine Verification Suite");
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
// 1. Conversational Normalization & Filler Removal
// -----------------------------------------------------------------------------
console.log("--- 1. Conversational Normalization & Politeness Stripping ---");

const norm1 = NLPEngine.normalizeText("Hey Pluto AI, can you please kindly search for machine learning on youtube?");
assert(norm1.toLowerCase().includes("search for machine learning on youtube"), `Conversational preamble stripped: "${norm1}"`);

const norm2 = NLPEngine.normalizeText("Could you please help me to open a new doc and write an essay on cybersecurity?");
assert(norm2.toLowerCase().startsWith("open a new doc"), `Polite modal prefix stripped: "${norm2}"`);

const norm3 = NLPEngine.normalizeText("I would like you to just go ahead and search for quantum computing");
assert(norm3.toLowerCase().includes("search for quantum computing"), `Volitional filler stripped: "${norm3}"`);

// -----------------------------------------------------------------------------
// 2. Contraction Expansion
// -----------------------------------------------------------------------------
console.log("\n--- 2. English Contraction Expansion ---");

const cont1 = NLPEngine.normalizeText("I can't open the link and it's won't load");
assert(cont1.includes("cannot") && cont1.includes("will not"), `Contractions expanded (cannot / will not): "${cont1}"`);

// -----------------------------------------------------------------------------
// 3. Domain Typo & Phonetic Auto-Correction
// -----------------------------------------------------------------------------
console.log("\n--- 3. Domain Typo & Phonetic Auto-Correction ---");

const typo1 = NLPEngine.normalizeText("open you tub and search for computer netwroks");
assert(typo1.includes("youtube") && typo1.includes("networks"), `Corrected "you tub" & "netwroks" -> "${typo1}"`);

const typo2 = NLPEngine.normalizeText("go to gogle and lookup artifical inteligence on wikipidia");
assert(typo2.includes("google") && typo2.includes("artificial") && typo2.includes("intelligence") && typo2.includes("wikipedia"), `Corrected search engine & topics -> "${typo2}"`);

const typo3 = NLPEngine.normalizeText("in a new doccument write a textbok about operatng system");
assert(typo3.includes("document") && typo3.includes("textbook") && typo3.includes("operating system"), `Corrected document terms -> "${typo3}"`);

const typo4 = NLPEngine.normalizeText("authenicate oficer ISRO-CMD-1 with passwrd Gaganyaan#1");
assert(typo4.includes("authenticate") && typo4.includes("officer") && typo4.includes("password"), `Corrected auth terms -> "${typo4}"`);

// -----------------------------------------------------------------------------
// 4. Multi-Clause Conjunction Segmentation
// -----------------------------------------------------------------------------
console.log("\n--- 4. Multi-Clause Conjunction Segmentation ---");

const seg1 = NLPEngine.segmentClauses("open youtube and search for computer networks and then open and play the second video");
assert(seg1.length >= 2, `Segmented 3-part YouTube instruction into ${seg1.length} clauses: [${seg1.join(' | ')}]`);

const seg2 = NLPEngine.segmentClauses("navigate to google.com, then search for research papers on transformers; and then click the first link");
assert(seg2.length >= 2, `Segmented multi-step punctuated prompt into ${seg2.length} clauses: [${seg2.join(' | ')}]`);

// -----------------------------------------------------------------------------
// 5. Semantic Intent Classification
// -----------------------------------------------------------------------------
console.log("\n--- 5. Semantic Intent Classification ---");

const int1 = NLPEngine.classifyIntent("watch lo-fi beats on youtube");
assert(int1.intent === "youtube_search_play", `Classified YouTube intent correctly (${int1.intent}, conf: ${int1.confidence})`);

const int2 = NLPEngine.classifyIntent("in a new google doc write a textbook about aiml");
assert(int2.intent === "doc_author", `Classified Google Docs authoring intent correctly (${int2.intent})`);

const int3="search for attention is all you need on scholar and cite paper";
assert(NLPEngine.classifyIntent(int3).intent === "scholar_research", `Classified Google Scholar intent correctly`);

const int4 = NLPEngine.classifyIntent("lookup quantum entanglement on wikipedia");
assert(int4.intent === "wikipedia_lookup", `Classified Wikipedia intent correctly (${int4.intent})`);

const int5 = NLPEngine.classifyIntent("explore transformers repository on github");
assert(int5.intent === "github_explore", `Classified GitHub intent correctly (${int5.intent})`);

const int6 = NLPEngine.classifyIntent("Authenticate officer ISRO-CMD-7712 with password Gaganyaan#2026 and authorize uplink");
assert(int6.intent === "isro_mission", `Classified ISRO Mission intent correctly (${int6.intent})`);

// -----------------------------------------------------------------------------
// 6. Precision Search Query Extraction
// -----------------------------------------------------------------------------
console.log("\n--- 6. Precision Search Query Extraction ---");

const qTests = [
  { input: 'open youtube and search for "computer networks" and then open and play the second video', expected: 'computer networks' },
  { input: 'open youtube and search for pesarma and then open and play the second video', expected: 'pesarma' },
  { input: 'search for \'artificial intelligence\' on youtube and click third video', expected: 'artificial intelligence' },
  { input: 'search quantum physics on google and click the second link', expected: 'quantum physics' },
  { input: 'open youtube and search SpaceX Starship flight test and play video', expected: 'SpaceX Starship flight test' },
  { input: 'look up distributed systems architecture on google', expected: 'distributed systems architecture' },
  { input: 'watch lex fridman podcast with sam altman on youtube', expected: 'lex fridman podcast with sam altman' },
  { input: 'find me research papers on reinforcement learning on google', expected: 'research papers on reinforcement learning' }
];

qTests.forEach((qt, idx) => {
  const extracted = NLPEngine.extractSearchQuery(qt.input);
  assert(extracted.toLowerCase() === qt.expected.toLowerCase(), `Query Test #${idx + 1}: Extracted "${extracted}" for "${qt.input}"`);
});

// -----------------------------------------------------------------------------
// 7. Target Ordinal & Positional Target Extraction
// -----------------------------------------------------------------------------
console.log("\n--- 7. Target Ordinal & Positional Target Extraction ---");

const ordTests = [
  { input: "play the first video", expectedIdx: 0, isLast: false },
  { input: "play the second video", expectedIdx: 1, isLast: false },
  { input: "click 2nd link", expectedIdx: 1, isLast: false },
  { input: "open the 3rd result", expectedIdx: 2, isLast: false },
  { input: "play video #4", expectedIdx: 3, isLast: false },
  { input: "select option 5", expectedIdx: 4, isLast: false },
  { input: "play the last video", expectedIdx: 0, isLast: true },
  { input: "click the penultimate link", expectedIdx: 1, isLast: false }
];

ordTests.forEach((ot, idx) => {
  const ord = NLPEngine.extractTargetOrdinal(ot.input);
  if (ot.isLast) {
    assert(ord.isLast === true, `Ordinal Test #${idx + 1} ("${ot.input}") -> correctly recognized as last`);
  } else {
    assert(ord.index === ot.expectedIdx, `Ordinal Test #${idx + 1} ("${ot.input}") -> index ${ord.index} (${ord.label})`);
  }
});

// -----------------------------------------------------------------------------
// 8. Form Credentials & Entity Extraction
// -----------------------------------------------------------------------------
console.log("\n--- 8. Form Credentials & Entity Extraction ---");

const entityGoal = "Authenticate officer ISRO-CMD-9021 with password Rocket#2026!Secret and pan card ABCDE1234F and email commander@isro.gov.in with budget under 50,000";
const entities = NLPEngine.extractFormEntities(entityGoal);

assert(entities.officer_id === "ISRO-CMD-9021", `Extracted Officer ID: ${entities.officer_id}`);
assert(entities.password === "Rocket#2026!Secret", `Extracted Password: ${entities.password}`);
assert(entities.pan === "ABCDE1234F", `Extracted Govt PAN: ${entities.pan}`);
assert(entities.email === "commander@isro.gov.in", `Extracted Email: ${entities.email}`);
assert(entities.max_price === 50000, `Extracted Max Price Budget: ₹${entities.max_price}`);

// -----------------------------------------------------------------------------
// 9. Comprehensive Collegiate Content Generation
// -----------------------------------------------------------------------------
console.log("\n--- 9. Comprehensive Collegiate Content Generation ---");

const aimlContent = NLPEngine.generateComprehensiveContent("write a textbook on aiml with all chapters");
assert(aimlContent.includes("CHAPTER 1: MATHEMATICAL FOUNDATIONS") && aimlContent.includes("CHAPTER 5: PRIVACY-PRESERVING AI"), "Generated complete 5-chapter AIML collegiate textbook");

const netContent = NLPEngine.generateComprehensiveContent("write textbook on computer networks");
assert(netContent.includes("7-LAYER OSI") && netContent.includes("TCP/IP"), "Generated Computer Networks curriculum chapters");

const osContent = NLPEngine.generateComprehensiveContent("write operating systems chapter on deadlocks and virtual memory");
assert(osContent.includes("Coffman Deadlock Conditions") && osContent.includes("PAGING TOPOLOGY"), "Generated Operating Systems textbook content");

const secContent = NLPEngine.generateComprehensiveContent("write an article on cybersecurity and zero trust");
assert(secContent.includes("ZERO TRUST SECURITY MODEL") && secContent.includes("AES-256-GCM"), "Generated Cybersecurity architectural chapter");

const dsaContent = NLPEngine.generateComprehensiveContent("write comprehensive data structures and algorithms tutorial");
assert(dsaContent.includes("ASYMPTOTIC NOTATION") && dsaContent.includes("DYNAMIC PROGRAMMING"), "Generated DSA collegiate tutorial");

const leaveContent = NLPEngine.generateComprehensiveContent("write a leave letter to hod for 2 days leave");
assert(leaveContent.includes("FORMAL ACADEMIC LEAVE APPLICATION") && leaveContent.includes("Respected Sir/Madam"), "Generated formal academic leave application");

// -----------------------------------------------------------------------------
// 10. TaskPlanner Integration with NLPEngine
// -----------------------------------------------------------------------------
console.log("\n--- 10. TaskPlanner Integration & Roadmap Generation ---");

const plan1 = TaskPlanner.decomposeGoal("Hey Pluto, please open youtube and search for 'computer networks' and play 2nd video", "about:blank");
assert(plan1.length >= 4, `TaskPlanner generated ${plan1.length} milestones for compound conversational instruction`);
assert(plan1[1].query === "computer networks", `Milestone 2 search query accurately extracted: "${plan1[1].query}"`);
assert(plan1[2].ordinalIndex === 1, `Milestone 3 video ordinal accurately set to index 1 (2nd video)`);

const plan2 = TaskPlanner.decomposeGoal("can you please open a new doc and author an essay on modern operating systems", "about:blank");
assert(plan2.some(m => m.type === 'navigate' && m.targetUrl.includes('docs.new')), "TaskPlanner generated Google Docs initialization milestone");
assert(plan2.some(m => m.type === 'type_content'), "TaskPlanner included comprehensive content typing milestone");

console.log("\n==========================================================");
console.log(`  🎯 NLP ENGINE SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log("==========================================================\n");

if (failed > 0) process.exit(1);
