// IdeaListed Capture Extension - Options Script

const MODEL_INFO = {
  'google/gemini-2.0-flash-exp:free': {
    name: 'Gemini 2.0 Flash',
    desc: 'Free tier, fast responses, good for structured extraction.'
  },
  'meta-llama/llama-3.2-3b-instruct:free': {
    name: 'Llama 3.2 3B',
    desc: 'Free tier, lightweight model, basic extraction.'
  },
  'qwen/qwen-2-7b-instruct:free': {
    name: 'Qwen 2 7B',
    desc: 'Free tier, good reasoning, multilingual support.'
  },
  'anthropic/claude-3.5-sonnet': {
    name: 'Claude 3.5 Sonnet',
    desc: 'Paid, excellent quality, best for detailed analysis.'
  },
  'openai/gpt-4o-mini': {
    name: 'GPT-4o Mini',
    desc: 'Paid, fast and capable, good balance of speed/quality.'
  },
  'anthropic/claude-3-haiku': {
    name: 'Claude 3 Haiku',
    desc: 'Paid, very fast, good for quick extraction.'
  },
  'google/gemini-pro': {
    name: 'Gemini Pro',
    desc: 'Paid, balanced performance, good for general use.'
  }
};

// Load settings on page load
document.addEventListener('DOMContentLoaded', loadSettings);

// Event listeners
document.getElementById('saveBtn').addEventListener('click', saveSettings);
document.getElementById('resetBtn').addEventListener('click', resetSettings);
document.getElementById('testConnection').addEventListener('click', testConnection);
document.getElementById('toggleApiKey').addEventListener('click', toggleApiKeyVisibility);
document.getElementById('aiModel').addEventListener('change', updateModelInfo);

// Load settings from storage
async function loadSettings() {
  const result = await chrome.storage.sync.get([
    'idealistedUrl',
    'openrouterApiKey',
    'aiModel',
    'defaultAction',
    'useAI'
  ]);

  document.getElementById('serverUrl').value = result.idealistedUrl || '';
  document.getElementById('apiKey').value = result.openrouterApiKey || '';
  document.getElementById('aiModel').value = result.aiModel || 'google/gemini-2.0-flash-exp:free';
  document.getElementById('defaultAction').value = result.defaultAction || 'popup';
  document.getElementById('useAI').checked = result.useAI !== false;

  updateModelInfo();
}

// Save settings
async function saveSettings() {
  const serverUrl = document.getElementById('serverUrl').value.trim();
  const apiKey = document.getElementById('apiKey').value.trim();
  const aiModel = document.getElementById('aiModel').value;
  const defaultAction = document.getElementById('defaultAction').value;
  const useAI = document.getElementById('useAI').checked;

  // Validate server URL
  if (serverUrl && !isValidUrl(serverUrl)) {
    showMessage('error', 'Please enter a valid server URL');
    return;
  }

  try {
    await chrome.storage.sync.set({
      idealistedUrl: serverUrl,
      openrouterApiKey: apiKey,
      aiModel: aiModel,
      defaultAction: defaultAction,
      useAI: useAI
    });

    showMessage('success', 'Settings saved successfully!');
  } catch (error) {
    showMessage('error', 'Failed to save settings: ' + error.message);
  }
}

// Reset settings
async function resetSettings() {
  if (confirm('Are you sure you want to reset all settings?')) {
    await chrome.storage.sync.clear();
    loadSettings();
    showMessage('success', 'Settings reset to defaults');
  }
}

// Test connection to IdeaListed server
async function testConnection() {
  const serverUrl = document.getElementById('serverUrl').value.trim();
  const testResult = document.getElementById('testResult');

  if (!serverUrl) {
    testResult.textContent = 'Enter server URL first';
    testResult.className = 'test-result error';
    return;
  }

  testResult.textContent = 'Testing...';
  testResult.className = 'test-result testing';

  try {
    const response = await fetch(`${serverUrl}/api/items?limit=1`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      testResult.textContent = '✓ Connected';
      testResult.className = 'test-result success';
    } else {
      testResult.textContent = `✗ Error ${response.status}`;
      testResult.className = 'test-result error';
    }
  } catch (error) {
    testResult.textContent = '✗ Connection failed';
    testResult.className = 'test-result error';
  }
}

// Toggle API key visibility
function toggleApiKeyVisibility() {
  const input = document.getElementById('apiKey');
  const btn = document.getElementById('toggleApiKey');

  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = 'Hide';
  } else {
    input.type = 'password';
    btn.textContent = 'Show';
  }
}

// Update model info display
function updateModelInfo() {
  const model = document.getElementById('aiModel').value;
  const info = MODEL_INFO[model];
  const infoEl = document.getElementById('modelInfo');

  if (info) {
    infoEl.innerHTML = `<strong>${info.name}</strong> - ${info.desc}`;
  }
}

// Show message
function showMessage(type, text) {
  const messageArea = document.getElementById('messageArea');
  messageArea.innerHTML = `<div class="message ${type}">${text}</div>`;

  // Auto-hide success messages
  if (type === 'success') {
    setTimeout(() => {
      messageArea.innerHTML = '';
    }, 3000);
  }
}

// Validate URL
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}
