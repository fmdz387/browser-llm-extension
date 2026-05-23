import { handleCommand } from './commands';
import { handleContextMenuClick, registerContextMenus } from './contextMenu';
import { handleMessage } from './messageHandler';

// Register listeners synchronously at top level (Manifest V3 requirement)
console.log('[Browser LLM] Service worker initializing...');

// Storage key for transformations
const TRANSFORMATIONS_STORAGE_KEY = 'browser-llm-transformations';

// Register context menus on extension install/update
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Browser LLM] Extension installed/updated');
  registerContextMenus();
});

// Listen for storage changes to update context menus when transformations change
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes[TRANSFORMATIONS_STORAGE_KEY]) {
    console.log('[Browser LLM] Transformations changed, updating context menus...');
    registerContextMenus();
  }
});

// Context menu click handler (wrapped to handle async)
chrome.contextMenus.onClicked.addListener((info, tab) => {
  void handleContextMenuClick(info, tab);
});

// Manifest-declared keyboard commands (chrome://extensions/shortcuts)
if (chrome.commands?.onCommand) {
  chrome.commands.onCommand.addListener((command, tab) => {
    void handleCommand(command, tab);
  });
}

// Message handler from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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

console.log('[Browser LLM] Service worker initialized');
