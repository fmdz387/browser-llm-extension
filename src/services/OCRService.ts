import type { LLMProvider, LLMResult, ImageContentPart, TextContentPart } from '@/providers';

export interface OCRRequest {
  imageData: string; // Base64 encoded image data (without data: prefix) or URL
  mimeType?: string; // e.g., 'image/png', 'image/jpeg' - defaults to 'image/png'
}

export interface OCRResult {
  text: string;
}

/** Default model for OCR operations - Gemini 3 Flash via OpenRouter */
export const OCR_DEFAULT_MODEL = 'google/gemini-3-flash-preview';

const SYSTEM_PROMPT = `You are an OCR (Optical Character Recognition) specialist. Your task is to extract ALL text from the provided image accurately.

Instructions:
- Extract every piece of text visible in the image
- Preserve the original formatting, line breaks, and structure as much as possible
- If the text has columns, read left to right, top to bottom
- Include numbers, symbols, and special characters exactly as shown
- If handwritten text is present, do your best to transcribe it accurately
- Do not add any explanations, comments, or interpretations
- Only output the extracted text, nothing else

If you cannot read any text or the image contains no text, respond with: [No text detected]`;

/**
 * Convert image data to a data URL for the API
 */
function toDataUrl(imageData: string, mimeType: string): string {
  // If already a data URL or regular URL, return as-is
  if (imageData.startsWith('data:') || imageData.startsWith('http')) {
    return imageData;
  }
  // Otherwise, construct data URL from base64
  return `data:${mimeType};base64,${imageData}`;
}

/**
 * Perform OCR on an image to extract text
 */
export async function extractText(
  request: OCRRequest,
  provider: LLMProvider,
  model?: string,
): Promise<LLMResult<OCRResult>> {
  const mimeType = request.mimeType ?? 'image/png';
  const imageUrl = toDataUrl(request.imageData, mimeType);

  // Build multimodal message with text first, then image (as recommended by OpenRouter)
  // Note: OpenRouter SDK expects camelCase (imageUrl), not snake_case (image_url)
  const textPart: TextContentPart = {
    type: 'text',
    text: 'Extract all text from this image:',
  };

  const imagePart: ImageContentPart = {
    type: 'image_url',
    imageUrl: {
      url: imageUrl,
    },
  };

  const result = await provider.complete({
    model: model ?? OCR_DEFAULT_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: [textPart, imagePart] },
    ],
  });

  if (!result.success) {
    return result;
  }

  const extractedText = result.data.content.trim();

  return {
    success: true,
    data: {
      text: extractedText,
    },
  };
}

/**
 * Build the prompt for streaming mode
 */
export function buildOCRPrompt(request: OCRRequest): {
  prompt: string;
  system: string;
  imageUrl: string;
} {
  const mimeType = request.mimeType ?? 'image/png';
  return {
    prompt: 'Extract all text from this image:',
    system: SYSTEM_PROMPT,
    imageUrl: toDataUrl(request.imageData, mimeType),
  };
}
