/**
 * PlutoAI - Options Page Controller
 */

(function () {
  const geminiKey = document.getElementById('opt-gemini-key');
  const geminiModel = document.getElementById('opt-gemini-model');
  const openaiKey = document.getElementById('opt-openai-key');
  const openaiModel = document.getElementById('opt-openai-model');
  const claudeKey = document.getElementById('opt-claude-key');
  const claudeModel = document.getElementById('opt-claude-model');
  const groqKey = document.getElementById('opt-groq-key');
  const mistralKey = document.getElementById('opt-mistral-key');
  const deepseekKey = document.getElementById('opt-deepseek-key');
  const togetherKey = document.getElementById('opt-together-key');
  const xaiKey = document.getElementById('opt-xai-key');
  const customKey = document.getElementById('opt-custom-key');
  const customEndpoint = document.getElementById('opt-custom-endpoint');
  const maxSteps = document.getElementById('opt-max-steps');
  const stepDelay = document.getElementById('opt-step-delay');
  const visualCursor = document.getElementById('opt-visual-cursor');
  const ripples = document.getElementById('opt-ripples');
  const btnSaveAll = document.getElementById('btn-save-all');
  const saveStatus = document.getElementById('save-status');

  init();

  async function init() {
    const data = await chrome.storage.local.get(null);
    if (data.geminiApiKey && geminiKey) geminiKey.value = data.geminiApiKey;
    if (data.geminiModel && geminiModel) geminiModel.value = data.geminiModel;
    if (data.openaiApiKey && openaiKey) openaiKey.value = data.openaiApiKey;
    if (data.openaiModel && openaiModel) openaiModel.value = data.openaiModel;
    if (data.claudeApiKey && claudeKey) claudeKey.value = data.claudeApiKey;
    if (data.claudeModel && claudeModel) claudeModel.value = data.claudeModel;
    if (data.groqApiKey && groqKey) groqKey.value = data.groqApiKey;
    if (data.mistralApiKey && mistralKey) mistralKey.value = data.mistralApiKey;
    if (data.deepseekApiKey && deepseekKey) deepseekKey.value = data.deepseekApiKey;
    if (data.togetherApiKey && togetherKey) togetherKey.value = data.togetherApiKey;
    if (data.xaiApiKey && xaiKey) xaiKey.value = data.xaiApiKey;
    if (data.customApiKey && customKey) customKey.value = data.customApiKey;
    if (data.customEndpoint && customEndpoint) customEndpoint.value = data.customEndpoint;
    if (data.maxSteps && maxSteps) maxSteps.value = data.maxSteps;
    if (data.stepDelay && stepDelay) stepDelay.value = data.stepDelay;
    if (data.enableVisualCursor !== undefined && visualCursor) visualCursor.checked = data.enableVisualCursor;
    if (data.enableLaserRipples !== undefined && ripples) ripples.checked = data.enableLaserRipples;

    btnSaveAll.addEventListener('click', saveAll);

    // Test buttons
    document.querySelectorAll('.btn-test-key').forEach(btn => {
      btn.addEventListener('click', async () => {
        const provider = btn.getAttribute('data-provider');
        btn.textContent = 'Testing...';
        
        let apiKey = '';
        let model = '';
        if (provider === 'gemini') { apiKey = geminiKey?.value || ''; model = geminiModel?.value || ''; }
        if (provider === 'openai') { apiKey = openaiKey?.value || ''; model = openaiModel?.value || ''; }
        if (provider === 'claude') { apiKey = claudeKey?.value || ''; model = claudeModel?.value || ''; }
        if (provider === 'groq') { apiKey = groqKey?.value || ''; }
        if (provider === 'mistral') { apiKey = mistralKey?.value || ''; }
        if (provider === 'deepseek') { apiKey = deepseekKey?.value || ''; }
        if (provider === 'together') { apiKey = togetherKey?.value || ''; }
        if (provider === 'xai') { apiKey = xaiKey?.value || ''; }
        if (provider === 'custom') { apiKey = customKey?.value || ''; }

        chrome.runtime.sendMessage({
          action: 'TEST_API_KEY',
          payload: {
            provider,
            apiKey,
            model,
            customEndpoint: customEndpoint?.value || ''
          }
        }, (response) => {
          if (response && response.valid) {
            btn.textContent = '✓ Connected!';
            btn.style.borderColor = '#10B981';
            btn.style.color = '#6ee7b7';
          } else {
            btn.textContent = '✕ Error: ' + (response?.error?.slice(0, 25) || 'Failed');
            btn.style.borderColor = '#EF4444';
            btn.style.color = '#fca5a5';
          }
          setTimeout(() => {
            btn.textContent = `Test ${provider.toUpperCase()} Key`;
            btn.style.borderColor = '';
            btn.style.color = '';
          }, 3500);
        });
      });
    });
  }

  async function saveAll() {
    const payload = {
      geminiApiKey: geminiKey?.value.trim() || '',
      geminiModel: geminiModel?.value || 'gemini-3.5-flash-lite',
      openaiApiKey: openaiKey?.value.trim() || '',
      openaiModel: openaiModel?.value || 'gpt-4o',
      claudeApiKey: claudeKey?.value.trim() || '',
      claudeModel: claudeModel?.value || 'claude-3-5-sonnet-20241022',
      groqApiKey: groqKey?.value.trim() || '',
      mistralApiKey: mistralKey?.value.trim() || '',
      deepseekApiKey: deepseekKey?.value.trim() || '',
      togetherApiKey: togetherKey?.value.trim() || '',
      xaiApiKey: xaiKey?.value.trim() || '',
      customApiKey: customKey?.value.trim() || '',
      customEndpoint: customEndpoint?.value.trim() || '',
      maxSteps: parseInt(maxSteps?.value, 10) || 25,
      stepDelay: parseInt(stepDelay?.value, 10) || 1200,
      enableVisualCursor: visualCursor ? visualCursor.checked : true,
      enableLaserRipples: ripples ? ripples.checked : true
    };

    await chrome.storage.local.set(payload);
    saveStatus.textContent = '✓ All configuration saved successfully!';
    saveStatus.style.color = '#10B981';
    setTimeout(() => {
      saveStatus.textContent = 'All changes saved automatically.';
      saveStatus.style.color = '';
    }, 2500);
  }
})();
