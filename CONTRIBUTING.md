# Contributing

Thanks for helping improve the Peer Cash snap. Security reports go through
[`SECURITY.md`](./SECURITY.md), not a public issue or pull request.

## Getting set up

Requires Node `>=18.6.0` (see `.nvmrc`) and Yarn 3, which is vendored in the
repository — no global install needed.

```shell
yarn install
yarn start   # snap on :8080, companion dapp on :8000
```

Install the local snap from the dapp at http://localhost:8000. This needs
[MetaMask Flask](https://metamask.io/flask/) until the snap is allowlisted in
the MetaMask Snaps Directory.

## Checks

Run these before opening a pull request. CI runs the same set.

```shell
yarn lint    # ESLint (flat config) + Prettier
yarn build   # builds both workspaces
yarn test    # @metamask/snaps-jest against the built bundle
```

`yarn lint:fix` fixes what it can. The site is additionally type-checked with
`tsc --noEmit`, which is what proves the cross-workspace type imports in
`packages/site/src/types/cash.ts` still line up with the snap.

## The manifest shasum

`packages/snap/snap.manifest.json` carries `source.shasum`, a hash of the built
bundle. **Any change to snap source invalidates it.** Rebuild before
committing, or the manifest check fails and the snap will not install:

```shell
yarn workspace @zkp2p/peer-cash-snap run build
```

`mm-snap manifest` reports a mismatch and can fix it in place. Changing
`initialPermissions` is a user-visible permission prompt change — call it out
explicitly in the pull request.

## Making changes

- The snap is the single host for `@zkp2p/cash`. The site imports wire types
  from the snap workspace with type-only imports; do not hand-copy them back.
- Every mutation must keep the unsigned-plan shape: confirmation dialog, then
  a plan the dapp submits. Never add a path that skips the dialog.
- Never persist payee handles or any sensitive value into snap state. See the
  privacy allowlist in `packages/snap/src/serialize.ts`.
- Validate all RPC input with the existing zod schemas in
  `packages/snap/src/rpc.tsx`.

## Commits and pull requests

Commit messages use the imperative mood with a conventional prefix when it
fits: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`.

Describe what changed and why it is safe. If the change touches dialogs,
permissions, or what the snap stores, say so in the description — that is what
reviewers look at first.
