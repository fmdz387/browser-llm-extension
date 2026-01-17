import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { getProviderDisplayName, useConfigStore } from '@/store/useConfigStore';
import { useConnectionStore } from '@/store/useConnectionStore';
import { sendMessage } from '@/utils/messaging';

import { useEffect } from 'react';

export function ConnectionStatus() {
  const { status, error, setStatus } = useConnectionStore();
  const providerType = useConfigStore((state) => state.provider.type);
  const providerName = getProviderDisplayName(providerType);

  const testConnection = async () => {
    setStatus('connecting');

    try {
      const response = await sendMessage({ type: 'TEST_CONNECTION' });

      if (response.success) {
        setStatus('connected');
      } else {
        setStatus('error', response.error.message);
      }
    } catch (err) {
      setStatus('error', err instanceof Error ? err.message : 'Connection failed');
    }
  };

  // Test connection on mount
  useEffect(() => {
    testConnection();
  }, []);

  const statusConfig = {
    disconnected: { label: 'Not Connected', variant: 'secondary' as const },
    connecting: { label: 'Connecting...', variant: 'secondary' as const },
    connected: { label: 'Connected', variant: 'default' as const },
    error: { label: 'Error', variant: 'destructive' as const },
  };

  const config = statusConfig[status];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{providerName} Status</span>
        {status === 'connecting' ? (
          <Spinner className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Badge variant={config.variant}>{config.label}</Badge>
        )}
      </div>

      {status === 'error' && error && <p className="text-xs text-destructive">{error}</p>}

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={testConnection}
        disabled={status === 'connecting'}
      >
        {status === 'connecting' ? 'Testing...' : 'Test Connection'}
      </Button>
    </div>
  );
}
