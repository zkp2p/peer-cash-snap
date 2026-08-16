/**
 * Wire types for the Peer Cash snap's JSON-RPC surface. These mirror the
 * JSON-safe shapes the snap returns (bigints travel as decimal strings);
 * the site deliberately does not import `@zkp2p/cash` - the snap is the
 * single SDK host.
 */

export type PlatformView = {
  platform: string;
  currencies: string[];
  payeeHint: string;
  requiresIdentityAttestation: boolean;
  restricted: boolean;
};

export type CapabilitiesView = {
  environment: 'production' | 'preproduction' | 'staging';
  chainId: number;
  token: { address: string; symbol: string; decimals: number };
  platforms: PlatformView[];
  currencies: string[];
  amount: { min: string; recommendedMin: string; max: null };
  pricing: { kind: string; spreadBps: number };
};

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
  meta: {
    owner: string;
    amountUsdc: string;
    legs: { platform: string; currencies: string[] }[];
    environment: string;
  };
};

export type OrderView = {
  depositId: string;
  state: string;
  isInFlight: boolean;
  nextActions: string[];
  explain: string;
  totalAmount: string;
  filledAmount: string;
  pendingAmount: string;
  returnedAmount: string;
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
  tracked: boolean;
  createdAt?: number;
  creationTxHash?: string;
  stale?: boolean;
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
