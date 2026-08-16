/**
 * Build-time stub for `viem/_esm/tempo/chainConfig.js`.
 *
 * viem's Tempo chain support performs namespace assignments to frozen
 * function properties (`fn.call = ...`) at module-evaluation time, which SES
 * rejects. The Tempo chains are re-exported by `viem/chains`, dragging that
 * whole subtree into the bundle even though this snap only ever talks to
 * Base. Replacing the chain config with an inert object makes the Tempo
 * chain definitions pure so the bundler drops the entire subtree.
 */
export const chainConfig = {};
