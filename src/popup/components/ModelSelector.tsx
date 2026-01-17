import { useEffect, useState } from 'react';
import { SimpleSelect, SelectOption } from '@/components/SimpleSelect';
import { useConfigStore } from '@/store/useConfigStore';
import { sendMessage } from '@/utils/messaging';
import type { AvailableModel } from '@/types/messages';

export function ModelSelector() {
  const { provider, setProviderConfig } = useConfigStore();
  const [models, setModels] = useState<AvailableModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await sendMessage({ type: 'LIST_MODELS' });

      if (response.success && response.data) {
        const data = response.data as { models: AvailableModel[] };
        setModels(data.models);

        // Set default model if none selected
        if (!provider.model && data.models.length > 0) {
          setProviderConfig({ model: data.models[0].name });
        }
      } else if (!response.success) {
        setError(response.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch models');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleModelChange = (value: string) => {
    setProviderConfig({ model: value });
  };

  // Convert models to SelectOption format
  const options: SelectOption[] = models.map((model) => ({
    value: model.name,
    label: model.name,
    description: model.size,
  }));

  return (
    <SimpleSelect
      label="Model"
      placeholder="Select a model"
      options={options}
      value={provider.model}
      onChange={handleModelChange}
      loading={loading}
      error={error || undefined}
      description={models.length === 0 && !loading && !error ? 'No models found. Make sure your provider has models available.' : undefined}
    />
  );
}
