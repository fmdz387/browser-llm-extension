import { Button } from '@/components/ui/button';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { useStreamingResponse } from '@/hooks';
import { cn } from '@/lib/utils';
import { sendMessage } from '@/utils/messaging';
import { Check, ClipboardCopy, Loader, Replace, Sparkles, X, XCircle } from 'lucide-react';

import { useCallback, useEffect, useRef, useState } from 'react';

interface ResultOverlayProps {
  selectedText: string;
  selectionRect: DOMRect | null;
  action: 'translate' | 'improve' | 'grammar' | 'transform' | null;
  transformationId?: string | null;
  onClose: () => void;
  onReplace?: (text: string) => void;
  isEditable: boolean;
}

type RequestStatus = 'idle' | 'loading' | 'streaming' | 'complete' | 'error';

// Status configuration with colored background icons following blogr-web design
const STATUS_CONFIG: Record<
  RequestStatus,
  {
    icon: typeof Loader;
    bgClass: string;
    iconClass: string;
    animate?: boolean;
  }
> = {
  idle: {
    icon: Sparkles,
    bgClass: 'bg-slate-100 dark:bg-slate-800',
    iconClass: 'text-slate-600 dark:text-slate-400',
  },
  loading: {
    icon: Loader,
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    iconClass: 'text-blue-600 dark:text-blue-400',
    animate: true,
  },
  streaming: {
    icon: Sparkles,
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    iconClass: 'text-blue-600 dark:text-blue-400',
    animate: true,
  },
  complete: {
    icon: Check,
    bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
  },
  error: {
    icon: XCircle,
    bgClass: 'bg-red-100 dark:bg-red-900/30',
    iconClass: 'text-red-600 dark:text-red-400',
  },
};

// Action labels for header
const ACTION_LABELS: Record<string, string> = {
  translate: 'Translation',
  improve: 'Improved',
  grammar: 'Grammar',
  transform: 'Transform',
};

export function ResultOverlay({
  selectedText,
  selectionRect,
  action,
  transformationId,
  onClose,
  onReplace,
  isEditable,
}: ResultOverlayProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<RequestStatus>('idle');
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

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

  // Open popover when action is set
  useEffect(() => {
    if (action && selectionRect) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [action, selectionRect]);

  // Start request when action changes
  useEffect(() => {
    if (!action || !selectedText) return;

    const performAction = async () => {
      setStatus('loading');
      setResult('');
      setError(null);
      setCopied(false);
      reset();

      try {
        let response;

        switch (action) {
          case 'translate':
            response = await sendMessage({
              type: 'TRANSLATE',
              payload: {
                text: selectedText,
                targetLanguage: 'English',
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

          case 'transform':
            if (!transformationId) {
              setError('No transformation selected');
              setStatus('error');
              return;
            }
            response = await sendMessage({
              type: 'TRANSFORM',
              payload: {
                text: selectedText,
                transformationId,
              },
            });
            break;
        }

        if (response?.success && response.data) {
          const data = response.data as {
            result?: string;
            text?: string;
            correctedText?: string;
            transformedText?: string;
            translatedText?: string;
            improvedText?: string;
          };
          const resultText =
            data.transformedText ||
            data.translatedText ||
            data.improvedText ||
            data.correctedText ||
            data.result ||
            data.text ||
            '';
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
  }, [action, selectedText, transformationId, reset]);

  const handleCopy = useCallback(async () => {
    if (result) {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
    setIsOpen(false);
    onClose();
  }, [isStreaming, cancel, onClose]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        handleClose();
      }
    },
    [handleClose],
  );

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleClose, isOpen]);

  if (!action || !selectionRect) return null;

  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;

  // Calculate anchor position based on selection
  const anchorStyle: React.CSSProperties = {
    position: 'fixed',
    left: selectionRect.left + selectionRect.width / 2,
    top: selectionRect.bottom + 4,
    width: 1,
    height: 1,
    pointerEvents: 'none',
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      {/* Virtual anchor positioned at selection */}
      <PopoverAnchor asChild>
        <div ref={anchorRef} style={anchorStyle} />
      </PopoverAnchor>

      <PopoverContent
        className="w-[320px] max-w-[90vw] overflow-hidden p-0"
        side="bottom"
        align="center"
        sideOffset={6}
        collisionPadding={12}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Compact header with colored icon */}
        <div className="flex items-center justify-between border-b px-2.5 py-2">
          <div className="flex items-center gap-2">
            {/* Colored background icon */}
            <div
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-md',
                statusConfig.bgClass,
              )}
            >
              <StatusIcon
                className={cn(
                  'size-3.5',
                  statusConfig.iconClass,
                  statusConfig.animate && 'animate-spin',
                )}
              />
            </div>
            {/* Action label */}
            <span className="text-xs font-medium">{ACTION_LABELS[action]}</span>
          </div>
          {/* Close button */}
          <button
            onClick={handleClose}
            className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-3.5" />
          </button>
        </div>

        {/* Content area */}
        <div className="max-h-[240px] min-h-[48px] overflow-y-auto px-2.5 py-2">
          {status === 'loading' && (
            <div className="flex items-center gap-2 py-3">
              <Loader className="size-4 animate-spin text-blue-600 dark:text-blue-400" />
              <span className="text-xs text-muted-foreground">Processing...</span>
            </div>
          )}

          {(status === 'streaming' || status === 'complete') && (
            <div className="whitespace-pre-wrap text-xs leading-relaxed">
              {result}
              {status === 'streaming' && (
                <span className="ml-0.5 inline-block h-3 w-1 animate-pulse rounded-sm bg-blue-500" />
              )}
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-start gap-2 rounded-md bg-red-100 p-2 dark:bg-red-900/20">
              <XCircle className="mt-0.5 size-3.5 shrink-0 text-red-600 dark:text-red-400" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-red-700 dark:text-red-400">Error</p>
                <p className="mt-0.5 text-xs text-red-600 dark:text-red-300">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Compact footer with actions */}
        {status === 'complete' && result && (
          <div className="flex items-center justify-end gap-1.5 border-t px-2.5 py-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className={cn(
                'h-7 gap-1 px-2 text-xs',
                copied &&
                  'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400',
              )}
            >
              {copied ? (
                <>
                  <Check className="size-3" />
                  Copied
                </>
              ) : (
                <>
                  <ClipboardCopy className="size-3" />
                  Copy
                </>
              )}
            </Button>
            {isEditable && onReplace && (
              <Button size="sm" onClick={handleReplace} className="h-7 gap-1 px-2 text-xs">
                <Replace className="size-3" />
                Replace
              </Button>
            )}
          </div>
        )}

        {status === 'streaming' && (
          <div className="flex justify-end border-t px-2.5 py-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => cancel()}
              className="h-7 gap-1 px-2 text-xs"
            >
              <X className="size-3" />
              Cancel
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
