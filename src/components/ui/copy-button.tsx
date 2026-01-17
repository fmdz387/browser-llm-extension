import { cn } from '@/lib/utils';
import { Check, Copy } from 'lucide-react';

import { Button } from './button';

interface CopyButtonProps {
  text: string;
  copied: boolean;
  onCopy: () => void;
  className?: string;
}

export function CopyButton({ text, copied, onCopy, className }: CopyButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onCopy}
      disabled={!text}
      className={cn('size-7 shrink-0 p-0', className)}
      aria-label={copied ? 'Copied' : 'Copy to clipboard'}
    >
      {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
    </Button>
  );
}
