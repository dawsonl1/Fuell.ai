/**
 * CareerVine Content Script
 * Handles LinkedIn profile scraping and slide-out panel UI
 */

// State
let isPanelOpen = false;
let currentProfileData = null;
let isAnalyzing = false;
let lastAnalyzedProfileId = null;

// Create and inject the slide-out panel with Shadow DOM isolation
function createPanel() {
  // Check if panel already exists
  if (document.getElementById('careervine-panel-host')) {
    return;
  }

  // Create host element for Shadow DOM
  const host = document.createElement('div');
  host.id = 'careervine-panel-host';
  host.style.cssText = 'all: initial; position: fixed; top: 0; right: 0; z-index: 2147483647; height: 100vh; pointer-events: none;';
  document.body.appendChild(host);

  // Create Shadow DOM for complete style isolation
  const shadow = host.attachShadow({ mode: 'open' });

  // Create panel container inside shadow
  const panel = document.createElement('div');
  panel.id = 'careervine-panel';
  panel.className = 'careervine-panel';
  panel.style.cssText = 'pointer-events: auto;';
  panel.innerHTML = `<div id="root"></div>`;
  shadow.appendChild(panel);

  // Make panel visible immediately
  setTimeout(() => {
    panel.classList.add('open');
    isPanelOpen = true;
    console.log('CareerVine panel opened');
  }, 100);

  // Load React panel bundle into shadow DOM
  loadPanelScript(shadow);
}

function loadPanelScript(shadowRoot) {
  // Define process.env for React bundle
  window.process = { env: { NODE_ENV: 'production' } };
  
  // Store shadow root globally for the panel script
  window.__careervine_shadow_root = shadowRoot;
  
  // Import the panel script as a module in the content script context
  // This keeps it in the same isolated world where we have access to shadowRoot
  import(chrome.runtime.getURL('src/content/panel-app/panel.js'))
    .catch(error => {
      console.error('CareerVine: Failed to load panel script:', error);
    });
}

// Create the floating action button
function createFAB() {
  if (document.getElementById('careervine-fab')) {
    return;
  }

  const fab = document.createElement('button');
  fab.id = 'careervine-fab';
  fab.className = 'careervine-fab';
  fab.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M7 20h10"/>
      <path d="M10 20c5.5-2.5.8-6.4 3-10"/>
      <path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/>
      <path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>
    </svg>
  `;
  fab.title = 'Import to CareerVine';
  fab.addEventListener('click', togglePanel);

  document.body.appendChild(fab);
}

function togglePanel() {
  if (isPanelOpen) {
    closePanel();
  } else {
    openPanel();
  }
}

function openPanel() {
  createPanel();
  const host = document.getElementById('careervine-panel-host');
  if (host && host.shadowRoot) {
    const panel = host.shadowRoot.getElementById('careervine-panel');
    if (panel) {
      panel.classList.add('open');
      isPanelOpen = true;
      
      // Check if we need to analyze a new profile
      const currentProfileId = extractProfileId(window.location.href);
      if (currentProfileId && currentProfileId !== lastAnalyzedProfileId) {
        // Set analyzing state and notify React panel
        isAnalyzing = true;
        const event = new CustomEvent('careervine:analyzing', { detail: { analyzing: true } });
        window.dispatchEvent(event);
        
        // Start analysis
        autoScrapeIfProfile().then(() => {
          isAnalyzing = false;
          lastAnalyzedProfileId = currentProfileId;
          // Notify React panel that analysis is complete
          const doneEvent = new CustomEvent('careervine:analyzing', { detail: { analyzing: false } });
          window.dispatchEvent(doneEvent);
        });
      }
    }
  }
}

function closePanel() {
  console.log('CareerVine: closePanel called');
  const host = document.getElementById('careervine-panel-host');
  if (host && host.shadowRoot) {
    const panel = host.shadowRoot.getElementById('careervine-panel');
    if (panel) {
      panel.classList.remove('open');
      isPanelOpen = false;
      console.log('CareerVine: panel closed');
    }
  }
}

async function checkAuthAndShowContent() {
  // No longer needed: React panel handles auth/data loading internally
}

function showLoginUI() {
  // No longer needed: React panel handles auth/data loading internally
}

async function handleLogin(e) {
  // No longer needed: React panel handles auth/data loading internally
}

function showScrapeUI(user) {
  // No longer needed: React panel handles auth/data loading internally
}

async function handleLogout() {
  // No longer needed: React panel handles auth/data loading internally
}

async function handleScrape() {
  // No longer needed: React panel handles auth/data loading internally
}

function showContactForm(profileData) {
  // No longer needed: React panel handles auth/data loading internally
}

function resetForm() {
  // No longer needed: React panel handles auth/data loading internally
}

function handleSubmitContact(e) {
  // No longer needed: React panel handles auth/data loading internally
}

// Check if extension context is still valid
function isExtensionContextValid() {
  try {
    return chrome.runtime && !!chrome.runtime.id;
  } catch {
    return false;
  }
}

// Auto-scrape on LinkedIn profile visits
async function autoScrapeIfProfile() {
  if (!window.location.href.includes('linkedin.com/in/')) return;
  if (!isExtensionContextValid()) {
    console.log('CareerVine: Extension context invalidated, skipping auto-scrape');
    return;
  }
  
  try {
    const response = await chrome.runtime.sendMessage({ action: 'checkAuth' });
    if (!response?.authenticated) {
      console.log('CareerVine: Not authenticated, skipping auto-scrape');
      return;
    }
    
    // Already authenticated, scrape immediately
    const scraper = new window.LinkedInScraper();
    const cleanedText = await scraper.scrapeAndClean();
    
    if (!isExtensionContextValid()) return;
    
    await chrome.runtime.sendMessage({
      action: 'parseProfile',
      data: {
        cleanedText,
        profileUrl: window.location.href
      }
    });
  } catch (error) {
    if (error.message?.includes('Extension context invalidated')) {
      console.log('CareerVine: Extension was reloaded, please refresh the page');
    } else {
      console.error('CareerVine: Auto-scrape failed:', error);
    }
  }
}

// Listen for navigation changes (SPA)
let lastUrl = window.location.href;
let lastProfileId = extractProfileId(lastUrl);

function extractProfileId(url) {
  const match = url.match(/linkedin\.com\/in\/([^/?]+)/);
  return match ? match[1] : null;
}

// Use multiple methods to detect navigation in LinkedIn SPA
// Method 1: MutationObserver for DOM changes
new MutationObserver(() => {
  const currentUrl = window.location.href;
  const currentProfileId = extractProfileId(currentUrl);
  
  if (currentUrl !== lastUrl) {
    lastUrl = currentUrl;
    // Only rescrape if we're on a different profile
    if (currentProfileId && currentProfileId !== lastProfileId) {
      lastProfileId = currentProfileId;
      console.log('CareerVine: New profile detected via MutationObserver:', currentProfileId);
      // Close panel when navigating to new profile
      if (isPanelOpen) {
        closePanel();
      }
      // Reset analysis state for new profile
      isAnalyzing = false;
      lastAnalyzedProfileId = null;
      autoScrapeIfProfile();
    }
  }
}).observe(document.body, { childList: true, subtree: true });

// Method 2:// Listen for popstate (back/forward navigation)
window.addEventListener('popstate', () => {
  const currentProfileId = extractProfileId(window.location.href);
  if (currentProfileId && currentProfileId !== lastProfileId) {
    lastProfileId = currentProfileId;
    console.log('CareerVine: New profile detected via popstate:', currentProfileId);
    // Close panel when navigating to new profile
    if (isPanelOpen) {
      closePanel();
    }
    // Reset analysis state for new profile
    isAnalyzing = false;
    lastAnalyzedProfileId = null;
    autoScrapeIfProfile();
  }
});

// Method 3: Intercept pushState/replaceState for programmatic navigation
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function(...args) {
  originalPushState.apply(this, args);
  handleHistoryChange();
};

history.replaceState = function(...args) {
  originalReplaceState.apply(this, args);
  handleHistoryChange();
};

function handleHistoryChange() {
  const currentProfileId = extractProfileId(window.location.href);
  if (currentProfileId && currentProfileId !== lastProfileId) {
    lastProfileId = currentProfileId;
    console.log('CareerVine: New profile detected via history change:', currentProfileId);
    // Close panel when navigating to new profile
    if (isPanelOpen) {
      closePanel();
    }
    // Reset analysis state for new profile
    isAnalyzing = false;
    lastAnalyzedProfileId = null;
    // Small delay to let LinkedIn load the new profile content
    setTimeout(autoScrapeIfProfile, 500);
  }
}

// Add close panel listener at initialization (before panel is created)
window.addEventListener('careervine:close-panel', closePanel);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    createFAB();
    // Reset state on page reload
    isAnalyzing = false;
    lastAnalyzedProfileId = null;
    autoScrapeIfProfile();
  });
} else {
  createFAB();
  // Reset state on page reload
  isAnalyzing = false;
  lastAnalyzedProfileId = null;
  autoScrapeIfProfile();
}

// Also expose for manual triggering
window.CareerVinePanel = {
  open: openPanel,
  close: closePanel,
  toggle: togglePanel
};

console.log('CareerVine content script loaded');
