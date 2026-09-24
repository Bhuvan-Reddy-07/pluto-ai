/**
 * PlutoAI - Advanced Natural Language Processing & Semantic Understanding Engine
 * Architecture: TOKENIZE -> NORMALIZE -> SPELL_CORRECT -> SEGMENT -> CLASSIFY INTENT -> EXTRACT SLOTS & ENTITIES -> PLAN ROADMAP
 */

export class NLPEngine {
  /**
   * Common Conversational Fillers, Politeness Prefixes & Chatbot Preamble
   */
  static CONVERSATIONAL_FILLERS = [
    /^(?:hey\s+|hi\s+|hello\s+|yo\s+|ok\s+|okay\s+)?(?:pluto(?:\s*ai)?|agent|bot|assistant|pluto|friend|bro)[,\s:]*/i,
    /^(?:can\s+you\s+(?:please\s+|kindly\s+)?|could\s+you\s+(?:please\s+|kindly\s+)?|would\s+you\s+(?:please\s+)?|please\s+|kindly\s+|plz\s+)/i,
    /^(?:i\s+(?:would\s+like|want|need|wish)\s+(?:you\s+)?to\s+|help\s+me\s+(?:to\s+)?|i'd\s+like\s+to\s+|i\s+need\s+to\s+)/i,
    /^(?:just\s+|go\s+ahead\s+and\s+|be\s+sure\s+to\s+|make\s+sure\s+to\s+|i\s+want\s+to\s+)/i,
    /^(?:do\s+a\s+quick\s+|run\s+a\s+|perform\s+a\s+|execute\s+a\s+)/i,
    /^(?:for\s+me\s+|now\s+)/i
  ];

  /**
   * Domain-Specific Spelling Corrections & Phonetic / Colloquial Replacements
   */
  static SPELLING_CORRECTIONS = [
    // Video / Platforms
    [/\b(you\s*tub[e]?|youtub|utube|u-tube|yt)\b/gi, 'youtube'],
    [/\b(gogle|googl|gooogle|gogl)\b/gi, 'google'],
    [/\b(wikipidia|wikpedia|wekipedia|wiki)\b/gi, 'wikipedia'],
    [/\b(amzon|amzn|amazn)\b/gi, 'amazon'],
    [/\b(flipcart|flipkt)\b/gi, 'flipkart'],
    [/\b(gthub|githb|git-hub)\b/gi, 'github'],
    [/\b(scholr|schlr|google\s+scholar)\b/gi, 'scholar'],
    [/\b(gforms|gform|g\s+form|g\s+forms|googl\s+forms)\b/gi, 'google forms'],
    [/\b(gsheets|gsheet|g\s+sheet|g\s+sheets|spread\s*sheet)\b/gi, 'google sheets'],

    // Technical & Academic Terms
    [/\b(netwroks|netwrok|netowrk|netwrk|networking)\b/gi, 'networks'],
    [/\b(artifical|artifitial|arteficial)\b/gi, 'artificial'],
    [/\b(inteligence|intellegence|inteligense)\b/gi, 'intelligence'],
    [/\b(machin\s+learning|machne\s+learning|ml)\b/gi, 'machine learning'],
    [/\b(aiml|ai\/ml|ai-ml)\b/gi, 'aiml'],
    [/\b(operatng\s+system|oprating\s+system|os)\b/gi, 'operating system'],
    [/\b(cyber\s*sec|secrity|securty|cybr\s+security)\b/gi, 'cybersecurity'],
    [/\b(cryptograhpy|cryptogrpahy|crypto)\b/gi, 'cryptography'],
    [/\b(algo|algos|algortihm|algoritm)\b/gi, 'algorithm'],
    [/\b(structurs|datstructures|dsa)\b/gi, 'data structures'],
    [/\b(databse|datbase|dbms)\b/gi, 'database'],
    [/\b(aerodinamics|aerodynmics|aerodinamik|aerodynamic)\b/gi, 'aerodynamics'],
    [/\b(quadcoper|quadcoptor|quadrotor|dronee|dron)\b/gi, 'drone'],
    [/\b(airfoill|aerofoil|airfol)\b/gi, 'airfoil'],
    [/\b(bernouli|bernoullie|bernoli)\b/gi, 'bernoulli'],
    [/\b(avioncs|avionic|avionix)\b/gi, 'avionics'],
    [/\b(propellor|propelar|propller)\b/gi, 'propeller'],

    // Documents & Actions
    [/\b(doccument|docuemnt|documnt|documnet)\b/gi, 'document'],
    [/\b(textbok|txtbook|text\s+book)\b/gi, 'textbook'],
    [/\b(artcle|artical)\b/gi, 'article'],
    [/\b(authenicate|autheticate|authentcat)\b/gi, 'authenticate'],
    [/\b(passwrd|passowrd|pwd|pswd)\b/gi, 'password'],
    [/\b(oficer|offcr)\b/gi, 'officer'],
    [/\b(gaganayan|gaganyan)\b/gi, 'gaganyaan'],
    [/\b(quizes|quizz|queez)\b/gi, 'quiz'],
    [/\b(responces|respons)\b/gi, 'responses']
  ];

  /**
   * Normalizes raw natural language input:
   * - Cleans unicode quotes and dashes
   * - Expands English contractions
   * - Corrects domain typos and phonetic variations
   * - Strips conversational padding & politeness wrappers
   * - Trims redundant whitespace
   */
  static normalizeText(rawText) {
    if (!rawText || typeof rawText !== 'string') return '';

    let text = rawText
      .replace(/[\u2018\u2019`´]/g, "'")
      .replace(/[\u201C\u201D""]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/\s+/g, ' ')
      .trim();

    // Expand common contractions
    text = text
      .replace(/\bcan't\b/gi, 'cannot')
      .replace(/\bwon't\b/gi, 'will not')
      .replace(/\bi'm\b/gi, 'i am')
      .replace(/\bi'd\b/gi, 'i would')
      .replace(/\bi'll\b/gi, 'i will')
      .replace(/\bi've\b/gi, 'i have')
      .replace(/\blet's\b/gi, 'let us')
      .replace(/\bdon't\b/gi, 'do not')
      .replace(/\bdoesn't\b/gi, 'does not')
      .replace(/\bdidn't\b/gi, 'did not')
      .replace(/\bhasn't\b/gi, 'has not')
      .replace(/\bhaven't\b/gi, 'have not')
      .replace(/\bit's\b/gi, 'it is');

    // Apply domain spelling corrections
    for (const [pattern, replacement] of this.SPELLING_CORRECTIONS) {
      text = text.replace(pattern, replacement);
    }

    // Strip conversational polite prefixes & fillers iteratively
    let prevText = '';
    while (prevText !== text) {
      prevText = text;
      for (const filler of this.CONVERSATIONAL_FILLERS) {
        text = text.replace(filler, '').trim();
      }
    }

    return text.trim();
  }

  /**
   * Segments multi-clause compound instructions into sequential logical action steps.
   */
  static segmentClauses(goal) {
    const clean = this.normalizeText(goal);
    if (!clean) return [];

    const conjunctionRegex = /\s*(?:;\s*|,\s*and\s+then\s+|,\s*then\s+|\s+and\s+then\s+|\s+after\s+that\s+|\s+then\s+|\s+followed\s+by\s+|\s+after\s+which\s+|\s+next\s+|\s+subsequently\s+|\s+and\s+also\s+|\s+and(?=\s+(?:open|search|play|click|type|fill|write|author|navigate|submit|verify|scroll|filter|select|download|view)))\s*/i;
    
    const rawClauses = clean.split(conjunctionRegex);
    return rawClauses
      .map(c => c.trim())
      .filter(c => c.length > 0);
  }

  /**
   * Classifies user goal intent into high-level semantic action paradigms
   */
  static classifyIntent(goal) {
    if (!goal || typeof goal !== 'string') {
      return { intent: 'general_interact', confidence: 0.5 };
    }
    const norm = this.normalizeText(goal).toLowerCase();

    if (norm.includes('youtube') || (/\b(video|play|channel|watch)\b/i.test(norm) && !norm.includes('doc') && !norm.includes('quiz'))) {
      return { intent: 'youtube_search_play', confidence: 0.95 };
    }
    if (/\b(google\s+forms?|forms\.google\.com|forms\.gle|quiz|questionnaire|survey|exam|test\s+questions?)\b/i.test(norm)) {
      return { intent: 'google_forms_quiz', confidence: 0.96 };
    }
    if (/\b(google\s+sheets?|sheets\.google\.com|sheets\.new|spreadsheet|workbook|rows?\s+and\s+columns?|tabular\s+data)\b/i.test(norm)) {
      return { intent: 'google_sheets_data', confidence: 0.94 };
    }
    if (/\b(drone|quadcopter|uav|aerodynamics|airfoil|bernoulli|thrust\s+to\s+weight|flight\s+controller|avionics|propeller)\b/i.test(norm)) {
      return { intent: 'drone_aerodynamics_stem', confidence: 0.95 };
    }
    if (/\b(doc|docs|document|textbook|essay|article|draft|leave letter|permission letter|sop|resume|curriculum vitae)\b/i.test(norm)) {
      return { intent: 'doc_author', confidence: 0.95 };
    }
    if (norm.includes('scholar') || (norm.includes('research paper') && norm.includes('cite'))) {
      return { intent: 'scholar_research', confidence: 0.92 };
    }
    if (norm.includes('wikipedia')) {
      return { intent: 'wikipedia_lookup', confidence: 0.94 };
    }
    if (norm.includes('github') || norm.includes('repository') || norm.includes('repo')) {
      return { intent: 'github_explore', confidence: 0.93 };
    }
    if (norm.includes('amazon') || norm.includes('flipkart') || /\b(buy|price under|cart|ecommerce)\b/i.test(norm)) {
      return { intent: 'ecommerce_filter', confidence: 0.90 };
    }
    if (norm.includes('isro') || norm.includes('gaganyaan') || norm.includes('uplink') || /\b(officer|mission)\b/i.test(norm)) {
      return { intent: 'isro_mission', confidence: 0.96 };
    }
    if (/\b(auth|authenticate|login|signin|sign in|password|pan card|credentials|form)\b/i.test(norm)) {
      return { intent: 'auth_form', confidence: 0.92 };
    }
    if (norm.includes('google') || /\b(search|search for|look up|find out|query)\b/i.test(norm)) {
      return { intent: 'google_search', confidence: 0.90 };
    }
    if (/\b(sanitize|redact|pii|privacy audit)\b/i.test(norm) || (norm.includes('inspect') && (norm.includes('page') || norm.includes('webpage') || norm.includes('dom')))) {
      return { intent: 'inspect_sanitize_page', confidence: 0.96 };
    }
    if (/\b(extract|scrape|read|summarize|table|data)\b/i.test(norm)) {
      return { intent: 'extract_data', confidence: 0.88 };
    }

    return { intent: 'general_interact', confidence: 0.70 };
  }

  /**
   * Extracts search queries accurately across diverse linguistic formulations.
   */
  static extractSearchQuery(goal) {
    if (!goal) return "Trending";
    const normalized = this.normalizeText(goal);

    // 1. Quoted query: "computer networks", 'artificial intelligence'
    const quotedMatch = normalized.match(/["']([^"']+)["']/);
    if (quotedMatch && quotedMatch[1].trim()) {
      return quotedMatch[1].trim();
    }

    // 2. Target of preposition after ordinal/video action
    const prepTargetMatch = normalized.match(/(?:play|watch|open|click|view)\s+(?:the\s+)?(?:first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|last|top|penultimate)?\s*(?:video|result|link|track|item)?\s*(?:#\d+|\d+)?\s+(?:for|of|on|about)\s+(.+?)(?:\s+(?:on\s+youtube|on\s+google|in\s+youtube|in\s+google)|$)/i);
    if (prepTargetMatch && prepTargetMatch[1].trim()) {
      let q = prepTargetMatch[1].trim();
      q = q.replace(/^["'\s]+|["'\s]+$/g, '');
      if (q) return q;
    }

    // 3. Document Authoring Topic Extraction
    const docTopicMatch = normalized.match(/(?:in\s+a\s+new\s+doc(?:ument)?\s+|in\s+google\s+docs?\s+)?(?:write|author|draft|create|generate)\s+(?:a|an)?\s*(?:textbook|essay|article|notes|paper|chapter|guide|summary)?\s*(?:about|on|for)\s+(.+)$/i);
    if (docTopicMatch && docTopicMatch[1].trim()) {
      let q = docTopicMatch[1].trim();
      q = q.replace(/^["'\s]+|["'\s]+$/g, '');
      if (q) return q;
    }

    // 4. Lookup clause
    const lookupMatch = normalized.match(/(?:look\s*up|lookup)\s+(.+?)(?:\s+(?:on\s+wikipedia|on\s+google|on\s+youtube|on\s+scholar|\bthen\b|$))/i);
    if (lookupMatch && lookupMatch[1].trim()) {
      let q = lookupMatch[1].trim();
      q = q.replace(/^["'\s]+|["'\s]+$/g, '');
      if (q) return q;
    }

    // 5. Explicit search clause with boundary delimiters
    const searchDelimited = normalized.match(/(?:search\s+(?:for\s+)?|find\s+(?:me\s+)?|look\s*up\s+|lookup\s+|query\s+|browse\s+|show\s+(?:me\s+)?|play\s+|watch\s+)(.+?)(?:\s+(?:and\s+then|and\s+play|and\s+open|and\s+click|\bthen\b|on\s+youtube|in\s+youtube|on\s+google|in\s+google|on\s+scholar|on\s+amazon|on\s+flipkart|on\s+wikipedia|\bplay\b|\bopen\b|\bclick\b|\bdownload\b|$))/i);
    if (searchDelimited && searchDelimited[1].trim()) {
      let q = searchDelimited[1].trim();
      q = q.replace(/^["'\s]+|["'\s]+$/g, '');
      q = q.replace(/\s+(?:the\s+)?(?:second|2nd|third|3rd|first|1st|fourth|4th|fifth|5th|sixth|6th|seventh|7th|eighth|8th|ninth|9th|tenth|10th|last|top|penultimate)\s+(?:video|result|link|paper|article|item|product).*$/i, '');
      if (q.trim()) return q.trim();
    }

    // 6. Infix pattern
    const infixMatch = normalized.match(/^(?:open\s+[a-z0-9\-\.]+\s+and\s+)?(?:watch|play|see|read|get|search|find)\s+(.+?)\s+(?:on\s+youtube|on\s+google|on\s+amazon|on\s+wikipedia|on\s+scholar)/i);
    if (infixMatch && infixMatch[1].trim()) {
      let q = infixMatch[1].trim();
      q = q.replace(/\s+(?:the\s+)?(?:second|2nd|third|3rd|first|1st|fourth|4th|fifth|5th|last|top)\s+(?:video|result|link).*$/i, '');
      if (q.trim()) return q.trim();
    }

    // 7. Cleaned fallback
    let cleaned = normalized
      .replace(/^(?:open\s+[a-z0-9\.\-]+\s+and\s+|go\s+to\s+[a-z0-9\.\-]+\s+and\s+|navigate\s+to\s+[a-z0-9\.\-]+\s+and\s+)/i, '')
      .replace(/^(?:search\s+for|search|look\s*up|lookup|find\s+me|find|show\s+me|query|play|watch)\s+/i, '')
      .replace(/\s+(?:and\s+then|and\s+play|and\s+click|and\s+open|\bthen\b)\s+.*$/i, '')
      .replace(/\s+(?:on\s+youtube|on\s+google|on\s+amazon|on\s+wikipedia|in\s+youtube|in\s+google)/ig, '')
      .replace(/\s+(?:and\s+)?(?:open|play|watch|click)\s+(?:the\s+)?(?:first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|sixth|6th|seventh|7th|eighth|8th|ninth|9th|tenth|10th|last|top)\s+(?:video|result|link|item|product).*$/i, '')
      .replace(/["']/g, '')
      .trim();

    return cleaned || "Trending";
  }

  /**
   * Extracts ordinal target numbers (0-indexed) from natural language
   */
  static extractTargetOrdinal(goal) {
    if (!goal) return { index: 0, label: "first (1st)", isLast: false };
    const gl = (goal || '').toLowerCase();

    // Numerical hashes / labels e.g. "#2", "number 2", "result 2", "video 3", "link 4"
    const numMatch = gl.match(/(?:#|number\s+|result\s+|video\s+|item\s+|option\s+|link\s+)(\d+)/i);
    if (numMatch) {
      const parsedNum = parseInt(numMatch[1], 10);
      if (parsedNum >= 1 && parsedNum <= 20) {
        const idx = parsedNum - 1;
        const ordinalLabels = [
          "first (1st)", "second (2nd)", "third (3rd)", "fourth (4th)", "fifth (5th)",
          "sixth (6th)", "seventh (7th)", "eighth (8th)", "ninth (9th)", "tenth (10th)"
        ];
        return { index: idx, label: ordinalLabels[idx] || `${parsedNum}th`, isLast: false };
      }
    }

    if (/\b(last|final|bottom|end)\b/i.test(gl)) {
      return { index: 0, label: "last (final)", isLast: true };
    }
    if (/\b(penultimate|second\s+to\s+last|2nd\s+to\s+last)\b/i.test(gl)) {
      return { index: 1, label: "penultimate", isPenultimate: true };
    }
    if (/\b(second|2nd)\b/i.test(gl)) return { index: 1, label: "second (2nd)", isLast: false };
    if (/\b(third|3rd)\b/i.test(gl)) return { index: 2, label: "third (3rd)", isLast: false };
    if (/\b(fourth|4th)\b/i.test(gl)) return { index: 3, label: "fourth (4th)", isLast: false };
    if (/\b(fifth|5th)\b/i.test(gl)) return { index: 4, label: "fifth (5th)", isLast: false };
    if (/\b(sixth|6th)\b/i.test(gl)) return { index: 5, label: "sixth (6th)", isLast: false };
    if (/\b(seventh|7th)\b/i.test(gl)) return { index: 6, label: "seventh (7th)", isLast: false };
    if (/\b(eighth|8th)\b/i.test(gl)) return { index: 7, label: "eighth (8th)", isLast: false };
    if (/\b(ninth|9th)\b/i.test(gl)) return { index: 8, label: "ninth (9th)", isLast: false };
    if (/\b(tenth|10th)\b/i.test(gl)) return { index: 9, label: "tenth (10th)", isLast: false };
    if (/\b(first|1st|top|initial|primary)\b/i.test(gl)) return { index: 0, label: "first (1st)", isLast: false };

    return { index: 0, label: "first (1st)", isLast: false };
  }

  /**
   * Recognizes target domain and destination platform from natural language
   */
  static extractPlatformAndTargetUrl(goal, currentUrl = '') {
    const gl = (goal || '').toLowerCase();
    const cur = (currentUrl || '').toLowerCase();
    const explicitUrlMatch = (goal || '').match(/https?:\/\/[^\s"'>]+/i);
    const explicitUrl = explicitUrlMatch ? explicitUrlMatch[0].trim() : null;

    // YouTube
    if (gl.includes('youtube') || gl.includes('youtu.be') || (/\b(video|play|watch|channel|views|subscribers)\b/i.test(gl) && !gl.includes('amazon') && !gl.includes('flipkart') && !gl.includes('doc') && !gl.includes('quiz'))) {
      return {
        platform: 'youtube',
        targetUrl: explicitUrl || 'https://www.youtube.com',
        domainKey: 'youtube.com',
        isCurrent: cur.includes('youtube.com')
      };
    }

    // Google Forms & Quizzes
    if (gl.includes('forms.google.com') || gl.includes('forms.gle') || /\b(google\s+forms?|quiz|questionnaire|survey|exam\s+form)\b/i.test(gl)) {
      return {
        platform: 'google_forms',
        targetUrl: explicitUrl || 'https://forms.google.com',
        domainKey: 'docs.google.com/forms',
        isCurrent: cur.includes('docs.google.com/forms') || cur.includes('forms.gle') || cur.includes('forms.google.com')
      };
    }

    // Google Sheets / Spreadsheet Data
    if (gl.includes('sheets.google.com') || gl.includes('sheets.new') || /\b(google\s+sheets?|spreadsheet|workbook|sheets\s+response)\b/i.test(gl)) {
      return {
        platform: 'google_sheets',
        targetUrl: explicitUrl || 'https://sheets.new',
        domainKey: 'docs.google.com/spreadsheets',
        isCurrent: cur.includes('docs.google.com/spreadsheets') || cur.includes('sheets.google.com')
      };
    }

    // Google Docs / Document Authoring
    if (/\b(doc|docs|document|textbook|essay|article|draft|notes|leave letter|permission letter|resume|sop|curriculum vitae)\b/i.test(gl) && !gl.includes('doctor') && !gl.includes('pan')) {
      return {
        platform: 'google_docs',
        targetUrl: 'https://docs.new',
        domainKey: 'docs.google.com',
        isCurrent: cur.includes('docs.google.com/document') || (cur.includes('docs.google.com') && !cur.includes('/forms') && !cur.includes('/spreadsheets'))
      };
    }

    // Google Scholar / Research Papers
    if (gl.includes('scholar') || (gl.includes('research paper') && gl.includes('cite'))) {
      return {
        platform: 'google_scholar',
        targetUrl: 'https://scholar.google.com',
        domainKey: 'scholar.google.com',
        isCurrent: cur.includes('scholar.google.com')
      };
    }

    // Wikipedia
    if (gl.includes('wikipedia') || gl.includes('wiki')) {
      return {
        platform: 'wikipedia',
        targetUrl: 'https://www.wikipedia.org',
        domainKey: 'wikipedia.org',
        isCurrent: cur.includes('wikipedia.org')
      };
    }

    // GitHub
    if (gl.includes('github') || gl.includes('repository') || gl.includes('repo')) {
      const repoMatch = gl.match(/github\.com\/([a-zA-Z0-9_\-\/]+)/i);
      const targetUrl = repoMatch ? `https://github.com/${repoMatch[1]}` : 'https://github.com';
      return {
        platform: 'github',
        targetUrl,
        domainKey: 'github.com',
        isCurrent: cur.includes('github.com')
      };
    }

    // Amazon E-Commerce
    if (gl.includes('amazon')) {
      return {
        platform: 'amazon',
        targetUrl: 'https://www.amazon.in',
        domainKey: 'amazon',
        isCurrent: cur.includes('amazon.')
      };
    }

    // Flipkart E-Commerce
    if (gl.includes('flipkart')) {
      return {
        platform: 'flipkart',
        targetUrl: 'https://www.flipkart.com',
        domainKey: 'flipkart.com',
        isCurrent: cur.includes('flipkart.com')
      };
    }

    // ISRO / Defense Dashboard Demo
    if (gl.includes('isro') || gl.includes('gaganyaan') || gl.includes('uplink') || gl.includes('officer')) {
      return {
        platform: 'isro_dashboard',
        targetUrl: 'http://localhost:8085/demo/isro_dashboard.html',
        domainKey: 'isro_dashboard.html',
        isCurrent: cur.includes('isro_dashboard')
      };
    }

    // Google Search
    if (gl.includes('google') || /\b(search|search for|look up|find out)\b/i.test(gl)) {
      return {
        platform: 'google_search',
        targetUrl: 'https://www.google.com',
        domainKey: 'google.com',
        isCurrent: cur.includes('google.com')
      };
    }

    // Explicit URL in query
    const urlMatch = gl.match(/(?:https?:\/\/|www\.)[^\s]+/i);
    if (urlMatch) {
      let rawUrl = urlMatch[0];
      if (rawUrl.startsWith('www.')) rawUrl = 'https://' + rawUrl;
      try {
        const u = new URL(rawUrl);
        return {
          platform: 'custom_url',
          targetUrl: rawUrl,
          domainKey: u.hostname,
          isCurrent: cur.includes(u.hostname)
        };
      } catch (e) {
        // invalid URL
      }
    }

    // Default Web Page
    return {
      platform: 'general_web',
      targetUrl: cur || 'https://www.google.com',
      domainKey: cur ? (cur.includes('://') ? new URL(cur).hostname : 'web') : 'web',
      isCurrent: true
    };
  }

  /**
   * Extracts form field key-value pairs and credential entities from natural language
   */
  static extractFormEntities(goal) {
    const entities = {};
    if (!goal) return entities;

    // 1. Officer ID / Username
    const officerMatch = goal.match(/(?:officer(?:\s+id)?|username|user|login\s+id)\s+(?:is\s+|to\s+|as\s+|[:=]\s*)?([A-Za-z0-9\-_@\.]+)/i);
    if (officerMatch) entities.officer_id = officerMatch[1].trim();

    // 2. Password / Secret Token
    const pwdMatch = goal.match(/(?:password|pwd|secret|passphrase|passcode)\s+(?:is\s+|to\s+|as\s+|[:=]\s*)?([^\s,;]+)/i);
    if (pwdMatch) entities.password = pwdMatch[1].trim();

    // 3. PAN / Government ID
    const panMatch = goal.match(/(?:pan(?:\s+card|\s+number)?)\s+(?:is\s+|to\s+|as\s+|[:=]\s*)?([A-Z0-9]{10})/i);
    if (panMatch) entities.pan = panMatch[1].trim();

    // 4. Email
    const emailMatch = goal.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (emailMatch) entities.email = emailMatch[1].trim();

    // 5. Phone / Mobile
    const phoneMatch = goal.match(/(?:\+91[\-\s]?)?[6-9]\d{9}/);
    if (phoneMatch) entities.phone = phoneMatch[0].trim();

    // 6. Name
    const nameMatch = goal.match(/(?:name|student\s+name|candidate)\s+(?:is\s+|to\s+|as\s+|[:=]\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
    if (nameMatch) entities.name = nameMatch[1].trim();

    // 7. Amount / Price filter
    const priceMatch = goal.match(/(?:under|below|less\s+than|max(?:imum)?)\s+(?:rs\.?|inr|\$|₹)?\s*(\d+(?:,\d+)?)/i);
    if (priceMatch) entities.max_price = parseInt(priceMatch[1].replace(/,/g, ''), 10);

    return entities;
  }

  /**
   * Alias for generateComprehensiveContent for structured textbook generation
   */
  static generateComprehensiveTextbook(goal) {
    return this.generateComprehensiveContent(goal);
  }

  /**
   * Generates comprehensive, technically rigorous textbook & document content
   * for authoring tasks across diverse collegiate disciplines.
   */
  static generateComprehensiveContent(goal) {
    const gl = (goal || '').toLowerCase();

    // 1. Artificial Intelligence & Machine Learning (AIML)
    if (gl.includes('aiml') || gl.includes('machine learning') || gl.includes('deep learning') || gl.includes('neural') || (gl.includes('ai') && !gl.includes('isro') && !gl.includes('tail'))) {
      return `FOUNDATIONS OF ARTIFICIAL INTELLIGENCE & MACHINE LEARNING: COMPREHENSIVE TEXTBOOK

CHAPTER 1: MATHEMATICAL FOUNDATIONS & SYSTEM ARCHITECTURE
Artificial Intelligence (AI) constitutes computational paradigms engineered to emulate human cognitive faculties—namely abstraction, probabilistic inference, pattern decomposition, and optimal decision making under uncertainty.

1.1 Convex Optimization & Gradient Descent Formulations
Supervised machine learning optimizes objective loss functions over high-dimensional weight spaces:
$$w^* = \\arg\\min_{w} \\frac{1}{N} \\sum_{i=1}^N \\mathcal{L}(f_w(x_i), y_i) + \\lambda \\Omega(w)$$
Where $\\Omega(w)$ denotes Tikhonov ($L_2$) or Lasso ($L_1$) regularization penalties ensuring model generalization.

CHAPTER 2: DEEP NEURAL NETWORKS & ATTENTION MECHANISMS
- Transformer Architectures: Multi-Head Self-Attention scales sequence processing across spatial-temporal tokens via:
$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$
- Residual Connections & Layer Normalization: Prevent vanishing gradients across deep layer compositions.

CHAPTER 3: REINFORCEMENT LEARNING & MARKOV DECISION PROCESSES
Policy gradients and Q-learning formulations optimizing expected long-term cumulative discount reward trajectories:
$$J(\\theta) = \\mathbb{E}_{\\tau \\sim \\pi_\\theta} [R(\\tau)]$$

CHAPTER 4: MULTI-MODAL COMPUTER VISION & PERCEPTION
Convolutional feature extractors, Vision Transformers (ViT), and Set-of-Marks visual element grounding for autonomous web navigation.

CHAPTER 5: PRIVACY-PRESERVING AI & ON-DEVICE AGENTS
Local zero-knowledge inference, differential privacy, visual PII redaction, and client-side cryptographic enclaves.`;
    }

    // 2. Computer Networks
    if (gl.includes('computer network') || gl.includes('networks') || gl.includes('osi model') || gl.includes('tcp')) {
      return `COMPUTER NETWORKS & DISTRIBUTED COMMUNICATIONS PROTOCOL ARCHITECTURE

CHAPTER 1: THE 7-LAYER OSI MODEL & TCP/IP STACK
1. Physical Layer: Signal transmission, Manchester encoding, modulation schemes, and physical media.
2. Data Link Layer: Framing, HDLC, Ethernet (IEEE 802.3), CSMA/CD, MAC address resolution (ARP), and cyclic redundancy checks (CRC-32).
3. Network Layer: IP packet routing, CIDR subnetting, Dijkstra Shortest Path (OSPF), Distance Vector (BGP), and ICMP diagnostics.
4. Transport Layer: Connection-oriented TCP (three-way handshake, sliding window flow control, Reno/Cubic congestion control) vs. UDP datagrams.
5. Application Layer: HTTP/2 & HTTP/3 (QUIC over UDP), DNS resolution hierarchy, TLS 1.3 cryptographic key exchange, and WebSocket streaming.

CHAPTER 2: NETWORK SECURITY, PACKET INSPECTION & ROUTING
Deep Packet Inspection (DPI), stateful firewalls, intrusion detection systems (IDS/IPS), and zero-trust perimeter network segmentation.`;
    }

    // 3. Operating Systems
    if (gl.includes('operating system') || gl.includes('kernel') || gl.includes('linux') || gl.includes('unix') || gl.includes('posix')) {
      return `MODERN OPERATING SYSTEMS: KERNEL DESIGN, CONCURRENCY & MEMORY MANAGEMENT

CHAPTER 1: KERNEL ARCHITECTURE & PROCESS SCHEDULING
- Monolithic vs. Microkernel Architectures: Linux vs. seL4 trade-offs in isolation and context-switch overhead.
- CPU Scheduling: Completely Fair Scheduler (CFS) using red-black trees, Round-Robin, and Multi-Level Feedback Queues.

CHAPTER 2: THREAD CONCURRENCY, MUTEXES & DEADLOCKS
- Concurrency Primitives: Mutexes, Semaphores (Counting & Binary), Spinlocks, and Read-Write Locks.
- Coffman Deadlock Conditions: Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait. Mitigation via Banker's Algorithm and lock ordering.

CHAPTER 3: VIRTUAL MEMORY & PAGING TOPOLOGY
Multi-level Page Tables, Translation Lookaside Buffers (TLB), Demand Paging, and Page Replacement Algorithms (LRU, FIFO, Clock/Second-Chance).`;
    }

    // 4. Cybersecurity & Cryptographic Defense
    if (gl.includes('cyber') || gl.includes('security') || gl.includes('crypto') || gl.includes('zero trust')) {
      return `PRINCIPLES OF ENTERPRISE CYBERSECURITY & CRYPTOGRAPHIC DEFENSE

CHAPTER 1: ZERO TRUST SECURITY MODEL
Core Principle: Never Trust, Always Verify. Continuous micro-segmentation, identity assertion, and least-privilege access enforcement across all endpoints and service boundaries.

CHAPTER 2: CRYPTOGRAPHIC PRIMITIVES & ENCRYPTION STANDARDS
- Asymmetric Cryptography: Elliptic Curve Diffie-Hellman (X25519/ECDH) and RSA-4096.
- Symmetric Authenticated Encryption: AES-256-GCM with distinct 96-bit Initialization Vectors (IV).
- Cryptographic Hashing: SHA-256, SHA-3, and HMAC-SHA256 for tamper-evident data integrity verification.

CHAPTER 3: WEB APPLICATION DEFENSE & SECURE BROWSER AGENTS
Mitigating OWASP Top 10 vulnerabilities (XSS, CSRF, SSRF, SQLi) through Content Security Policies (CSP), on-device visual redaction, and strict input sandboxing.`;
    }

    // 5. Data Structures & Algorithms (DSA)
    if (gl.includes('data structure') || gl.includes('dsa') || gl.includes('algorithm') || gl.includes('binary tree') || gl.includes('graph')) {
      return `COMPREHENSIVE DATA STRUCTURES & ALGORITHMIC ANALYSIS

CHAPTER 1: ASYMPTOTIC NOTATION & COMPLEXITY ANALYSIS
Big-O ($O$), Big-Omega ($\\Omega$), and Big-Theta ($\\Theta$) bounds. Master Theorem for divide-and-conquer recurrences:
$$T(n) = aT(n/b) + f(n)$$

CHAPTER 2: LINEAR & NON-LINEAR DATA STRUCTURES
1. Dynamic Arrays & Linked Lists: Singly, Doubly, and Skip Lists with $O(1)$ amortized insertions.
2. Trees & Hierarchies: Binary Search Trees (BST), Self-Balancing AVL Trees, Red-Black Trees, and B-Trees for database indexing.
3. Priority Queues & Heaps: Min/Max Binary Heaps and Fibonacci Heaps for optimal graph processing.

CHAPTER 3: GRAPH ALGORITHMS & DYNAMIC PROGRAMMING
- Shortest Path: Dijkstra's algorithm with priority queues and Bellman-Ford for negative cycles.
- Minimum Spanning Trees: Kruskal's with Disjoint Set Union (DSU) and Prim's Algorithm.
- Dynamic Programming: Optimal substructure and overlapping subproblems (Knapsack, Longest Common Subsequence).`;
    }

    // 6. Database Management Systems (DBMS)
    if (gl.includes('database') || gl.includes('dbms') || gl.includes('sql') || gl.includes('acid') || gl.includes('nosql')) {
      return `DATABASE MANAGEMENT SYSTEMS: RELATIONAL, NOSQL & TRANSACTIONAL ACID DESIGN

CHAPTER 1: RELATIONAL ALGEBRA & SQL OPTIMIZATION
Codd's Relational Model, Projection, Selection, Cartesian Product, and Joins (Nested-Loop, Hash Join, Sort-Merge Join). B+ Tree indexing for range queries.

CHAPTER 2: ACID PROPERTIES & CONCURRENCY CONTROL
1. Atomicity & Durability: Write-Ahead Logging (WAL) and ARIES recovery algorithm.
2. Consistency & Isolation: Serializability levels (Read Uncommitted, Read Committed, Repeatable Read, Serializable) via Two-Phase Locking (2PL) and Multi-Version Concurrency Control (MVCC).

CHAPTER 3: DISTRIBUTED DATABASES & THE CAP THEOREM
Trade-offs between Consistency, Availability, and Partition Tolerance. Sharding, Consistent Hashing, and Consensus Protocols (Raft/Paxos).`;
    }

    // 7. Formal Leave Application / Academic Correspondence
    if (gl.includes('leave') || gl.includes('letter') || gl.includes('permission') || gl.includes('application')) {
      return `FORMAL ACADEMIC LEAVE APPLICATION

To: The Department Chair / Head of Department
Institution: Faculty of Computer Science & Engineering
Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

Subject: Application for Academic Leave of Absence

Respected Sir/Madam,

I am writing to formally request an authorized leave of absence from classes and laboratory sessions for a period of two days due to unexpected medical indisposition (fever and health recovery).

I have coordinated with my class peers to ensure all laboratory assignments, study materials, and seminar deliverables for the missed sessions are promptly reviewed and submitted upon my resumption.

I kindly request you to approve my leave application and grant attendance waiver for the stated duration. The medical certificate will be presented to the department office upon return.

Thank you for your understanding and support.

Sincerely,
Student Name / Roll Number
Department of Computer Science & Engineering`;
    }

    // 8. Drone Technology, UAVs & Aerodynamics
    if (gl.includes('drone') || gl.includes('aerodynamics') || gl.includes('quadcopter') || gl.includes('uav') || gl.includes('airfoil') || gl.includes('bernoulli') || gl.includes('flight controller')) {
      return `COMPREHENSIVE DRONE TECHNOLOGY, UAV ARCHITECTURE & AERODYNAMICS TEXTBOOK

CHAPTER 1: FLIGHT MECHANICS & QUADCOPTER AERODYNAMIC DYNAMICS
Unmanned Aerial Vehicles (UAVs) achieve six-degree-of-freedom (6-DoF) motion through differential rotor thrust and torque conservation:
1. Lift Generation: Governed by the fundamental aerodynamic equation:
$$L = \\frac{1}{2} \\rho v^2 S C_L$$
Where $\\rho$ is air density, $v$ is relative airspeed, $S$ is propeller planform area, and $C_L$ is the angle-of-attack lift coefficient derived from Bernoulli's principle.
2. Quadcopter Force Equilibria:
- Hover Condition: Total vertical thrust equals aircraft weight: $\\sum_{i=1}^4 T_i = mg$.
- Pitch & Roll Moments: Created by differential thrust across opposite motor pairs.
- Yaw Moment: Produced by reactive torque differentials between clockwise (CW) and counter-clockwise (CCW) rotating propellers:
$$\\tau_{\\psi} = d(T_1 + T_3 - T_2 - T_4)$$

CHAPTER 2: PROPULSION, AVIONICS & ELECTRONIC SPEED CONTROL
- Brushless DC (BLDC) Motors: Controlled via 3-phase sinusoidal Back-EMF commutation, characterized by $K_v$ ratings (RPM/Volt).
- Electronic Speed Controllers (ESCs): Utilize DShot600 digital telemetry protocols operating at 600 kHz to regulate MOSFET switching cycles.
- Thrust-to-Weight Ratio: High-agility aerial platforms maintain $T/W \\ge 2.5:1$ for responsive dynamic attitude correction.

CHAPTER 3: FLIGHT CONTROLLERS, KALMAN FILTERING & AUTONOMOUS NAVIGATION
- Inertial Measurement Units (IMUs): High-frequency 6-axis MEMS Accelerometers and Rate Gyroscopes fused via an Extended Kalman Filter (EKF) to eliminate vibrational sensor drift.
- PID Attitude Loop: Executes at 8 kHz inside flight control firmware (Betaflight/PX4/ArduPilot):
$$u(t) = K_p e(t) + K_i \\int_0^t e(\\tau) d\\tau + K_d \\frac{de(t)}{dt}$$
- Autopilot & Fail-Safes: Incorporates GPS/GNSS RTK positioning, optical flow odometry, Barometric altitude hold, and autonomous Return-to-Home (RTH) upon RF link loss.`;
    }

    // 9. Robotics & Autonomous Systems
    if (gl.includes('robotics') || gl.includes('robot') || gl.includes('kinematics') || gl.includes('slam') || gl.includes('ros')) {
      return `ROBOTICS ENGINEERING: KINEMATICS, SLAM & AUTONOMOUS CONTROL

CHAPTER 1: RIGID-BODY KINEMATICS & DYNAMICS
- Forward Kinematics: Denavit-Hartenberg (D-H) parameterization mapping joint angles $(\\theta_1, \\dots, \\theta_n)$ to end-effector Cartesian poses $(x, y, z, \\alpha, \\beta, \\gamma)$.
- Inverse Kinematics: Solved via Jacobian pseudoinverse methods ($J^+ = J^T (J J^T)^{-1}$) to achieve smooth trajectory execution under singularity constraints.

CHAPTER 2: SIMULTANEOUS LOCALIZATION AND MAPPING (SLAM)
- Visual-Inertial Odometry (VIO) & LiDAR SLAM: Graph-based pose estimation optimizing node constraints via bundle adjustment.
- Occupancy Grid Mapping: Probabilistic ray-casting identifying free, occupied, and unobserved workspace volumes.

CHAPTER 3: ROBOT OPERATING SYSTEM (ROS 2) & REAL-TIME INTERACTION
- Node Graph Communication: Zero-copy intra-process transport utilizing DDS (Data Distribution Service) middleware.
- Motion Planning: Rapidly-exploring Random Trees (RRT*) and Model Predictive Control (MPC).`;
    }

    // 10. Statement of Purpose (SOP) & Academic Profile
    if (gl.includes('sop') || gl.includes('statement of purpose') || gl.includes('resume') || gl.includes('curriculum vitae') || gl.includes('cv')) {
      return `STATEMENT OF PURPOSE (SOP) - GRADUATE STUDIES IN COMPUTER SCIENCE

1. ACADEMIC OBJECTIVE & RESEARCH VISION
My academic trajectory has been driven by an enduring fascination with autonomous intelligent systems, distributed architectures, and privacy-preserving computation. I seek admission to advance state-of-the-art multi-modal web agents.

2. UNDERGRADUATE FOUNDATION & TECHNICAL EXPERTISE
Throughout my undergraduate studies in Computer Science, I developed robust foundations in Algorithms, Operating Systems, Machine Learning, and Computer Networks, maintaining strong academic performance and leading capstone implementations.

3. RESEARCH PROJECTS & PRACTICAL CONTRIBUTIONS
Engineered high-performance on-device perception architectures incorporating Set-of-Marks indexing and Web Crypto AES-GCM-256 session envelopes to achieve zero raw PII transmission.

4. FUTURE ASPIRATIONS & ALIGNMENT
With access to advanced computing resources and esteemed faculty mentorship, I aim to publish high-impact research in verifiable autonomous agent workflows and trustworthy AI.`;
    }

    // Generic Structured Research Analysis
    return `AUTONOMOUS RESEARCH & SYNTHESIS REPORT: ${goal.toUpperCase()}

1. EXECUTIVE SUMMARY
Comprehensive analytical investigation and workflow execution conducted autonomously by PlutoAI Privacy-First Agent.

2. METHODOLOGICAL FRAMEWORK & ARCHITECTURE
- Performed on-device visual grounding and Set-of-Marks DOM indexation.
- Zero raw confidential information transmitted beyond the local device perimeter.
- Executed multi-step verified operations with deterministic state progression.

3. KEY FINDINGS & STRATEGIC RECOMMENDATIONS
All actions executed safely with complete cryptographic zero-leak integrity.`;
  }
}
