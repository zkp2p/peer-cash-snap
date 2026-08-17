import type { CashCapabilities, CashOrder, RuntimeEnv } from '@zkp2p/cash';
import { formatUsdc } from '@zkp2p/cash';

import { RESTRICTED_PLATFORMS } from './constants';
import type { TrackedOrder } from './state';

/** JSON-safe capability row for one payout platform. */
export type PlatformView = {
  platform: string;
  currencies: string[];
  payeeHint: string;
  requiresIdentityAttestation: boolean;
  /** True when this snap refuses the rail (needs a first-party Peer host). */
  restricted: boolean;
};

/** JSON-safe view of `capabilities()` (bigint bounds become strings). */
export type CapabilitiesView = {
  environment: RuntimeEnv;
  chainId: number;
  token: { address: string; symbol: string; decimals: number };
  platforms: PlatformView[];
  currencies: string[];
  amount: { min: string; recommendedMin: string; max: null };
  pricing: { kind: string; spreadBps: number };
};

/**
 * Convert live capabilities into a JSON-safe wire shape for the dapp.
 *
 * @param capabilities - Result of `cash.capabilities()`.
 * @returns The serializable view.
 */
export function serializeCapabilities(
  capabilities: CashCapabilities,
): CapabilitiesView {
  return {
    environment: capabilities.environment,
    chainId: capabilities.chainId,
    token: capabilities.token,
    platforms: capabilities.platforms.map((platform) => ({
      platform: platform.platform,
      currencies: [...platform.currencies],
      payeeHint: platform.payeeHint,
      requiresIdentityAttestation: platform.requiresIdentityAttestation,
      restricted: RESTRICTED_PLATFORMS.has(platform.platform),
    })),
    currencies: [...capabilities.currencies],
    amount: {
      min: capabilities.amount.min.toString(),
      recommendedMin: capabilities.amount.recommendedMin.toString(),
      max: null,
    },
    pricing: capabilities.pricing,
  };
}

/**
 * `cash_prepareCashout` echo payload the dapp passes back verbatim (minus
 * `environment`) to `cash_finalizeCashout`. Named so the site can type its
 * side of the round-trip against this exact shape.
 */
export type CashoutMeta = {
  owner: string;
  amountUsdc: string;
  legs: { platform: string; currencies: string[] }[];
  environment: RuntimeEnv;
};

/** JSON-safe order view consumed by the dapp and the home page. */
export type OrderView = {
  depositId: string;
  state: string;
  isInFlight: boolean;
  nextActions: string[];
  /** One honest sentence from live data. */
  explain: string;
  /** Amounts in USDC base units (decimal strings). */
  totalAmount: string;
  filledAmount: string;
  pendingAmount: string;
  returnedAmount: string;
  /** Human-formatted USDC amounts. */
  totalUsdc: string;
  filledUsdc: string;
  pendingUsdc: string;
  returnedUsdc: string;
  payouts?: { platform: string; currencies: string[] }[];
  intentCount?: number;
  successRateBps?: number;
  withdrawn?: boolean;
  matchedAt?: number;
  deliveredAt?: number;
  updatedAt?: number;
  /** Whether the snap created and tracks this order. */
  tracked: boolean;
  /** Unix ms when the snap finalized the cash-out (tracked orders only). */
  createdAt?: number;
  /** createDeposit transaction hash (tracked orders only). */
  creationTxHash?: string;
  /** True when this view was rebuilt from cached snap state, not live data. */
  stale?: boolean;
};

/**
 * Convert a live `CashOrder` into a JSON-safe view.
 *
 * This is a deliberate allowlist, not a generic codec: the SDK's
 * `orderToJson` carries fill/payee details the snap must not expose, so new
 * `CashOrder` fields stay out of the wire shape until added here explicitly.
 * (The conditional spreads are the type-safe optional-field idiom under
 * `exactOptionalPropertyTypes`.)
 *
 * @param order - Live order from `order()`/`orders()`.
 * @param tracked - Snap-tracked metadata for the same deposit, if any.
 * @returns The serializable view.
 */
export function serializeOrder(
  order: CashOrder,
  tracked?: TrackedOrder,
): OrderView {
  const payouts = order.payouts?.map((payout) => ({
    platform: payout.platform,
    currencies: payout.currency ? [payout.currency] : [],
  }));

  return {
    depositId: order.depositId,
    state: order.state,
    isInFlight: order.isInFlight,
    nextActions: [...order.nextActions],
    explain: order.explain(),
    totalAmount: order.totalAmount.toString(),
    filledAmount: order.filledAmount.toString(),
    pendingAmount: order.pendingAmount.toString(),
    returnedAmount: order.returnedAmount.toString(),
    totalUsdc: formatUsdc(order.totalAmount),
    filledUsdc: formatUsdc(order.filledAmount),
    pendingUsdc: formatUsdc(order.pendingAmount),
    returnedUsdc: formatUsdc(order.returnedAmount),
    ...(payouts ? { payouts } : {}),
    ...(order.intentCount === undefined
      ? {}
      : { intentCount: order.intentCount }),
    ...(order.successRateBps === undefined
      ? {}
      : { successRateBps: order.successRateBps }),
    ...(order.withdrawn === undefined ? {} : { withdrawn: order.withdrawn }),
    ...(order.matchedAt === undefined ? {} : { matchedAt: order.matchedAt }),
    ...(order.deliveredAt === undefined
      ? {}
      : { deliveredAt: order.deliveredAt }),
    ...(order.updatedAt === undefined ? {} : { updatedAt: order.updatedAt }),
    tracked: Boolean(tracked),
    ...(tracked
      ? { createdAt: tracked.createdAt, creationTxHash: tracked.txHash }
      : {}),
  };
}

/**
 * Build a best-effort order view from tracked snap state alone, used when the
 * live read fails (offline, indexer lag) or the order is already terminal.
 *
 * @param tracked - The tracked order metadata.
 * @returns A stale view carrying the last observed state.
 */
export function viewFromTracked(tracked: TrackedOrder): OrderView {
  const amount = BigInt(tracked.amount);
  return {
    depositId: tracked.depositId,
    state: tracked.lastState,
    isInFlight: tracked.inFlight,
    nextActions: [],
    explain: `Last observed state: ${tracked.lastState}.`,
    totalAmount: tracked.amount,
    filledAmount: '0',
    pendingAmount: '0',
    returnedAmount: '0',
    totalUsdc: formatUsdc(amount),
    filledUsdc: '0',
    pendingUsdc: '0',
    returnedUsdc: '0',
    payouts: tracked.legs.map((leg) => ({
      platform: leg.platform,
      currencies: leg.currencies,
    })),
    tracked: true,
    createdAt: tracked.createdAt,
    creationTxHash: tracked.txHash,
    stale: true,
  };
}
