import type { Json, JsonRpcRequest } from '@metamask/snaps-sdk';
import { SnapError } from '@metamask/snaps-sdk';
import type { JSXElement } from '@metamask/snaps-sdk/jsx';
import type {
  CashReceiveLeg,
  CurrencyType,
  PreparedCashoutReceipt,
} from '@zkp2p/cash';
import {
  estimateToJson,
  formatUsdc,
  isCashError,
  preparedStepToJson,
  preparedTxToJson,
  prepareResultToJson,
  usdc,
} from '@zkp2p/cash';
import type { Log } from 'viem';
import { z } from 'zod';

import { getCashClient } from './cash';
import {
  RESTRICTED_PLATFORMS,
  RESTRICTED_REMEDIATION,
  SUPPORTED_ENVIRONMENTS,
} from './constants';
import { refreshTrackedOrders } from './orders';
import type { OrderView } from './serialize';
import {
  serializeCapabilities,
  serializeOrder,
  viewFromTracked,
} from './serialize';
import type { TrackedOrder } from './state';
import { getSnapState, updateSnapState } from './state';
import {
  CashoutConfirmation,
  EnvironmentConfirmation,
  TopUpConfirmation,
  WithdrawConfirmation,
} from './ui';

const addressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/u, 'Expected a 0x-prefixed EVM address');

const amountSchema = z
  .string()
  .min(1)
  .max(32)
  .describe('Decimal USDC amount, e.g. "100" or "25.50"');

const legSchema = z
  .object({
    platform: z.string().min(1).max(64),
    currency: z.string().min(1).max(16).optional(),
    currencies: z.array(z.string().min(1).max(16)).min(1).max(16).optional(),
    payee: z.string().min(1).max(256),
  })
  .refine(
    (leg) => (leg.currency === undefined) !== (leg.currencies === undefined),
    { message: 'Provide exactly one of `currency` or `currencies` per leg' },
  );

const prepareCashoutSchema = z.object({
  amountUsdc: amountSchema,
  owner: addressSchema,
  legs: z.array(legSchema).min(1).max(8),
});

const logSchema = z.looseObject({
  address: z.string(),
  topics: z.array(z.string()),
  data: z.string(),
});

const finalizeCashoutSchema = z.object({
  owner: addressSchema,
  amountUsdc: amountSchema,
  legs: z
    .array(
      z.object({
        platform: z.string().min(1).max(64),
        currencies: z.array(z.string().min(1).max(16)).min(1).max(16),
      }),
    )
    .min(1)
    .max(8),
  receipt: z.object({
    transactionHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/u),
    status: z.enum(['success', 'reverted']),
    logs: z.array(logSchema),
  }),
});

const estimateSchema = z.object({
  amountUsdc: amountSchema,
  platform: z.string().min(1).max(64),
  currency: z.string().min(1).max(16),
});

const depositIdSchema = z.object({ depositId: z.string().min(1).max(256) });

const getOrdersSchema = z.object({
  owner: addressSchema,
  inFlight: z.boolean().optional(),
});

const prepareWithdrawSchema = z.object({
  depositId: z.string().min(1).max(256),
  amountUsdc: amountSchema.optional(),
});

const prepareTopUpSchema = z.object({
  depositId: z.string().min(1).max(256),
  amountUsdc: amountSchema,
});

const setEnvironmentSchema = z.object({
  environment: z.enum(SUPPORTED_ENVIRONMENTS),
});

/**
 * Parse RPC params with a zod schema, converting failures into clean
 * JSON-RPC errors.
 *
 * @param schema - The zod schema to apply.
 * @param params - Raw request params.
 * @returns The parsed params.
 */
function parseParams<Schema extends z.ZodType>(
  schema: Schema,
  params: unknown,
): z.infer<Schema> {
  const result = schema.safeParse(params ?? {});
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path.join('.') ?? '';
    throw new SnapError(
      `Invalid params${path ? ` at \`${path}\`` : ''}: ${
        issue?.message ?? 'validation failed'
      }`,
    );
  }
  return result.data;
}

/**
 * Convert a decimal USDC string into base units with a clean error.
 *
 * @param amountUsdc - Decimal USDC amount, e.g. `"100"`.
 * @returns The amount in USDC base units.
 */
function parseUsdcAmount(amountUsdc: string): bigint {
  try {
    return usdc(amountUsdc);
  } catch (error) {
    throw new SnapError(
      error instanceof Error ? error.message : 'Invalid USDC amount',
    );
  }
}

/**
 * Convert SDK/unknown errors into `SnapError`s the dapp can render, keeping
 * Peer Cash's typed error shape (code, retryable, remediation, recovery).
 *
 * @param error - The caught error.
 * @returns The `SnapError` to throw.
 */
function toSnapError(error: unknown): SnapError {
  if (error instanceof SnapError) {
    return error;
  }
  if (isCashError(error)) {
    return new SnapError(
      `${error.message}${error.remediation ? ` ${error.remediation}` : ''}`,
      error.toJSON() as unknown as Json,
    );
  }
  return new SnapError(
    error instanceof Error ? error.message : 'Unexpected snap error',
  );
}

/** Normalized payout leg: platform + one-or-more currencies + payee. */
type NormalizedLeg = {
  platform: string;
  currencies: string[];
  payee: string;
};

/**
 * Normalize wire legs (`currency` xor `currencies`) into a canonical shape.
 *
 * @param legs - Parsed wire legs.
 * @returns Normalized legs.
 */
function normalizeLegs(
  legs: z.infer<typeof prepareCashoutSchema>['legs'],
): NormalizedLeg[] {
  return legs.map((leg) => ({
    platform: leg.platform.toLowerCase(),
    currencies: leg.currencies ?? [leg.currency as string],
    payee: leg.payee,
  }));
}

/**
 * Build the SDK `receive` value from normalized legs.
 *
 * @param legs - Normalized legs.
 * @returns The SDK receive legs.
 */
function toReceiveLegs(
  legs: NormalizedLeg[],
): [CashReceiveLeg, ...CashReceiveLeg[]] {
  const receive = legs.map((leg): CashReceiveLeg => {
    const [firstCurrency, ...restCurrencies] = leg.currencies;
    if (!firstCurrency) {
      throw new SnapError('Each leg needs at least one currency');
    }
    if (restCurrencies.length === 0) {
      return {
        platform: leg.platform,
        currency: firstCurrency as CurrencyType,
        payee: leg.payee,
      };
    }
    return {
      platform: leg.platform,
      currencies: [
        firstCurrency as CurrencyType,
        ...(restCurrencies as CurrencyType[]),
      ],
      payee: leg.payee,
    };
  });
  return receive as [CashReceiveLeg, ...CashReceiveLeg[]];
}

/**
 * Reject payout legs on rails that need a first-party atomic access policy.
 *
 * @param legs - Normalized legs.
 */
function assertNoRestrictedLegs(legs: NormalizedLeg[]): void {
  const restricted = legs.filter((leg) =>
    RESTRICTED_PLATFORMS.has(leg.platform),
  );
  if (restricted.length > 0) {
    throw new SnapError(
      `Cash-outs via ${restricted
        .map((leg) => leg.platform)
        .join(', ')} are not supported in this snap. ${RESTRICTED_REMEDIATION}`,
    );
  }
}

/**
 * Show a confirmation dialog and throw if the user rejects it.
 *
 * @param content - The dialog content.
 */
async function confirmOrThrow(content: JSXElement): Promise<void> {
  const approved = await snap.request({
    method: 'snap_dialog',
    params: { type: 'confirmation', content },
  });
  if (approved !== true) {
    throw new SnapError('User rejected the request');
  }
}

/**
 * Persist (or replace) a tracked order in snap state.
 *
 * @param tracked - The tracked order to upsert.
 */
async function trackOrder(tracked: TrackedOrder): Promise<void> {
  await updateSnapState((state) => ({
    ...state,
    orders: [
      ...state.orders.filter((order) => order.depositId !== tracked.depositId),
      tracked,
    ],
  }));
}

/**
 * Handle a JSON-RPC request from a connected dapp.
 *
 * @param origin - Origin of the requesting site.
 * @param request - The JSON-RPC request.
 * @returns The JSON-safe result.
 */
export async function handleRpcRequest(
  origin: string,
  request: JsonRpcRequest,
): Promise<Json> {
  try {
    switch (request.method) {
      case 'cash_getCapabilities': {
        const state = await getSnapState();
        const capabilities = getCashClient(state.environment).capabilities();
        return {
          capabilities: serializeCapabilities(
            capabilities,
            state.environment,
          ) as unknown as Json,
        };
      }

      case 'cash_getEnvironment': {
        const state = await getSnapState();
        return { environment: state.environment };
      }

      case 'cash_setEnvironment': {
        const { environment } = parseParams(
          setEnvironmentSchema,
          request.params,
        );
        const state = await getSnapState();
        if (state.environment === environment) {
          return { environment };
        }
        await confirmOrThrow(
          <EnvironmentConfirmation
            origin={origin}
            from={state.environment}
            to={environment}
          />,
        );
        await updateSnapState((current) => ({ ...current, environment }));
        return { environment };
      }

      case 'cash_estimate': {
        const params = parseParams(estimateSchema, request.params);
        const state = await getSnapState();
        const estimate = await getCashClient(state.environment).estimate({
          amount: parseUsdcAmount(params.amountUsdc),
          platform: params.platform.toLowerCase(),
          currency: params.currency as CurrencyType,
        });
        return { estimate: estimateToJson(estimate) as unknown as Json };
      }

      case 'cash_prepareCashout': {
        const params = parseParams(prepareCashoutSchema, request.params);
        const amount = parseUsdcAmount(params.amountUsdc);
        const legs = normalizeLegs(params.legs);
        assertNoRestrictedLegs(legs);

        const state = await getSnapState();
        const client = getCashClient(state.environment);

        // Best-effort estimate for the confirmation dialog only.
        let estimateText: string | null = null;
        const firstLeg = legs[0];
        const firstCurrency = firstLeg?.currencies[0];
        if (firstLeg && firstCurrency) {
          try {
            const estimate = await client.estimate({
              amount,
              platform: firstLeg.platform,
              currency: firstCurrency as CurrencyType,
            });
            estimateText = `≈ ${estimate.receiveAmount.toFixed(2)} ${
              estimate.currency
            }${estimate.stale ? ' (stale oracle rate)' : ''}`;
          } catch {
            estimateText = null;
          }
        }

        await confirmOrThrow(
          <CashoutConfirmation
            origin={origin}
            amountUsdc={formatUsdc(amount)}
            legs={legs}
            estimateText={estimateText}
            environment={state.environment}
          />,
        );

        const plan = await client.prepare({
          amount,
          receive: toReceiveLegs(legs),
        });

        if (plan.accessPolicyRequired) {
          throw new SnapError(RESTRICTED_REMEDIATION);
        }

        return {
          plan: prepareResultToJson(plan) as unknown as Json,
          meta: {
            owner: params.owner,
            amountUsdc: params.amountUsdc,
            legs: legs.map((leg) => ({
              platform: leg.platform,
              currencies: leg.currencies,
            })) as unknown as Json,
            environment: state.environment,
          },
        };
      }

      case 'cash_finalizeCashout': {
        const params = parseParams(finalizeCashoutSchema, request.params);
        const state = await getSnapState();
        const client = getCashClient(state.environment);

        const receipt: PreparedCashoutReceipt = {
          transactionHash: params.receipt
            .transactionHash as PreparedCashoutReceipt['transactionHash'],
          status: params.receipt.status,
          logs: params.receipt.logs as unknown as Log[],
        };

        const result = client.finalizePreparedCashout(receipt);

        const tracked: TrackedOrder = {
          depositId: result.depositId,
          environment: state.environment,
          owner: params.owner,
          txHash: result.txHash,
          amount: parseUsdcAmount(params.amountUsdc).toString(),
          legs: params.legs,
          createdAt: Date.now(),
          lastState: result.order.state,
          inFlight: result.order.isInFlight,
        };
        await trackOrder(tracked);

        return {
          result: {
            depositId: result.depositId,
            txHash: result.txHash,
            escrowAddress: result.escrowAddress,
            onchainDepositId: result.onchainDepositId.toString(),
            order: serializeOrder(result.order, tracked) as unknown as Json,
          },
        };
      }

      case 'cash_getOrder': {
        const { depositId } = parseParams(depositIdSchema, request.params);
        const state = await getSnapState();
        const tracked = state.orders.find(
          (order) => order.depositId === depositId,
        );
        const order = await getCashClient(state.environment).order(depositId);
        return { order: serializeOrder(order, tracked) as unknown as Json };
      }

      case 'cash_getOrders': {
        const params = parseParams(getOrdersSchema, request.params);
        const state = await getSnapState();
        const trackedById = new Map(
          state.orders
            .filter((order) => order.environment === state.environment)
            .map((order) => [order.depositId, order]),
        );

        let views: OrderView[] = [];
        const listed = new Set<string>();
        try {
          const orders = await getCashClient(state.environment).orders(
            params.owner,
            params.inFlight === undefined ? {} : { inFlight: params.inFlight },
          );
          views = orders.map((order) => {
            listed.add(order.depositId);
            return serializeOrder(order, trackedById.get(order.depositId));
          });
        } catch (error) {
          if (!isCashError(error)) {
            throw error;
          }
          // Indexer unavailable - fall back to tracked views below.
        }

        // Orders the indexer has not caught up on yet (or is down for),
        // that this snap created for the same owner.
        const ownerLower = params.owner.toLowerCase();
        for (const tracked of trackedById.values()) {
          if (
            !listed.has(tracked.depositId) &&
            tracked.owner.toLowerCase() === ownerLower &&
            (params.inFlight === undefined ||
              tracked.inFlight === params.inFlight)
          ) {
            views.push(viewFromTracked(tracked));
          }
        }

        views.sort(
          (first, second) =>
            (second.createdAt ?? second.updatedAt ?? 0) -
            (first.createdAt ?? first.updatedAt ?? 0),
        );
        return { orders: views as unknown as Json };
      }

      case 'cash_prepareWithdraw': {
        const params = parseParams(prepareWithdrawSchema, request.params);
        const state = await getSnapState();
        const client = getCashClient(state.environment);

        let stateLine = 'Live order state unavailable.';
        try {
          const order = await client.order(params.depositId);
          stateLine = order.explain();
        } catch {
          // The withdraw preflight below will surface a real error if any.
        }

        const amount =
          params.amountUsdc === undefined
            ? undefined
            : parseUsdcAmount(params.amountUsdc);

        await confirmOrThrow(
          <WithdrawConfirmation
            origin={origin}
            depositId={params.depositId}
            amountUsdc={amount === undefined ? null : formatUsdc(amount)}
            stateLine={stateLine}
            environment={state.environment}
          />,
        );

        const plan = await client.prepareWithdraw(
          params.depositId,
          amount === undefined ? {} : { amount },
        );
        return {
          plan: {
            txs: plan.txs.map(preparedTxToJson) as unknown as Json,
            steps: plan.steps.map(preparedStepToJson) as unknown as Json,
          },
        };
      }

      case 'cash_prepareTopUp': {
        const params = parseParams(prepareTopUpSchema, request.params);
        const amount = parseUsdcAmount(params.amountUsdc);
        const state = await getSnapState();
        const client = getCashClient(state.environment);

        let stateLine = 'Live order state unavailable.';
        try {
          const order = await client.order(params.depositId);
          stateLine = order.explain();
        } catch {
          // The top-up preflight below will surface a real error if any.
        }

        await confirmOrThrow(
          <TopUpConfirmation
            origin={origin}
            depositId={params.depositId}
            amountUsdc={formatUsdc(amount)}
            stateLine={stateLine}
            environment={state.environment}
          />,
        );

        const plan = await client.prepareTopUp(params.depositId, amount);
        return {
          plan: {
            txs: plan.txs.map(preparedTxToJson) as unknown as Json,
            steps: plan.steps.map(preparedStepToJson) as unknown as Json,
          },
        };
      }

      case 'cash_untrackOrder': {
        const { depositId } = parseParams(depositIdSchema, request.params);
        await updateSnapState((state) => ({
          ...state,
          orders: state.orders.filter((order) => order.depositId !== depositId),
        }));
        return { removed: true };
      }

      case 'cash_refreshOrders': {
        const { views } = await refreshTrackedOrders({ notify: false });
        return { orders: views as unknown as Json };
      }

      default:
        throw new SnapError(`Method not found: ${request.method}`);
    }
  } catch (error) {
    throw toSnapError(error);
  }
}
