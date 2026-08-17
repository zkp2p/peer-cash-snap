import type { CashClient, RuntimeEnv } from '@zkp2p/cash';
import { createCashClient } from '@zkp2p/cash';

const clients = new Map<RuntimeEnv, CashClient>();

/**
 * Lazily create (and memoize) a Peer Cash client for an environment.
 *
 * The client is read-capable without a signer; every mutation the snap
 * produces goes through the unsigned `prepare*` paths, so no keys or signers
 * ever exist inside the snap. RPC reads use the SDK's default public Base
 * RPC via the snap's `endowment:network-access` fetch.
 *
 * @param environment - Peer runtime environment to target.
 * @returns The memoized cash client.
 */
export function getCashClient(environment: RuntimeEnv): CashClient {
  let client = clients.get(environment);
  if (!client) {
    client = createCashClient({ environment, referrer: 'peer-cash-snap' });
    clients.set(environment, client);
  }
  return client;
}
