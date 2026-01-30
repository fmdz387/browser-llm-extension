import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { useConfigStore } from '@/store/useConfigStore';
import { useTransformationStore } from '@/store/useTransformationStore';
import { useShortcutStore } from '@/store/useShortcutStore';

import { useCallback, useEffect, useState } from 'react';

import { ConnectionStatus, SettingsForm, ShortcutSettings, TransformationList } from './components';

export function App() {
  const [isHydrated, setIsHydrated] = useState(false);
  const configHydrated = useConfigStore((state) => state._hasHydrated);
  const transformationsHydrated = useTransformationStore((state) => state._hasHydrated);
  const shortcutsHydrated = useShortcutStore((state) => state._hasHydrated);

  useEffect(() => {
    if (configHydrated && transformationsHydrated && shortcutsHydrated) {
      setIsHydrated(true);
    }
  }, [configHydrated, transformationsHydrated, shortcutsHydrated]);

  const handleResetAll = useCallback(async () => {
    if (!confirm('Reset all settings, transformations, and shortcuts to defaults?')) {
      return;
    }
    await chrome.storage.sync.clear();
    window.location.reload();
  }, []);

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
          <div className="flex items-center gap-3">
            <img
              src={chrome.runtime.getURL('assets/512x512.png')}
              alt="Browser LLM"
              className="h-10 w-10 rounded-lg"
            />
            <div>
              <h1 className="text-lg font-semibold">Browser LLM</h1>
              <p className="text-xs text-muted-foreground">Lightweight AI for your browser</p>
            </div>
          </div>

          <Separator />

          {/* Connection Status */}
          <ConnectionStatus />

          <Separator />

          {/* Settings */}
          <SettingsForm />

          <Separator />

          {/* Transformations */}
          <TransformationList />

          <Separator />

          {/* Keyboard Shortcuts */}
          <ShortcutSettings />

          <Separator />

          {/* Reset */}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={handleResetAll}
          >
            Reset All to Defaults
          </Button>
        </div>
      </Card>

      {/* Footer */}
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Right-click text to transform or images to extract text
      </p>
    </div>
  );
}
