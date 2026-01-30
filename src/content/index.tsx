import React from 'react';
import ReactDOM from 'react-dom/client';

import { App } from './App';
import { ShadowRootContext } from './ShadowRootContext';

// Content script entry point
// Uses Shadow DOM for complete style isolation from host page

const CONTAINER_ID = 'browser-llm-root';

// Message queue for messages that arrive before React is ready
type QueuedMessage = { type: string; action?: string; transformationId?: string; imageUrl?: string };
let messageQueue: QueuedMessage[] = [];
let messageHandler: ((message: QueuedMessage) => void) | null = null;

// Register the handler from React component
export function setMessageHandler(handler: (message: QueuedMessage) => void) {
  messageHandler = handler;
  // Process any queued messages
  if (messageQueue.length > 0) {
    console.log('[Browser LLM Content] Processing', messageQueue.length, 'queued messages');
    messageQueue.forEach(msg => handler(msg));
    messageQueue = [];
  }
}

export function clearMessageHandler() {
  messageHandler = null;
}

// Set up message listener IMMEDIATELY (before React mounts)
// This ensures we never miss messages
chrome.runtime.onMessage.addListener((message: QueuedMessage, _sender, _sendResponse) => {
  if (message.type !== 'CONTEXT_MENU_ACTION') {
    return;
  }

  if (messageHandler) {
    // React is ready, handle immediately
    messageHandler(message);
  } else {
    messageQueue.push(message);
  }
});

function initContentScript() {
  // Prevent double initialization
  if (document.getElementById(CONTAINER_ID)) {
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
