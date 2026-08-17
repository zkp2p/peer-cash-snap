import { useCallback, useState } from 'react';

import { errorMessage } from '../utils/cash';

/**
 * Shared choreography for multi-step wallet flows: one busy flag, one status
 * line, one error line, and a `run` wrapper that owns the set/clear/coerce
 * lifecycle so panels cannot drift on re-entry guards or error handling.
 *
 * @returns The flow state and the `run` wrapper.
 */
export const useFlow = () => {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Run one flow: clears prior error/status, guards re-entry via `busy`,
   * coerces thrown values into a message, and always clears status.
   *
   * @param fallbackError - Error text when the thrown value has no message.
   * @param task - The flow body; receives `setStatus` for progress lines.
   * @returns The task result, or null when it threw.
   */
  const run = useCallback(
    async <Result>(
      fallbackError: string,
      task: (report: (line: string) => void) => Promise<Result>,
    ): Promise<Result | null> => {
      setBusy(true);
      setError(null);
      try {
        return await task(setStatus);
      } catch (flowError) {
        setError(errorMessage(flowError, fallbackError));
        return null;
      } finally {
        setStatus(null);
        setBusy(false);
      }
    },
    [],
  );

  return { busy, status, error, setError, run };
};
