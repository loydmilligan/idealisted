// IdeaListed Capture Extension - Popup Script

let currentPageData = null;
let config = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();
  await checkConnection();
  await analyzePage();
  setupEventListeners();
});

// Load configuration from storage
async function loadConfig() {
  const result = await chrome.storage.sync.get(['idealistedUrl', 'openrouterApiKey', 'aiModel']);
  config = {
    serverUrl: result.idealistedUrl || '',
    apiKey: result.openrouterApiKey || '',
    aiModel: result.aiModel || 'x-ai/grok-code-fast-1'
  };

  document.getElementById('serverUrl').textContent = config.serverUrl ? new URL(config.serverUrl).host : 'Not configured';

  if (!config.serverUrl) {
    showConfigNeeded();
  }
}

// Check connection to IdeaListed server
async function checkConnection() {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  if (!config.serverUrl) {
    statusDot.className = 'status-dot disconnected';
    statusText.textContent = 'Not configured';
    return false;
  }

  try {
    const response = await fetch(`${config.serverUrl}/api/items?limit=1`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      statusDot.className = 'status-dot connected';
      statusText.textContent = 'Connected';
      return true;
    } else {
      throw new Error('Server returned error');
    }
  } catch (error) {
    statusDot.className = 'status-dot disconnected';
    statusText.textContent = 'Disconnected';
    return false;
  }
}

// Inject content script if not already present
async function ensureContentScript(tabId) {
  try {
    // Try to ping the content script
    await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    return true;
  } catch (error) {
    // Content script not loaded, inject it
    console.log('Content script not found, injecting...');
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });
      // Wait a moment for script to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      return true;
    } catch (injectError) {
      console.error('Failed to inject content script:', injectError);
      return false;
    }
  }
}

// Analyze current page
async function analyzePage() {
  if (!config.serverUrl) return;

  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Ensure content script is loaded
    const scriptReady = await ensureContentScript(tab.id);
    if (!scriptReady) {
      throw new Error('Could not load content script');
    }

    // Get page data from content script
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractPageData' });
    currentPageData = response;

    // Update UI
    document.getElementById('pageTitle').textContent = currentPageData.title || 'Untitled';
    document.getElementById('pageUrl').textContent = currentPageData.url;

    // Detect content type
    const detectedType = detectContentType(currentPageData);
    currentPageData.detectedType = detectedType;

    updateTypeDisplay(detectedType);
    updatePreview(currentPageData);

    // Show capture form
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('captureForm').style.display = 'block';
    document.getElementById('captureBtn').disabled = false;

  } catch (error) {
    console.error('Error analyzing page:', error);
    showMessage('error', 'Could not analyze page. Try refreshing.');
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('captureForm').style.display = 'block';
  }
}

// Detect content type based on URL and page data
function detectContentType(pageData) {
  const url = pageData.url.toLowerCase();

  // YouTube detection
  if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
    return 'video';
  }

  // Research/Article detection based on content length and structure
  if (pageData.articleContent && pageData.articleContent.length > 500) {
    // Check for article indicators
    const hasArticleStructure = pageData.hasArticleTag ||
      pageData.metaType === 'article' ||
      pageData.wordCount > 300;

    if (hasArticleStructure) {
      return 'research';
    }
  }

  // Default to link
  return 'link';
}

// Update type display in UI
function updateTypeDisplay(type) {
  const typeIcon = document.getElementById('typeIcon');
  const typeName = document.getElementById('typeName');

  const typeConfig = {
    video: { icon: '🎥', name: 'YouTube Video', class: 'youtube' },
    research: { icon: '🔬', name: 'Research/Article', class: 'research' },
    link: { icon: '🔗', name: 'Link/URL', class: 'link' }
  };

  const config = typeConfig[type] || typeConfig.link;
  typeIcon.textContent = config.icon;
  typeName.textContent = config.name;
  typeName.className = `type-name ${config.class}`;

  // Update select
  document.getElementById('noteType').value = type;
}

// Update preview content
function updatePreview(pageData) {
  const preview = document.getElementById('previewContent');
  let previewText = '';

  if (pageData.detectedType === 'video') {
    previewText = `Channel: ${pageData.channel || 'Unknown'}\n`;
    previewText += `Duration: ${pageData.duration || 'Unknown'}\n`;
    previewText += `\n${pageData.description?.substring(0, 200) || 'No description'}...`;
  } else if (pageData.detectedType === 'research') {
    previewText = `Author: ${pageData.author || 'Unknown'}\n`;
    previewText += `Published: ${pageData.publishDate || 'Unknown'}\n`;
    previewText += `\n${pageData.articleContent?.substring(0, 200) || pageData.description?.substring(0, 200) || 'No content'}...`;
  } else {
    previewText = `Domain: ${pageData.domain}\n`;
    previewText += `\n${pageData.description?.substring(0, 200) || 'No description'}...`;
  }

  preview.textContent = previewText;
}

// Setup event listeners
function setupEventListeners() {
  // Capture button
  document.getElementById('captureBtn').addEventListener('click', handleCapture);

  // Cancel button
  document.getElementById('cancelBtn').addEventListener('click', () => window.close());

  // Type select change
  document.getElementById('noteType').addEventListener('change', (e) => {
    if (e.target.value !== 'auto') {
      currentPageData.detectedType = e.target.value;
      updateTypeDisplay(e.target.value);
      updatePreview(currentPageData);
    } else {
      const autoType = detectContentType(currentPageData);
      currentPageData.detectedType = autoType;
      updateTypeDisplay(autoType);
      updatePreview(currentPageData);
    }
  });

  // Settings link
  document.getElementById('settingsLink').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  // Open options button
  document.getElementById('openOptionsBtn')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Create task toggle
  const createTaskCheckbox = document.getElementById('createTaskCheckbox');
  const taskFields = document.getElementById('taskFields');

  createTaskCheckbox?.addEventListener('change', (e) => {
    if (e.target.checked) {
      taskFields.classList.add('visible');
    } else {
      taskFields.classList.remove('visible');
      document.getElementById('dueDateInput').value = '';
      document.getElementById('reminderInput').value = '';
    }
  });
}

// Handle capture action
async function handleCapture() {
  const captureBtn = document.getElementById('captureBtn');
  const statusDot = document.getElementById('statusDot');
  const createTaskCheckbox = document.getElementById('createTaskCheckbox');
  const dueDateInput = document.getElementById('dueDateInput');
  const reminderInput = document.getElementById('reminderInput');

  captureBtn.disabled = true;
  captureBtn.textContent = 'Processing...';
  statusDot.className = 'status-dot processing';

  try {
    // Send to background script for processing
    const result = await chrome.runtime.sendMessage({
      action: 'captureToIdeaListed',
      pageData: currentPageData,
      config: config,
      taskOptions: {
        createTask: createTaskCheckbox?.checked || false,
        dueDate: dueDateInput?.value || null,
        reminder: reminderInput?.value || null
      }
    });

    if (result.success) {
      showMessage('success', 'Captured successfully!');
      statusDot.className = 'status-dot connected';

      // Close popup after delay
      setTimeout(() => window.close(), 1500);
    } else {
      throw new Error(result.error || 'Capture failed');
    }
  } catch (error) {
    console.error('Capture error:', error);
    showMessage('error', error.message || 'Capture failed');
    captureBtn.disabled = false;
    captureBtn.textContent = 'Capture';
    statusDot.className = 'status-dot disconnected';
  }
}

// Show message
function showMessage(type, text) {
  const messageArea = document.getElementById('messageArea');
  messageArea.innerHTML = `<div class="message ${type}">${text}</div>`;
}

// Show config needed screen
function showConfigNeeded() {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('captureForm').style.display = 'none';
  document.getElementById('configNeeded').style.display = 'block';
}
