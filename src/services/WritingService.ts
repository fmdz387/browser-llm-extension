import type { LLMProvider, LLMResult } from '@/providers';
import type { WritingResult } from '@/types/messages';

export type WritingAction =
  | 'improve'
  | 'simplify'
  | 'expand'
  | 'summarize'
  | 'rephrase';
export type WritingStyle =
  | 'formal'
  | 'casual'
  | 'professional'
  | 'academic'
  | 'creative';

export interface WritingRequest {
  text: string;
  action: WritingAction;
  style?: WritingStyle;
}

const ACTION_PROMPTS: Record<WritingAction, string> = {
  improve:
    'Improve the following text, making it clearer, more engaging, and better written while preserving the original meaning',
  simplify:
    'Simplify the following text, using simpler words and shorter sentences while keeping the core message',
  expand:
    'Expand on the following text, adding more detail, explanation, and context',
  summarize: 'Summarize the following text concisely, capturing the key points',
  rephrase:
    'Rephrase the following text in a different way while keeping the exact same meaning',
};

const STYLE_INSTRUCTIONS: Record<WritingStyle, string> = {
  formal:
    'Use formal language appropriate for professional or official communication.',
  casual: 'Use casual, conversational language.',
  professional: 'Use professional business language that is clear and direct.',
  academic:
    'Use academic language with precise terminology and structured arguments.',
  creative: 'Use creative, expressive language with vivid descriptions.',
};

function buildSystemPrompt(
  action: WritingAction,
  style?: WritingStyle,
): string {
  let prompt = `You are a skilled writing assistant. ${ACTION_PROMPTS[action]}.`;

  if (style) {
    prompt += ` ${STYLE_INSTRUCTIONS[style]}`;
  }

  prompt +=
    '\n\nRules:\n- Only respond with the improved text, no explanations or preamble\n- Preserve the general structure and formatting of the original';

  return prompt;
}

export async function assistWriting(
  request: WritingRequest,
  provider: LLMProvider,
  model?: string,
): Promise<LLMResult<WritingResult>> {
  const systemPrompt = buildSystemPrompt(request.action, request.style);

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

  return {
    success: true,
    data: {
      improvedText: result.data.content.trim(),
    },
  };
}

/**
 * Build the full prompt for writing assistance (used for streaming)
 */
export function buildWritingPrompt(request: WritingRequest): {
  prompt: string;
  system: string;
} {
  return {
    prompt: request.text,
    system: buildSystemPrompt(request.action, request.style),
  };
}

// Human-readable action names
export const ACTION_LABELS: Record<WritingAction, string> = {
  improve: 'Improve',
  simplify: 'Simplify',
  expand: 'Expand',
  summarize: 'Summarize',
  rephrase: 'Rephrase',
};

export const STYLE_LABELS: Record<WritingStyle, string> = {
  formal: 'Formal',
  casual: 'Casual',
  professional: 'Professional',
  academic: 'Academic',
  creative: 'Creative',
};
