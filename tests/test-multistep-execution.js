/**
 * Test Multi-Step Sequential Execution
 */
import { LLMProviderManager } from '../background/providers.js';

console.log("==================================================");
console.log("  Testing Multi-Step Sequential Execution Flow");
console.log("==================================================\n");

let passed = 0;
let failed = 0;

function assert(cond, name) {
  if (cond) {
    console.log(`  ✅ [PASS] ${name}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${name}`);
    failed++;
  }
}

// 1. Test ISRO Dashboard Sequential Steps (Officer ID -> Password -> PAN -> Uplink -> Finish)
const isroTags = [
  { tag: "1", name: "officer_id", tagName: "INPUT", type: "text", placeholder: "ISRO Officer ID" },
  { tag: "2", name: "pwd", tagName: "INPUT", type: "password", placeholder: "Password" },
  { tag: "3", name: "pan_number", tagName: "INPUT", type: "text", placeholder: "PAN Card" },
  { tag: "4", tagName: "BUTTON", text: "Access Mission Data & Authorize Uplink", type: "submit" }
];

const history = [];
const goal = "Authenticate officer ISRO-CMD-7712 with password Gaganyaan#2026!Secret and PAN ABCDE1234F and authorize uplink";

// Step 1
const s1 = LLMProviderManager.heuristicSimulator({ goal, step: 1, tags: isroTags, history });
assert(s1.action === "type" && s1.target_tag === "1", `Step 1 types Officer ID (action: ${s1.action}, tag: ${s1.target_tag})`);
history.push({ step: 1, action: s1.action, target_tag: s1.target_tag, value: s1.value, thought: s1.thought });

// Step 2
const s2 = LLMProviderManager.heuristicSimulator({ goal, step: 2, tags: isroTags, history });
assert(s2.action === "type" && s2.target_tag === "2", `Step 2 types Password (action: ${s2.action}, tag: ${s2.target_tag})`);
history.push({ step: 2, action: s2.action, target_tag: s2.target_tag, value: s2.value, thought: s2.thought });

// Step 3
const s3 = LLMProviderManager.heuristicSimulator({ goal, step: 3, tags: isroTags, history });
assert(s3.action === "type" && s3.target_tag === "3", `Step 3 types PAN (action: ${s3.action}, tag: ${s3.target_tag})`);
history.push({ step: 3, action: s3.action, target_tag: s3.target_tag, value: s3.value, thought: s3.thought });

// Step 4
const s4 = LLMProviderManager.heuristicSimulator({ goal, step: 4, tags: isroTags, history });
assert(s4.action === "click" && s4.target_tag === "4", `Step 4 clicks Uplink Submit button (action: ${s4.action}, tag: ${s4.target_tag})`);
history.push({ step: 4, action: s4.action, target_tag: s4.target_tag, value: s4.value, thought: s4.thought });

// Step 5
const s5 = LLMProviderManager.heuristicSimulator({ goal, step: 5, tags: isroTags, history });
assert(s5.action === "finish", `Step 5 finishes with telemetry lock after all fields and submit button executed (action: ${s5.action})`);

// 2. Test YouTube Workflow (Search -> Click Video -> Finish)
const ytHistory = [];
const ytGoal = "search for SpaceX Starship on youtube and play video";
const ytTags = [
  { tag: "1", name: "search_query", tagName: "INPUT", placeholder: "Search" },
  { tag: "2", id: "video-title", tagName: "A", href: "/watch?v=123", text: "SpaceX Starship Flight Test" }
];

const yt1 = LLMProviderManager.heuristicSimulator({ goal: ytGoal, step: 1, url: "https://www.youtube.com", tags: ytTags, history: ytHistory });
assert(yt1.action === "type" && yt1.target_tag === "1", `YouTube Step 1 types search query (action: ${yt1.action}, tag: ${yt1.target_tag})`);
ytHistory.push({ step: 1, action: yt1.action, target_tag: yt1.target_tag, value: yt1.value });

const yt2 = LLMProviderManager.heuristicSimulator({ goal: ytGoal, step: 2, url: "https://www.youtube.com", tags: ytTags, history: ytHistory });
assert(yt2.action === "click" && yt2.target_tag === "2", `YouTube Step 2 clicks video result (action: ${yt2.action}, tag: ${yt2.target_tag})`);
ytHistory.push({ step: 2, action: yt2.action, target_tag: yt2.target_tag });

const yt3 = LLMProviderManager.heuristicSimulator({ goal: ytGoal, step: 3, url: "https://www.youtube.com", tags: ytTags, history: ytHistory });
assert(yt3.action === "finish", `YouTube Step 3 finishes after video playback initiated (action: ${yt3.action})`);

// 4. Test User Prompt: "open youtube and search for \"computer networks\" and then open and play the second video"
const userGoal = 'open youtube and search for "computer networks" and then open and play the second video';
const userYtHistory = [];
const userYtTags = [
  { tag: "1", name: "search_query", id: "search", tagName: "INPUT", placeholder: "Search" },
  { tag: "2", id: "video-title", tagName: "A", href: "/watch?v=vid1", text: "Computer Networks Full Course - 1st Video" },
  { tag: "3", id: "video-title", tagName: "A", href: "/watch?v=vid2", text: "Computer Networking in 100 Seconds - 2nd Video" },
  { tag: "4", id: "video-title", tagName: "A", href: "/watch?v=vid3", text: "TCP/IP Protocol Explained - 3rd Video" }
];

const uStep1 = LLMProviderManager.heuristicSimulator({
  goal: userGoal,
  step: 1,
  url: "https://www.youtube.com",
  tags: userYtTags,
  history: userYtHistory
});
assert(uStep1.action === "type" && uStep1.target_tag === "1" && uStep1.value === "computer networks", `User Prompt Step 1 types "computer networks" (got: "${uStep1.value}", tag: ${uStep1.target_tag})`);
userYtHistory.push({ step: 1, action: uStep1.action, target_tag: uStep1.target_tag, value: uStep1.value });

const uStep2 = LLMProviderManager.heuristicSimulator({
  goal: userGoal,
  step: 2,
  url: "https://www.youtube.com/results?search_query=computer+networks",
  tags: userYtTags,
  history: userYtHistory
});
assert(uStep2.action === "click" && uStep2.target_tag === "3", `User Prompt Step 2 clicks SECOND video [TAG_3] (got: tag ${uStep2.target_tag})`);
userYtHistory.push({ step: 2, action: uStep2.action, target_tag: uStep2.target_tag });

const uStep3 = LLMProviderManager.heuristicSimulator({
  goal: userGoal,
  step: 3,
  url: "https://www.youtube.com/watch?v=vid2",
  tags: userYtTags,
  history: userYtHistory
});
assert(uStep3.action === "finish", `User Prompt Step 3 finishes on watch page (action: ${uStep3.action})`);

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
