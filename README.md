# Peer Cash Snap

A [MetaMask Snap](https://metamask.io/snaps/) that turns MetaMask into a
[Peer Cash](https://github.com/zkp2p/peer-cash) off-ramp: escrow Base USDC in
the ZKP2P protocol and get paid on a fiat rail (Chime, Revolut, Zelle, Wise,
…) at the live Chainlink oracle rate, with no custodian in between.

Built on `@zkp2p/cash`, Peer's offramp-only SDK, hosted entirely inside the
snap. A companion dapp (in this repo) drives the flow and submits
transactions; the snap owns the SDK, approvals, order state, and
notifications.

## How it works

MetaMask snaps cannot sign or submit transactions (`eth_sendTransaction` is
unavailable to snaps), and `@zkp2p/cash` was designed for exactly this
custody split: every mutation has an unsigned-plan path.

```text
┌────────────┐  wallet_invokeSnap   ┌─────────────────────────────┐
│ companion  │ ───────────────────► │ Peer Cash snap              │
│ dapp       │                      │ · hosts @zkp2p/cash         │
│ (this repo)│ ◄─────────────────── │ · confirmation dialogs      │
└─────┬──────┘   unsigned tx plans  │ · order state + cron + noti │
      │                             └──────────────┬──────────────┘
      │ eth_sendTransaction                        │ fetch (RPC, curator,
      ▼ (user confirms each tx)                    ▼  indexer, oracle)
┌────────────┐                      ┌─────────────────────────────┐
│  MetaMask  │ ───────────────────► │ ZKP2P protocol on Base      │
└────────────┘      Base mainnet    │ escrow · oracle · intents   │
                                    └─────────────────────────────┘
```

- **The user is the maker.** A cash-out creates a protocol-held USDC deposit
  at the live market rate (zero spread). A buyer signals an intent, pays fiat,
  proves it with TEE-TLS, and the protocol releases the USDC. Unmatched funds
  are withdrawable at any time.
- **Two approvals for every mutation.** The snap shows a confirmation dialog
  (amount, platform, payee, estimate) before returning a plan, and MetaMask
  asks again for every transaction in that plan. The snap never holds keys.
- **Resumable.** The `depositId` is the durable resume key. The snap tracks
  it in unencrypted snap state, refreshes in-flight orders every 5 minutes
  via a cron job, notifies on state changes (`matched`, `delivered`,
  `returned`), and lists everything on its home page inside MetaMask.

## Repository layout

| Package         | What it is                                                             |
| --------------- | ---------------------------------------------------------------------- |
| `packages/snap` | The snap: `@zkp2p/cash` host, RPC API, dialogs, home page, cron, state |
| `packages/site` | Companion dapp: cash-out form, order list, plan submission             |

## Snap RPC API

All methods are invoked with `wallet_invokeSnap` from a site the user has
connected the snap to. Amounts are decimal USDC strings (`"25.50"`).

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

Errors keep Peer Cash's typed shape: the snap forwards `code`, `retryable`,
`remediation`, and `recovery` in the JSON-RPC error `data`.

### Payout rails

- **Venmo, Cash App, PayPal are refused** with a clear remediation: they
  require an atomic access policy only first-party Peer hosts can configure.
  The snap pre-flights this locally and re-checks the SDK's
  `accessPolicyRequired` flag after `prepare()` as the authoritative backstop.
- **Wise and PayPal identity attestations** cannot be minted here; an
  existing Peer-registered handle can be reused (`PAYEE_VERIFICATION_REQUIRED`
  otherwise).

## Snap permissions

| Permission                  | Why                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `endowment:rpc` (dapps)     | The dapp-facing API above                                                                                                 |
| `endowment:network-access`  | Base RPC, curator, indexer, oracle reads                                                                                  |
| `endowment:page-home`       | Order dashboard inside MetaMask                                                                                           |
| `endowment:cronjob` (5 min) | Background order refresh                                                                                                  |
| `endowment:lifecycle-hooks` | Welcome dialog on install                                                                                                 |
| `snap_dialog`               | Approval dialogs for every mutation                                                                                       |
| `snap_notify`               | In-app notifications on order state changes                                                                               |
| `snap_manageState`          | Tracked orders (unencrypted: public protocol data only — deposit ids, amounts, states; payee handles are never persisted) |

## Try it

The snap is published as
[`@zkp2p/peer-cash-snap`](https://www.npmjs.com/package/@zkp2p/peer-cash-snap)
and the companion dapp is hosted at https://peer-cash-snap.vercel.app.

Until the snap is allowlisted in the MetaMask Snaps Directory it installs only
under [MetaMask Flask](https://metamask.io/flask/) — stable MetaMask refuses
snaps that request protected permissions (this one needs
`endowment:network-access` and `endowment:rpc`) unless they are allowlisted.

## Getting started

Requirements: Node 18+ (Node 22+ recommended), Yarn (via corepack), and
[MetaMask Flask](https://metamask.io/flask/) in a browser profile without
regular MetaMask.

```shell
yarn install
yarn start
```

- Snap served at `http://localhost:8080`
- Dapp at `http://localhost:8000`

Open the dapp, install the snap, connect an account, and cash out. The
environment selector (production / preproduction / staging) switches the
whole stack — contracts, curator, indexer — through a snap-confirmed dialog.

## Verifying on staging

Before relying on a build, prove the maker lifecycle with a small wallet,
mirroring the Peer Cash SDK integration guide:

1. Switch the environment to `staging` in the dapp.
2. Create a 1–2 USDC cash-out; save the `depositId` and transaction hash.
3. Retry `Refresh` through indexer lag until the order shows `awaiting-buyer`.
4. Withdraw without waiting for a buyer.
5. Confirm the order becomes `returned` and the USDC is back, minus gas.

If a withdrawal fails with funds apparently stuck, stop and investigate — do
not retry transactions blindly.

## Testing

```shell
yarn test
```

`@metamask/snaps-jest` covers the network-free surface: capability discovery,
restricted-rail refusal, parameter validation, the environment-switch dialog
flow, home page rendering, and the cron entry point. Live-infrastructure
flows are covered by the staging procedure above.

## SES bundling notes

Snaps run under [SES lockdown](https://github.com/endojs/endo), which freezes
intrinsics. Three dependency subtrees violate that and are replaced at build
time (see `packages/snap/snap.config.ts` and `packages/snap/src/stubs/`):

- `@relayprotocol/relay-sdk` (+ `chain-utils`) — Relay source routing is
  unreachable anyway (`cash.prepare()` is Base-USDC only); stubbed with
  throwing functions.
- `viem`'s Tempo chain config — makes the Tempo chain definitions pure so the
  side-effecting `fn.call = ...` namespace assignments tree-shake out. viem is
  also pinned to `~2.37.3` (the SDK's declared floor) because newer viem wires
  side-effecting token actions into the standard client decorators.
- `@zkp2p/zkp2p-attestation` — buyer-side TEE helpers the snap never calls;
  pulls in `reflect-metadata`, which mutates the frozen `Reflect`.

If an upgrade reintroduces an SES failure, `yarn workspace
@zkp2p/peer-cash-snap build` reproduces it locally (`mm-snap build` evaluates
the bundle in SES).

## Known limitations

- The dapp sends a single payout leg per order; the snap RPC already accepts
  multi-platform / multi-currency legs.
- Cross-chain sources (Relay) are out of scope; cash out Base USDC directly.
- Flask-only distribution until the MetaMask allowlist request is approved.
  The npm package is published; the directory listing is not.
- `cash_getOrders` trusts the dapp-supplied `owner` for the indexer read;
  order data is public protocol state, and mutations are always dialog-gated.
