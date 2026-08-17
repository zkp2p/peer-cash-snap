# @zkp2p/peer-cash-snap

A [MetaMask Snap](https://metamask.io/snaps/) that turns MetaMask into a Peer
Cash off-ramp: escrow Base USDC in the ZKP2P protocol and get paid on a fiat
rail (Chime, Revolut, Wise, Zelle, …) at the live Chainlink oracle rate, with
no custodian in between.

Built on [`@zkp2p/cash`](https://www.npmjs.com/package/@zkp2p/cash), hosted
entirely inside the snap. A companion dapp drives the flow and submits
transactions; the snap owns the SDK, approvals, order state, and
notifications.

## Install

Requires [MetaMask Flask](https://metamask.io/flask/) until the snap is
allowlisted in the MetaMask Snaps Directory.

```ts
await window.ethereum.request({
  method: 'wallet_requestSnaps',
  params: { 'npm:@zkp2p/peer-cash-snap': {} },
});
```

Companion dapp: https://peer-cash-snap.vercel.app

## Custody model

Snaps cannot sign or submit transactions (`eth_sendTransaction` is
unavailable to them), and `@zkp2p/cash` was designed for exactly this custody
split: every mutation has an unsigned-plan path.

1. The dapp calls a `cash_prepare*` method.
2. The snap shows a confirmation dialog (amount, platform, payee, estimate)
   and returns an unsigned transaction plan.
3. The dapp submits the plan through MetaMask, which asks the user to confirm
   every transaction.

The snap never holds keys and never sees a signature. The user approves twice:
once for intent, once per transaction.

## RPC API

All methods are invoked with `wallet_invokeSnap` from a connected site.
Amounts are decimal USDC strings (`"25.50"`).

| Method                 | Params                                 | Result                                           |
| ---------------------- | -------------------------------------- | ------------------------------------------------ |
| `cash_getCapabilities` | –                                      | Platforms × currencies, payee hints, bounds      |
| `cash_getEnvironment`  | –                                      | `{ environment }`                                |
| `cash_setEnvironment`  | `{ environment }`                      | Switches after a confirmation dialog             |
| `cash_estimate`        | `{ amountUsdc, platform, currency }`   | Oracle estimate (never a locked quote)           |
| `cash_prepareCashout`  | `{ amountUsdc, owner, legs }`          | Dialog → unsigned `approve`+`createDeposit` plan |
| `cash_finalizeCashout` | `{ receipt, owner, amountUsdc, legs }` | Decodes `depositId`, tracks the order            |
| `cash_getOrder`        | `{ depositId }`                        | One live order view                              |
| `cash_getOrders`       | `{ owner, inFlight? }`                 | Wallet's orders (indexer + tracked merge)        |
| `cash_prepareWithdraw` | `{ depositId, amountUsdc? }`           | Dialog → unsigned withdraw/prune plan            |
| `cash_prepareTopUp`    | `{ depositId, amountUsdc }`            | Dialog → unsigned `approve`+`addFunds` plan      |
| `cash_refreshOrders`   | –                                      | Refreshes tracked orders                         |
| `cash_untrackOrder`    | `{ depositId }`                        | Stops tracking (protocol state unaffected)       |

Errors keep Peer Cash's typed shape: `code`, `retryable`, `remediation`, and
`recovery` are forwarded in the JSON-RPC error `data`.

### Payout rails

Venmo, Cash App, and PayPal are refused with a clear remediation: they require
an atomic access policy only first-party Peer hosts can configure. The snap
pre-flights this locally and re-checks the SDK's `accessPolicyRequired` flag
after `prepare()` as the authoritative backstop.

## Permissions

| Permission                  | Why                                                     |
| --------------------------- | ------------------------------------------------------- |
| `endowment:rpc` (dapps)     | The dapp-facing API above                               |
| `endowment:network-access`  | Base RPC, curator, indexer, oracle reads                |
| `endowment:page-home`       | Order dashboard inside MetaMask                         |
| `endowment:cronjob` (5 min) | Background order refresh                                |
| `endowment:lifecycle-hooks` | Welcome dialog on install                               |
| `snap_dialog`               | Approval dialogs for every mutation                     |
| `snap_notify`               | In-app notifications on order state changes             |
| `snap_manageState`          | Tracked orders (unencrypted; public protocol data only) |

No key-management permissions are requested: the snap never calls
`snap_getEntropy`, `snap_getBip32Entropy`, `snap_getBip44Entropy`,
`snap_getBip32PublicKey`, or `snap_manageAccounts`.

### What is stored

Tracked orders are kept in unencrypted snap state so the cron job can refresh
them while MetaMask is locked. Only public protocol data is persisted: deposit
ids, amounts, states, and transaction hashes. Payee handles are never
persisted.

## Development

Source, issues, and the companion dapp live in
[zkp2p/peer-cash-snap](https://github.com/zkp2p/peer-cash-snap).

```shell
yarn install
yarn start   # snap on :8080, dapp on :8000
yarn test    # @metamask/snaps-jest against the built bundle
```

## License

Dual licensed under [MIT-0](./LICENSE.MIT0) or
[Apache 2.0](./LICENSE.APACHE2), at your option.
