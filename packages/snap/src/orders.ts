import { getCashClient } from './cash';
import { STATE_NOTIFICATIONS } from './constants';
import type { OrderView } from './serialize';
import { serializeOrder, viewFromTracked } from './serialize';
import type { SnapState, TrackedOrder } from './state';
import { getSnapState, updateSnapState } from './state';

type TrackedPatch = Partial<
  Pick<TrackedOrder, 'lastState' | 'inFlight' | 'amount' | 'lastNotifiedState'>
>;

/**
 * Send the in-app notification for an order state, when copy exists for it.
 * Notification failures (rate limits) must never break order tracking.
 *
 * @param state - The newly observed order state.
 */
async function notifyState(state: string): Promise<void> {
  const message = STATE_NOTIFICATIONS[state];
  if (!message) {
    return;
  }
  try {
    await snap.request({
      method: 'snap_notify',
      params: { type: 'inApp', message },
    });
  } catch {
    // Ignore notification failures.
  }
}

/**
 * Refresh every tracked order for the active environment.
 *
 * Terminal orders are served from cached state; in-flight orders are re-read
 * from the protocol. When `notify` is set, a state transition emits one
 * in-app notification per order — including transitions first observed by a
 * `notify: false` refresh (home page opens), which advance `lastState`
 * without advancing `lastNotifiedState` so the next cron still delivers the
 * owed notification.
 *
 * Live-read failures degrade to the cached view instead of throwing, so the
 * home page and cron job keep working through indexer lag or offline spells.
 *
 * State is persisted as per-order patches applied to a freshly-read state,
 * so orders tracked or untracked concurrently (snap handlers interleave at
 * await points) are not clobbered by this refresh's earlier snapshot.
 *
 * @param options - Refresh options.
 * @param options.notify - Whether to emit in-app notifications on changes.
 * @returns The state snapshot and the order views.
 */
export async function refreshTrackedOrders(options: {
  notify: boolean;
}): Promise<{ state: SnapState; views: OrderView[] }> {
  const state = await getSnapState();
  const tracked = state.orders.filter(
    (order) => order.environment === state.environment,
  );

  const views: OrderView[] = [];
  const patches = new Map<string, TrackedPatch>();

  const addPatch = (depositId: string, patch: TrackedPatch): void => {
    patches.set(depositId, { ...(patches.get(depositId) ?? {}), ...patch });
  };

  for (const trackedOrder of tracked) {
    // Deliver a notification owed from an earlier notify:false observation.
    if (
      options.notify &&
      trackedOrder.lastNotifiedState !== trackedOrder.lastState
    ) {
      await notifyState(trackedOrder.lastState);
      addPatch(trackedOrder.depositId, {
        lastNotifiedState: trackedOrder.lastState,
      });
      trackedOrder.lastNotifiedState = trackedOrder.lastState;
    }

    if (!trackedOrder.inFlight) {
      views.push(viewFromTracked(trackedOrder));
      continue;
    }

    try {
      const order = await getCashClient(trackedOrder.environment).order(
        trackedOrder.depositId,
      );
      views.push(serializeOrder(order, trackedOrder));

      const patch: TrackedPatch = {};
      if (order.state !== trackedOrder.lastState) {
        patch.lastState = order.state;
      }
      if (order.isInFlight !== trackedOrder.inFlight) {
        patch.inFlight = order.isInFlight;
      }
      const liveAmount = order.totalAmount.toString();
      if (liveAmount !== trackedOrder.amount) {
        // Keeps cached views honest after on-chain top-ups.
        patch.amount = liveAmount;
      }
      if (
        patch.lastState !== undefined &&
        options.notify &&
        trackedOrder.lastNotifiedState !== order.state
      ) {
        await notifyState(order.state);
        patch.lastNotifiedState = order.state;
      }

      if (Object.keys(patch).length > 0) {
        addPatch(trackedOrder.depositId, patch);
        Object.assign(trackedOrder, patch);
      }
    } catch {
      // Live read failed (indexer lag, network) - fall back to cached view.
      views.push(viewFromTracked(trackedOrder));
    }
  }

  if (patches.size > 0) {
    await updateSnapState((current) => ({
      ...current,
      orders: current.orders.map((order) => {
        const patch = patches.get(order.depositId);
        return patch ? { ...order, ...patch } : order;
      }),
    }));
  }

  return { state, views };
}
