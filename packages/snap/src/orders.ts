import { getCashClient } from './cash';
import { STATE_NOTIFICATIONS } from './constants';
import type { OrderView } from './serialize';
import { serializeOrder, viewFromTracked } from './serialize';
import type { SnapState } from './state';
import { getSnapState, setSnapState } from './state';

/**
 * Refresh every tracked order for the active environment.
 *
 * Terminal orders are served from cached state; in-flight orders are re-read
 * from the protocol. When `notify` is set, a state transition emits one
 * in-app notification per order (deduplicated via `lastNotifiedState`).
 *
 * Live-read failures degrade to the cached view instead of throwing, so the
 * home page and cron job keep working through indexer lag or offline spells.
 *
 * @param options - Refresh options.
 * @param options.notify - Whether to emit in-app notifications on changes.
 * @returns The (possibly updated) state and the order views.
 */
export async function refreshTrackedOrders(options: {
  notify: boolean;
}): Promise<{ state: SnapState; views: OrderView[] }> {
  const state = await getSnapState();
  const tracked = state.orders.filter(
    (order) => order.environment === state.environment,
  );

  const views: OrderView[] = [];
  let mutated = false;

  for (const trackedOrder of tracked) {
    if (!trackedOrder.inFlight) {
      views.push(viewFromTracked(trackedOrder));
      continue;
    }

    try {
      const order = await getCashClient(trackedOrder.environment).order(
        trackedOrder.depositId,
      );
      views.push(serializeOrder(order, trackedOrder));

      if (
        order.state !== trackedOrder.lastState ||
        order.isInFlight !== trackedOrder.inFlight
      ) {
        trackedOrder.lastState = order.state;
        trackedOrder.inFlight = order.isInFlight;
        mutated = true;

        if (options.notify && trackedOrder.lastNotifiedState !== order.state) {
          const message = STATE_NOTIFICATIONS[order.state];
          if (message) {
            try {
              await snap.request({
                method: 'snap_notify',
                params: { type: 'inApp', message },
              });
            } catch {
              // Notification rate limits must never break order tracking.
            }
          }
          trackedOrder.lastNotifiedState = order.state;
        }
      }
    } catch {
      // Live read failed (indexer lag, network) - fall back to cached view.
      views.push(viewFromTracked(trackedOrder));
    }
  }

  if (mutated) {
    await setSnapState(state);
  }

  return { state, views };
}
