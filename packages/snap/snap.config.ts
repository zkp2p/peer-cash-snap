import type { SnapConfig } from '@metamask/snaps-cli';
import { resolve } from 'path';
import { NormalModuleReplacementPlugin } from 'webpack';

const relaySdkStub = resolve(__dirname, 'src/stubs/relay-sdk.ts');
const attestationStub = resolve(__dirname, 'src/stubs/zkp2p-attestation.ts');
const viemTempoChainConfigStub = resolve(
  __dirname,
  'src/stubs/viem-tempo-chain-config.ts',
);

const config: SnapConfig = {
  input: resolve(__dirname, 'src/index.tsx'),
  server: {
    port: 8080,
  },
  polyfills: {
    buffer: true,
    crypto: true,
    stream: true,
    events: true,
    process: true,
  },
  stats: {
    builtIns: false,
  },
  customizeWebpackConfig: (webpackConfig) => {
    // The snap is Base-USDC only; Relay source routing is unreachable. The
    // real Relay SDK also breaks under SES (assignments to frozen function
    // properties), so it is replaced with a small throwing stub.
    webpackConfig.resolve = webpackConfig.resolve ?? {};
    webpackConfig.resolve.alias = {
      ...(webpackConfig.resolve.alias as Record<string, string> | undefined),
      '@relayprotocol/relay-sdk/chain-utils$': relaySdkStub,
      '@relayprotocol/relay-sdk$': relaySdkStub,
      // Buyer-side TEE attestation helpers; pulls in `reflect-metadata`,
      // which mutates frozen intrinsics under SES.
      '@zkp2p/zkp2p-attestation$': attestationStub,
    };

    // viem's Tempo chain subtree performs `fn.call = ...` namespace
    // assignments at import time, which SES rejects. Stubbing its chain
    // config makes the Tempo chain definitions pure, so they tree-shake out.
    webpackConfig.plugins = [
      ...(webpackConfig.plugins ?? []),
      new NormalModuleReplacementPlugin(
        /tempo[\\/]chainConfig\.js$/u,
        viemTempoChainConfigStub,
      ),
    ];

    return webpackConfig;
  },
};

export default config;
