import type { MetaMaskInpageProvider } from '@metamask/providers';

import type { RawReceipt, WireStep, WireTx } from '../types/cash';

export const BASE_CHAIN_ID_HEX = '0x2105'; // 8453

const BASE_CHAIN_PARAMS = {
  chainId: BASE_CHAIN_ID_HEX,
  chainName: 'Base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://mainnet.base.org'],
  blockExplorerUrls: ['https://basescan.org'],
};

/**
 * Make sure MetaMask is on Base, switching (and adding the chain if
 * necessary) otherwise.
 *
 * @param provider - The MetaMask provider.
 */
export async function ensureBaseChain(
  provider: MetaMaskInpageProvider,
): Promise<void> {
  const chainId = (await provider.request({ method: 'eth_chainId' })) as
    | string
    | null;
  if (chainId?.toLowerCase() === BASE_CHAIN_ID_HEX) {
    return;
  }

  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BASE_CHAIN_ID_HEX }],
    });
  } catch (switchError) {
    const code = (switchError as { code?: number })?.code;
    if (code === 4902) {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [BASE_CHAIN_PARAMS],
      });
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_CHAIN_ID_HEX }],
      });
    } else {
      throw switchError;
    }
  }
}

/**
 * Wait for a transaction receipt by polling the connected wallet's RPC.
 *
 * @param provider - The MetaMask provider.
 * @param hash - The transaction hash.
 * @param options - Poll interval and timeout overrides.
 * @param options.pollMs - Milliseconds between polls.
 * @param options.timeoutMs - Give-up timeout in milliseconds.
 * @returns The raw receipt.
 */
export async function waitForReceipt(
  provider: MetaMaskInpageProvider,
  hash: string,
  options: { pollMs?: number; timeoutMs?: number } = {},
): Promise<RawReceipt> {
  const { pollMs = 2_000, timeoutMs = 300_000 } = options;
  const startedAt = Date.now();

  for (;;) {
    const receipt = (await provider.request({
      method: 'eth_getTransactionReceipt',
      params: [hash],
    })) as RawReceipt | null;

    if (receipt) {
      return receipt;
    }
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(
        `Timed out waiting for receipt of ${hash}. Check the transaction in MetaMask before retrying anything.`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

export type ExecutedStep = {
  step: WireStep;
  hash: string;
  receipt: RawReceipt;
};

/**
 * Submit an unsigned plan through MetaMask, sequentially, waiting for each
 * receipt and failing fast on a revert.
 *
 * @param provider - The MetaMask provider.
 * @param from - The sending account.
 * @param txs - The unsigned transactions.
 * @param steps - The matching step descriptions.
 * @param onProgress - Progress callback (step label).
 * @returns Every executed step with its receipt.
 */
export async function executePlan(
  provider: MetaMaskInpageProvider,
  from: string,
  txs: WireTx[],
  steps: WireStep[],
  onProgress?: (label: string) => void,
): Promise<ExecutedStep[]> {
  const executed: ExecutedStep[] = [];

  for (const [index, tx] of txs.entries()) {
    const step = steps[index] ?? {
      kind: 'transaction',
      description: `Transaction ${index + 1}`,
    };
    onProgress?.(
      `Step ${index + 1}/${txs.length}: ${step.description} Confirm in MetaMask…`,
    );

    const hash = (await provider.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from,
          to: tx.to,
          data: tx.data,
          value: `0x${BigInt(tx.value).toString(16)}`,
          // MetaMask rejects the transaction if this does not match the
          // active chain, so a mid-plan network switch cannot misroute it.
          chainId: `0x${tx.chainId.toString(16)}`,
        },
      ],
    })) as string;

    onProgress?.(
      `Step ${index + 1}/${txs.length}: waiting for confirmation of ${hash.slice(
        0,
        10,
      )}…`,
    );
    const receipt = await waitForReceipt(provider, hash);

    if (receipt.status !== '0x1') {
      throw new Error(
        `${step.kind} transaction reverted (${hash}). Nothing further was submitted.`,
      );
    }
    executed.push({ step, hash, receipt });
  }

  return executed;
}

/**
 * Convert a raw receipt into the snap's finalize wire shape.
 *
 * @param receipt - The raw receipt.
 * @returns The finalize receipt payload.
 */
export function toFinalizeReceipt(receipt: RawReceipt): {
  transactionHash: string;
  status: 'success' | 'reverted';
  logs: RawReceipt['logs'];
} {
  return {
    transactionHash: receipt.transactionHash,
    status: receipt.status === '0x1' ? 'success' : 'reverted',
    logs: receipt.logs,
  };
}
