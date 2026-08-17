import type { CashoutMeta, OrderView } from '../../../snap/src/serialize';

/**
 * Wire types for the Peer Cash snap's JSON-RPC surface.
 *
 * The view and meta shapes are type-only imports from the snap workspace -
 * one source of truth, erased at build time, so the site still never bundles
 * snap code or `@zkp2p/cash` (the snap is the single SDK host). Shapes the
 * snap forwards verbatim from the SDK (estimates, plans, receipts) are
 * mirrored here by hand, with bigints travelling as decimal strings.
 */

export type { SupportedEnvironment } from '../../../snap/src/constants';
export type {
  CapabilitiesView,
  CashoutMeta,
  OrderView,
  PlatformView,
} from '../../../snap/src/serialize';

export type EstimateView = {
  kind: string;
  currency: string;
  amount: string;
  rate: number;
  receiveAmount: number;
  asOf: number;
  oracleUpdatedAt?: number;
  stale?: boolean;
  eta?: { medianFillSeconds?: number; sampleSize?: number };
};

export type WireTx = {
  to: string;
  data: string;
  value: string;
  chainId: number;
};

export type WireStep = {
  kind: string;
  description: string;
};

export type WirePlan = {
  txs: WireTx[];
  steps: WireStep[];
};

export type PrepareCashoutResult = {
  plan: WirePlan & {
    register: { hashedOnchainIds: string[] };
    accessPolicyRequired: boolean;
  };
  meta: CashoutMeta;
};

export type FinalizeCashoutResult = {
  result: {
    depositId: string;
    txHash: string;
    escrowAddress: string;
    onchainDepositId: string;
    order: OrderView;
  };
};

/** Raw `eth_getTransactionReceipt` result (relevant fields). */
export type RawReceipt = {
  transactionHash: string;
  status: string;
  logs: {
    address: string;
    topics: string[];
    data: string;
    [key: string]: unknown;
  }[];
  [key: string]: unknown;
};
