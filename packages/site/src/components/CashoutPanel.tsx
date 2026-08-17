import type { MetaMaskInpageProvider } from '@metamask/providers';
import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';

import { ErrorText, Input, Panel, Select, Status } from './panelStyles';
import { useFlow } from '../hooks';
import type {
  CapabilitiesView,
  EstimateView,
  FinalizeCashoutResult,
  PrepareCashoutResult,
} from '../types/cash';
import { invokeCash, formatEta } from '../utils/cash';
import {
  ensureBaseChain,
  executePlan,
  toFinalizeReceipt,
} from '../utils/chain';

const Title = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.large};
  margin: 0 0 1.6rem 0;
`;

const FieldRow = styled.div`
  display: flex;
  flex-direction: row;
  gap: 1.2rem;
  flex-wrap: wrap;
  margin-bottom: 1.2rem;
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  font-size: ${({ theme }) => theme.fontSizes.small};
  color: ${({ theme }) => theme.colors.text?.muted};
  gap: 0.6rem;
  flex: 1;
  min-width: 16rem;
`;

const EstimateLine = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.text};
  margin: 0.4rem 0 2rem 0;
`;

const Hint = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.small};
  color: ${({ theme }) => theme.colors.text?.muted};
`;

const ActionButton = styled.button`
  align-self: flex-start;
`;

const SuccessText = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.small};
  color: ${({ theme }) => theme.colors.success?.default};
  margin: 1.2rem 0 0 0;
  word-break: break-all;
`;

type CashoutPanelProps = {
  provider: MetaMaskInpageProvider;
  account: string;
  capabilities: CapabilitiesView;
  onCompleted: (depositId: string) => void;
};

/**
 * The cash-out form: platform, currency, payee, amount, estimate, and the
 * prepare → submit → finalize flow driven through the snap.
 *
 * @param props - Component props.
 * @param props.provider - The MetaMask provider.
 * @param props.account - The connected account address.
 * @param props.capabilities - Capabilities read from the snap.
 * @param props.onCompleted - Called with the depositId after finalize.
 * @returns The panel.
 */
export const CashoutPanel = ({
  provider,
  account,
  capabilities,
  onCompleted,
}: CashoutPanelProps) => {
  const platforms = useMemo(
    () => capabilities.platforms.filter((platform) => !platform.restricted),
    [capabilities],
  );

  const [platform, setPlatform] = useState(platforms[0]?.platform ?? '');
  const selected = platforms.find((entry) => entry.platform === platform);
  const [currency, setCurrency] = useState(selected?.currencies[0] ?? 'USD');
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('10');
  const [estimate, setEstimate] = useState<EstimateView | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const { busy, status, error, run } = useFlow();

  const selectPlatform = (nextPlatform: string) => {
    setPlatform(nextPlatform);
    const entry = platforms.find((item) => item.platform === nextPlatform);
    if (entry && !entry.currencies.includes(currency)) {
      setCurrency(entry.currencies[0] ?? 'USD');
    }
  };

  useEffect(() => {
    setEstimate(null);
    if (!platform || !currency || !amount || Number.isNaN(Number(amount))) {
      return undefined;
    }
    const handle = setTimeout(() => {
      invokeCash<{ estimate: EstimateView }>(provider, 'cash_estimate', {
        amountUsdc: amount,
        platform,
        currency,
      })
        .then((result) => setEstimate(result.estimate))
        .catch(() => setEstimate(null));
    }, 500);
    return () => clearTimeout(handle);
  }, [provider, platform, currency, amount]);

  const startCashout = async () => {
    setDone(null);
    const finalized = await run('The cash-out flow failed.', async (report) => {
      report('Switching MetaMask to Base…');
      await ensureBaseChain(provider);

      report('Review the cash-out in the Peer Cash snap…');
      const prepared = await invokeCash<PrepareCashoutResult>(
        provider,
        'cash_prepareCashout',
        {
          amountUsdc: amount,
          owner: account,
          legs: [{ platform, currency, payee }],
        },
      );

      const executed = await executePlan(
        provider,
        account,
        prepared.plan.txs,
        prepared.plan.steps,
        report,
      );

      const createDeposit = executed.find(
        (entry) => entry.step.kind === 'createDeposit',
      );
      if (!createDeposit) {
        throw new Error(
          'createDeposit receipt missing - do not retry blindly; check your wallet activity.',
        );
      }

      report('Finalizing with the snap…');
      return invokeCash<FinalizeCashoutResult>(
        provider,
        'cash_finalizeCashout',
        {
          owner: account,
          amountUsdc: amount,
          legs: prepared.meta.legs,
          receipt: toFinalizeReceipt(createDeposit.receipt),
        },
      );
    });

    if (finalized) {
      setDone(finalized.result.depositId);
      onCompleted(finalized.result.depositId);
    }
  };

  if (platforms.length === 0) {
    return (
      <Panel>
        <Title>Start a cash-out</Title>
        <Hint>No payout platforms available in this environment.</Hint>
      </Panel>
    );
  }

  return (
    <Panel>
      <Title>Start a cash-out</Title>
      <FieldRow>
        <Field>
          Amount (USDC)
          <Input
            value={amount}
            inputMode="decimal"
            onChange={(event) => setAmount(event.target.value.trim())}
            placeholder="10"
          />
        </Field>
        <Field>
          Get paid via
          <Select
            value={platform}
            onChange={(event) => selectPlatform(event.target.value)}
          >
            {platforms.map((entry) => (
              <option key={entry.platform} value={entry.platform}>
                {entry.platform}
                {entry.requiresIdentityAttestation
                  ? ' (existing Peer handle only)'
                  : ''}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          Currency
          <Select
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
          >
            {(selected?.currencies ?? []).map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </Select>
        </Field>
      </FieldRow>
      <FieldRow>
        <Field>
          Payee handle
          <Input
            value={payee}
            onChange={(event) => setPayee(event.target.value)}
            placeholder={selected?.payeeHint ?? 'Your payment handle'}
          />
          <Hint>{selected?.payeeHint}</Hint>
        </Field>
      </FieldRow>
      <EstimateLine>
        {estimate
          ? `≈ ${estimate.receiveAmount.toFixed(2)} ${estimate.currency} at the live oracle rate${
              estimate.stale ? ' (stale reading)' : ''
            }${
              estimate.eta?.medianFillSeconds
                ? ` · recent fills ${formatEta(estimate.eta.medianFillSeconds)}`
                : ''
            }`
          : 'Estimate unavailable - the binding rate is set when a buyer fills.'}{' '}
        <Hint>Estimates are approximate, never a locked quote.</Hint>
      </EstimateLine>
      <ActionButton
        disabled={busy || !payee || !amount}
        onClick={() => {
          startCashout().catch(() => undefined);
        }}
      >
        {busy ? 'Working…' : 'Cash out'}
      </ActionButton>
      {status ? <Status>{status}</Status> : null}
      {error ? <ErrorText>{error}</ErrorText> : null}
      {done ? (
        <SuccessText>
          Cash-out live. Order id: <code>{done}</code> - keep it; it is the
          durable resume key. Track it below or on the snap home page.
        </SuccessText>
      ) : null}
    </Panel>
  );
};
