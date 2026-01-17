import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useConfigStore } from '@/store/useConfigStore';
import { sendMessage } from '@/utils/messaging';

import { useEffect } from 'react';

export function SettingsForm() {
  const { provider, features, setProviderConfig, setFeatureConfig } = useConfigStore();

  // Sync provider config to background script when it changes
  useEffect(() => {
    sendMessage({
      type: 'UPDATE_CONFIG',
      payload: { provider },
    });
  }, [provider]);

  return (
    <div className="space-y-6">
      {/* Connection Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Connection</h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="host">Host</Label>
            <Input
              id="host"
              value={provider.host}
              onChange={(e) => setProviderConfig({ host: e.target.value })}
              placeholder="localhost"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="port">Port</Label>
            <Input
              id="port"
              type="number"
              value={provider.port}
              onChange={(e) => setProviderConfig({ port: parseInt(e.target.value, 10) || 11434 })}
              placeholder="11434"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Model Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Generation</h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="temperature">Temperature</Label>
              <span className="text-xs text-muted-foreground">{provider.temperature}</span>
            </div>
            <Slider
              id="temperature"
              min={0}
              max={2}
              step={0.1}
              value={[provider.temperature]}
              onValueChange={([value]) => setProviderConfig({ temperature: value })}
            />
            <p className="text-xs text-muted-foreground">
              Lower = more focused, Higher = more creative
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Feature Toggles */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Features</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="translate-enabled">Translation</Label>
              <p className="text-xs text-muted-foreground">Enable text translation</p>
            </div>
            <Switch
              id="translate-enabled"
              checked={features.translateEnabled}
              onCheckedChange={(checked) => setFeatureConfig({ translateEnabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="writing-enabled">Writing Assist</Label>
              <p className="text-xs text-muted-foreground">Improve selected text</p>
            </div>
            <Switch
              id="writing-enabled"
              checked={features.writingEnabled}
              onCheckedChange={(checked) => setFeatureConfig({ writingEnabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="grammar-enabled">Grammar Check</Label>
              <p className="text-xs text-muted-foreground">Check and fix grammar</p>
            </div>
            <Switch
              id="grammar-enabled"
              checked={features.grammarEnabled}
              onCheckedChange={(checked) => setFeatureConfig({ grammarEnabled: checked })}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Translation Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Translation</h3>

        <div className="space-y-2">
          <Label htmlFor="default-language">Default Target Language</Label>
          <Input
            id="default-language"
            value={features.defaultTargetLanguage}
            onChange={(e) => setFeatureConfig({ defaultTargetLanguage: e.target.value })}
            placeholder="English"
          />
        </div>
      </div>
    </div>
  );
}
