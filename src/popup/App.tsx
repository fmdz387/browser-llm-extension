import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { useConfigStore } from '@/store/useConfigStore';
import { useTransformationStore } from '@/store/useTransformationStore';

import { useEffect, useState } from 'react';

import { ConnectionStatus, SettingsForm, TransformationList } from './components';

export function App() {
  const [isHydrated, setIsHydrated] = useState(false);
  const configHydrated = useConfigStore((state) => state._hasHydrated);
  const transformationsHydrated = useTransformationStore((state) => state._hasHydrated);

  useEffect(() => {
    if (configHydrated && transformationsHydrated) {
      setIsHydrated(true);
    }
  }, [configHydrated, transformationsHydrated]);

  // Wait for store hydration from chrome.storage
  if (!isHydrated) {
    return (
      <div className="w-[360px] p-4">
        <Card className="p-4">
          <div className="flex h-32 items-center justify-center">
            <Spinner className="h-6 w-6 text-muted-foreground" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-[360px] bg-background p-4">
      <Card className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary-foreground"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold">Browser LLM</h1>
              <p className="text-xs text-muted-foreground">Local AI for your browser</p>
            </div>
          </div>

          <Separator />

          {/* Connection Status */}
          <ConnectionStatus />

          <Separator />

          {/* Transformations */}
          <TransformationList />

          <Separator />

          {/* Settings */}
          <SettingsForm />
        </div>
      </Card>

      {/* Footer */}
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Right-click selected text to use transformations
      </p>
    </div>
  );
}
