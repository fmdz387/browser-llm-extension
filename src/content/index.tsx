import React from 'react';
import ReactDOM from 'react-dom/client';

import { App } from './App';
import { ShadowRootContext } from './ShadowRootContext';

// Content script entry point
// Uses Shadow DOM for complete style isolation from host page

const CONTAINER_ID = 'browser-llm-root';

function initContentScript() {
  // Prevent double initialization
  if (document.getElementById(CONTAINER_ID)) {
    console.log('[Browser LLM] Content script already initialized');
    return;
  }

  console.log('[Browser LLM] Initializing content script...');

  // Create container element
  const container = document.createElement('div');
  container.id = CONTAINER_ID;
  document.body.appendChild(container);

  // Attach shadow root for style isolation
  const shadowRoot = container.attachShadow({ mode: 'open' });

  // Create a container for React app inside shadow DOM
  const appContainer = document.createElement('div');
  appContainer.id = 'browser-llm-app';
  appContainer.className = 'browser-llm-shadow-host';
  shadowRoot.appendChild(appContainer);

  // Fetch and inject compiled Tailwind CSS
  fetch(chrome.runtime.getURL('content.css'))
    .then((response) => response.text())
    .then((css) => {
      // Create and inject styles
      const styleSheet = document.createElement('style');
      styleSheet.textContent = css;
      shadowRoot.insertBefore(styleSheet, appContainer);

      // Mount React app after styles are loaded
      const root = ReactDOM.createRoot(appContainer);
      root.render(
        <React.StrictMode>
          <ShadowRootContext.Provider value={{ container: appContainer }}>
            <App />
          </ShadowRootContext.Provider>
        </React.StrictMode>,
      );

      console.log('[Browser LLM] Content script initialized with shadow DOM');
    })
    .catch((error) => {
      console.error('[Browser LLM] Failed to load styles:', error);
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContentScript);
} else {
  initContentScript();
}
