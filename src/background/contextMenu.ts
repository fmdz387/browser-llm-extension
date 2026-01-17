import type { ContextMenuAction } from '@/types/messages';
import { sendToTab } from '@/utils/messaging';

// Menu item definitions
const MENU_ITEMS = [
  {
    id: 'browser-llm-translate',
    title: 'Translate Selection',
    action: 'translate' as const,
  },
  {
    id: 'browser-llm-improve',
    title: 'Improve Writing',
    action: 'improve' as const,
  },
  {
    id: 'browser-llm-grammar',
    title: 'Check Grammar',
    action: 'grammar' as const,
  },
] as const;

/**
 * Register context menus on extension install/update
 */
export function registerContextMenus(): void {
  // Remove existing menus first
  chrome.contextMenus.removeAll(() => {
    // Create parent menu
    chrome.contextMenus.create({
      id: 'browser-llm-parent',
      title: 'Browser LLM',
      contexts: ['selection'],
    });

    // Create child menu items
    for (const item of MENU_ITEMS) {
      chrome.contextMenus.create({
        id: item.id,
        parentId: 'browser-llm-parent',
        title: item.title,
        contexts: ['selection'],
      });
    }

    console.log('[Browser LLM] Context menus registered');
  });
}

/**
 * Handle context menu clicks
 */
export function handleContextMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab: chrome.tabs.Tab | undefined,
): void {
  if (!tab?.id) {
    console.warn('[Browser LLM] No tab ID for context menu action');
    return;
  }

  const menuItem = MENU_ITEMS.find((item) => item.id === info.menuItemId);

  if (menuItem) {
    const message: ContextMenuAction = {
      type: 'CONTEXT_MENU_ACTION',
      action: menuItem.action,
    };

    sendToTab(tab.id, message);
    console.log(`[Browser LLM] Context menu action: ${menuItem.action}`);
  }
}
