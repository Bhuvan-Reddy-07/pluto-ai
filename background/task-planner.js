/**
 * PlutoAI - Task Planner & Execution Organizer
 * Decomposes natural language prompts into sequential, verifiable milestones.
 * Powered by centralized NLPEngine semantic parser and intent classifier.
 */

import { NLPEngine } from './nlp-engine.js';

export class TaskPlanner {
  /**
   * Decomposes a user goal into an organized, sequential execution plan.
   * @param {string} goal - The raw user instruction
   * @param {string} currentUrl - Current active browser URL
   * @returns {Array<Object>} List of structured milestones
   */
  static decomposeGoal(goal, currentUrl = '') {
    const rawGoal = (goal || '').trim();
    const normalizedGoal = NLPEngine.normalizeText(rawGoal);
    const goalLower = normalizedGoal.toLowerCase();
    const currentHref = (currentUrl || '').toLowerCase();
    const milestones = [];
    let milestoneId = 1;

    const platformInfo = NLPEngine.extractPlatformAndTargetUrl(rawGoal, currentUrl);
    const query = NLPEngine.extractSearchQuery(rawGoal);
    const ordinal = NLPEngine.extractTargetOrdinal(rawGoal);
    const entities = NLPEngine.extractFormEntities(rawGoal);

    // =========================================================================
    // PLAN TYPE A: YouTube Search & Video Playback Flow
    // =========================================================================
    if (platformInfo.platform === 'youtube' || goalLower.includes('youtube')) {
      const isAlreadyOnYt = currentHref.includes('youtube.com');

      milestones.push({
        id: milestoneId++,
        title: "Navigate to YouTube",
        description: "Open YouTube homepage in active browser tab",
        type: "navigate",
        targetUrl: "https://www.youtube.com",
        status: isAlreadyOnYt ? "completed" : "pending",
        expectedUrl: "youtube.com"
      });

      if (goalLower === "open youtube" || goalLower === "youtube" || goalLower === "go to youtube") {
        milestones.push({
          id: milestoneId++,
          title: "Verify YouTube Homepage",
          description: "Confirm YouTube loaded successfully",
          type: "verify",
          status: "pending"
        });
        return milestones;
      }

      milestones.push({
        id: milestoneId++,
        title: `Search for "${query}"`,
        description: `Locate search input, type "${query}" and press Enter`,
        type: "search",
        query,
        targetInput: "search_query",
        pressEnter: true,
        status: "pending",
        expectedUrl: "youtube.com/results"
      });

      milestones.push({
        id: milestoneId++,
        title: `Open ${ordinal.label} Video`,
        description: `Locate search result #${ordinal.index + 1} and click video title/thumbnail`,
        type: "click_result",
        ordinalIndex: ordinal.index,
        ordinalLabel: ordinal.label,
        isLast: ordinal.isLast || false,
        status: "pending",
        expectedUrl: "youtube.com/watch"
      });

      milestones.push({
        id: milestoneId++,
        title: "Verify Video Playback",
        description: "Confirm video player mounted and streaming content",
        type: "verify_playback",
        status: "pending"
      });

      return milestones;
    }

    // =========================================================================
    // PLAN TYPE B: Google Forms & Quiz Answering Flow
    // =========================================================================
    const isFormQuiz = platformInfo.platform === 'google_forms' || goalLower.includes('quiz') || goalLower.includes('google forms') || goalLower.includes('forms.gle') || goalLower.includes('forms.google.com');
    if (isFormQuiz) {
      const isInsideForm = currentHref.includes('docs.google.com/forms') || currentHref.includes('forms.gle') || currentHref.includes('forms.google.com');

      milestones.push({
        id: milestoneId++,
        title: "Navigate to Google Form / Quiz",
        description: `Open Google Form at ${platformInfo.targetUrl || 'active URL'}`,
        type: "navigate",
        targetUrl: platformInfo.targetUrl,
        status: isInsideForm ? "completed" : "pending",
        expectedUrl: "docs.google.com/forms"
      });

      milestones.push({
        id: milestoneId++,
        title: "Perceive Quiz Questions & Fields",
        description: "Identify all multiple-choice radio options, text inputs, and question stems",
        type: "perceive_quiz",
        status: "pending"
      });

      milestones.push({
        id: milestoneId++,
        title: "Select Answers & Populate Responses",
        description: "Select accurate options and populate short-answer fields with zero PII leaks",
        type: "answer_quiz",
        status: "pending"
      });

      milestones.push({
        id: milestoneId++,
        title: "Submit Form & Verify Confirmation",
        description: "Click submission button and confirm response recorded",
        type: "submit_and_verify",
        status: "pending"
      });

      return milestones;
    }

    // =========================================================================
    // PLAN TYPE C: Google Sheets / Spreadsheet Data Flow
    // =========================================================================
    const isSheetTask = platformInfo.platform === 'google_sheets' || goalLower.includes('google sheets') || goalLower.includes('spreadsheet') || goalLower.includes('sheets.new') || goalLower.includes('sheets.google.com');
    if (isSheetTask) {
      const isInsideSheet = currentHref.includes('docs.google.com/spreadsheets') || currentHref.includes('sheets.google.com');

      milestones.push({
        id: milestoneId++,
        title: "Initialize Google Spreadsheet",
        description: "Open Google Sheets workbook at https://sheets.new",
        type: "navigate",
        targetUrl: platformInfo.targetUrl || "https://sheets.new",
        status: isInsideSheet ? "completed" : "pending",
        expectedUrl: "docs.google.com/spreadsheets"
      });

      milestones.push({
        id: milestoneId++,
        title: "Mount Spreadsheet Grid Canvas",
        description: "Focus Google Sheets formula bar and cell coordinate grid",
        type: "focus_editor",
        status: "pending"
      });

      milestones.push({
        id: milestoneId++,
        title: "Enter Data & Formulas",
        description: "Populate tabular data entries and functions with privacy protection",
        type: "type_content",
        status: "pending"
      });

      milestones.push({
        id: milestoneId++,
        title: "Verify Spreadsheet State",
        description: "Confirm workbook updated and calculations saved",
        type: "verify_doc",
        status: "pending"
      });

      return milestones;
    }

    // =========================================================================
    // PLAN TYPE D: Google Docs Authoring Flow
    // =========================================================================
    const isDocTask = platformInfo.platform === 'google_docs' || (/\b(doc|docs|document|textbook|essay|article|draft|notes|leave letter|permission letter|sop|resume)\b/i.test(rawGoal) && !goalLower.includes('doctor') && !goalLower.includes('pan') && !isFormQuiz && !isSheetTask);
    if (isDocTask) {
      const isInsideDoc = currentHref.includes('docs.google.com/document/d/') || currentHref.includes('/edit');

      milestones.push({
        id: milestoneId++,
        title: "Initialize Google Document",
        description: "Open Google Docs editor at https://docs.new",
        type: "navigate",
        targetUrl: platformInfo.targetUrl || "https://docs.new",
        status: isInsideDoc ? "completed" : "pending",
        expectedUrl: "docs.google.com"
      });

      milestones.push({
        id: milestoneId++,
        title: "Mount Document Canvas Editor",
        description: "Focus Google Docs kix-canvas typography surface",
        type: "focus_editor",
        status: "pending"
      });

      milestones.push({
        id: milestoneId++,
        title: "Author Structured Content",
        description: "Generate and type comprehensive structured chapters with zero privacy leaks",
        type: "type_content",
        status: "pending"
      });

      milestones.push({
        id: milestoneId++,
        title: "Finalize & Verify Document",
        description: "Verify document body saved and formatted cleanly",
        type: "verify_doc",
        status: "pending"
      });

      return milestones;
    }

    // =========================================================================
    // PLAN TYPE C: Google Scholar Research Papers Flow
    // =========================================================================
    if (platformInfo.platform === 'google_scholar') {
      const isAlreadyOnScholar = currentHref.includes('scholar.google.com');

      milestones.push({
        id: milestoneId++,
        title: "Navigate to Google Scholar",
        description: "Open Google Scholar at https://scholar.google.com",
        type: "navigate",
        targetUrl: "https://scholar.google.com",
        status: isAlreadyOnScholar ? "completed" : "pending",
        expectedUrl: "scholar.google.com"
      });

      milestones.push({
        id: milestoneId++,
        title: `Search Academic Papers for "${query}"`,
        description: `Search peer-reviewed papers for "${query}"`,
        type: "search",
        query,
        targetInput: "q",
        pressEnter: true,
        status: "pending",
        expectedUrl: "scholar.google.com/scholar"
      });

      milestones.push({
        id: milestoneId++,
        title: `Explore ${ordinal.label} Research Paper`,
        description: `Navigate to paper #${ordinal.index + 1} and extract citation telemetry`,
        type: "click_result",
        ordinalIndex: ordinal.index,
        ordinalLabel: ordinal.label,
        status: "pending"
      });

      milestones.push({
        id: milestoneId++,
        title: "Synthesize Academic Literature",
        description: "Extract findings and abstract with zero privacy leaks",
        type: "verify",
        status: "pending"
      });

      return milestones;
    }

    // =========================================================================
    // PLAN TYPE D: Wikipedia Encyclopedia Flow
    // =========================================================================
    if (platformInfo.platform === 'wikipedia') {
      const isAlreadyOnWiki = currentHref.includes('wikipedia.org');

      milestones.push({
        id: milestoneId++,
        title: "Navigate to Wikipedia",
        description: "Open Wikipedia encyclopedia at https://www.wikipedia.org",
        type: "navigate",
        targetUrl: "https://www.wikipedia.org",
        status: isAlreadyOnWiki ? "completed" : "pending",
        expectedUrl: "wikipedia.org"
      });

      milestones.push({
        id: milestoneId++,
        title: `Lookup "${query}"`,
        description: `Search encyclopedic article for "${query}"`,
        type: "search",
        query,
        targetInput: "search",
        pressEnter: true,
        status: "pending"
      });

      milestones.push({
        id: milestoneId++,
        title: "Verify Encyclopedia Article",
        description: "Confirm article content rendered and accessible",
        type: "verify",
        status: "pending"
      });

      return milestones;
    }

    // =========================================================================
    // PLAN TYPE E: GitHub Repository Exploration Flow
    // =========================================================================
    if (platformInfo.platform === 'github') {
      const isAlreadyOnGithub = currentHref.includes('github.com');

      milestones.push({
        id: milestoneId++,
        title: `Navigate to GitHub`,
        description: `Open ${platformInfo.targetUrl}`,
        type: "navigate",
        targetUrl: platformInfo.targetUrl,
        status: isAlreadyOnGithub ? "completed" : "pending",
        expectedUrl: "github.com"
      });

      if (query && query !== "Trending" && !platformInfo.targetUrl.includes('/')) {
        milestones.push({
          id: milestoneId++,
          title: `Search Repositories for "${query}"`,
          description: `Search open-source repositories matching "${query}"`,
          type: "search",
          query,
          pressEnter: true,
          status: "pending"
        });
      }

      milestones.push({
        id: milestoneId++,
        title: "Inspect Codebase & README",
        description: "Verify repository source tree and project specifications",
        type: "verify",
        status: "pending"
      });

      return milestones;
    }

    // =========================================================================
    // PLAN TYPE F: Google Search & Link Exploration Flow
    // =========================================================================
    if (goalLower.includes('google') || goalLower.includes('search for') || goalLower.includes('look up') || (goalLower.includes('search') && !goalLower.includes('youtube'))) {
      const isAlreadyOnGoogle = currentHref.includes('google.com');

      milestones.push({
        id: milestoneId++,
        title: "Navigate to Google Search",
        description: "Open Google search engine at https://www.google.com",
        type: "navigate",
        targetUrl: "https://www.google.com",
        status: isAlreadyOnGoogle ? "completed" : "pending",
        expectedUrl: "google.com"
      });

      milestones.push({
        id: milestoneId++,
        title: `Search for "${query}"`,
        description: `Type "${query}" into Google search box and submit query`,
        type: "search",
        query,
        targetInput: "q",
        pressEnter: true,
        status: "pending",
        expectedUrl: "google.com/search"
      });

      milestones.push({
        id: milestoneId++,
        title: `Open ${ordinal.label} Search Result`,
        description: `Locate search result link #${ordinal.index + 1} and navigate`,
        type: "click_result",
        ordinalIndex: ordinal.index,
        ordinalLabel: ordinal.label,
        status: "pending"
      });

      milestones.push({
        id: milestoneId++,
        title: "Verify Destination Page",
        description: "Confirm destination web page loaded successfully",
        type: "verify",
        status: "pending"
      });

      return milestones;
    }

    // =========================================================================
    // PLAN TYPE G: Authentication / Multi-Step Form Submission Flow
    // =========================================================================
    const isAuth = /\b(auth|authenticate|authorized|authorization|login|signin|sign in|password|pan|officer|credentials)\b/i.test(goalLower);
    if (isAuth) {
      milestones.push({
        id: milestoneId++,
        title: `Locate & Fill Officer / Username (${entities.officer_id || 'ID'})`,
        description: "Identify user ID input field and enter verified credentials",
        type: "fill_field",
        field: "officer_id",
        status: "pending"
      });

      milestones.push({
        id: milestoneId++,
        title: "Apply Zero-Leak Password Mask",
        description: "Populate password field with on-device cryptographic protection",
        type: "fill_field",
        field: "password",
        status: "pending"
      });

      milestones.push({
        id: milestoneId++,
        title: "Populate Verification ID (PAN / Card)",
        description: "Enter sanitized personal identifier record",
        type: "fill_field",
        field: "pan",
        status: "pending"
      });

      milestones.push({
        id: milestoneId++,
        title: "Submit Authorization & Verify",
        description: "Click submission button and verify telemetry confirmation",
        type: "submit_and_verify",
        status: "pending"
      });

      return milestones;
    }

    // =========================================================================
    // PLAN TYPE: Page Inspection & On-Device Sanitization Flow
    // =========================================================================
    const isInspectSanitize = /\b(inspect|sanitize|scan|redact|pii|privacy audit)\b/i.test(goalLower) && (goalLower.includes('page') || goalLower.includes('present') || goalLower.includes('current') || goalLower.includes('sanitize') || goalLower.includes('inspect'));
    if (isInspectSanitize) {
      milestones.push({
        id: milestoneId++,
        title: "Perceive & Index Page DOM",
        description: "Extract Set-of-Marks tags and visual hierarchy on current tab",
        type: "perceive",
        status: "pending"
      });

      milestones.push({
        id: milestoneId++,
        title: "Scan On-Device for Sensitive PII",
        description: "Detect credentials, financial tokens, identity records, and sensitive forms",
        type: "scan_pii",
        status: "pending"
      });

      milestones.push({
        id: milestoneId++,
        title: "Apply Privacy Firewall & Redactions",
        description: "Sanitize visual canvas and mask DOM nodes locally",
        type: "sanitize_page",
        status: "pending"
      });

      milestones.push({
        id: milestoneId++,
        title: "Verify Sanitization & Finalize Audit",
        description: "Confirm zero raw PII leaks and display sanitized preview",
        type: "verify",
        status: "pending"
      });

      return milestones;
    }

    // =========================================================================
    // PLAN TYPE I: General Autonomous Web Flow (Default Fallback)
    // =========================================================================
    if (platformInfo.targetUrl && platformInfo.platform !== 'general_web') {
      milestones.push({
        id: milestoneId++,
        title: `Navigate to ${platformInfo.targetUrl}`,
        description: `Open destination ${platformInfo.targetUrl}`,
        type: "navigate",
        targetUrl: platformInfo.targetUrl,
        status: platformInfo.isCurrent ? "completed" : "pending"
      });
    }

    milestones.push({
      id: milestoneId++,
      title: "Perceive & Ground Visual State",
      description: "Extract Set-of-Marks tags and scan for on-device sensitive PII",
      type: "perceive",
      status: "pending"
    });

    milestones.push({
      id: milestoneId++,
      title: "Execute Target Actions",
      description: `Autonomously perform interactions to achieve: "${rawGoal}"`,
      type: "interact",
      status: "pending"
    });

    milestones.push({
      id: milestoneId++,
      title: "Verify Task Outcome",
      description: "Confirm completion state with 0 raw PII leaked",
      type: "verify",
      status: "pending"
    });

    return milestones;
  }

  /**
   * Synchronizes and updates milestone statuses based on current execution history and browser state.
   */
  static updateMilestoneProgress(plan, currentUrl = '', history = []) {
    if (!plan || plan.length === 0) return { plan: [], activeIndex: 0, activeMilestone: null, isAllCompleted: false };

    const currentHref = (currentUrl || '').toLowerCase();
    const hasNavigated = history.some(h => h.action === 'navigate');
    const hasTyped = history.some(h => h.action === 'type');
    const hasClicked = history.some(h => h.action === 'click');

    for (let i = 0; i < plan.length; i++) {
      const m = plan[i];

      if (m.type === 'navigate') {
        if (m.expectedUrl && currentHref.includes(m.expectedUrl.toLowerCase())) {
          m.status = 'completed';
        } else if (hasNavigated) {
          m.status = 'completed';
        }
      } else if (m.type === 'search') {
        if (m.expectedUrl && currentHref.includes(m.expectedUrl.toLowerCase())) {
          m.status = 'completed';
        } else if (currentHref.includes('/results') || currentHref.includes('/search')) {
          m.status = 'completed';
        }
      } else if (m.type === 'click_result') {
        if (m.expectedUrl && currentHref.includes(m.expectedUrl.toLowerCase())) {
          m.status = 'completed';
        } else if (currentHref.includes('/watch')) {
          m.status = 'completed';
        } else if (hasClicked && !currentHref.includes('google.com') && !currentHref.includes('youtube.com') && currentHref.startsWith('http')) {
          m.status = 'completed';
        }
      } else if (m.type === 'type_content') {
        if (hasTyped) {
          m.status = 'completed';
        }
      } else if (m.type === 'fill_field') {
        const fieldTyped = history.some(h => h.action === 'type' && (h.thought?.toLowerCase().includes(m.field || '') || h.details?.toLowerCase().includes(m.field || '')));
        if (fieldTyped) {
          m.status = 'completed';
        }
      } else if (m.type === 'perceive_quiz') {
        if (hasClicked || hasTyped) {
          m.status = 'completed';
        }
      } else if (m.type === 'answer_quiz') {
        if (hasClicked || hasTyped) {
          m.status = 'completed';
        }
      } else if (m.type === 'submit_and_verify') {
        if (hasClicked) {
          m.status = 'completed';
        }
      } else if (m.type === 'verify_playback') {
        if (currentHref.includes('/watch') && history.some(h => h.action === 'finish')) {
          m.status = 'completed';
        }
      } else if (m.type === 'verify_doc' || m.type === 'verify') {
        if (history.some(h => h.action === 'finish')) {
          m.status = 'completed';
        }
      }
    }

    let activeIndex = plan.findIndex(m => m.status === 'pending' || m.status === 'in_progress');
    if (activeIndex === -1) {
      activeIndex = plan.length - 1;
    } else {
      plan[activeIndex].status = 'in_progress';
    }

    const isAllCompleted = plan.every(m => m.status === 'completed');

    return {
      plan,
      activeIndex,
      activeMilestone: plan[activeIndex] || null,
      isAllCompleted
    };
  }

  /**
   * Generates a structured prompt block for LLM providers detailing the roadmap.
   */
  static formatPlanForPrompt(plan, activeIndex = 0) {
    if (!plan || plan.length === 0) return '';

    const lines = [
      "=== STRUCTURED EXECUTION PLAN & ACTIVE MILESTONES ===",
      "You MUST follow this roadmap sequentially. Do NOT skip milestones or terminate early."
    ];

    plan.forEach((m, idx) => {
      const statusSymbol = m.status === 'completed' ? '[COMPLETED ✅]' : (idx === activeIndex ? '[ACTIVE 🔄]' : '[PENDING ⏳]');
      lines.push(`${idx + 1}. ${statusSymbol} ${m.title} — ${m.description}`);
    });

    const current = plan[activeIndex];
    if (current) {
      lines.push(`\nCURRENT ACTIVE MILESTONE: #${activeIndex + 1} "${current.title}"`);
      lines.push(`GOAL FOR THIS STEP: Execute the single next immediate action to make progress on Milestone #${activeIndex + 1}.`);
    }

    lines.push("====================================================\n");
    return lines.join('\n');
  }
}
