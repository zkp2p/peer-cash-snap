import type {
  OnCronjobHandler,
  OnHomePageHandler,
  OnInstallHandler,
  OnRpcRequestHandler,
  OnUserInputHandler,
} from '@metamask/snaps-sdk';
import { UserInputEventType } from '@metamask/snaps-sdk';

import { refreshTrackedOrders } from './orders';
import { handleRpcRequest } from './rpc';
import { updateSnapState } from './state';
import { HomePanel, Welcome } from './ui';

/**
 * Handle JSON-RPC requests from connected dapps.
 *
 * All mutating flows return unsigned transaction plans after an in-snap
 * confirmation dialog; the dapp submits them through MetaMask, so the user
 * approves every transaction twice (snap intent + wallet signature).
 *
 * @param args - The request handler args.
 * @param args.origin - The origin invoking the snap.
 * @param args.request - The validated JSON-RPC request.
 * @returns The JSON-safe method result.
 */
export const onRpcRequest: OnRpcRequestHandler = async ({ origin, request }) =>
  handleRpcRequest(origin, request);

/**
 * Render the snap home page: tracked cash-out orders with live states.
 *
 * @returns The home page content.
 */
export const onHomePage: OnHomePageHandler = async () => {
  const { state, views } = await refreshTrackedOrders({ notify: false });
  return {
    content: <HomePanel environment={state.environment} views={views} />,
  };
};

/**
 * Handle interactive events from the home page (refresh, untrack).
 *
 * @param args - The user input args.
 * @param args.id - The interface id to update.
 * @param args.event - The user input event.
 */
export const onUserInput: OnUserInputHandler = async ({ id, event }) => {
  if (event.type !== UserInputEventType.ButtonClickEvent || !event.name) {
    return;
  }

  if (event.name.startsWith('untrack:')) {
    const depositId = event.name.slice('untrack:'.length);
    await updateSnapState((state) => ({
      ...state,
      orders: state.orders.filter((order) => order.depositId !== depositId),
    }));
  } else if (event.name !== 'refresh') {
    return;
  }

  const { state, views } = await refreshTrackedOrders({ notify: false });
  await snap.request({
    method: 'snap_updateInterface',
    params: {
      id,
      ui: <HomePanel environment={state.environment} views={views} />,
    },
  });
};

/**
 * Background refresh of in-flight orders; notifies on state changes.
 *
 * @param args - The cronjob args.
 * @param args.request - The scheduled request from the manifest.
 * @returns Null when the job ran.
 */
export const onCronjob: OnCronjobHandler = async ({ request }) => {
  switch (request.method) {
    case 'refreshOrders':
      await refreshTrackedOrders({ notify: true });
      return null;
    default:
      throw new Error(`Unknown cronjob method: ${request.method}`);
  }
};

/**
 * Show a short welcome after install.
 */
export const onInstall: OnInstallHandler = async () => {
  await snap.request({
    method: 'snap_dialog',
    params: { type: 'alert', content: <Welcome /> },
  });
};
