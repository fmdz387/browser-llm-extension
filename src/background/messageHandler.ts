import { getProvider, updateProviderConfig } from '@/providers';
import type { CompletionRequest, LLMProvider } from '@/providers';
import { checkGrammar } from '@/services/GrammarService';
import { translate } from '@/services/TranslationService';
import { assistWriting } from '@/services/WritingService';
import type { AvailableModel, ExtensionRequest, ExtensionResponse } from '@/types/messages';

// Store for managing active streaming requests
const activeRequests = new Map<string, AbortController>();

/**
 * Handle incoming messages from popup and content scripts
 */
export async function handleMessage(
  message: ExtensionRequest,
  sender: chrome.runtime.MessageSender,
): Promise<ExtensionResponse<unknown>> {
  console.log('[Browser LLM] Received message:', message.type);

  const provider = getProvider();

  try {
    switch (message.type) {
      case 'TEST_CONNECTION': {
        const result = await provider.testConnection();
        return result.success
          ? { success: true, data: true }
          : { success: false, error: { code: result.error.code, message: result.error.message } };
      }

      case 'LIST_MODELS': {
        const result = await provider.listModels();
        if (!result.success) {
          return {
            success: false,
            error: { code: result.error.code, message: result.error.message },
          };
        }

        // Transform to expected format
        const models: AvailableModel[] = result.data.map((m) => ({
          name: m.name,
          size: m.size ?? 'Unknown',
          modifiedAt: m.modifiedAt ?? '',
        }));

        return { success: true, data: { models } };
      }

      case 'TRANSLATE': {
        const result = await translate(message.payload, provider);
        return result.success
          ? { success: true, data: result.data }
          : { success: false, error: { code: result.error.code, message: result.error.message } };
      }

      case 'WRITING_ASSIST': {
        const result = await assistWriting(message.payload, provider);
        return result.success
          ? { success: true, data: result.data }
          : { success: false, error: { code: result.error.code, message: result.error.message } };
      }

      case 'GRAMMAR_CHECK': {
        const result = await checkGrammar(message.payload, provider);
        return result.success
          ? { success: true, data: result.data }
          : { success: false, error: { code: result.error.code, message: result.error.message } };
      }

      case 'GENERATE_STREAM': {
        const { prompt, requestId, model, system } = message.payload;
        const tabId = sender.tab?.id;

        if (!tabId) {
          return { success: false, error: { code: 'NO_TAB', message: 'No tab ID for streaming' } };
        }

        // Start streaming in background (don't await)
        handleStreamGenerate(provider, prompt, requestId, tabId, model, system);

        return { success: true, data: { started: true } };
      }

      case 'CANCEL_REQUEST': {
        const { requestId } = message.payload;
        const controller = activeRequests.get(requestId);
        if (controller) {
          controller.abort();
          activeRequests.delete(requestId);
          console.log(`[Browser LLM] Cancelled request: ${requestId}`);
        }
        // Also abort via provider
        provider.abort();
        return { success: true, data: null };
      }

      case 'GET_CONFIG': {
        // Config is managed by popup via Zustand, return empty for now
        return { success: true, data: null };
      }

      case 'UPDATE_CONFIG': {
        const config = message.payload;
        if (config.provider) {
          // Currently only Ollama is supported
          updateProviderConfig({
            provider: 'ollama',
            host: config.provider.host ?? 'localhost',
            port: config.provider.port ?? 11434,
          });
        }
        return { success: true, data: null };
      }

      default:
        return {
          success: false,
          error: { code: 'UNKNOWN_MESSAGE', message: 'Unknown message type' },
        };
    }
  } catch (error) {
    console.error('[Browser LLM] Message handler error:', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/**
 * Handle streaming generation request using AsyncIterable
 */
async function handleStreamGenerate(
  provider: LLMProvider,
  prompt: string,
  requestId: string,
  tabId: number,
  model?: string,
  system?: string,
) {
  const abortController = new AbortController();
  activeRequests.set(requestId, abortController);

  try {
    // Build completion request
    const request: CompletionRequest = {
      model: model ?? '',
      messages: system
        ? [
            { role: 'system', content: system },
            { role: 'user', content: prompt },
          ]
        : [{ role: 'user', content: prompt }],
    };

    // Stream tokens using AsyncIterable
    const stream = provider.stream(request);

    for await (const token of stream) {
      // Check if cancelled
      if (abortController.signal.aborted) {
        chrome.tabs.sendMessage(tabId, {
          type: 'STREAM_CANCELLED',
          requestId,
        });
        return;
      }

      // Send token to content script
      chrome.tabs.sendMessage(tabId, {
        type: 'STREAM_TOKEN',
        requestId,
        token: token.content,
      });

      if (token.done) {
        chrome.tabs.sendMessage(tabId, {
          type: 'STREAM_COMPLETE',
          requestId,
        });
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      chrome.tabs.sendMessage(tabId, {
        type: 'STREAM_CANCELLED',
        requestId,
      });
    } else {
      chrome.tabs.sendMessage(tabId, {
        type: 'STREAM_ERROR',
        requestId,
        error: error instanceof Error ? error.message : 'Generation failed',
      });
    }
  } finally {
    activeRequests.delete(requestId);
  }
}
