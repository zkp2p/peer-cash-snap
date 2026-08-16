import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import {
  CashoutPanel,
  ConnectButton,
  InstallFlaskButton,
  OrdersPanel,
  ReconnectButton,
  Card,
} from '../components';
import { defaultSnapOrigin } from '../config';
import { useMetaMask, useMetaMaskContext, useRequestSnap } from '../hooks';
import type { CapabilitiesView } from '../types/cash';
import { isLocalSnap, shouldDisplayReconnectButton } from '../utils';
import { invokeCash, shorten } from '../utils/cash';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  margin-top: 7.6rem;
  margin-bottom: 7.6rem;
  ${({ theme }) => theme.mediaQueries.small} {
    padding-left: 2.4rem;
    padding-right: 2.4rem;
    margin-top: 2rem;
    margin-bottom: 2rem;
    width: auto;
  }
`;

const Heading = styled.h1`
  margin-top: 0;
  margin-bottom: 2.4rem;
  text-align: center;
`;

const Span = styled.span`
  color: ${(props) => props.theme.colors.primary?.default};
`;

const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.large};
  font-weight: 500;
  margin-top: 0;
  margin-bottom: 0;
  text-align: center;
  max-width: 64.8rem;
  ${({ theme }) => theme.mediaQueries.small} {
    font-size: ${({ theme }) => theme.fontSizes.text};
  }
`;

const CardContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-between;
  max-width: 64.8rem;
  width: 100%;
  height: 100%;
  margin-top: 1.5rem;
`;

const ErrorMessage = styled.div`
  background-color: ${({ theme }) => theme.colors.error?.muted};
  border: 1px solid ${({ theme }) => theme.colors.error?.default};
  color: ${({ theme }) => theme.colors.error?.alternative};
  border-radius: ${({ theme }) => theme.radii.default};
  padding: 2.4rem;
  margin-bottom: 2.4rem;
  margin-top: 2.4rem;
  max-width: 60rem;
  width: 100%;
  word-break: break-word;
  ${({ theme }) => theme.mediaQueries.small} {
    padding: 1.6rem;
    margin-bottom: 1.2rem;
    margin-top: 1.2rem;
    max-width: 100%;
  }
`;

const ToolbarRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1.2rem;
  flex-wrap: wrap;
  margin-top: 2.4rem;
  max-width: 64.8rem;
  width: 100%;
  justify-content: space-between;
`;

const AccountBadge = styled.code`
  font-size: ${({ theme }) => theme.fontSizes.small};
`;

const EnvSelect = styled.select`
  font-size: ${({ theme }) => theme.fontSizes.small};
  padding: 0.6rem;
  border: 1px solid ${({ theme }) => theme.colors.border?.default};
  border-radius: ${({ theme }) => theme.radii.default};
  background: ${({ theme }) => theme.colors.background?.default};
  color: ${({ theme }) => theme.colors.text?.default};
`;

const ENVIRONMENTS = ['production', 'preproduction', 'staging'] as const;

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

  return (
    <Container>
      <Heading>
        <Span>Peer Cash</Span> · cash out USDC from MetaMask
      </Heading>
      <Subtitle>
        Escrow Base USDC in the ZKP2P protocol and get paid on a fiat rail at
        the live oracle rate. The snap reviews every request, returns unsigned
        transactions, and tracks your orders; MetaMask confirms every
        transaction.
      </Subtitle>
      <CardContainer>
        {error && (
          <ErrorMessage>
            <b>An error happened:</b> {error.message}
          </ErrorMessage>
        )}
        {!isMetaMaskReady && (
          <Card
            content={{
              title: 'Install MetaMask Flask',
              description:
                'Snaps is pre-release software only available in MetaMask Flask, a canary distribution for developers with access to upcoming features.',
              button: <InstallFlaskButton />,
            }}
            fullWidth
          />
        )}
        {!installedSnap && (
          <Card
            content={{
              title: 'Install the Peer Cash snap',
              description:
                'Connect MetaMask and install the Peer Cash snap to start cashing out.',
              button: (
                <ConnectButton
                  onClick={requestSnap}
                  disabled={!isMetaMaskReady}
                />
              ),
            }}
            disabled={!isMetaMaskReady}
            fullWidth
          />
        )}
        {shouldDisplayReconnectButton(installedSnap) && (
          <Card
            content={{
              title: 'Reconnect',
              description:
                'While connected to a locally running snap, this button re-installs the latest local build.',
              button: (
                <ReconnectButton
                  onClick={requestSnap}
                  disabled={!installedSnap}
                />
              ),
            }}
            disabled={!installedSnap}
            fullWidth
          />
        )}
      </CardContainer>

      {installedSnap && provider ? (
        <>
          <ToolbarRow>
            <div>
              {account ? (
                <AccountBadge title={account}>
                  Wallet: {shorten(account)}
                </AccountBadge>
              ) : (
                <button
                  onClick={() => {
                    connectAccount().catch(() => undefined);
                  }}
                >
                  Connect wallet account
                </button>
              )}
            </div>
            <div>
              Environment:{' '}
              <EnvSelect
                value={capabilities?.environment ?? 'production'}
                onChange={(event) => {
                  switchEnvironment(event.target.value).catch(() => undefined);
                }}
              >
                {ENVIRONMENTS.map((env) => (
                  <option key={env} value={env}>
                    {env}
                  </option>
                ))}
              </EnvSelect>
            </div>
          </ToolbarRow>

          {account && capabilities ? (
            <>
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
            </>
          ) : null}
        </>
      ) : null}
    </Container>
  );
};

export default Index;
