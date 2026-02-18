import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App';
import styles from './styles.css?inline';

declare global {
  interface Window {
    __careervine_shadow_root?: ShadowRoot;
  }
}

// Mount React inside Shadow DOM for complete style isolation
function mountApp() {
  // Get shadow root from global (set by content.js)
  const shadowRoot = window.__careervine_shadow_root;
  
  if (!shadowRoot) {
    console.error('CareerVine: Shadow root not found');
    return;
  }

  const rootElement = shadowRoot.getElementById("root");
  if (!rootElement) {
    console.error('CareerVine: #root element not found in shadow DOM');
    return;
  }

  // Inject styles into shadow root (isolated from page)
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  shadowRoot.insertBefore(styleSheet, shadowRoot.firstChild);

  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}

// Run immediately since we're loaded dynamically
mountApp();
