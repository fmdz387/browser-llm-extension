import { useRef, useCallback, useEffect, useState } from 'react';
import { useOverlayPosition, useStreamingResponse } from '@/hooks';
import { sendMessage } from '@/utils/messaging';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

interface ResultOverlayProps {
  selectedText: string;
  selectionRect: DOMRect | null;
  action: 'translate' | 'improve' | 'grammar' | null;
  onClose: () => void;
  onReplace?: (text: string) => void;
  isEditable: boolean;
}

type RequestStatus = 'idle' | 'loading' | 'streaming' | 'complete' | 'error';

export function ResultOverlay({
  selectedText,
  selectionRect,
  action,
  onClose,
  onReplace,
  isEditable,
}: ResultOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<RequestStatus>('idle');
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const { position, isVisible } = useOverlayPosition(selectionRect, overlayRef);

  const { isStreaming, fullText, cancel, reset } = useStreamingResponse({
    onToken: () => setStatus('streaming'),
    onComplete: (text) => {
      setResult(text);
      setStatus('complete');
    },
    onError: (err) => {
      setError(err);
      setStatus('error');
    },
  });

  // Update result from streaming
  useEffect(() => {
    if (isStreaming) {
      setResult(fullText);
    }
  }, [fullText, isStreaming]);

  // Start request when action changes
  useEffect(() => {
    if (!action || !selectedText) return;

    const performAction = async () => {
      setStatus('loading');
      setResult('');
      setError(null);
      reset();

      try {
        let response;

        switch (action) {
          case 'translate':
            response = await sendMessage({
              type: 'TRANSLATE',
              payload: {
                text: selectedText,
                targetLanguage: 'English', // Could be configurable
              },
            });
            break;

          case 'improve':
            response = await sendMessage({
              type: 'WRITING_ASSIST',
              payload: {
                text: selectedText,
                action: 'improve',
              },
            });
            break;

          case 'grammar':
            response = await sendMessage({
              type: 'GRAMMAR_CHECK',
              payload: {
                text: selectedText,
              },
            });
            break;
        }

        if (response?.success && response.data) {
          const data = response.data as { result?: string; text?: string; correctedText?: string };
          const resultText = data.result || data.text || data.correctedText || '';
          setResult(resultText);
          setStatus('complete');
        } else if (response && !response.success) {
          setError(response.error.message);
          setStatus('error');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Request failed');
        setStatus('error');
      }
    };

    performAction();
  }, [action, selectedText, reset]);

  const handleCopy = useCallback(async () => {
    if (result) {
      await navigator.clipboard.writeText(result);
    }
  }, [result]);

  const handleReplace = useCallback(() => {
    if (result && onReplace) {
      onReplace(result);
      onClose();
    }
  }, [result, onReplace, onClose]);

  const handleClose = useCallback(() => {
    if (isStreaming) {
      cancel();
    }
    onClose();
  }, [isStreaming, cancel, onClose]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleClose]);

  if (!action || !selectionRect) return null;

  const actionLabels = {
    translate: 'Translation',
    improve: 'Improved',
    grammar: 'Grammar Check',
  };

  return (
    <div
      ref={overlayRef}
      className={cn(
        'fixed z-[2147483647] transition-all duration-200',
        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
      )}
      style={
        position
          ? {
              top: `${position.top}px`,
              left: `${position.left}px`,
              transformOrigin: position.transformOrigin,
            }
          : { visibility: 'hidden' }
      }
    >
      <Card className="w-[380px] max-w-[90vw] shadow-xl border bg-background">
        <div className="p-3 border-b flex items-center justify-between">
          <Badge variant="secondary">{actionLabels[action]}</Badge>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 4L4 12M4 4l8 8" />
            </svg>
          </button>
        </div>

        <div className="p-4 min-h-[80px] max-h-[300px] overflow-y-auto">
          {status === 'loading' && (
            <div className="flex items-center justify-center py-4">
              <Spinner className="h-6 w-6 text-muted-foreground" />
            </div>
          )}

          {(status === 'streaming' || status === 'complete') && (
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {result}
              {status === 'streaming' && (
                <span className="inline-block w-2 h-4 ml-0.5 bg-primary animate-pulse" />
              )}
            </div>
          )}

          {status === 'error' && (
            <div className="text-sm text-destructive">
              <p className="font-medium">Error</p>
              <p className="mt-1 text-muted-foreground">{error}</p>
            </div>
          )}
        </div>

        {status === 'complete' && result && (
          <div className="p-3 border-t flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              Copy
            </Button>
            {isEditable && onReplace && (
              <Button size="sm" onClick={handleReplace}>
                Replace
              </Button>
            )}
          </div>
        )}

        {status === 'streaming' && (
          <div className="p-3 border-t flex justify-end">
            <Button variant="outline" size="sm" onClick={() => cancel()}>
              Cancel
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
