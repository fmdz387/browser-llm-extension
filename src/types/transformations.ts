// User-Configurable Text Transformation Types

/**
 * A user-defined text transformation
 */
export interface Transformation {
  id: string;
  name: string;
  instructions: string;
  enabled: boolean;
  order: number;
  createdAt: number;
  updatedAt: number;
  /** Display title shown in the popover header (max 30 chars) */
  title?: string;
  /** Short description shown below the title (max 80 chars) */
  description?: string;
}

/** Validation constraints for transformation metadata */
export const TRANSFORMATION_LIMITS = {
  TITLE_MAX_LENGTH: 30,
  DESCRIPTION_MAX_LENGTH: 80,
  NAME_MAX_LENGTH: 50,
} as const;

/**
 * Result of a transformation, including fallback info
 */
export interface TransformationResult {
  transformedText: string;
  usedFallback: boolean; // True if JSON parsing failed
}

/**
 * Payload for transform requests
 */
export interface TransformPayload {
  text: string;
  transformationId: string;
}

/**
 * Fixed IDs for default transformations (used for shortcut mapping)
 */
export const DEFAULT_TRANSFORMATION_IDS = {
  TRANSLATE_TO_ENGLISH: 'default-translate-to-english',
  FIX_GRAMMAR: 'default-fix-grammar',
  MAKE_CONCISE: 'default-make-concise',
} as const;

/**
 * Default transformations provided as a starter set
 * Using fixed IDs so keyboard shortcuts can reference them
 */
export const DEFAULT_TRANSFORMATIONS: Omit<Transformation, 'createdAt' | 'updatedAt'>[] = [
  {
    id: DEFAULT_TRANSFORMATION_IDS.TRANSLATE_TO_ENGLISH,
    name: 'Translate to English',
    title: 'Translation',
    description: 'Converting text to English',
    instructions: 'Translate the text to English. Preserve the original tone and formatting.',
    enabled: true,
    order: 0,
  },
  {
    id: DEFAULT_TRANSFORMATION_IDS.FIX_GRAMMAR,
    name: 'Fix Grammar',
    title: 'Grammar Fix',
    description: 'Correcting grammar, spelling, and punctuation',
    instructions:
      'Fix any grammar, spelling, and punctuation errors in the text. Preserve the original meaning and style.',
    enabled: true,
    order: 1,
  },
  {
    id: DEFAULT_TRANSFORMATION_IDS.MAKE_CONCISE,
    name: 'Make Concise',
    title: 'Concise Rewrite',
    description: 'Making text shorter while keeping key points',
    instructions:
      'Rewrite the text to be more concise while preserving the key information. Remove unnecessary words and redundancy.',
    enabled: true,
    order: 2,
  },
];
