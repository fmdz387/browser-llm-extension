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
}

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
 * Default transformations provided as a starter set
 */
export const DEFAULT_TRANSFORMATIONS: Omit<Transformation, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Translate to English',
    instructions: 'Translate the text to English. Preserve the original tone and formatting.',
    enabled: true,
    order: 0,
  },
  {
    name: 'Fix Grammar',
    instructions:
      'Fix any grammar, spelling, and punctuation errors in the text. Preserve the original meaning and style.',
    enabled: true,
    order: 1,
  },
  {
    name: 'Make Concise',
    instructions:
      'Rewrite the text to be more concise while preserving the key information. Remove unnecessary words and redundancy.',
    enabled: true,
    order: 2,
  },
];
