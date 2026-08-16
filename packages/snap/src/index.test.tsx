import { expect } from '@jest/globals';
import { installSnap } from '@metamask/snaps-jest';

import { HomePanel } from './ui';

type ConfirmationInterface = {
  type: 'confirmation';
  ok: () => Promise<unknown>;
  cancel: () => Promise<unknown>;
};

/**
 * Narrow a snap interface to a confirmation dialog (throws otherwise), so
 * tests stay free of conditionals.
 *
 * @param ui - The snap interface returned by `getInterface()`.
 * @param ui.type - The interface type reported by snaps-jest.
 * @returns The confirmation interface.
 */
function asConfirmation(ui: { type?: string }): ConfirmationInterface {
  if (ui.type !== 'confirmation') {
    throw new Error(
      `Expected a confirmation dialog, got ${ui.type ?? 'no type'}`,
    );
  }
  return ui as unknown as ConfirmationInterface;
}

/**
 * These tests exercise the network-free surface of the snap: capability
 * discovery, parameter validation, restricted-rail refusal, environment
 * switching (dialog flow), and home page rendering with empty state.
 *
 * Flows that hit live Peer infrastructure (estimate, prepare, finalize,
 * order reads) are covered by the staging verification procedure documented
 * in the README, mirroring the Peer Cash SDK integration guide.
 */
describe('onRpcRequest', () => {
  describe('cash_getCapabilities', () => {
    it('returns the live product boundary with restricted rails flagged', async () => {
      const { request } = await installSnap();

      const response = await request({ method: 'cash_getCapabilities' });

      expect(response).toRespondWith(
        expect.objectContaining({
          capabilities: expect.objectContaining({
            environment: 'production',
            chainId: 8453,
            token: expect.objectContaining({ symbol: 'USDC', decimals: 6 }),
            amount: expect.objectContaining({ min: '10000' }),
            pricing: { kind: 'oracle-market-rate', spreadBps: 0 },
          }),
        }),
      );

      const { result } = (
        response as unknown as {
          response: {
            result?: {
              capabilities: {
                platforms: {
                  platform: string;
                  currencies: string[];
                  restricted: boolean;
                }[];
              };
            };
          };
        }
      ).response;

      expect(result).toBeDefined();
      const { platforms } = (result as NonNullable<typeof result>).capabilities;
      expect(platforms.length).toBeGreaterThan(0);

      // Restricted rails are flagged so dapps can label them.
      const restrictedFlags = platforms
        .filter((platform) =>
          ['venmo', 'cashapp', 'paypal'].includes(platform.platform),
        )
        .map((platform) => platform.restricted);
      expect(restrictedFlags.every(Boolean)).toBe(true);
    });
  });

  describe('cash_getEnvironment', () => {
    it('defaults to production', async () => {
      const { request } = await installSnap();

      const response = await request({ method: 'cash_getEnvironment' });

      expect(response).toRespondWith({ environment: 'production' });
    });
  });

  describe('cash_setEnvironment', () => {
    it('switches after user confirmation', async () => {
      const { request } = await installSnap();

      const response = request({
        method: 'cash_setEnvironment',
        params: { environment: 'staging' },
      });

      const ui = asConfirmation(await response.getInterface());
      await ui.ok();

      expect(await response).toRespondWith({ environment: 'staging' });

      const after = await request({ method: 'cash_getEnvironment' });
      expect(after).toRespondWith({ environment: 'staging' });
    });

    it('rejects when the user declines', async () => {
      const { request } = await installSnap();

      const response = request({
        method: 'cash_setEnvironment',
        params: { environment: 'staging' },
      });

      const ui = asConfirmation(await response.getInterface());
      await ui.cancel();

      expect(await response).toRespondWithError(
        expect.objectContaining({
          message: expect.stringContaining('rejected'),
        }),
      );
    });

    it('rejects unknown environments', async () => {
      const { request } = await installSnap();

      const response = await request({
        method: 'cash_setEnvironment',
        params: { environment: 'mainnet' },
      });

      expect(response).toRespondWithError(
        expect.objectContaining({
          message: expect.stringContaining('Invalid params'),
        }),
      );
    });
  });

  describe('cash_prepareCashout', () => {
    const owner = '0x1111111111111111111111111111111111111111';

    it('refuses restricted rails before any side effect', async () => {
      const { request } = await installSnap();

      const response = await request({
        method: 'cash_prepareCashout',
        params: {
          amountUsdc: '100',
          owner,
          legs: [{ platform: 'venmo', currency: 'USD', payee: '@someone' }],
        },
      });

      expect(response).toRespondWithError(
        expect.objectContaining({
          message: expect.stringContaining('venmo'),
        }),
      );
    });

    it('rejects malformed amounts', async () => {
      const { request } = await installSnap();

      const response = await request({
        method: 'cash_prepareCashout',
        params: {
          amountUsdc: 'one hundred',
          owner,
          legs: [{ platform: 'chime', currency: 'USD', payee: '$someone' }],
        },
      });

      expect(response).toRespondWithError(
        expect.objectContaining({
          message: expect.stringContaining('Invalid USDC amount'),
        }),
      );
    });

    it('rejects legs with both currency and currencies', async () => {
      const { request } = await installSnap();

      const response = await request({
        method: 'cash_prepareCashout',
        params: {
          amountUsdc: '100',
          owner,
          legs: [
            {
              platform: 'revolut',
              currency: 'EUR',
              currencies: ['EUR', 'GBP'],
              payee: 'revtag',
            },
          ],
        },
      });

      expect(response).toRespondWithError(
        expect.objectContaining({
          message: expect.stringContaining('Invalid params'),
        }),
      );
    });

    it('rejects a missing owner address', async () => {
      const { request } = await installSnap();

      const response = await request({
        method: 'cash_prepareCashout',
        params: {
          amountUsdc: '100',
          legs: [{ platform: 'chime', currency: 'USD', payee: '$someone' }],
        },
      });

      expect(response).toRespondWithError(
        expect.objectContaining({
          message: expect.stringContaining('owner'),
        }),
      );
    });
  });

  describe('cash_untrackOrder', () => {
    it('is a no-op on an empty list', async () => {
      const { request } = await installSnap();

      const response = await request({
        method: 'cash_untrackOrder',
        params: { depositId: '0xescrow_1' },
      });

      expect(response).toRespondWith({ removed: true });
    });
  });

  describe('cash_refreshOrders', () => {
    it('returns an empty list when nothing is tracked', async () => {
      const { request } = await installSnap();

      const response = await request({ method: 'cash_refreshOrders' });

      expect(response).toRespondWith({ orders: [] });
    });
  });

  it('throws on unknown methods', async () => {
    const { request } = await installSnap();

    const response = await request({ method: 'foo' });

    expect(response).toRespondWithError(
      expect.objectContaining({
        message: expect.stringContaining('Method not found'),
      }),
    );
  });
});

describe('onHomePage', () => {
  it('renders the empty state without touching the network', async () => {
    const { onHomePage } = await installSnap();

    const response = await onHomePage();
    const screen = response.getInterface();

    expect(screen).toRender(<HomePanel environment="production" views={[]} />);
  });
});

describe('onCronjob', () => {
  it('refreshOrders succeeds with empty state', async () => {
    const { onCronjob } = await installSnap();

    const response = await onCronjob({ method: 'refreshOrders' });

    expect(response).toRespondWith(null);
  });

  it('throws on unknown jobs', async () => {
    const { onCronjob } = await installSnap();

    const response = await onCronjob({ method: 'nope' });

    expect(response).toRespondWithError(
      expect.objectContaining({
        message: expect.stringContaining('Unknown cronjob method'),
      }),
    );
  });
});
