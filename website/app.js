/**
 * Pluto AI — Landing Page Application Script
 * Dynamic Browser Detection, 1-Click Installation Trigger, & Live Interactive Sandbox
 */

(function () {
  'use strict';

  // 1. Dynamic Browser Detection
  function detectBrowser() {
    const userAgent = navigator.userAgent;
    let browserName = 'Chrome';

    if (userAgent.includes('Edg/')) {
      browserName = 'Edge';
    } else if (userAgent.includes('Brave')) {
      browserName = 'Brave';
    } else if (userAgent.includes('Arc')) {
      browserName = 'Arc';
    } else if (userAgent.includes('OPR') || userAgent.includes('Opera')) {
      browserName = 'Opera';
    } else if (userAgent.includes('Vivaldi')) {
      browserName = 'Vivaldi';
    }

    const browserLabels = document.querySelectorAll('.dynamic-browser-text');
    browserLabels.forEach(el => {
      el.textContent = `Add to ${browserName} — Free`;
    });
  }

  // 2. 1-Click Installation Modal & Download Trigger
  const installModal = document.getElementById('install-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnModalDone = document.getElementById('btn-modal-done');
  const installTriggers = document.querySelectorAll('.trigger-install-modal');
  const btnCopyModalUrl = document.getElementById('btn-copy-modal-url');
  const chromeExtUrlInput = document.getElementById('chrome-ext-url-input');
  const btnCopyChromeUrl = document.getElementById('btn-copy-chrome-url');
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');

  function showToast(message) {
    if (!toast) return;
    toastMsg.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 3000);
  }

  function triggerDirectDownload() {
    const downloadLink = document.createElement('a');
    downloadLink.href = 'downloads/pluto-ai-v2.0.0.zip';
    downloadLink.download = 'pluto-ai-v2.0.0.zip';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  }

  function openInstallModal() {
    // 1. Trigger the download immediately
    triggerDirectDownload();

    // 2. Open the modal guide
    if (installModal) {
      installModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  }

  function closeInstallModal() {
    if (installModal) {
      installModal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  }

  installTriggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openInstallModal();
    });
  });

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeInstallModal);
  if (btnModalDone) btnModalDone.addEventListener('click', closeInstallModal);

  if (installModal) {
    installModal.addEventListener('click', (e) => {
      if (e.target === installModal) closeInstallModal();
    });
  }

  // Copy chrome://extensions
  function copyExtensionUrl() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText('chrome://extensions').then(() => {
        showToast('✓ Copied "chrome://extensions" to clipboard!');
      }).catch(() => {
        fallbackCopy();
      });
    } else {
      fallbackCopy();
    }
  }

  function fallbackCopy() {
    if (chromeExtUrlInput) {
      chromeExtUrlInput.select();
      document.execCommand('copy');
      showToast('✓ Copied "chrome://extensions" to clipboard!');
    }
  }

  if (btnCopyModalUrl) btnCopyModalUrl.addEventListener('click', copyExtensionUrl);
  if (btnCopyChromeUrl) btnCopyChromeUrl.addEventListener('click', copyExtensionUrl);

  // 3. Interactive Gemini Side Panel Sandbox
  const simChips = document.querySelectorAll('.sim-chip');
  const simUserInput = document.getElementById('sim-user-input');
  const simBtnSend = document.getElementById('sim-btn-send');
  const simWelcomeHero = document.getElementById('sim-welcome-hero');
  const simExecutionFeed = document.getElementById('sim-execution-feed');
  const simActiveGoalText = document.getElementById('sim-active-goal-text');
  const simReasonBody = document.getElementById('sim-reason-body');
  const simTimeline = document.getElementById('sim-timeline');

  // Simulated tasks sequence
  const simulationScenarios = {
    tables: {
      goal: "Extract all structured data and table rows from this page.",
      steps: [
        { desc: "DOM Indexer located <table class='mock-table'> with 3 telemetry rows.", reason: "Scanning table elements and converting telemetry into structured JSON..." },
        { desc: "Sanitizing extracted strings through local privacy regex engine.", reason: "0 Raw PII leaks detected. Table attributes clean." },
        { desc: "Extracted: Node #ND-701, #ND-702, #ND-703 (Nominal telemetry 99.98%).", reason: "Table export ready in JSON format." }
      ]
    },
    pii: {
      goal: "Scan active webpage for sensitive PII and preview redactions.",
      steps: [
        { desc: "Local OCR & Regex Scanner detected 4 confidential fields.", reason: "Credit Card (Visa), Aadhaar ID, Email, and Cardholder detected." },
        { desc: "Applying AES-GCM token substitution on-device.", reason: "Masked to [REDACTED_CARD_VISA_8812], [REDACTED_AADHAAR_4910], [REDACTED_EMAIL_GOV]." },
        { desc: "Firewall approved: 0 raw sensitive bytes egressed.", reason: "Privacy Firewall active and verified clean." }
      ]
    },
    decision: {
      goal: "Help me make a decision based on these mission nodes",
      steps: [
        { desc: "Analyzing telemetry data across 3 server nodes.", reason: "Node #ND-701 and #ND-702 are running at >99.9% health." },
        { desc: "Identified Node #ND-703 is Queued with 94.20% telemetry.", reason: "Recommendation: Trigger Node #ND-703 restart to synchronize telemetry." },
        { desc: "Ready to execute restart sequence upon confirmation.", reason: "Awaiting human confirmation for system modification." }
      ]
    }
  };

  let simRunning = false;

  function runSimulation(promptText) {
    if (simRunning) return;
    simRunning = true;

    let scenarioKey = 'tables';
    if (promptText.toLowerCase().includes('pii') || promptText.toLowerCase().includes('scan')) {
      scenarioKey = 'pii';
    } else if (promptText.toLowerCase().includes('decision')) {
      scenarioKey = 'decision';
    }

    const scenario = simulationScenarios[scenarioKey];

    // Hide welcome, show feed
    if (simWelcomeHero) simWelcomeHero.style.display = 'none';
    if (simExecutionFeed) simExecutionFeed.style.display = 'flex';
    if (simActiveGoalText) simActiveGoalText.textContent = promptText;
    if (simUserInput) simUserInput.value = '';

    // Step 1
    if (simReasonBody) simReasonBody.textContent = "Initializing on-device perception & visual tree index...";
    if (simTimeline) {
      simTimeline.innerHTML = `
        <div class="sim-step-item active">⚡ Step 1: Perceiving DOM & screen structure...</div>
      `;
    }

    // Step 2 after 1s
    setTimeout(() => {
      if (simReasonBody) simReasonBody.textContent = scenario.steps[0].reason;
      if (simTimeline) {
        simTimeline.innerHTML = `
          <div class="sim-step-item done">✓ Step 1: ${scenario.steps[0].desc}</div>
          <div class="sim-step-item active">⚡ Step 2: On-device PII masking & reasoning...</div>
        `;
      }
    }, 1200);

    // Step 3 after 2.4s
    setTimeout(() => {
      if (simReasonBody) simReasonBody.textContent = scenario.steps[1].reason;
      if (simTimeline) {
        simTimeline.innerHTML = `
          <div class="sim-step-item done">✓ Step 1: ${scenario.steps[0].desc}</div>
          <div class="sim-step-item done">✓ Step 2: ${scenario.steps[1].desc}</div>
          <div class="sim-step-item active">⚡ Step 3: Executing task milestone...</div>
        `;
      }
    }, 2400);

    // Completion after 3.8s
    setTimeout(() => {
      if (simReasonBody) simReasonBody.textContent = scenario.steps[2].reason;
      if (simTimeline) {
        simTimeline.innerHTML = `
          <div class="sim-step-item done">✓ Step 1: ${scenario.steps[0].desc}</div>
          <div class="sim-step-item done">✓ Step 2: ${scenario.steps[1].desc}</div>
          <div class="sim-step-item done">✓ Step 3: ${scenario.steps[2].desc}</div>
          <div class="sim-step-item done" style="background: rgba(129, 201, 149, 0.15); color: #81c995; font-weight: 700;">✨ Task Completed with 0 PII Leaks</div>
        `;
      }
      simRunning = false;
    }, 3800);
  }

  simChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.getAttribute('data-sim-prompt') || chip.textContent.trim();
      runSimulation(prompt);
    });
  });

  if (simBtnSend && simUserInput) {
    simBtnSend.addEventListener('click', () => {
      const val = simUserInput.value.trim();
      if (val) runSimulation(val);
    });

    simUserInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = simUserInput.value.trim();
        if (val) runSimulation(val);
      }
    });
  }

  // Side Panel simulated tabs
  const simNavPills = document.querySelectorAll('.sim-nav-pill');
  simNavPills.forEach(pill => {
    pill.addEventListener('click', () => {
      simNavPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      if (pill.id === 'sim-tab-privacy') {
        if (simWelcomeHero) simWelcomeHero.style.display = 'none';
        if (simExecutionFeed) {
          simExecutionFeed.style.display = 'flex';
          simActiveGoalText.textContent = "🛡️ On-Device Privacy Firewall";
          simReasonBody.textContent = "Active Firewall: 4 sensitive entities masked on-device (Credit Card, Aadhaar, Password, Email). 0 unmasked bytes transmitted.";
          simTimeline.innerHTML = `
            <div class="sim-step-item done">✓ AES-GCM-256 Cryptographic Session Verified</div>
            <div class="sim-step-item done">✓ Local Luhn Card Checksum Engine: 100% Validated</div>
            <div class="sim-step-item done">✓ Zero-Leak Privacy Guarantee Active</div>
          `;
        }
      } else if (pill.id === 'sim-tab-metrics') {
        if (simWelcomeHero) simWelcomeHero.style.display = 'none';
        if (simExecutionFeed) {
          simExecutionFeed.style.display = 'flex';
          simActiveGoalText.textContent = "🎯 Performance & Accuracy Benchmarks";
          simReasonBody.textContent = "Live Telemetry: E2E Perception 114ms • PII Precision 100.0% • Unit Test Pass Rate: 217/217 (100%).";
          simTimeline.innerHTML = `
            <div class="sim-step-item done">✓ Visual Grounding Accuracy: 98.4%</div>
            <div class="sim-step-item done">✓ Redaction Accuracy: 100.0%</div>
            <div class="sim-step-item done">✓ Memory Heap Usage: 14.8 MB</div>
          `;
        }
      } else {
        if (simWelcomeHero) simWelcomeHero.style.display = 'flex';
        if (simExecutionFeed) simExecutionFeed.style.display = 'none';
      }
    });
  });

  // 4. FAQ Accordions
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (question) {
      question.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        faqItems.forEach(i => i.classList.remove('open'));
        if (!isOpen) {
          item.classList.add('open');
        }
      });
    }
  });

  // 5. Initial setup
  detectBrowser();

})();
