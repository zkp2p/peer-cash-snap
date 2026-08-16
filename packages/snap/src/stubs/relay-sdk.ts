/**
 * Build-time stub for `@relayprotocol/relay-sdk` (and its `chain-utils`
 * subpath).
 *
 * The real Relay SDK pulls in dependencies that assign to frozen function
 * properties (`fn.call = ...`), which SES rejects, and the snap never routes
 * non-Base source assets anyway: `cash.prepare()` is Base-USDC only. The
 * webpack aliases in `snap.config.ts` swap the SDK for this module, keeping
 * the bundle SES-safe and small while preserving the constants evaluated at
 * import time.
 *
 * Any accidental use of a Relay-backed code path fails loudly here instead
 * of misbehaving silently.
 */

/** Real Relay API URL; evaluated at import time by `@zkp2p/cash`. */
export const MAINNET_RELAY_API = 'https://api.relay.link';

/**
 * Build a stub that throws when a Relay-only code path is reached.
 *
 * @param name - The stubbed export's name, for the error message.
 * @returns A function that always throws.
 */
const unavailable = (name: string) => {
  return (): never => {
    throw new Error(
      `Relay source routing is not available in the Peer Cash snap (stubbed \`${name}\`). Cash out Base USDC directly.`,
    );
  };
};

export const createClient = unavailable('createClient');
export const configureDynamicChains = unavailable('configureDynamicChains');
export const fetchChainConfigs = unavailable('fetchChainConfigs');
