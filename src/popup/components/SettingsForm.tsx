import { SimpleSelect, SelectOption } from '@/components/SimpleSelect';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { OPENROUTER_DEFAULT_MODELS, CUSTOM_MODEL_VALUE } from '@/constants/models';
import type { ProviderType } from '@/providers';
import { getProviderDisplayName, useConfigStore } from '@/store/useConfigStore';
import type { AvailableModel } from '@/types/messages';
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

  // Model selection state
  const [ollamaModels, setOllamaModels] = useState<AvailableModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [showCustomModelInput, setShowCustomModelInput] = useState(false);
  const [customModelId, setCustomModelId] = useState(provider.modelId || '');

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

  // Fetch Ollama models when provider type is ollama
  const fetchOllamaModels = useCallback(async () => {
    if (provider.type !== 'ollama') return;

    setModelsLoading(true);
    setModelsError(null);

    try {
      const response = await sendMessage({ type: 'LIST_MODELS' });

      if (response.success && response.data) {
        const data = response.data as { models: AvailableModel[] };
        setOllamaModels(data.models);

        // Set default model if none selected
        if (!provider.model && data.models.length > 0) {
          setProviderConfig({ model: data.models[0].name });
        }
      } else if (!response.success) {
        setModelsError(response.error.message);
      }
    } catch (err) {
      setModelsError(err instanceof Error ? err.message : 'Failed to fetch models');
    } finally {
      setModelsLoading(false);
    }
  }, [provider.type, provider.model, setProviderConfig]);

  useEffect(() => {
    if (provider.type === 'ollama') {
      fetchOllamaModels();
    }
  }, [provider.type, fetchOllamaModels]);

  // Check if current OpenRouter model is a custom model (not in defaults)
  useEffect(() => {
    if (provider.type === 'openrouter') {
      const isDefaultModel = OPENROUTER_DEFAULT_MODELS.some(m => m.id === provider.model);
      if (provider.model && !isDefaultModel) {
        setShowCustomModelInput(true);
        setCustomModelId(provider.model);
      }
    }
  }, [provider.type, provider.model]);

  // Handle model selection
  const handleModelChange = useCallback((value: string) => {
    if (provider.type === 'openrouter' && value === CUSTOM_MODEL_VALUE) {
      setShowCustomModelInput(true);
      // Don't clear the model yet - wait for user to enter custom ID
    } else {
      setShowCustomModelInput(false);
      setProviderConfig({ model: value });
    }
  }, [provider.type, setProviderConfig]);

  // Handle custom model ID change
  const handleCustomModelIdChange = useCallback((value: string) => {
    setCustomModelId(value);
    setProviderConfig({ model: value, modelId: value });
  }, [setProviderConfig]);

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

  // Build model options based on provider type
  const getModelOptions = (): SelectOption[] => {
    if (provider.type === 'ollama') {
      return ollamaModels.map((model) => ({
        value: model.name,
        label: model.name,
        description: model.size,
      }));
    }

    if (provider.type === 'openrouter') {
      const options: SelectOption[] = OPENROUTER_DEFAULT_MODELS.map((model) => ({
        value: model.id,
        label: model.displayName,
        description: model.description,
      }));
      options.push({
        value: CUSTOM_MODEL_VALUE,
        label: 'Custom model...',
        description: 'Enter a custom model ID',
      });
      return options;
    }

    return [];
  };

  // Get current model value for the dropdown
  const getCurrentModelValue = (): string => {
    if (provider.type === 'openrouter' && showCustomModelInput) {
      return CUSTOM_MODEL_VALUE;
    }
    return provider.model;
  };

  return (
    <div className="space-y-6">
      {/* Provider & Model Selection */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Provider & Model</h3>

        <SimpleSelect
          label="Provider"
          placeholder="Select provider"
          options={PROVIDER_OPTIONS}
          value={provider.type}
          onChange={(value) => setProviderConfig({ type: value as ProviderType })}
        />

        {/* Model Selection - Provider-aware */}
        <SimpleSelect
          label="Model"
          placeholder="Select a model"
          options={getModelOptions()}
          value={getCurrentModelValue()}
          onChange={handleModelChange}
          loading={provider.type === 'ollama' && modelsLoading}
          error={provider.type === 'ollama' ? modelsError || undefined : undefined}
          description={
            provider.type === 'ollama' && ollamaModels.length === 0 && !modelsLoading && !modelsError
              ? 'No models found. Make sure Ollama is running.'
              : undefined
          }
        />

        {/* Custom model input for OpenRouter */}
        {provider.type === 'openrouter' && showCustomModelInput && (
          <div className="space-y-2">
            <Label htmlFor="custom-model-id">Custom Model ID</Label>
            <Input
              id="custom-model-id"
              value={customModelId}
              onChange={(e) => handleCustomModelIdChange(e.target.value)}
              placeholder="e.g., openai/gpt-4o"
            />
            <p className="text-xs text-muted-foreground">
              Enter the full model ID from{' '}
              <a
                href="https://openrouter.ai/models"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                openrouter.ai/models
              </a>
            </p>
          </div>
        )}

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
