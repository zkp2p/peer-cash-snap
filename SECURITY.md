# Security Policy

This snap moves real funds. Please report suspected vulnerabilities privately
and give us a chance to ship a fix before disclosing.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting: open the
[Security tab](https://github.com/zkp2p/peer-cash-snap/security) and choose
**Report a vulnerability**. That opens a private advisory visible only to the
maintainers.

Please do **not** open a public issue for a security report.

A useful report includes:

- affected package (`packages/snap` or `packages/site`) and version
- what an attacker gains, not just what misbehaves
- reproduction steps, ideally against a local `yarn start`
- the environment (`production`, `preproduction`, `staging`) if it matters

We aim to acknowledge within three business days and to keep you updated until
the issue is resolved or declined with a reason.

## Scope

| In scope                                    | Out of scope                                                       |
| ------------------------------------------- | ------------------------------------------------------------------ |
| The snap in `packages/snap`                 | The ZKP2P protocol contracts and their on-chain behavior           |
| The companion dapp in `packages/site`       | The [`@zkp2p/cash`](https://www.npmjs.com/package/@zkp2p/cash) SDK |
| The RPC surface and its validation          | MetaMask itself and the Snaps platform                             |
| Confirmation dialogs and what they disclose | Third-party fiat rails (Chime, Revolut, Wise, Zelle, …)            |
| What the snap persists in snap state        | Findings that require a compromised wallet or machine              |

Issues in an out-of-scope dependency are still worth telling us about if this
snap's usage makes them exploitable here. Report those to the upstream project
as well.

## Threat model

These are deliberate design properties. A report that breaks one of them is a
valid finding.

- **The snap never holds keys and never sees a signature.** Snaps cannot call
  `eth_sendTransaction`; every mutation returns an unsigned transaction plan
  that the user submits through MetaMask.
- **No key-management permissions are requested.** The snap does not call
  `snap_getEntropy`, `snap_getBip32Entropy`, `snap_getBip44Entropy`,
  `snap_getBip32PublicKey`, or `snap_manageAccounts`. Any change here is a
  breaking permission change, not a patch.
- **Two approvals per mutation.** The snap shows a confirmation dialog before
  returning a plan, and MetaMask confirms every transaction in it. A path that
  produces a plan without a dialog is a vulnerability.
- **Snap state is unencrypted and holds public protocol data only.** Deposit
  ids, amounts, states, and transaction hashes are already public on-chain.
  Payee handles are never persisted. Anything that writes a payee handle,
  secret, or other sensitive value into snap state is a vulnerability.
- **Restricted rails are refused.** Venmo, Cash App, and PayPal require an
  atomic access policy only first-party Peer hosts can configure. The snap
  pre-flights locally and re-checks the SDK's `accessPolicyRequired` flag after
  `prepare()`. A bypass of that backstop is a vulnerability.
- **All RPC input is schema-validated.** Input that reaches the SDK or a dialog
  without validation is a vulnerability.

## Supported versions

This snap is pre-1.0. Only the latest published version of
`@zkp2p/peer-cash-snap` receives security fixes.
