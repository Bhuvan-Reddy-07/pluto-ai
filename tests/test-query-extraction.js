/**
 * PlutoAI - Query & Semantic Entity Extraction Tests
 * Powered by centralized NLPEngine
 */

import { NLPEngine } from '../background/nlp-engine.js';

console.log("==========================================================");
console.log("  🔍 Testing Advanced Query & Entity Extraction Suite");
console.log("==========================================================\n");

const testCases = [
  {
    goal: 'Hey Pluto AI, can you please open youtube and search for "computer networks" and then open and play the second video?',
    expectedQuery: 'computer networks',
    expectedOrdinal: 1,
    expectedPlatform: 'youtube'
  },
  {
    goal: 'open you tub and search for pesarma and then open and play the second video',
    expectedQuery: 'pesarma',
    expectedOrdinal: 1,
    expectedPlatform: 'youtube'
  },
  {
    goal: 'open youtube and search pesarma and play the second video',
    expectedQuery: 'pesarma',
    expectedOrdinal: 1,
    expectedPlatform: 'youtube'
  },
  {
    goal: 'open youtube and search for "pesarma" and then open and play the second video',
    expectedQuery: 'pesarma',
    expectedOrdinal: 1,
    expectedPlatform: 'youtube'
  },
  {
    goal: 'search for computer networks on youtube and play the 2nd video',
    expectedQuery: 'computer networks',
    expectedOrdinal: 1,
    expectedPlatform: 'youtube'
  },
  {
    goal: 'search for \'artificial intelligence\' on youtube and click third video',
    expectedQuery: 'artificial intelligence',
    expectedOrdinal: 2,
    expectedPlatform: 'youtube'
  },
  {
    goal: 'open youtube and search SpaceX Starship flight test and play video',
    expectedQuery: 'SpaceX Starship flight test',
    expectedOrdinal: 0,
    expectedPlatform: 'youtube'
  },
  {
    goal: 'search quantum physics on google and click the second link',
    expectedQuery: 'quantum physics',
    expectedOrdinal: 1,
    expectedPlatform: 'google_search'
  },
  {
    goal: 'open youtube and search for "lo-fi beats to relax" and play first video',
    expectedQuery: 'lo-fi beats to relax',
    expectedOrdinal: 0,
    expectedPlatform: 'youtube'
  },
  {
    goal: 'could you find me research papers on transformers on scholar and cite the 3rd paper',
    expectedQuery: 'research papers on transformers',
    expectedOrdinal: 2,
    expectedPlatform: 'google_scholar'
  },
  {
    goal: 'in a new doc write a textbook about aiml and computer networks',
    expectedQuery: 'aiml and computer networks',
    expectedOrdinal: 0,
    expectedPlatform: 'google_docs'
  },
  {
    goal: 'lookup Dijkstra shortest path algorithm on wikipedia',
    expectedQuery: 'Dijkstra shortest path algorithm',
    expectedOrdinal: 0,
    expectedPlatform: 'wikipedia'
  },
  {
    goal: 'search for deepseek v3 on google and open the fourth result',
    expectedQuery: 'deepseek v3',
    expectedOrdinal: 3,
    expectedPlatform: 'google_search'
  },
  {
    goal: 'open youtube and play video #5 for MIT linear algebra lecture 1',
    expectedQuery: 'MIT linear algebra lecture 1',
    expectedOrdinal: 4,
    expectedPlatform: 'youtube'
  },
  {
    goal: 'watch the last video of Andrew Ng machine learning playlist on youtube',
    expectedQuery: 'Andrew Ng machine learning playlist',
    expectedOrdinal: 0,
    expectedPlatform: 'youtube'
  }
];

let passed = 0;
let failed = 0;

testCases.forEach((tc, idx) => {
  const q = NLPEngine.extractSearchQuery(tc.goal);
  const ord = NLPEngine.extractTargetOrdinal(tc.goal);
  const plat = NLPEngine.extractPlatformAndTargetUrl(tc.goal);

  const queryOk = q.toLowerCase() === tc.expectedQuery.toLowerCase();
  const ordOk = ord.index === tc.expectedOrdinal || (tc.goal.includes('last') && ord.isLast);
  const platOk = plat.platform === tc.expectedPlatform;

  if (queryOk && ordOk && platOk) {
    console.log(`  ✅ [PASS] Case #${idx + 1}: Query="${q}", Ordinal=${ord.index} (${ord.label}), Platform=${plat.platform}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] Case #${idx + 1}: Goal="${tc.goal}"`);
    if (!queryOk) console.error(`     Query Mismatch: got "${q}", expected "${tc.expectedQuery}"`);
    if (!ordOk) console.error(`     Ordinal Mismatch: got ${ord.index}, expected ${tc.expectedOrdinal}`);
    if (!platOk) console.error(`     Platform Mismatch: got "${plat.platform}", expected "${tc.expectedPlatform}"`);
    failed++;
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
