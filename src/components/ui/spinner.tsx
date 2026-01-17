import { cn } from '@/lib/utils';
import { Loader } from 'lucide-react';

export function Spinner({ className }: { className?: string }) {
  return <Loader className={cn('h-8 w-8 animate-spin', className)} />;
}
