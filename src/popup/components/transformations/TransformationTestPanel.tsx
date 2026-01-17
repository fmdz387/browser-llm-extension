import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { Transformation } from '@/types/transformations';
import { sendMessage } from '@/utils/messaging';

import { useState } from 'react';

interface TransformationTestPanelProps {
  transformation: Transformation;
}

export function TransformationTestPanel({ transformation }: TransformationTestPanelProps) {
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRunTest = async () => {
    if (!testInput.trim()) {
      setTestError('Please enter some text to test');
      return;
    }

    setIsLoading(true);
    setTestResult(null);
    setTestError(null);

    try {
      const response = await sendMessage({
        type: 'TRANSFORM',
        payload: {
          text: testInput.trim(),
          transformationId: transformation.id,
        },
      });

      if (response.success && response.data) {
        const data = response.data as { transformedText?: string };
        setTestResult(data.transformedText ?? '');
      } else if (!response.success) {
        setTestError(response.error.message);
      }
    } catch (error) {
      setTestError(error instanceof Error ? error.message : 'Test failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      <div className="space-y-2">
        <label htmlFor="test-input" className="text-xs font-medium">
          Test Input
        </label>
        <textarea
          id="test-input"
          value={testInput}
          onChange={(e) => setTestInput(e.target.value)}
          placeholder="Enter text to test this transformation..."
          className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          rows={2}
          disabled={isLoading}
        />
      </div>

      <Button
        variant="secondary"
        size="sm"
        onClick={handleRunTest}
        disabled={isLoading || !testInput.trim()}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Spinner className="mr-2 h-4 w-4" />
            Running...
          </>
        ) : (
          'Run Test'
        )}
      </Button>

      {testResult !== null && (
        <div className="space-y-1">
          <span className="text-xs font-medium">Result:</span>
          <div className="max-h-[100px] overflow-y-auto rounded-md bg-background p-2 text-sm">
            {testResult || <span className="text-muted-foreground">(empty result)</span>}
          </div>
        </div>
      )}

      {testError && (
        <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{testError}</div>
      )}
    </div>
  );
}
