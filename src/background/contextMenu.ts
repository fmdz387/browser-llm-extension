import { getTransformationsFromStorage } from '@/store/useTransformationStore';
import type { ContextMenuAction } from '@/types/messages';
import type { Transformation } from '@/types/transformations';
import { sendToTab } from '@/utils/messaging';

// Prefix for transformation menu item IDs
const TRANSFORM_ID_PREFIX = 'browser-llm-transform-';

// Maximum number of context menu items (Chrome has limits)
const MAX_MENU_ITEMS = 50;

/**
 * Register context menus dynamically from stored transformations
 */
export async function registerContextMenus(): Promise<void> {
  // Get enabled transformations from storage
  const transformations = await getTransformationsFromStorage();
  const enabledTransformations = transformations
    .filter((t) => t.enabled)
    .sort((a, b) => a.order - b.order)
    .slice(0, MAX_MENU_ITEMS);

  // Remove all existing menus and recreate
  chrome.contextMenus.removeAll(() => {
    // Create parent menu
    chrome.contextMenus.create({
      id: 'browser-llm-parent',
      title: 'Browser LLM',
      contexts: ['selection'],
    });

    // Create menu items for each enabled transformation
    for (const transformation of enabledTransformations) {
      chrome.contextMenus.create({
        id: `${TRANSFORM_ID_PREFIX}${transformation.id}`,
        parentId: 'browser-llm-parent',
        title: transformation.name,
        contexts: ['selection'],
      });
    }

    // Add separator if there are transformations
    if (enabledTransformations.length > 0) {
      chrome.contextMenus.create({
        id: 'browser-llm-separator',
        parentId: 'browser-llm-parent',
        type: 'separator',
        contexts: ['selection'],
      });
    }

    // Add "Manage Transformations..." link at bottom
    chrome.contextMenus.create({
      id: 'browser-llm-manage',
      parentId: 'browser-llm-parent',
      title: 'Manage Transformations...',
      contexts: ['selection'],
    });

    console.log(
      `[Browser LLM] Context menus registered with ${enabledTransformations.length} transformations`,
    );
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

  const menuItemId = String(info.menuItemId);

  // Handle "Manage Transformations" click - open popup
  if (menuItemId === 'browser-llm-manage') {
    chrome.action.openPopup();
    console.log('[Browser LLM] Opening popup for transformation management');
    return;
  }

  // Handle transformation menu item clicks
  if (menuItemId.startsWith(TRANSFORM_ID_PREFIX)) {
    const transformationId = menuItemId.replace(TRANSFORM_ID_PREFIX, '');

    const message: ContextMenuAction = {
      type: 'CONTEXT_MENU_ACTION',
      action: 'transform',
      transformationId,
    };

    sendToTab(tab.id, message);
    console.log(`[Browser LLM] Context menu action: transform (${transformationId})`);
  }
}
