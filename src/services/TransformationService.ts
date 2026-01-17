import type { LLMProvider, LLMResult } from '@/providers';
import type { Transformation, TransformationResult } from '@/types/transformations';
import { parseTransformationResponse } from '@/utils/jsonParser';

export interface TransformRequest {
  text: string;
  transformation: Transformation;
}

const SYSTEM_PROMPT_TEMPLATE = `You are a text transformation assistant. Your task is to transform the provided text according to the user's instructions.

IMPORTANT: You MUST respond with ONLY a JSON object in this exact format:
{
  "transformedText": "your transformed text here"
}

Rules:
- Return ONLY the JSON object, no explanations or additional text
- Preserve formatting (line breaks, paragraphs) unless instructed otherwise
- If the transformation cannot be performed, return the original text unchanged

User's transformation instructions:
{{INSTRUCTIONS}}`;

/**
 * Build the system prompt with user instructions
 */
function buildSystemPrompt(instructions: string): string {
  return SYSTEM_PROMPT_TEMPLATE.replace('{{INSTRUCTIONS}}', instructions);
}

/**
 * Execute a text transformation
 */
export async function transform(
  request: TransformRequest,
  provider: LLMProvider,
  model?: string,
): Promise<LLMResult<TransformationResult>> {
  const systemPrompt = buildSystemPrompt(request.transformation.instructions);

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

  const parsed = parseTransformationResponse(result.data.content);

  if (!parsed.success || !parsed.data) {
    // This shouldn't happen with our parser, but handle it gracefully
    return {
      success: true,
      data: {
        transformedText: result.data.content.trim(),
        usedFallback: true,
      },
    };
  }

  return {
    success: true,
    data: parsed.data,
  };
}

/**
 * Build the prompt for streaming mode (simpler, no JSON requirement)
 * For streaming, we use a simpler prompt that returns raw text
 */
export function buildTransformPrompt(request: TransformRequest): {
  prompt: string;
  system: string;
} {
  const system = `You are a text transformation assistant. Transform the provided text according to these instructions:

${request.transformation.instructions}

Rules:
- Only respond with the transformed text, no explanations
- Preserve formatting unless instructed otherwise
- If the transformation cannot be performed, return the original text`;

  return {
    prompt: request.text,
    system,
  };
}
