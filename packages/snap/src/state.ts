import type { Json } from '@metamask/snaps-sdk';
import type { RuntimeEnv } from '@zkp2p/cash';

/** One payout leg summary kept alongside a tracked order (no payee handles). */
export type TrackedLeg = {
  platform: string;
  currencies: string[];
};

/**
 * A cash-out order this snap created and keeps watching. Only non-sensitive
 * protocol data is stored (the deposit id and amounts are public on-chain);
 * payee handles are deliberately never persisted.
 */
export type TrackedOrder = {
  /** Composite deposit id (`escrow_onchainId`) - the durable resume key. */
  depositId: string;
  environment: RuntimeEnv;
  /** Maker wallet address that owns the deposit. */
  owner: string;
  /** Hash of the createDeposit transaction. */
  txHash: string;
  /** Deposited amount in USDC base units (decimal string). */
  amount: string;
  legs: TrackedLeg[];
  /** Unix milliseconds when the snap finalized the cash-out. */
  createdAt: number;
  /** Last observed order state. */
  lastState: string;
  /** Last state the user was notified about. */
  lastNotifiedState?: string;
  /** Last observed `isInFlight` flag; false once terminal. */
  inFlight: boolean;
};

/** Persistent, unencrypted snap state (readable by background cron jobs). */
export type SnapState = {
  environment: RuntimeEnv;
  orders: TrackedOrder[];
};

/**
 * Read the snap's persisted state, falling back to defaults on first run.
 *
 * State is stored unencrypted so the cron job can refresh orders while
 * MetaMask is locked without prompting for the password. Nothing stored here
 * is secret: deposit ids, amounts, and states are public protocol data.
 *
 * @returns The current snap state.
 */
export async function getSnapState(): Promise<SnapState> {
  const stored = (await snap.request({
    method: 'snap_manageState',
    params: { operation: 'get', encrypted: false },
  })) as Record<string, Json> | null;

  if (!stored) {
    return { environment: 'production', orders: [] };
  }

  return {
    environment: (stored.environment as RuntimeEnv) ?? 'production',
    orders: (stored.orders as unknown as TrackedOrder[]) ?? [],
  };
}

/**
 * Persist the snap state.
 *
 * @param state - The full state to store.
 */
export async function setSnapState(state: SnapState): Promise<void> {
  await snap.request({
    method: 'snap_manageState',
    params: {
      operation: 'update',
      newState: state as unknown as Record<string, Json>,
      encrypted: false,
    },
  });
}

/**
 * Read-modify-write helper for the snap state.
 *
 * @param mutate - Pure function producing the next state.
 * @returns The state after the update.
 */
export async function updateSnapState(
  mutate: (state: SnapState) => SnapState,
): Promise<SnapState> {
  const current = await getSnapState();
  const next = mutate(current);
  await setSnapState(next);
  return next;
}
