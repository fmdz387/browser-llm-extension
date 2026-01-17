import type { GrammarResult } from '@/types/messages';
import type { LLMProvider, LLMResult } from '@/providers';

export interface GrammarRequest {
  text: string;
  includeExplanations?: boolean;
}

const SIMPLE_SYSTEM_PROMPT = `You are a grammar and spelling expert. Correct any grammar, spelling, punctuation, or style errors in the provided text.

Rules:
- Only respond with the corrected text, no explanations
- Preserve the original meaning and intent
- Keep the same formatting (line breaks, paragraphs, etc.)
- If the text has no errors, return it unchanged`;

const DETAILED_SYSTEM_PROMPT = `You are a grammar and spelling expert. Analyze the provided text and correct any grammar, spelling, punctuation, or style errors.

Respond in this exact JSON format:
{
  "correctedText": "the corrected version of the text",
  "corrections": [
    {
      "original": "the incorrect phrase",
      "corrected": "the corrected phrase",
      "explanation": "brief explanation of why it was changed"
    }
  ]
}

If the text has no errors, return it with an empty corrections array.`;

export async function checkGrammar(
  request: GrammarRequest,
  provider: LLMProvider,
  model?: string,
): Promise<LLMResult<GrammarResult>> {
  const systemPrompt = request.includeExplanations ? DETAILED_SYSTEM_PROMPT : SIMPLE_SYSTEM_PROMPT;

  const result = await provider.complete({
    model: model ?? '',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: request.text },
    ],
  });

  if (!result.success) {
    return result;
  }

  const response = result.data.content.trim();

  // Parse response based on format
  if (request.includeExplanations) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          correctedText: string;
          corrections?: Array<{
            original: string;
            corrected: string;
            explanation?: string;
          }>;
        };

        return {
          success: true,
          data: {
            correctedText: parsed.correctedText,
            hasErrors: (parsed.corrections?.length ?? 0) > 0,
            corrections: parsed.corrections,
          },
        };
      }
    } catch {
      // JSON parsing failed, fall through to simple format
    }
  }

  // Simple format or JSON parsing failed
  return {
    success: true,
    data: {
      correctedText: response,
      hasErrors: response.toLowerCase() !== request.text.toLowerCase(),
    },
  };
}

/**
 * Build the full prompt for grammar checking (used for streaming)
 */
export function buildGrammarPrompt(request: GrammarRequest): {
  prompt: string;
  system: string;
} {
  return {
    prompt: request.text,
    system: SIMPLE_SYSTEM_PROMPT, // Always use simple for streaming
  };
}
