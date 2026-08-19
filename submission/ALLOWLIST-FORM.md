# Allowlist request — field-by-field

Form: <https://go.metamask.io/snaps-directory-request>
(`https://consensys-software.typeform.com/snaps-request`, 26 fields)

No field on the form enforces a character limit. Lengths below are tuned to the
live registry corpus (summaries average 67 chars, descriptions 716).

Filed 19 Aug 2026 for 0.1.1. Every field below went in as written.

---

**2. Your Snap name** _(required)_

```
Peer Cash
```

Must match `proposedName` in `snap.manifest.json` — it does. Nine characters,
and free of the banned words (MetaMask, meta, mask, snap).

**3. Your company or brand name** _(required)_

```
Peer
```

Settled: `author` is now `Peer (https://peer.xyz)` in the root, snap and site
packages, matching `@zkp2p/cash` and the brand name on this form.

**4. Your company or brand website** _(required)_

```
https://peer.xyz
```

**5. Website for your Snap** _(optional)_

```
https://peer-cash-snap.vercel.app
```

**6. Short description** _(required)_ — "1 or 2 sentences, brief and direct"

```
Cash out Base USDC to fiat without a custodian. Your USDC is escrowed in the ZKP2P protocol and a buyer pays you on Revolut, Wise, Zelle, or Chime at the live oracle rate.
```

**7. Long description** _(required)_ — plain text only, `\n` for line breaks, no
Markdown or HTML

```
Peer Cash turns your wallet into an off-ramp for Base USDC.

Pick an amount and a payout rail. Your USDC is escrowed in the ZKP2P protocol at the live Chainlink oracle rate, with zero spread and no custodian holding your funds. A buyer signals an intent, pays you on the rail you chose, and proves the payment with TEE-TLS. The protocol then releases the USDC to them. Anything that never matches is withdrawable at any time.

Rails include Revolut, Wise, Zelle, and Chime, covering USD, EUR, GBP and more.

Every mutation is approved twice. Peer Cash shows you the amount, rail, payee, and a live estimate before it builds anything, then hands back unsigned transactions that your wallet asks you to confirm one by one. It holds no keys and never signs.

Orders appear on the home page, refresh in the background every five minutes, and notify you when a buyer matches, when a payout is delivered, and when unmatched funds come back.

Venmo, Cash App, and PayPal are not offered here. Those rails need an access policy only first-party Peer surfaces can configure, and the snap refuses them with a pointer to Peer rather than failing later.
```

**8. Public GitHub repo URL** _(required)_

```
https://github.com/zkp2p/peer-cash-snap
```

Confirmed: the repository is public.

**9. Public npm package URL** _(required)_

```
https://www.npmjs.com/package/@zkp2p/peer-cash-snap
```

Confirmed: `@zkp2p/peer-cash-snap@0.1.1` is published and live on npm as `latest`.

**10. Snap version to be allowlisted** _(required)_

```
0.1.1
```

**11. Verified no errors in the CLI?** _(required checkbox)_

Yes. `mm-snap manifest` reports the manifest valid, `yarn build` evaluates the
bundle under SES cleanly, `yarn lint` is clean, and all 15 snaps-jest tests
pass.

**12. Tested with Snap Install Tester in Flask?** _(required checkbox)_

Yes, verified 19 Aug 2026 before filing. MetaMask Flask 13.44.0-flask.0 in a
throwaway profile, snap installed from npm through
<https://montoya.github.io/snap-install-tester/> as
`npm:@zkp2p/peer-cash-snap`. The four things the field's helper text asks about
all held: the version resolved as 0.1.1, the Peer icon rendered, the name and
description showed in the Snaps settings menu, and the `page-home` view
rendered its real empty state. Evidence in
[`FLASK-E2E.md`](./FLASK-E2E.md#what-was-verified-under-flask).

**13. Is the icon for your Snap correct?** _(required checkbox)_

Yes. `packages/snap/images/icon.svg` is a valid square SVG (512×512 viewBox), a
solid `#000000` rounded square with the Peer mark in `#FFFFFF` — the official
brand pairing, matching `peer400x400.png`, and opaque so it
reads on both light and dark backgrounds.

**14. URL to Snap audit report** _(optional)_ — leave blank
**15. Upload Snap audit report** _(optional)_ — leave blank

No key-management permissions, so no audit is required. Note the form warns any
uploaded report becomes public on allowlisting.

**16. General support contact for users** _(optional)_

```
https://support.peer.xyz
```

**17. Escalation contact email — internal only** _(required)_

```
support@peer.xyz
```

Confirmed by Andrew. `support@peer.xyz` is the canonical public support address —
it is the single source of truth in `clients/web/src/helpers/supportEmail.ts`,
pinned by a unit test, and it is what the support site and docs publish. It was
deliberately migrated from `support@zkp2p.xyz` in #1209 (2026-07-16).

Two caveats before using it here:

- This field is an _escalation_ contact, so a shared user-support inbox may not
  be what you want MetaMask to reach you on.
- The only mailbox provably monitored is `support@zkp2p.xyz`. `support@peer.xyz`
  is very likely an alias into it, but mail routing was not verified.

Alternative if you want escalation separated from user support: `team@peer.xyz`,
published as the Contact link on docs.peer.xyz. There is no `security@` mailbox
anywhere in the fleet — do not invent one. `SECURITY.md` (added in #14) routes
vulnerability reports through GitHub private advisories rather than email, so it
does not supply an address for this field either.

**18. Knowledge Base for users** _(optional)_

```
https://support.peer.xyz
```

**19. FAQ page for users** _(optional)_

```
https://github.com/zkp2p/peer-cash-snap#readme
```

**20–22. Promotional images** _(optional, but all-or-nothing)_

Upload `images/1.png`, `images/2.png`, `images/3.png` in order. All three are
960×540 PNG. The form's helper text: "If you choose to provide images, you must
provide exactly 3 images."

| Image   | Shows                                                                                                                                                                                 |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `1.png` | Positioning: the custody model, supported rails, and a live 25 USDC → 21.55 EUR quote at the real oracle rate                                                                         |
| `2.png` | The approval model: the snap's real `Start a cash-out?` dialog copy, verbatim, with the two-approval explanation                                                                      |
| `3.png` | Order tracking: two real live production orders — `awaiting-buyer` (8 USDC, revolut→USD) and `delivering` (37.658178 of 57.85 USDC, revolut→EUR), with their real `explain()` strings |

**23. Snap demo video or tutorial video** _(optional)_ — URL field, not an upload

**Left blank on the 19 Aug filing.** Optional, and there is no specified length,
format, or platform. It must be hosted somewhere and supplied as a URL, and it never enters
the registry data — MetaMask uses it for review and possibly marketing.

A real demo has to show the snap UI inside MetaMask, which means Flask driving
the extension; it cannot be produced headlessly. The shot list is in
[`FLASK-E2E.md`](./FLASK-E2E.md) and is designed so the whole thing records in
one take alongside the E2E run.

**24. Country the team is based in** _(required)_

```
United States
```

P2P Labs Inc. — the legal entity named in the clients' `COMPANY_INFO`.

**25. Acknowledge the declaration** _(optional checkbox)_ — tick it.

**26. How can we follow up with you?** _(optional)_

```
support@peer.xyz, or @andrewwilkinson on X
```

Both routes given deliberately: the form warns MetaMask may need to reach us to
proceed with allowlisting, and the X handle does not depend on `peer.xyz` mail
routing, which has never been verified end to end.

---

## Not on the form

MetaMask assigns these during review; there is no field for either.

- **Category** — expect `interoperability`. The schema enum is exactly:
  `interoperability`, `notifications`, `transaction insights`,
  `account management`, `name resolution`. Live distribution puts
  `interoperability` first at 66 of 185.
- **Tags** — the schema allows them, but zero of 185 live verified snaps use
  them. Effectively dead.

## Registry entry MetaMask will write

```json
"npm:@zkp2p/peer-cash-snap": {
  "id": "npm:@zkp2p/peer-cash-snap",
  "metadata": {
    "name": "Peer Cash",
    "author": { "name": "Peer", "website": "https://peer.xyz" },
    "website": "https://peer-cash-snap.vercel.app",
    "summary": "Cash out Base USDC to fiat without a custodian. ...",
    "description": "Peer Cash turns your wallet into an off-ramp for Base USDC. ...",
    "category": "interoperability",
    "support": {
      "knowledgeBase": "https://support.peer.xyz",
      "contact": "https://support.peer.xyz"
    },
    "sourceCode": "https://github.com/zkp2p/peer-cash-snap",
    "screenshots": [
      "./images/@zkp2p/peer-cash-snap/1.png",
      "./images/@zkp2p/peer-cash-snap/2.png",
      "./images/@zkp2p/peer-cash-snap/3.png"
    ]
  },
  "versions": {
    "0.1.1": { "checksum": "3ykr2Eg14vXKEVOBTW7pX2ew8O9NPIEiqlcVGEq+nfo=" }
  }
}
```

The checksum is `source.shasum` from `snap.manifest.json`, verbatim. Re-check it
against the manifest at submission time — if the bundle is rebuilt from a
different dependency tree, it changes.

## Snapper scan

Ran Snapper v0.19.1 against `packages/snap`. No blocking findings.

The one High finding is a false positive: its hardcoded-secret regex matches the
literal function name `createNitroAttestationClient`. The high-severity `ws` DoS
advisory it reports via viem does not reach the artifact — `ws` is absent from
`dist/bundle.js`, and the only `webSocket` hits are viem transport-type string
comparisons, so there is no reason to break the deliberate `viem@~2.37.3` SES
pin. The rest is jsdoc formatting and non-exact semver ranges.

Two caveats worth knowing before quoting a clean result: out of the box Snapper
silently skips 8 of its 28 detectors because it only loads `.ts`/`.tsx`, which
means every manifest, `package.json`, and `tsconfig.json` detector never fires —
exactly the checks a directory reviewer cares about. The result above is from a
patched run where all 28 executed. Separately, `originValidation` — its only
High-rated dynamic check — cannot run here at all, because it hard-requires
`snap.config.js` and this repo uses `snap.config.ts`.

## Pre-submission checklist

- [x] `version` identical in `package.json` and `snap.manifest.json` (0.1.1)
- [x] `source.location.npm.packageName` matches the package name
- [x] `source.shasum` matches the built bundle
- [x] Icon is a square SVG referenced by `iconPath`
- [x] `proposedName` within limits, free of reserved words
- [x] No key-management permissions, so no audit
- [x] Snapper scan run, no blockers
- [x] Three 960×540 promotional images
- [x] Published to npm — `@zkp2p/peer-cash-snap@0.1.1`
- [x] Repo public
- [x] Snap Install Tester run under Flask (19 Aug 2026, Flask 13.44.0-flask.0)
- [x] Escalation contact confirmed — `support@peer.xyz`
- [ ] Demo video _(optional, left blank)_
