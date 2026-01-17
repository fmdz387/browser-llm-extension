import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { ConnectionStatus, ModelSelector, SettingsForm } from './components';
import { useConfigStore } from '@/store/useConfigStore';

export function App() {
  const [isHydrated, setIsHydrated] = useState(false);
  const hasHydrated = useConfigStore((state) => state._hasHydrated);

  useEffect(() => {
    if (hasHydrated) {
      setIsHydrated(true);
    }
  }, [hasHydrated]);

  // Wait for store hydration from chrome.storage
  if (!isHydrated) {
    return (
      <div className="w-[360px] p-4">
        <Card className="p-4">
          <div className="flex items-center justify-center h-32">
            <Spinner className="h-6 w-6 text-muted-foreground" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-[360px] p-4 bg-background">
      <Card className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
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

          {/* Model Selector */}
          <ModelSelector />

          <Separator />

          {/* Settings */}
          <SettingsForm />
        </div>
      </Card>

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground mt-3">
        Right-click selected text to use
      </p>
    </div>
  );
}
