import type { RuntimeEnv } from '@zkp2p/cash';

/** Runtime environments the snap can point at (contracts, curator, indexer). */
export const SUPPORTED_ENVIRONMENTS = [
  'production',
  'preproduction',
  'staging',
] as const satisfies readonly RuntimeEnv[];

/**
 * Payout rails whose deposits require an atomically configured access policy
 * (Plus/Pro/Peer Makers/Peer Pay) that only first-party Peer hosts can
 * provide. Mirrors the SDK's internal `CASH_RESTRICTED_PLATFORMS`; the
 * authoritative backstop is `PrepareResult.accessPolicyRequired`, which the
 * snap re-checks after every `prepare()`.
 */
export const RESTRICTED_PLATFORMS = new Set(['venmo', 'cashapp', 'paypal']);

/** Companion dapp that submits the unsigned transaction plans. */
export const COMPANION_DAPP_URL = 'http://localhost:8000';

/** Guidance shown when a restricted rail is requested. */
export const RESTRICTED_REMEDIATION =
  'Venmo, Cash App, and PayPal cash-outs need an atomic access policy that only the Peer app or peer.xyz can configure. Pick another platform here, or use Peer directly for those rails.';

/** In-app notification copy per newly observed order state (max 50 chars). */
export const STATE_NOTIFICATIONS: Record<string, string> = {
  matched: 'Peer Cash: a buyer matched your cash-out',
  delivering: 'Peer Cash: your cash-out is delivering',
  delivered: 'Peer Cash: cash-out delivered',
  returned: 'Peer Cash: funds returned to your wallet',
};
