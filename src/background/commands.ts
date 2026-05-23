/**
 * Bridges `chrome.commands.onCommand` events from manifest-declared
 * shortcuts to the content script via the same CONTEXT_MENU_ACTION
 * message used by the right-click menu.
 *
 * Manifest commands have no `suggested_key` by default — they're opt-in
 * via chrome://extensions/shortcuts. This keeps them from colliding with
 * the in-page keydown shortcuts on regular web pages and lets advanced
 * users bind keys that fire on chrome:// pages, the New Tab page, PDFs,
 * and other contexts where content scripts cannot inject.
 *
 * On those restricted pages the content script is absent, so the
 * forwarded message simply has no effect; we log and move on.
 */

import { DEFAULT_TRANSFORMATION_IDS } from '@/types/transformations';
import type { ContextMenuAction } from '@/types/messages';
import { sendToTab } from '@/utils/messaging';

type CommandName =
  | 'translate-selection'
  | 'fix-grammar-selection'
  | 'translate-urban-selection'
  | 'make-concise-selection';

const COMMAND_TO_TRANSFORMATION: Record<CommandName, string> = {
  'translate-selection': DEFAULT_TRANSFORMATION_IDS.TRANSLATE_TO_ENGLISH,
  'fix-grammar-selection': DEFAULT_TRANSFORMATION_IDS.FIX_GRAMMAR,
  'translate-urban-selection': DEFAULT_TRANSFORMATION_IDS.TRANSLATE_TO_URBAN_ENGLISH,
  'make-concise-selection': DEFAULT_TRANSFORMATION_IDS.MAKE_CONCISE,
};

function isKnownCommand(command: string): command is CommandName {
  return command in COMMAND_TO_TRANSFORMATION;
}

export async function handleCommand(
  command: string,
  tab: chrome.tabs.Tab | undefined,
): Promise<void> {
  // _execute_action is handled natively by Chrome (opens popup) — never lands here.
  if (!isKnownCommand(command)) {
    return;
  }

  const tabId = tab?.id;
  if (!tabId) {
    console.warn('[Browser LLM] chrome.commands fired with no active tab');
    return;
  }

  const message: ContextMenuAction = {
    type: 'CONTEXT_MENU_ACTION',
    action: 'transform',
    transformationId: COMMAND_TO_TRANSFORMATION[command],
  };

  await sendToTab(tabId, message);
}
