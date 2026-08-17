# Live end-to-end under MetaMask Flask

Proves the maker lifecycle against production: cash out → `awaiting-buyer` →
withdraw → `returned`. Everything that can be verified without a wallet is done;
what remains needs hands on a wallet.

---

## Do not run Flask next to your existing MetaMask

They are separate extensions — Flask is `ljfoeinjpaedjfecbmggjgodbgkmjkjk`,
stable MetaMask is `nkbihfbeogaeaoehlefnkodbefgpgknn` — so Chrome will happily
install both. Don't. MetaMask's own install guide says:

> Install Flask in a new browser profile, or disable any existing installed
> versions of MetaMask before installing Flask. Running multiple instances of
> MetaMask in the same browser profile can break dapp interactions.

There is a concrete reason it breaks _this_ dapp specifically.
`packages/site/src/utils/metamask.ts` resolves the provider like this:

```ts
if (await hasSnapsSupport()) {
  return window.ethereum; // ← whoever won window.ethereum
}
```

`hasSnapsSupport` just calls `wallet_getSnaps`, and **stable MetaMask supports
that call**. So if stable wins the `window.ethereum` race, the dapp binds to
stable, and installing `local:http://localhost:8080` fails — stable MetaMask
refuses local snap IDs. The EIP-6963 fallback doesn't save you either: it
matches `rdns.includes('io.metamask')`, which matches both `io.metamask` and
`io.metamask.flask`, and resolves to whichever announces first.

**Use a separate profile.** This launches a fully isolated Chrome that cannot
touch your Default profile, its cookies, or its sessions:

```shell
open -na "Google Chrome" --args \
  --user-data-dir="$HOME/.chrome-flask" \
  --no-first-run \
  http://localhost:8000
```

Your normal Chrome keeps running untouched. To repeat the run later, reuse the
same `--user-data-dir` and Flask is still installed.

---

## Pre-flight — done, verified

| Check                                           | State                                                                                  |
| ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| Dapp `http://localhost:8000`                    | 200                                                                                    |
| Snap `http://localhost:8080/snap.manifest.json` | 200                                                                                    |
| Bundle `http://localhost:8080/dist/bundle.js`   | 200                                                                                    |
| Served shasum == built shasum                   | `DTg/2rdRpVg/HkWQnVVUASu9ica3bxXB53UpYdPrBZ0=` both                                    |
| Manifest valid                                  | `mm-snap manifest` clean                                                               |
| Tests                                           | 15/15 snaps-jest against the built bundle                                              |
| Live oracle through the bundle                  | 25 USDC → 21.55 EUR @ 0.8621; 50 USDC → 36.95 GBP @ 0.7389                             |
| Live indexer through the bundle                 | Real orders resolve: `awaiting-buyer` (8 USDC) and `delivering` (37.658178/57.85 USDC) |

If the dev servers are not running:

```shell
yarn install && yarn start     # snap on :8080, dapp on :8000
```

### Test wallet position

Read live from Base mainnet. The address is `TEST_WALLET_ADDRESS` in the
workspace `.env`; its key is `TEST_WALLET_PRIVATE_KEY` and is never printed
here.

|                             |                                                               |
| --------------------------- | ------------------------------------------------------------- |
| USDC                        | 23.046786                                                     |
| ETH                         | 0.00004617                                                    |
| Base gas price              | 0.0060 gwei                                                   |
| `approve` + `createDeposit` | ~0.0000021 ETH at that price                                  |
| Gas headroom                | ~22× for the deposit, comfortably enough for the withdraw too |

Funded sufficiently. No top-up needed.

### Choosing the rail

`capabilities()` live, restricted rails excluded:

| Rail    | Currencies           | Note                                               |
| ------- | -------------------- | -------------------------------------------------- |
| revolut | AUD, CAD, CHF, EUR … | **Use this** — no identity attestation             |
| chime   | USD                  |                                                    |
| monzo   | GBP                  |                                                    |
| zelle   | USD                  |                                                    |
| wise    | AUD, CAD, CHF, EUR … | Needs an identity attestation the snap cannot mint |

Bounds: hard minimum 0.01 USDC, recommended minimum **1 USDC**. Venmo, Cash App
and PayPal are refused by design.

---

## Runbook

Expected state is given for every step so a failure is unambiguous.

### 1. Launch the isolated profile

Run the `open -na` command above. **Expect:** a fresh Chrome, no extensions, the
Peer Cash dapp loading at `localhost:8000`.

### 2. Install Flask

<https://chromewebstore.google.com/detail/metamask-flask-developmen/ljfoeinjpaedjfecbmggjgodbgkmjkjk>

**Expect:** the Flask fox (orange/dark variant) pinned in the toolbar.

### 3. Set up the wallet — your hands only

Import the test wallet with `TEST_WALLET_PRIVATE_KEY`, or create a wallet and
send it 2–3 USDC plus a little ETH on Base.

**Expect:** Flask unlocked, network set to **Base** (chain 8453), USDC visible.

### 4. Reload the dapp

**Expect:** the "Install MetaMask Flask" card is gone. The "Install the Peer Cash
snap" card with a **Connect** button is showing.

If it still shows the Flask install card, the dapp did not detect Flask —
re-check that no other MetaMask is installed in this profile.

### 5. Connect and install the snap

Click **Connect**.

**Expect:** Flask opens a permission dialog listing exactly these:
`endowment:rpc`, `endowment:network-access`, `endowment:page-home`,
`endowment:cronjob` (every 5 minutes), `endowment:lifecycle-hooks`,
`snap_dialog`, `snap_notify`, `snap_manageState`. Approve.

**Then expect:** the `onInstall` welcome dialog — heading "Peer Cash installed",
and a copyable `https://peer-cash-snap.vercel.app`.

_Video shot 1: the permission list. Shot 2: the welcome dialog._

### 6. Check the home page

Flask → Menu → Snaps → Peer Cash.

**Expect:** heading "Peer Cash", the line "Cash out Base USDC to fiat at the live
market rate.", the empty state "No cash-outs tracked yet…", and a **Refresh**
button. No environment warning banner — production is the default, and the
banner only renders off-production.

_Video shot 3: the empty home page._

### 7. Fill the cash-out form

Amount **1**, platform **revolut**, currency **EUR**, and your Revolut tag as
payee.

**Expect:** a live estimate appears under the form within a couple of seconds,
roughly 0.86 EUR per USDC at current rates.

### 8. Start the cash-out — first approval

Click the cash-out button.

**Expect:** the snap dialog "Start a cash-out?" showing the origin, `Amount 1
USDC`, a `revolut → EUR` row with your payee, and `Estimated payout ≈ 0.86 EUR`.
Approve.

_Video shot 4: this dialog. It is the single most important frame — it shows the
snap disclosing everything before anything moves._

### 9. Sign the transactions — your hands only

**Expect:** MetaMask asks twice, in order:

1. `approve` — USDC spend approval for the escrow
2. `createDeposit` — the escrow deposit itself

Confirm each. **Expect:** the dapp reports a `depositId` of the form
`0x777777779d229cdf3110e9de47943791c26300ef_<n>`. **Save it**, plus both
transaction hashes.

_Video shot 5: the MetaMask confirmation, to show the wallet still gates every
transaction._

### 10. Wait for the order to appear

Press **Refresh** on the dapp or the snap home page.

**Expect:** eventually state `awaiting-buyer` and the line "Your 1 USDC cash-out
is live and waiting for a buyer; you can withdraw it any time before a buyer
commits."

`ORDER_NOT_FOUND` immediately after creation is normal indexer lag — the error
is marked retryable and says so. Keep refreshing. If it persists past a few
minutes, stop and investigate rather than resubmitting.

_Video shot 6: the home page with the live order._

### 11. Withdraw

Withdraw the full amount from the dapp.

**Expect:** the snap dialog "Withdraw from your cash-out?" with `Withdraw: All
remaining USDC (closes the order)` and a live status line. Approve, then confirm
the withdraw transaction in MetaMask.

> **Race to be aware of:** a real buyer can signal an intent on a 1 USDC revolut
> deposit at any time. If one commits before you withdraw, a full close is
> blocked until the intent is delivered or expires — that is correct protocol
> behaviour, not a bug. If it happens, either let it complete (you get paid in
> EUR) or wait out the expiry. Do not retry transactions blindly.

### 12. Confirm the terminal state

**Expect:** state `returned`, USDC back in the wallet minus gas, and an in-app
notification "Peer Cash: funds returned to your wallet". The order stays listed
with a **Remove from list** button, since it is no longer in flight.

_Video shot 7: the returned state._

### 13. Snap Install Tester — required for the form

<https://montoya.github.io/snap-install-tester/> with
`local:http://localhost:8080` (or `npm:@zkp2p/peer-cash-snap` once published).

**Expect:** a clean install. This is form field 12, a required checkbox.

---

## What needs Andrew, and why

| Step                                   | Why it cannot be automated                                                               |
| -------------------------------------- | ---------------------------------------------------------------------------------------- |
| 3. Wallet setup                        | Entering a private key or seed phrase is credential entry. I will not do it.             |
| 9. Signing `approve` + `createDeposit` | Broadcasting a transaction that escrows real USDC is moving funds.                       |
| 11. Signing the withdraw               | Same.                                                                                    |
| 5, 8, 11 dialogs                       | Approving a wallet permission prompt on your behalf is consent I do not have.            |
| 2. Installing Flask                    | Browser extension install in your profile.                                               |
| 12. Install Tester attestation         | A truthful checkbox about something only you observed.                                   |
| Demo video                             | Needs the snap UI rendered by the Flask extension. Not reachable headlessly — see below. |

## Why the video cannot be produced headlessly

I confirmed this rather than assuming it. `@metamask/snaps-sandbox`, which
`mm-snap sandbox` serves, is **not** a simulator — it is a client of the Flask
extension. Running it headless, `window.ethereum` is `undefined` and it renders
an "Install MetaMask Flask" prompt instead of executing anything. The snap's UI
is drawn by MetaMask's own extension chrome, so any headless reproduction would
be a mock, not the product.

Shots 1–7 above are ordered to record in a single take alongside this run. Field
23 on the form is optional and takes a URL, not an upload, so it needs hosting
somewhere (Loom, YouTube) — no length or format is specified anywhere in
MetaMask's docs or the form.
