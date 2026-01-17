import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { useCopyToClipboard, useStreamingResponse } from '@/hooks';
import { cn } from '@/lib/utils';
import { sendMessage } from '@/utils/messaging';
import { Check, Loader, Sparkles, X, XCircle } from 'lucide-react';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type ActionType = 'translate' | 'improve' | 'grammar' | 'transform';
type RequestStatus = 'idle' | 'loading' | 'streaming' | 'complete' | 'error';

interface ResultOverlayProps {
  selectedText: string;
  selectionRect: DOMRect | null;
  action: ActionType | null;
  transformationId?: string | null;
  transformationTitle?: string;
  transformationDescription?: string;
  onClose: () => void;
}

interface StatusConfig {
  icon: typeof Loader;
  bgClass: string;
  iconClass: string;
  animate?: boolean;
}

const STATUS_CONFIG: Record<RequestStatus, StatusConfig> = {
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

const ACTION_LABELS: Record<ActionType, string> = {
  translate: 'Translation',
  improve: 'Improved',
  grammar: 'Grammar',
  transform: 'Transform',
};

interface HeaderProps {
  action: ActionType;
  status: RequestStatus;
  title?: string;
  description?: string;
  onClose: () => void;
}

function Header({ action, status, title, description, onClose }: HeaderProps) {
  const config = STATUS_CONFIG[status];
  const StatusIcon = config.icon;

  // Use custom title if provided, otherwise fall back to action label
  const displayTitle = title || ACTION_LABELS[action];

  return (
    <div className="flex items-center justify-between border-b px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-md',
            config.bgClass,
          )}
        >
          <StatusIcon
            className={cn('size-4', config.iconClass, config.animate && 'animate-spin')}
          />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium">{displayTitle}</span>
          {description && (
            <p className="truncate text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <button
        onClick={onClose}
        className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Close"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

interface ContentProps {
  status: RequestStatus;
  result: string;
  error: string | null;
}

function Content({ status, result, error }: ContentProps) {
  return (
    <div className="max-h-[280px] min-h-[56px] overflow-y-auto px-3 py-3">
      {status === 'loading' && (
        <p className="py-2 text-sm text-muted-foreground">Processing your request...</p>
      )}

      {(status === 'streaming' || status === 'complete') && (
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {result}
          {status === 'streaming' && (
            <span className="ml-0.5 inline-block h-4 w-1 animate-pulse rounded-sm bg-blue-500" />
          )}
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-start gap-2.5 rounded-md bg-red-100 p-2.5 dark:bg-red-900/20">
          <XCircle className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Error</p>
            <p className="mt-0.5 text-sm text-red-600 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface FooterProps {
  status: RequestStatus;
  result: string;
  copied: boolean;
  onCopy: () => void;
  onCancel: () => void;
}

function Footer({
  status,
  result,
  copied,
  onCopy,
  onCancel,
}: FooterProps) {
  if (status === 'complete' && result) {
    return (
      <div className="flex items-center justify-end border-t px-3 py-2">
        <CopyButton text={result} copied={copied} onCopy={onCopy} />
      </div>
    );
  }

  if (status === 'streaming') {
    return (
      <div className="flex justify-end border-t px-3 py-2">
        <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 gap-1.5 px-3 text-sm">
          <X className="size-3.5" />
          Cancel
        </Button>
      </div>
    );
  }

  return null;
}

// =============================================================================
// Helpers
// =============================================================================

function extractResultText(data: Record<string, unknown>): string {
  return (
    (data.transformedText as string) ||
    (data.translatedText as string) ||
    (data.improvedText as string) ||
    (data.correctedText as string) ||
    (data.result as string) ||
    (data.text as string) ||
    ''
  );
}

function getAnchorStyle(rect: DOMRect): React.CSSProperties {
  return {
    position: 'fixed',
    left: rect.left + rect.width / 2,
    top: rect.bottom + 4,
    width: 1,
    height: 1,
    pointerEvents: 'none',
  };
}

// =============================================================================
// Main Component
// =============================================================================

export function ResultOverlay({
  selectedText,
  selectionRect,
  action,
  transformationId,
  transformationTitle,
  transformationDescription,
  onClose,
}: ResultOverlayProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<RequestStatus>('idle');
  const [result, setResult] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const { copied, copy } = useCopyToClipboard();

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

  // Sync streaming result
  useEffect(() => {
    if (isStreaming) setResult(fullText);
  }, [fullText, isStreaming]);

  // Open/close popover based on action
  useEffect(() => {
    setIsOpen(Boolean(action && selectionRect));
  }, [action, selectionRect]);

  // Execute action when triggered
  useEffect(() => {
    if (!action || !selectedText) return;

    const executeAction = async () => {
      setStatus('loading');
      setResult('');
      setError(null);
      reset();

      try {
        const response = await sendActionRequest(action, selectedText, transformationId);

        if (response?.success && response.data) {
          setResult(extractResultText(response.data as Record<string, unknown>));
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

    executeAction();
  }, [action, selectedText, transformationId, reset]);

  // Handlers
  const handleClose = useCallback(() => {
    if (isStreaming) cancel();
    setIsOpen(false);
    onClose();
  }, [isStreaming, cancel, onClose]);

  const handleCopy = useCallback(() => {
    copy(result);
  }, [copy, result]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) handleClose();
    },
    [handleClose],
  );

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) handleClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleClose, isOpen]);

  // Memoized anchor style
  const anchorStyle = useMemo(
    () => (selectionRect ? getAnchorStyle(selectionRect) : undefined),
    [selectionRect],
  );

  if (!action || !selectionRect) return null;

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverAnchor asChild>
        <div ref={anchorRef} style={anchorStyle} />
      </PopoverAnchor>

      <PopoverContent
        className="w-[360px] max-w-[90vw] overflow-hidden p-0"
        side="bottom"
        align="center"
        sideOffset={8}
        collisionPadding={12}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Header
          action={action}
          status={status}
          title={transformationTitle}
          description={transformationDescription}
          onClose={handleClose}
        />
        <Content status={status} result={result} error={error} />
        <Footer
          status={status}
          result={result}
          copied={copied}
          onCopy={handleCopy}
          onCancel={cancel}
        />
      </PopoverContent>
    </Popover>
  );
}

async function sendActionRequest(
  action: ActionType,
  text: string,
  transformationId?: string | null,
) {
  switch (action) {
    case 'translate':
      return sendMessage({
        type: 'TRANSLATE',
        payload: { text, targetLanguage: 'English' },
      });

    case 'improve':
      return sendMessage({
        type: 'WRITING_ASSIST',
        payload: { text, action: 'improve' },
      });

    case 'grammar':
      return sendMessage({
        type: 'GRAMMAR_CHECK',
        payload: { text },
      });

    case 'transform':
      if (!transformationId) {
        return { success: false as const, error: { code: 'NO_TRANSFORMATION', message: 'No transformation selected' } };
      }
      return sendMessage({
        type: 'TRANSFORM',
        payload: { text, transformationId },
      });
  }
}
