import { loadDecryptedApiKey, hasStoredApiKey } from '@/lib/secureKeyStorage';
import { getProvider, updateProviderConfig } from '@/providers';
import type { CompletionRequest, LLMProvider } from '@/providers';
import { checkGrammar } from '@/services/GrammarService';
import { transform } from '@/services/TransformationService';
import { translate } from '@/services/TranslationService';
import { assistWriting } from '@/services/WritingService';
import { getTransformationByIdFromStorage } from '@/store/useTransformationStore';
import type { AvailableModel, ExtensionRequest, ExtensionResponse } from '@/types/messages';

import { registerContextMenus } from './contextMenu';

// Store for managing active streaming requests
const activeRequests = new Map<string, AbortController>();

// Storage key for config
const CONFIG_STORAGE_KEY = 'browser-llm-config';

// Default provider config
const DEFAULT_PROVIDER_CONFIG = {
  type: 'ollama' as const,
  host: 'localhost',
  port: 11434,
  model: '',
};

interface StoredProviderConfig {
  type: 'ollama' | 'openai' | 'anthropic' | 'openrouter';
  host: string;
  port: number;
  model: string;
  temperature?: number;
  maxTokens?: number;
  // OpenRouter-specific fields
  apiKey?: string;
  modelId?: string;
}

/**
 * Get the provider config from chrome.storage
 */
async function getProviderConfig(): Promise<StoredProviderConfig> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
      const result = await chrome.storage.sync.get(CONFIG_STORAGE_KEY);
      const stored = result[CONFIG_STORAGE_KEY];
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.state?.provider) {
          return {
            ...DEFAULT_PROVIDER_CONFIG,
            ...parsed.state.provider,
          };
        }
      }
    }
  } catch (error) {
    console.error('[Browser LLM] Error reading provider config from storage:', error);
  }
  return DEFAULT_PROVIDER_CONFIG;
}

/**
 * Handle incoming messages from popup and content scripts
 */
export async function handleMessage(
  message: ExtensionRequest,
  sender: chrome.runtime.MessageSender,
): Promise<ExtensionResponse<unknown>> {
  console.log('[Browser LLM] Received message:', message.type);

  // Get provider config from storage and initialize provider with it
  const providerConfig = await getProviderConfig();

  // Build ProviderConfig based on type
  let provider: LLMProvider;
  let model: string | null = null;

  if (providerConfig.type === 'openrouter') {
    // OpenRouter uses modelId for the model selection
    // Get API key from secure storage
    const apiKey = await loadDecryptedApiKey();
    const hasKey = await hasStoredApiKey();

    if (!hasKey || !apiKey || !providerConfig.modelId) {
      // Return early if OpenRouter is not properly configured
      provider = getProvider({
        provider: 'ollama',
        host: 'localhost',
        port: 11434,
      });
    } else {
      provider = getProvider({
        provider: 'openrouter',
        apiKey: apiKey,
        modelId: providerConfig.modelId,
      });
      // For OpenRouter, the modelId is the model
      model = providerConfig.modelId;
    }
  } else if (providerConfig.type === 'ollama') {
    provider = getProvider({
      provider: 'ollama',
      host: providerConfig.host,
      port: providerConfig.port,
    });
    model = providerConfig.model || null;
  } else {
    // Fallback to default Ollama for unsupported providers
    provider = getProvider({
      provider: 'ollama',
      host: providerConfig.host || 'localhost',
      port: providerConfig.port || 11434,
    });
    model = providerConfig.model || null;
  }

  // Check if model is required for this action
  const requiresModel = ['TRANSLATE', 'WRITING_ASSIST', 'GRAMMAR_CHECK', 'TRANSFORM'].includes(
    message.type,
  );
  if (requiresModel && !model) {
    return {
      success: false,
      error: {
        code: 'MODEL_NOT_SELECTED',
        message: 'Please select a model in the extension popup first',
      },
    };
  }

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
        const result = await translate(message.payload, provider, model!);
        return result.success
          ? { success: true, data: result.data }
          : { success: false, error: { code: result.error.code, message: result.error.message } };
      }

      case 'WRITING_ASSIST': {
        const result = await assistWriting(message.payload, provider, model!);
        return result.success
          ? { success: true, data: result.data }
          : { success: false, error: { code: result.error.code, message: result.error.message } };
      }

      case 'GRAMMAR_CHECK': {
        const result = await checkGrammar(message.payload, provider, model!);
        return result.success
          ? { success: true, data: result.data }
          : { success: false, error: { code: result.error.code, message: result.error.message } };
      }

      case 'GENERATE_STREAM': {
        const { prompt, requestId, model: payloadModel, system } = message.payload;
        const tabId = sender.tab?.id;

        if (!tabId) {
          return { success: false, error: { code: 'NO_TAB', message: 'No tab ID for streaming' } };
        }

        // Use model from payload or fallback to selected model
        const streamModel = payloadModel || model;
        if (!streamModel) {
          return {
            success: false,
            error: {
              code: 'MODEL_NOT_SELECTED',
              message: 'Please select a model in the extension popup first',
            },
          };
        }

        // Start streaming in background (don't await)
        handleStreamGenerate(provider, prompt, requestId, tabId, streamModel, system);

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
          if (config.provider.type === 'openrouter') {
            // Handle OpenRouter config
            // API key is retrieved from secure storage, not from message payload
            const apiKey = await loadDecryptedApiKey();
            if (apiKey && config.provider.modelId) {
              updateProviderConfig({
                provider: 'openrouter',
                apiKey: apiKey,
                modelId: config.provider.modelId,
              });
            }
          } else if (config.provider.type === 'ollama' || !config.provider.type) {
            updateProviderConfig({
              provider: 'ollama',
              host: config.provider.host ?? 'localhost',
              port: config.provider.port ?? 11434,
            });
          }
        }
        return { success: true, data: null };
      }

      case 'TRANSFORM': {
        const { text, transformationId } = message.payload;
        const transformation = await getTransformationByIdFromStorage(transformationId);

        if (!transformation) {
          return {
            success: false,
            error: { code: 'TRANSFORMATION_NOT_FOUND', message: 'Transformation not found' },
          };
        }

        const result = await transform({ text, transformation }, provider, model!);
        return result.success
          ? { success: true, data: result.data }
          : { success: false, error: { code: result.error.code, message: result.error.message } };
      }

      case 'REFRESH_CONTEXT_MENUS': {
        await registerContextMenus();
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
