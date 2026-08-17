import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import {
  CashoutPanel,
  ConnectButton,
  Hero,
  InstallFlaskButton,
  OrdersPanel,
  PrimaryButton,
} from '../components';
import { SmallSelect } from '../components/panelStyles';
import { defaultSnapOrigin } from '../config';
import { useMetaMask, useMetaMaskContext, useRequestSnap } from '../hooks';
import type { CapabilitiesView, SupportedEnvironment } from '../types/cash';
import { isLocalSnap, shouldDisplayReconnectButton } from '../utils';
import { invokeCash, shorten } from '../utils/cash';

// `flex: 1` plus centring keeps a short page filling the viewport instead of
// leaving a dead band above the footer; taller content grows past the centre
// and scrolls normally.
const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  width: 100%;
  padding: 6.4rem 3.2rem;
  ${({ theme }) => theme.mediaQueries.small} {
    padding: 3.2rem 1.6rem;
  }
`;

const AppView = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
`;

const AppHeading = styled.h1`
  font-size: ${({ theme }) => theme.fontSizes.title};
  margin: 0;
  max-width: 64.8rem;
  width: 100%;
`;

const ErrorMessage = styled.div`
  background-color: ${({ theme }) => theme.colors.error?.muted};
  border: 1px solid ${({ theme }) => theme.colors.error?.default};
  color: ${({ theme }) => theme.colors.error?.default};
  border-radius: ${({ theme }) => theme.radii.inner};
  padding: 1.6rem 2rem;
  margin-bottom: 2.4rem;
  width: 100%;
  max-width: 64.8rem;
  word-break: break-word;
`;

const ToolbarRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1.2rem;
  flex-wrap: wrap;
  margin-top: 1.6rem;
  max-width: 64.8rem;
  width: 100%;
  justify-content: space-between;
`;

const EnvironmentField = styled.label`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.8rem;
  font-size: ${({ theme }) => theme.fontSizes.small};
  color: ${({ theme }) => theme.colors.text?.muted};
`;

const AccountBadge = styled.code`
  font-size: ${({ theme }) => theme.fontSizes.small};
`;

// Typed against the snap's wire contract so a renamed environment fails to
// compile here instead of silently desyncing the dropdown.
const ENVIRONMENTS: readonly SupportedEnvironment[] = [
  'production',
  'preproduction',
  'staging',
];

const Index = () => {
  const { error, provider, setError } = useMetaMaskContext();
  const { isFlask, snapsDetected, installedSnap } = useMetaMask();
  const requestSnap = useRequestSnap();

  const [account, setAccount] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<CapabilitiesView | null>(
    null,
  );
  const [refreshKey, setRefreshKey] = useState(0);

  const isMetaMaskReady = isLocalSnap(defaultSnapOrigin)
    ? isFlask
    : snapsDetected;

  const loadCapabilities = useCallback(async () => {
    if (!provider || !installedSnap) {
      return;
    }
    try {
      const result = await invokeCash<{ capabilities: CapabilitiesView }>(
        provider,
        'cash_getCapabilities',
      );
      setCapabilities(result.capabilities);
    } catch (capsError) {
      setError(
        capsError instanceof Error
          ? capsError
          : new Error('Failed to load capabilities'),
      );
    }
  }, [provider, installedSnap, setError]);

  useEffect(() => {
    loadCapabilities().catch(() => undefined);
  }, [loadCapabilities]);

  useEffect(() => {
    if (!provider) {
      return undefined;
    }
    const handler = (...args: unknown[]) => {
      const [accounts] = args as [string[]];
      setAccount(accounts?.[0] ?? null);
    };
    provider.on('accountsChanged', handler);
    return () => {
      provider.removeListener('accountsChanged', handler);
    };
  }, [provider]);

  const connectAccount = async () => {
    if (!provider) {
      return;
    }
    try {
      const accounts = (await provider.request({
        method: 'eth_requestAccounts',
      })) as string[];
      setAccount(accounts?.[0] ?? null);
    } catch (accountError) {
      setError(
        accountError instanceof Error
          ? accountError
          : new Error('Failed to connect an account'),
      );
    }
  };

  const switchEnvironment = async (environment: string) => {
    if (
      !provider ||
      !capabilities ||
      environment === capabilities.environment
    ) {
      return;
    }
    try {
      await invokeCash(provider, 'cash_setEnvironment', { environment });
      await loadCapabilities();
      setRefreshKey((key) => key + 1);
    } catch {
      // User declined the switch in the snap dialog; keep the current value.
      await loadCapabilities();
    }
  };

  const isReady = Boolean(provider && installedSnap && account && capabilities);

  // One primary action per pre-connected state, so the hero never shows two
  // competing calls to action.
  const heroAction = () => {
    if (!isMetaMaskReady) {
      return {
        action: <InstallFlaskButton />,
        note: 'Snaps are pre-release software, available today in MetaMask Flask.',
      };
    }
    if (!installedSnap) {
      return {
        action: <ConnectButton onClick={requestSnap} />,
        note: 'Installs the Peer Cash snap and reviews its permissions in MetaMask.',
      };
    }
    if (shouldDisplayReconnectButton(installedSnap)) {
      return {
        action: (
          <PrimaryButton
            onClick={() => {
              connectAccount().catch(() => undefined);
            }}
          >
            Connect wallet account
          </PrimaryButton>
        ),
        note: 'Connected to a locally served snap. Use Reconnect in the header to reinstall the latest build.',
      };
    }
    return {
      action: (
        <PrimaryButton
          onClick={() => {
            connectAccount().catch(() => undefined);
          }}
        >
          Connect wallet account
        </PrimaryButton>
      ),
      note: 'The snap is installed. Connect an account to start a cash-out.',
    };
  };

  const { action, note } = heroAction();

  return (
    <Container>
      {error && (
        <ErrorMessage>
          <b>An error happened:</b> {error.message}
        </ErrorMessage>
      )}

      {isReady && provider && account && capabilities ? (
        <AppView>
          <AppHeading>Peer Cash</AppHeading>
          <ToolbarRow>
            <AccountBadge title={account}>
              Wallet: {shorten(account)}
            </AccountBadge>
            <EnvironmentField>
              Environment
              <SmallSelect
                value={capabilities.environment}
                onChange={(event) => {
                  switchEnvironment(event.target.value).catch(() => undefined);
                }}
              >
                {ENVIRONMENTS.map((env) => (
                  <option key={env} value={env}>
                    {env}
                  </option>
                ))}
              </SmallSelect>
            </EnvironmentField>
          </ToolbarRow>
          <CashoutPanel
            provider={provider}
            account={account}
            capabilities={capabilities}
            onCompleted={() => setRefreshKey((key) => key + 1)}
          />
          <OrdersPanel
            provider={provider}
            account={account}
            refreshKey={refreshKey}
          />
        </AppView>
      ) : (
        <Hero action={action} actionNote={note} />
      )}
    </Container>
  );
};

export default Index;

const TITLE = 'Peer Cash · cash out USDC from MetaMask';
const DESCRIPTION =
  'Escrow Base USDC in the ZKP2P protocol and get paid on Revolut, Wise, Zelle or Chime at the live oracle rate. No custodian, and the snap never holds your keys.';
const SITE_URL = 'https://peer-cash-snap.vercel.app';

/**
 * Document head for the single page. Gatsby has no default title, so without
 * this the tab and every link preview are blank.
 *
 * @returns The head elements.
 */
export const Head = () => (
  <>
    <title>{TITLE}</title>
    <meta name="description" content={DESCRIPTION} />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Peer Cash" />
    <meta property="og:title" content={TITLE} />
    <meta property="og:description" content={DESCRIPTION} />
    <meta property="og:url" content={SITE_URL} />
    <meta property="og:image" content={`${SITE_URL}/og.png`} />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={TITLE} />
    <meta name="twitter:description" content={DESCRIPTION} />
    <meta name="twitter:image" content={`${SITE_URL}/og.png`} />
  </>
);
