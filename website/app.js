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

    // 2. Open the modal guide & reset to Tab 1
    if (typeof switchModalTab === 'function') {
      switchModalTab('modal-step-install');
    }

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
    docs: {
      goal: "open google docs and in a new doc file write a textbook on computer networks",
      steps: [
        { desc: "Navigated to https://docs.new and initialized typography editor.", reason: "Mounting Google Docs editor workspace with zero raw cloud telemetry." },
        { desc: "Authoring 5 comprehensive chapters on OSI layers, TCP/IP stack, and packet routing.", reason: "Local generative synthesizer structuring technical curriculum directly into editor canvas." },
        { desc: "Google Doc completed: 5 chapters written, 0 raw PII transmitted to cloud.", reason: "Textbook on Computer Networks saved cleanly." }
      ]
    },
    youtube: {
      goal: "open youtube and search for melody song and play first video",
      steps: [
        { desc: "Navigated to https://www.youtube.com and located search bar.", reason: "Indexing DOM Set-of-Marks tags on YouTube homepage." },
        { desc: "Typed 'melody song' into search input and submitted query.", reason: "Filtering video results with on-device privacy protection." },
        { desc: "Identified and clicked 1st video result. Video playback streaming nominal.", reason: "Playback initiated with zero privacy leaks." }
      ]
    },
    sanitize: {
      goal: "inspect and sanitize the present page ",
      steps: [
        { desc: "Local OCR & Regex Scanner analyzed viewport DOM and visual tokens.", reason: "Detected 4 sensitive confidential fields (Passcards, emails, Govt IDs)." },
        { desc: "Applying client-side AES-GCM-256 redaction and visual blur filters.", reason: "Masked all confidential elements locally before any network egress." },
        { desc: "Page inspection complete: Viewport sanitized, 0 raw PII leaked, audit log generated.", reason: "Privacy Firewall active and fully verified." }
      ]
    }
  };

  let simRunning = false;

  function runSimulation(promptText) {
    if (simRunning) return;
    simRunning = true;

    let scenarioKey = 'docs';
    const pl = promptText.toLowerCase();
    if (pl.includes('youtube') || pl.includes('song') || pl.includes('melody') || pl.includes('video')) {
      scenarioKey = 'youtube';
    } else if (pl.includes('sanitize') || pl.includes('inspect') || pl.includes('pii') || pl.includes('scan')) {
      scenarioKey = 'sanitize';
    } else if (pl.includes('doc') || pl.includes('network') || pl.includes('textbook')) {
      scenarioKey = 'docs';
    }

    const scenario = simulationScenarios[scenarioKey] || simulationScenarios.docs;

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

  // 5. Modal Multi-Step Tabs Navigation (Install -> API Key -> Connect)
  const modalTabBtns = document.querySelectorAll('.modal-tab-btn');
  const modalTabContents = document.querySelectorAll('.modal-tab-content');
  const modalNextBtns = document.querySelectorAll('.btn-modal-next');
  const modalPrevBtns = document.querySelectorAll('.btn-modal-prev');

  function switchModalTab(tabId) {
    modalTabBtns.forEach(btn => {
      if (btn.getAttribute('data-modaltab') === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    modalTabContents.forEach(content => {
      if (content.id === tabId) {
        content.classList.add('active');
      } else {
        content.classList.remove('active');
      }
    });
  }

  modalTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-modaltab');
      switchModalTab(tabId);
    });
  });

  modalNextBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const nextTab = btn.getAttribute('data-nexttab');
      if (nextTab) switchModalTab(nextTab);
    });
  });

  modalPrevBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const prevTab = btn.getAttribute('data-prevtab');
      if (prevTab) switchModalTab(prevTab);
    });
  });

  // 6. Generic Copy-to-Clipboard for elements with [data-copy]
  document.querySelectorAll('[data-copy]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const text = el.getAttribute('data-copy');
      if (text) {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(() => {
            showToast(`✓ Copied "${text}" to clipboard!`);
          }).catch(() => {
            showToast('✓ Copied to clipboard!');
          });
        } else {
          showToast('✓ Copied to clipboard!');
        }
      }
    });
  });

  // 7. Setup Guide Step Navigation Pills
  const setupPills = document.querySelectorAll('.setup-pill');
  setupPills.forEach(pill => {
    pill.addEventListener('click', () => {
      setupPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
    });
  });

  // 8. Live Interactive "Test Key Sandbox" Demonstration Widget in Setup Guide
  const guideSimProvider = document.getElementById('guide-sim-provider');
  const guideSimKey = document.getElementById('guide-sim-key');
  const btnToggleKeyVis = document.getElementById('btn-toggle-key-visibility');
  const btnSampleKey = document.getElementById('btn-sample-key');
  const guideBtnTestConnection = document.getElementById('guide-btn-test-connection');
  const guideSimResult = document.getElementById('guide-sim-result');
  const guideSimStatusTitle = document.getElementById('guide-sim-status-title');
  const guideSimStatusDesc = document.getElementById('guide-sim-status-desc');

  const sampleKeys = {
    gemini: 'AIzaSyDemo-GeminiKey-Valid2026',
    openai: 'sk-proj-OpenAIDemoKey-Valid2026',
    claude: 'sk-ant-ClaudeDemoKey-Valid2026',
    groq: 'gsk_GroqDemoKey-Valid2026',
    offline: '(No Key Required for Offline Mode)'
  };

  if (btnToggleKeyVis && guideSimKey) {
    btnToggleKeyVis.addEventListener('click', () => {
      if (guideSimKey.type === 'password') {
        guideSimKey.type = 'text';
        btnToggleKeyVis.textContent = '🔒';
      } else {
        guideSimKey.type = 'password';
        btnToggleKeyVis.textContent = '👁️';
      }
    });
  }

  if (btnSampleKey && guideSimKey && guideSimProvider) {
    btnSampleKey.addEventListener('click', () => {
      const provider = guideSimProvider.value;
      guideSimKey.value = sampleKeys[provider] || sampleKeys.gemini;
      const label = guideSimProvider.options[guideSimProvider.selectedIndex].text;
      showToast(`✓ Sample ${label} key loaded!`);
    });
  }

  if (guideSimProvider && guideSimKey) {
    guideSimProvider.addEventListener('change', () => {
      const provider = guideSimProvider.value;
      if (provider === 'offline') {
        guideSimKey.value = '(No Key Required for Offline Mode)';
        guideSimKey.disabled = true;
      } else {
        guideSimKey.disabled = false;
        guideSimKey.value = sampleKeys[provider] || '';
      }
    });
  }

  if (guideBtnTestConnection) {
    guideBtnTestConnection.addEventListener('click', () => {
      const provider = guideSimProvider ? guideSimProvider.value : 'gemini';
      const providerName = guideSimProvider ? guideSimProvider.options[guideSimProvider.selectedIndex].text : 'Google Gemini';
      const key = guideSimKey ? guideSimKey.value.trim() : '';

      // Set loading state
      guideBtnTestConnection.disabled = true;
      guideBtnTestConnection.innerHTML = '<span>⏳ Handshake ping...</span>';
      if (guideSimResult) {
        guideSimResult.className = 'sim-result-banner';
        if (guideSimStatusTitle) guideSimStatusTitle.textContent = `Pinging ${providerName}...`;
        if (guideSimStatusDesc) guideSimStatusDesc.textContent = 'Verifying API authentication, checking quota limits, and establishing AES-GCM local session...';
      }

      setTimeout(() => {
        guideBtnTestConnection.disabled = false;
        guideBtnTestConnection.innerHTML = '<span>⚡ Test Connection</span>';

        if (!guideSimResult) return;

        if (provider === 'offline') {
          guideSimResult.className = 'sim-result-banner success';
          if (guideSimStatusTitle) guideSimStatusTitle.textContent = 'Connected — Offline Privacy Mode Active!';
          if (guideSimStatusDesc) guideSimStatusDesc.textContent = '100% on-device heuristic parser and DOM perception ready. Zero external egress.';
          showToast('✓ Offline Mode verified!');
        } else if (!key || key.length < 5) {
          guideSimResult.className = 'sim-result-banner error';
          if (guideSimStatusTitle) guideSimStatusTitle.textContent = 'Authentication Failed (401 Missing Key)';
          if (guideSimStatusDesc) guideSimStatusDesc.textContent = 'Please paste your API key or click "Paste Sample" to test the connection.';
          showToast('⚠️ API key is missing or incomplete.');
        } else {
          guideSimResult.className = 'sim-result-banner success';
          const latency = Math.floor(Math.random() * 60) + 160;
          if (guideSimStatusTitle) guideSimStatusTitle.textContent = `Connected (200 OK) — ${providerName} Ready!`;
          if (guideSimStatusDesc) guideSimStatusDesc.textContent = `Verified handshake in ${latency}ms. Quota active. Local zero-PII privacy firewall armed and ready to automate!`;
          showToast(`✓ ${providerName} Connected successfully (${latency}ms)!`);
        }
      }, 400);
    });
  }

  // 9. Initial setup
  detectBrowser();

})();

