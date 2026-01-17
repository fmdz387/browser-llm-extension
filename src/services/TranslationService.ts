import type { TranslationResult } from '@/types/messages';
import type { LLMProvider, LLMResult } from '@/providers';

export interface TranslationRequest {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

const SYSTEM_PROMPT = `You are a professional translator. Your task is to translate text accurately while preserving the original tone, meaning, and nuances.

Rules:
- Only respond with the translation, no explanations or preamble
- Preserve formatting (line breaks, paragraphs, etc.)
- Keep proper nouns, brand names, and technical terms as appropriate
- Maintain the register (formal/informal) of the original text`;

export async function translate(
  request: TranslationRequest,
  provider: LLMProvider,
  model?: string,
): Promise<LLMResult<TranslationResult>> {
  const prompt = request.sourceLanguage
    ? `Translate the following text from ${request.sourceLanguage} to ${request.targetLanguage}:\n\n${request.text}`
    : `Translate the following text to ${request.targetLanguage}:\n\n${request.text}`;

  const result = await provider.complete({
    model: model ?? '',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
  });

  if (!result.success) {
    return result;
  }

  return {
    success: true,
    data: {
      translatedText: result.data.content.trim(),
    },
  };
}

/**
 * Build the full prompt for translation (used for streaming)
 */
export function buildTranslationPrompt(request: TranslationRequest): {
  prompt: string;
  system: string;
} {
  const prompt = request.sourceLanguage
    ? `Translate the following text from ${request.sourceLanguage} to ${request.targetLanguage}:\n\n${request.text}`
    : `Translate the following text to ${request.targetLanguage}:\n\n${request.text}`;

  return { prompt, system: SYSTEM_PROMPT };
}

// Language code to name mapping
export const LANGUAGES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  ru: 'Russian',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
  hi: 'Hindi',
  nl: 'Dutch',
  pl: 'Polish',
  tr: 'Turkish',
  vi: 'Vietnamese',
  th: 'Thai',
  id: 'Indonesian',
  uk: 'Ukrainian',
  cs: 'Czech',
};

export function getLanguageName(code: string): string {
  return LANGUAGES[code] ?? code;
}
