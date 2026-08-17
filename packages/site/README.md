# Peer Cash companion dapp

The site half of [`peer-cash-snap`](../../README.md): a Gatsby dapp that
drives the Peer Cash off-ramp and submits the unsigned transaction plans the
snap returns.

Hosted at https://peer-cash-snap.vercel.app.

## Why a companion dapp exists

Snaps cannot call `eth_sendTransaction`. The snap owns `@zkp2p/cash`, the
confirmation dialogs, and order state; this dapp owns the wallet connection
and transaction submission. Every mutation is approved twice — once in the
snap's dialog, once per transaction in MetaMask.

## Scripts

| Script       | What it does                              |
| ------------ | ----------------------------------------- |
| `yarn start` | `gatsby develop` on http://localhost:8000 |
| `yarn build` | Production build into `public/`           |
| `yarn lint`  | ESLint + Prettier                         |

Run both halves together with `yarn start` from the repository root.

## Which snap it connects to

`src/config/snap.ts` reads `SNAP_ORIGIN`, falling back to
`local:http://localhost:8080` so `yarn start` targets the locally served snap.

Gatsby inlines every key from `.env.<stage>` into browser code, so the
production origin is set in the committed `.env.production`:

```shell
SNAP_ORIGIN=npm:@zkp2p/peer-cash-snap
```

That value is not a secret — it is the published npm snap id. To point a build
at a different snap, override `SNAP_ORIGIN` for that build.

## Layout

| Path                | What it is                                            |
| ------------------- | ----------------------------------------------------- |
| `src/pages`         | The single page: connect, cash out, orders            |
| `src/components`    | Cash-out form, order list, MetaMask connection UI     |
| `src/hooks`         | Provider context, snap install, shared flow lifecycle |
| `src/utils/cash.ts` | `wallet_invokeSnap` wrapper that propagates errors    |
| `src/types`         | Wire types shared with the snap's RPC API             |
