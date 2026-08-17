import type { MetaMaskInpageProvider } from '@metamask/providers';

import { defaultSnapOrigin } from '../config';

/**
 * Invoke a Peer Cash snap method and let JSON-RPC errors propagate to the
 * caller (unlike the template's `useRequest`, which swallows them). Cash-out
 * flows need real errors to stop cleanly mid-plan.
 *
 * @param provider - The MetaMask provider.
 * @param method - The snap RPC method name.
 * @param params - Optional method params.
 * @returns The snap's result.
 */
export async function invokeCash<Result>(
  provider: MetaMaskInpageProvider,
  method: string,
  params?: Record<string, unknown>,
): Promise<Result> {
  return (await provider.request({
    method: 'wallet_invokeSnap',
    params: {
      snapId: defaultSnapOrigin,
      request: params ? { method, params } : { method },
    },
  })) as Result;
}

/**
 * Format a unix-seconds ETA sample into a rough human string.
 *
 * @param seconds - Median fill seconds.
 * @returns A human string like `~4m`.
 */
export function formatEta(seconds: number): string {
  if (seconds < 90) {
    return `~${Math.max(1, Math.round(seconds))}s`;
  }
  if (seconds < 90 * 60) {
    return `~${Math.round(seconds / 60)}m`;
  }
  return `~${Math.round(seconds / 3600)}h`;
}

/**
 * Shorten an id or hash for display.
 *
 * @param value - The full value.
 * @returns The shortened value.
 */
export function shorten(value: string): string {
  return value.length > 14 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}

/**
 * Coerce a thrown value into a display message.
 *
 * @param error - The caught value.
 * @param fallback - Text to use when the value carries no message.
 * @returns The message to render.
 */
export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
