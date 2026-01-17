import type { TransformationResult } from '@/types/transformations';

export interface ParseResult {
  success: boolean;
  data?: TransformationResult;
  parseMethod?: string;
}

/**
 * Clean JSON string by removing common LLM quirks
 */
function cleanJsonString(str: string): string {
  // Remove trailing commas before } or ]
  let cleaned = str.replace(/,(\s*[}\]])/g, '$1');

  // Unescape common sequences if double-escaped
  cleaned = cleaned.replace(/\\\\n/g, '\\n');
  cleaned = cleaned.replace(/\\\\t/g, '\\t');

  return cleaned;
}

/**
 * Extract JSON object from a string that may contain markdown or other text
 */
function extractJsonObject(str: string): string | null {
  // Try to find JSON object pattern
  const match = str.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

/**
 * Extract transformedText field using regex (fallback)
 */
function extractTransformedTextField(str: string): string | null {
  // Match "transformedText": "..." with proper quote handling
  const patterns = [
    /"transformedText"\s*:\s*"((?:[^"\\]|\\.)*)"/,
    /'transformedText'\s*:\s*'((?:[^'\\]|\\.)*)'/,
    /transformedText\s*:\s*"((?:[^"\\]|\\.)*)"/,
  ];

  for (const pattern of patterns) {
    const match = str.match(pattern);
    if (match && match[1]) {
      // Unescape the matched string
      return match[1]
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }
  }

  return null;
}

/**
 * Extract content from markdown code block
 */
function extractFromMarkdownBlock(str: string): string | null {
  // Match ```json ... ``` or ``` ... ```
  const patterns = [/```json\s*([\s\S]*?)```/, /```\s*([\s\S]*?)```/];

  for (const pattern of patterns) {
    const match = str.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Multi-strategy parser to handle LLM response quirks
 *
 * Parsing Strategies (in order):
 * 1. Direct JSON: Try JSON.parse(response.trim())
 * 2. Markdown block: Extract from ```json ... ```
 * 3. JSON substring: Match /{[\s\S]*}/ anywhere in response
 * 4. Field extraction: Match /"transformedText"\s*:\s*"([^"]+)"/
 * 5. Fallback: Use raw response as transformedText
 */
export function parseTransformationResponse(response: string): ParseResult {
  if (!response || typeof response !== 'string') {
    return {
      success: true,
      data: { transformedText: response || '', usedFallback: true },
      parseMethod: 'empty-fallback',
    };
  }

  const trimmed = response.trim();

  // Strategy 1: Direct JSON parse
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed.transformedText === 'string') {
      return {
        success: true,
        data: { transformedText: parsed.transformedText, usedFallback: false },
        parseMethod: 'direct-json',
      };
    }
  } catch {
    // Continue to next strategy
  }

  // Strategy 2: Extract from markdown code block
  const markdownContent = extractFromMarkdownBlock(trimmed);
  if (markdownContent) {
    try {
      const cleaned = cleanJsonString(markdownContent);
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed.transformedText === 'string') {
        return {
          success: true,
          data: { transformedText: parsed.transformedText, usedFallback: false },
          parseMethod: 'markdown-block',
        };
      }
    } catch {
      // Continue to next strategy
    }
  }

  // Strategy 3: Extract JSON object from anywhere in response
  const jsonObject = extractJsonObject(trimmed);
  if (jsonObject) {
    try {
      const cleaned = cleanJsonString(jsonObject);
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed.transformedText === 'string') {
        return {
          success: true,
          data: { transformedText: parsed.transformedText, usedFallback: false },
          parseMethod: 'json-substring',
        };
      }
    } catch {
      // Continue to next strategy
    }
  }

  // Strategy 4: Regex field extraction
  const extractedField = extractTransformedTextField(trimmed);
  if (extractedField) {
    return {
      success: true,
      data: { transformedText: extractedField, usedFallback: false },
      parseMethod: 'field-extraction',
    };
  }

  // Strategy 5: Use raw response as fallback
  return {
    success: true,
    data: { transformedText: trimmed, usedFallback: true },
    parseMethod: 'raw-fallback',
  };
}
