import { handleContextMenuClick, registerContextMenus } from './contextMenu';
import { handleMessage } from './messageHandler';

// Register listeners synchronously at top level (Manifest V3 requirement)
console.log('[Browser LLM] Service worker initializing...');

// Register context menus on extension install/update
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Browser LLM] Extension installed/updated');
  registerContextMenus();
});

// Context menu click handler
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);

// Message handler from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle async message processing
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => {
      console.error('[Browser LLM] Message handler error:', error);
      sendResponse({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    });

  // Return true to indicate async response
  return true;
});

// Keep service worker alive during long operations (optional)
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'keepalive') {
    console.log('[Browser LLM] Keepalive port connected');
    port.onDisconnect.addListener(() => {
      console.log('[Browser LLM] Keepalive port disconnected');
    });
  }
});

console.log('[Browser LLM] Service worker initialized');
