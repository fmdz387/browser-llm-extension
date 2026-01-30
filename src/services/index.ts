// Re-export all services
export {
  translate,
  buildTranslationPrompt,
  LANGUAGES,
  getLanguageName,
} from './TranslationService';
export { assistWriting, buildWritingPrompt, ACTION_LABELS, STYLE_LABELS } from './WritingService';
export type { WritingAction, WritingStyle, WritingRequest } from './WritingService';
export { checkGrammar, buildGrammarPrompt } from './GrammarService';
export type { GrammarRequest } from './GrammarService';
export { transform, buildTransformPrompt } from './TransformationService';
export type { TransformRequest } from './TransformationService';
export {
  extractText,
  buildOCRPrompt,
  OCR_DEFAULT_MODEL,
} from './OCRService';
export type { OCRRequest, OCRResult } from './OCRService';
export {
  parseShortcut,
  eventToShortcutString,
  matchesShortcut,
  validateShortcut,
  normalizeShortcutString,
  formatShortcutForDisplay,
  isModifierOnlyEvent,
  getModifiersFromEvent,
} from './ShortcutService';
