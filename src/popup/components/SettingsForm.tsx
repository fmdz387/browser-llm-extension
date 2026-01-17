import { SimpleSelect } from '@/components/SimpleSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import type { ProviderType } from '@/providers';
import { getProviderDisplayName, useConfigStore } from '@/store/useConfigStore';
import { sendMessage } from '@/utils/messaging';

import { useCallback, useEffect, useState } from 'react';

const PROVIDER_OPTIONS = [
  { value: 'ollama', label: getProviderDisplayName('ollama') },
  { value: 'openrouter', label: getProviderDisplayName('openrouter') },
];

export function SettingsForm() {
  const { provider, features, hasApiKey, setProviderConfig, setFeatureConfig, saveApiKey, clearApiKey } = useConfigStore();

  // Local state for API key input - never stored in plaintext in the store
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  // Sync provider config to background script when it changes (excluding API key)
  useEffect(() => {
    sendMessage({
      type: 'UPDATE_CONFIG',
      payload: { provider },
    });
  }, [provider]);

  // Clear save status after 2 seconds
  useEffect(() => {
    if (saveStatus !== 'idle') {
      const timer = setTimeout(() => setSaveStatus('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  const handleSaveApiKey = useCallback(async () => {
    if (!apiKeyInput.trim()) return;

    setIsSaving(true);
    try {
      await saveApiKey(apiKeyInput.trim());
      setApiKeyInput(''); // Clear input after saving
      setSaveStatus('saved');
    } catch (error) {
      console.error('Failed to save API key:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, [apiKeyInput, saveApiKey]);

  const handleClearApiKey = useCallback(async () => {
    try {
      await clearApiKey();
      setApiKeyInput('');
      setSaveStatus('idle');
    } catch (error) {
      console.error('Failed to clear API key:', error);
    }
  }, [clearApiKey]);

  // Handle Enter key in API key input
  const handleApiKeyKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && apiKeyInput.trim()) {
      handleSaveApiKey();
    }
  }, [apiKeyInput, handleSaveApiKey]);

  return (
    <div className="space-y-6">
      {/* Provider Selection */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Provider</h3>

        <SimpleSelect
          label="Provider"
          placeholder="Select provider"
          options={PROVIDER_OPTIONS}
          value={provider.type}
          onChange={(value) => setProviderConfig({ type: value as ProviderType })}
        />

        {/* Ollama-specific settings */}
        {provider.type === 'ollama' && (
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
        )}

        {/* OpenRouter-specific settings */}
        {provider.type === 'openrouter' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              {hasApiKey ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      id="api-key-display"
                      type="password"
                      value="••••••••••••••••"
                      disabled
                      className="flex-1 bg-muted"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearApiKey}
                    >
                      Clear
                    </Button>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    API key stored securely (encrypted)
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      id="api-key"
                      type="password"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      onKeyDown={handleApiKeyKeyDown}
                      placeholder="sk-or-..."
                      className="flex-1"
                    />
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSaveApiKey}
                      disabled={!apiKeyInput.trim() || isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                  {saveStatus === 'saved' && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      API key saved securely
                    </p>
                  )}
                  {saveStatus === 'error' && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      Failed to save API key
                    </p>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Get your API key from{' '}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  openrouter.ai/keys
                </a>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model-id">Model ID</Label>
              <Input
                id="model-id"
                value={provider.modelId}
                onChange={(e) => setProviderConfig({ modelId: e.target.value })}
                placeholder="openai/gpt-4o-mini"
              />
              <p className="text-xs text-muted-foreground">
                e.g., openai/gpt-4o, anthropic/claude-3.5-sonnet
              </p>
            </div>
          </div>
        )}
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
