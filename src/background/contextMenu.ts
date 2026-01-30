import { getTransformationsFromStorage } from '@/store/useTransformationStore';
import type { ContextMenuAction } from '@/types/messages';
import { sendToTab } from '@/utils/messaging';

// Prefix for transformation menu item IDs
const TRANSFORM_ID_PREFIX = 'browser-llm-transform-';

// OCR context menu ID
const OCR_MENU_ID = 'browser-llm-ocr';

// Maximum number of context menu items (Chrome has limits)
const MAX_MENU_ITEMS = 50;

// Mutex to prevent concurrent context menu registrations
let registrationInProgress: Promise<void> | null = null;

/**
 * Promisified wrapper for chrome.contextMenus.removeAll
 */
function removeAllMenus(): Promise<void> {
  return new Promise((resolve) => {
    chrome.contextMenus.removeAll(() => {
      // Clear any lastError to prevent it from propagating
      void chrome.runtime.lastError;
      resolve();
    });
  });
}

/**
 * Safely create a context menu item, ignoring duplicate ID errors
 */
function createMenuItem(props: chrome.contextMenus.CreateProperties): void {
  chrome.contextMenus.create(props, () => {
    // Suppress duplicate ID errors - can happen during rapid re-registration
    void chrome.runtime.lastError;
  });
}

/**
 * Register context menus dynamically from stored transformations
 */
export async function registerContextMenus(): Promise<void> {
  // Wait for any in-progress registration to complete first
  if (registrationInProgress) {
    await registrationInProgress;
  }

  // Create new registration promise
  registrationInProgress = (async () => {
    try {
      // Get enabled transformations from storage
      const transformations = await getTransformationsFromStorage();
      const enabledTransformations = transformations
        .filter((t) => t.enabled)
        .sort((a, b) => a.order - b.order)
        .slice(0, MAX_MENU_ITEMS);

      // Remove all existing menus first
      await removeAllMenus();

      // Create parent menu
      createMenuItem({
        id: 'browser-llm-parent',
        title: 'Browser LLM',
        contexts: ['selection'],
      });

      // Create menu items for each enabled transformation
      for (const transformation of enabledTransformations) {
        createMenuItem({
          id: `${TRANSFORM_ID_PREFIX}${transformation.id}`,
          parentId: 'browser-llm-parent',
          title: transformation.name,
          contexts: ['selection'],
        });
      }

      // Add separator if there are transformations
      if (enabledTransformations.length > 0) {
        createMenuItem({
          id: 'browser-llm-separator',
          parentId: 'browser-llm-parent',
          type: 'separator',
          contexts: ['selection'],
        });
      }

      // Add "Manage Transformations..." link at bottom
      createMenuItem({
        id: 'browser-llm-manage',
        parentId: 'browser-llm-parent',
        title: 'Manage Transformations...',
        contexts: ['selection'],
      });

      // Create separate OCR menu item for images (not under parent, direct context menu)
      createMenuItem({
        id: OCR_MENU_ID,
        title: 'Extract Text (OCR)',
        contexts: ['image'],
      });

      console.log(
        `[Browser LLM] Context menus registered with ${enabledTransformations.length} transformations + OCR`,
      );
    } finally {
      registrationInProgress = null;
    }
  })();

  await registrationInProgress;
}

/**
 * Handle context menu clicks
 */
export async function handleContextMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab: chrome.tabs.Tab | undefined,
): Promise<void> {
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

    // Content script looks up title/description from the transformation store
    const message: ContextMenuAction = {
      type: 'CONTEXT_MENU_ACTION',
      action: 'transform',
      transformationId,
    };

    sendToTab(tab.id, message);
    console.log(`[Browser LLM] Context menu action: transform (${transformationId})`);
    return;
  }

  // Handle OCR menu item click
  if (menuItemId === OCR_MENU_ID) {
    // info.srcUrl contains the image URL when right-clicking on an image
    const imageUrl = info.srcUrl;

    if (!imageUrl) {
      console.warn('[Browser LLM] No image URL for OCR action');
      return;
    }

    const message: ContextMenuAction = {
      type: 'CONTEXT_MENU_ACTION',
      action: 'ocr',
      imageUrl,
    };

    console.log(`[Browser LLM] Sending OCR message to tab ${tab.id}:`, message);
    sendToTab(tab.id, message).then((response) => {
      console.log(`[Browser LLM] OCR message sent, response:`, response);
    }).catch((err) => {
      console.error(`[Browser LLM] Failed to send OCR message:`, err);
    });
  }
}
