import type { MetaMaskInpageProvider } from '@metamask/providers';
import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import { ErrorText, Panel, SmallInput, Status } from './panelStyles';
import { useFlow } from '../hooks';
import type { OrderView, WirePlan } from '../types/cash';
import { errorMessage, invokeCash, shorten } from '../utils/cash';
import { ensureBaseChain, executePlan } from '../utils/chain';

const TitleRow = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 1.2rem;
  margin-bottom: 1.6rem;
`;

const Title = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.large};
  margin: 0;
`;

const OrderCard = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border?.default};
  border-radius: ${({ theme }) => theme.radii.inner};
  padding: 1.6rem;
  margin-bottom: 1.2rem;

  &:last-of-type {
    margin-bottom: 0;
  }
`;

const OrderHead = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: baseline;
  gap: 1.2rem;
  flex-wrap: wrap;
`;

const OrderId = styled.code`
  font-size: ${({ theme }) => theme.fontSizes.small};
`;

const StateChip = styled.span<{ inFlight: boolean }>`
  font-size: ${({ theme }) => theme.fontSizes.small};
  border-radius: ${({ theme }) => theme.radii.pill};
  padding: 0.4rem 1.2rem;
  white-space: nowrap;
  border: 1px solid ${({ theme }) => theme.colors.border?.default};
  color: ${({ inFlight, theme }) =>
    inFlight ? theme.colors.text?.default : theme.colors.text?.muted};
  background: ${({ inFlight, theme }) =>
    inFlight
      ? (theme.colors.background?.alternative ?? 'transparent')
      : 'transparent'};
`;

const Explain = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.text};
  margin: 1.2rem 0 0.4rem 0;
`;

const Amounts = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.small};
  color: ${({ theme }) => theme.colors.text?.muted};
  margin: 0 0 1.6rem 0;
`;

const ButtonRow = styled.div`
  display: flex;
  flex-direction: row;
  gap: 1.2rem;
  flex-wrap: wrap;
  align-items: center;
`;

const TopUpInput = styled(SmallInput)`
  width: 10rem;
`;

const Empty = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.text};
  color: ${({ theme }) => theme.colors.text?.muted};
  margin: 0;
`;

type OrdersPanelProps = {
  provider: MetaMaskInpageProvider;
  account: string;
  refreshKey: number;
};

/**
 * Lists the connected wallet's cash-out orders and drives withdraw / top-up
 * plans through the snap.
 *
 * @param props - Component props.
 * @param props.provider - The MetaMask provider.
 * @param props.account - The connected account address.
 * @param props.refreshKey - Bump to force a reload.
 * @returns The panel.
 */
export const OrdersPanel = ({
  provider,
  account,
  refreshKey,
}: OrdersPanelProps) => {
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [loading, setLoading] = useState(false);
  const [topUpAmounts, setTopUpAmounts] = useState<Record<string, string>>({});
  const { busy, status, error, setError, run } = useFlow();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invokeCash<{ orders: OrderView[] }>(
        provider,
        'cash_getOrders',
        { owner: account },
      );
      setOrders(result.orders);
    } catch (loadError) {
      setError(errorMessage(loadError, 'Failed to load orders'));
    } finally {
      setLoading(false);
    }
  }, [provider, account, setError]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load, refreshKey]);

  const runPlan = async (
    label: string,
    prepare: () => Promise<{ plan: WirePlan }>,
  ) =>
    run(`The ${label} failed.`, async (report) => {
      report(`Switching MetaMask to Base…`);
      await ensureBaseChain(provider);
      report(`Review the ${label} in the Peer Cash snap…`);
      const { plan } = await prepare();
      await executePlan(provider, account, plan.txs, plan.steps, report);
      await load();
    });

  const withdraw = async (depositId: string) =>
    runPlan('withdrawal', async () =>
      invokeCash<{ plan: WirePlan }>(provider, 'cash_prepareWithdraw', {
        depositId,
      }),
    );

  const topUp = async (depositId: string) => {
    const amountUsdc = topUpAmounts[depositId];
    if (!amountUsdc) {
      return;
    }
    await runPlan('top-up', async () =>
      invokeCash<{ plan: WirePlan }>(provider, 'cash_prepareTopUp', {
        depositId,
        amountUsdc,
      }),
    );
  };

  const untrack = async (depositId: string) =>
    run('Failed to remove the order.', async () => {
      await invokeCash(provider, 'cash_untrackOrder', { depositId });
      await load();
    });

  return (
    <Panel>
      <TitleRow>
        <Title>Your cash-outs</Title>
        <button
          disabled={loading}
          onClick={() => {
            load().catch(() => undefined);
          }}
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </TitleRow>
      {orders.length === 0 ? (
        <Empty>
          No cash-out orders for {shorten(account)} yet. Start one above.
        </Empty>
      ) : (
        orders.map((order) => (
          <OrderCard key={order.depositId}>
            <OrderHead>
              <OrderId title={order.depositId}>
                {shorten(order.depositId)}
              </OrderId>
              <StateChip inFlight={order.isInFlight}>
                {order.state}
                {order.stale ? ' (cached)' : ''}
              </StateChip>
            </OrderHead>
            <Explain>{order.explain}</Explain>
            <Amounts>
              {order.totalUsdc} USDC total · {order.filledUsdc} delivered ·{' '}
              {order.pendingUsdc} locked · {order.returnedUsdc} returned
              {order.payouts?.length
                ? ` · via ${order.payouts
                    .map(
                      (payout) =>
                        `${payout.platform} (${payout.currencies.join(', ')})`,
                    )
                    .join(', ')}`
                : ''}
            </Amounts>
            <ButtonRow>
              {order.nextActions.includes('withdraw') ? (
                <button
                  disabled={busy}
                  onClick={() => {
                    withdraw(order.depositId).catch(() => undefined);
                  }}
                >
                  Withdraw
                </button>
              ) : null}
              {order.isInFlight ? (
                <>
                  <TopUpInput
                    inputMode="decimal"
                    placeholder="USDC"
                    value={topUpAmounts[order.depositId] ?? ''}
                    onChange={(event) =>
                      setTopUpAmounts((current) => ({
                        ...current,
                        [order.depositId]: event.target.value.trim(),
                      }))
                    }
                  />
                  <button
                    disabled={busy || !topUpAmounts[order.depositId]}
                    onClick={() => {
                      topUp(order.depositId).catch(() => undefined);
                    }}
                  >
                    Top up
                  </button>
                </>
              ) : null}
              {order.tracked && !order.isInFlight ? (
                <button
                  disabled={busy}
                  onClick={() => {
                    untrack(order.depositId).catch(() => undefined);
                  }}
                >
                  Remove from snap
                </button>
              ) : null}
            </ButtonRow>
          </OrderCard>
        ))
      )}
      {status ? <Status>{status}</Status> : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
    </Panel>
  );
};
