import { useState, useCallback, useRef, useEffect } from 'react';
import { sendMessage } from '@/utils/messaging';

interface StreamingState {
  isStreaming: boolean;
  tokens: string[];
  fullText: string;
  error: string | null;
  requestId: string | null;
}

interface UseStreamingResponseOptions {
  batchIntervalMs?: number;
  onToken?: (token: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: string) => void;
}

/**
 * Hook for managing streaming LLM responses.
 * Batches token updates to prevent reflow storms (40ms default).
 */
export function useStreamingResponse(options: UseStreamingResponseOptions = {}) {
  const { batchIntervalMs = 40, onToken, onComplete, onError } = options;

  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    tokens: [],
    fullText: '',
    error: null,
    requestId: null,
  });

  const tokenBufferRef = useRef<string[]>([]);
  const batchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fullTextRef = useRef('');

  // Flush buffered tokens to state
  const flushTokens = useCallback(() => {
    if (tokenBufferRef.current.length === 0) return;

    const newTokens = [...tokenBufferRef.current];
    tokenBufferRef.current = [];

    const addedText = newTokens.join('');
    fullTextRef.current += addedText;

    setState((prev) => ({
      ...prev,
      tokens: [...prev.tokens, ...newTokens],
      fullText: fullTextRef.current,
    }));

    // Call onToken for each token
    newTokens.forEach((token) => onToken?.(token));
  }, [onToken]);

  // Handle incoming stream messages from background
  useEffect(() => {
    const handleMessage = (message: {
      type: string;
      requestId: string;
      token?: string;
      error?: string;
    }) => {
      if (!state.requestId || message.requestId !== state.requestId) {
        return;
      }

      switch (message.type) {
        case 'STREAM_TOKEN':
          if (message.token) {
            tokenBufferRef.current.push(message.token);

            // Schedule batch flush
            if (!batchTimeoutRef.current) {
              batchTimeoutRef.current = setTimeout(() => {
                flushTokens();
                batchTimeoutRef.current = null;
              }, batchIntervalMs);
            }
          }
          break;

        case 'STREAM_COMPLETE':
          // Final flush
          if (batchTimeoutRef.current) {
            clearTimeout(batchTimeoutRef.current);
            batchTimeoutRef.current = null;
          }
          flushTokens();

          setState((prev) => ({ ...prev, isStreaming: false }));
          onComplete?.(fullTextRef.current);
          break;

        case 'STREAM_ERROR':
          if (batchTimeoutRef.current) {
            clearTimeout(batchTimeoutRef.current);
            batchTimeoutRef.current = null;
          }

          setState((prev) => ({
            ...prev,
            isStreaming: false,
            error: message.error || 'Stream error',
          }));
          onError?.(message.error || 'Stream error');
          break;

        case 'STREAM_CANCELLED':
          if (batchTimeoutRef.current) {
            clearTimeout(batchTimeoutRef.current);
            batchTimeoutRef.current = null;
          }

          setState((prev) => ({ ...prev, isStreaming: false }));
          break;
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, [state.requestId, batchIntervalMs, flushTokens, onComplete, onError]);

  const startStream = useCallback(
    async (prompt: string, systemPrompt?: string, model?: string) => {
      const requestId = `stream-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // Reset state
      tokenBufferRef.current = [];
      fullTextRef.current = '';

      setState({
        isStreaming: true,
        tokens: [],
        fullText: '',
        error: null,
        requestId,
      });

      try {
        const response = await sendMessage({
          type: 'GENERATE_STREAM',
          payload: {
            prompt,
            requestId,
            model,
            system: systemPrompt,
          },
        });

        if (!response.success) {
          setState((prev) => ({
            ...prev,
            isStreaming: false,
            error: response.error.message,
          }));
          onError?.(response.error.message);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to start stream';
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          error: errorMessage,
        }));
        onError?.(errorMessage);
      }
    },
    [onError]
  );

  const cancel = useCallback(async () => {
    if (state.requestId) {
      await sendMessage({
        type: 'CANCEL_REQUEST',
        payload: { requestId: state.requestId },
      });
    }

    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }

    setState((prev) => ({ ...prev, isStreaming: false }));
  }, [state.requestId]);

  const reset = useCallback(() => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }

    tokenBufferRef.current = [];
    fullTextRef.current = '';

    setState({
      isStreaming: false,
      tokens: [],
      fullText: '',
      error: null,
      requestId: null,
    });
  }, []);

  return {
    ...state,
    startStream,
    cancel,
    reset,
  };
}
