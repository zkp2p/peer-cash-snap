/**
 * Build-time stub for `@zkp2p/zkp2p-attestation`.
 *
 * `@zkp2p/sdk` imports two TEE-session encryption helpers from this package.
 * Both belong to buyer-proof and seller-credential flows the Peer Cash snap
 * never executes (the snap is maker-only: prepare, finalize, observe,
 * withdraw, top up). The real package drags in `@peculiar/x509`, which
 * imports `reflect-metadata` - a polyfill that mutates the frozen `Reflect`
 * intrinsic and crashes under SES. The webpack alias in `snap.config.ts`
 * swaps it for this module.
 *
 * If a future `@zkp2p/sdk` version imports additional names, the bundler
 * fails loudly at build time instead of shipping broken behavior.
 */

/**
 * Stub factory for unreachable attestation helpers.
 *
 * @param name - The stubbed export's name, for the error message.
 * @returns A function that always throws.
 */
const unavailable = (name: string) => {
  return (): never => {
    throw new Error(
      `\`${name}\` is not available in the Peer Cash snap (attestation flows are buyer-side and stubbed out).`,
    );
  };
};

export const createEncryptedBuyerTeeSessionMaterial = unavailable(
  'createEncryptedBuyerTeeSessionMaterial',
);
export const createEncryptedSellerCredentialUpload = unavailable(
  'createEncryptedSellerCredentialUpload',
);
export const createNitroAttestationClient = unavailable(
  'createNitroAttestationClient',
);
