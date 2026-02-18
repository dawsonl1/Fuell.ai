/**
 * Background Service Worker for CareerVine Extension
 * Handles API communication and authentication
 */

// Load environment configuration
let config = {};

// Initialize configuration
async function initializeConfig() {
  try {
    const response = await fetch(chrome.runtime.getURL('env/development.json'));
    config = await response.json();
  } catch (error) {
    console.error('Failed to load config:', error);
    // Fallback to development defaults
    config = {
      apiBaseUrl: 'http://localhost:3000/api',
      supabaseUrl: 'http://localhost:54321',
      environment: 'development'
    };
  }
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Ensure config is loaded before handling message
  (async () => {
    if (!config.supabaseUrl) {
      await initializeConfig();
    }
    
    try {
      switch (message.action) {
      case 'parseProfile':
        await handleParseProfile(message.data, sendResponse);
        break;
      case 'importData':
        await handleImportData(message.data, sendResponse);
        break;
      case 'authenticate':
        await handleAuthentication(message.credentials, sendResponse);
        break;
      case 'checkAuth':
        await checkAuthentication(sendResponse);
        break;
      case 'logout':
        await handleLogout(sendResponse);
        break;
      case 'getLatestProfile':
        await handleGetLatestProfile(sendResponse);
        break;
      default:
        sendResponse({ error: 'Unknown action' });
    }
  } catch (error) {
      console.error('Background script error:', error);
      sendResponse({ error: error.message });
    }
  })();
  
  // Return true to indicate async response
  return true;
});

async function handleParseProfile(data, sendResponse) {
  try {
    // Get stored session
    const { session } = await chrome.storage.local.get(['session']);
    
    if (!session) {
      sendResponse({ error: 'Not authenticated. Please sign in first.' });
      return;
    }

    // Call API to parse profile with OpenAI
    const response = await fetch(`${config.apiBaseUrl}/extension/parse-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        cleanedText: data.cleanedText,
        profileUrl: data.profileUrl
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    
    // Cache the latest profile for React panel
    await chrome.storage.local.set({ latestProfile: result.profileData });
    
    sendResponse({ success: true, profileData: result.profileData });

  } catch (error) {
    console.error('Parse profile error:', error);
    sendResponse({ error: error.message });
  }
}

async function handleImportData(data, sendResponse) {
  try {
    // Get stored session
    const { session } = await chrome.storage.local.get(['session']);
    
    if (!session) {
      sendResponse({ error: 'Not authenticated. Please sign in first.' });
      return;
    }

    // Call API to import data
    const response = await fetch(`${config.apiBaseUrl}/contacts/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        profileData: data,
        sessionId: session.access_token
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    sendResponse({ success: true, data: result });

  } catch (error) {
    console.error('Import error:', error);
    sendResponse({ error: error.message });
  }
}

async function handleAuthentication(credentials, sendResponse) {
  try {
    // Call Supabase auth endpoint
    const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': config.supabaseAnonKey || 'your-anon-key-here'
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error_description || errorData.error || 'Authentication failed');
    }

    const session = await response.json();
    
    // Store session
    await chrome.storage.local.set({ 
      session: session,
      isAuthenticated: true 
    });

    sendResponse({ success: true, session: session });

  } catch (error) {
    console.error('Authentication error:', error);
    sendResponse({ error: error.message });
  }
}

async function checkAuthentication(sendResponse) {
  try {
    const { session, isAuthenticated } = await chrome.storage.local.get(['session', 'isAuthenticated']);
    
    if (!session || !isAuthenticated) {
      sendResponse({ authenticated: false });
      return;
    }

    // Check if session is still valid
    const response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': config.supabaseAnonKey || 'your-anon-key-here'
      }
    });

    if (response.ok) {
      sendResponse({ authenticated: true, user: await response.json() });
    } else {
      // Session expired, clear it
      await chrome.storage.local.remove(['session', 'isAuthenticated']);
      sendResponse({ authenticated: false });
    }

  } catch (error) {
    console.error('Auth check error:', error);
    sendResponse({ authenticated: false });
  }
}

async function handleLogout(sendResponse) {
  try {
    await chrome.storage.local.remove(['session', 'isAuthenticated']);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    sendResponse({ error: error.message });
  }
}

async function handleGetLatestProfile(sendResponse) {
  try {
    const { latestProfile } = await chrome.storage.local.get(['latestProfile']);
    sendResponse({ profileData: latestProfile });
  } catch (error) {
    console.error('Get latest profile error:', error);
    sendResponse({ error: error.message });
  }
}

// Handle extension installation
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('CareerVine Extension installed');
    
    // Initialize configuration
    await initializeConfig();
    
    // Set default values
    await chrome.storage.local.set({
      isAuthenticated: false,
      session: null
    });
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(async () => {
  console.log('CareerVine Extension started');
  await initializeConfig();
});
