# MetaMask Snaps Directory submission

Everything needed to get `@zkp2p/peer-cash-snap` allowlisted.

**Submitted 19 Aug 2026 for version 0.1.1.** The allowlist request went in
through the Typeform below and returned the confirmation screen: "It may take up
to one month for your request to be reviewed." See
[Submission record](#submission-record) for exactly what was sent.

| File                                       | What it is                                                        |
| ------------------------------------------ | ----------------------------------------------------------------- |
| [`ALLOWLIST-FORM.md`](./ALLOWLIST-FORM.md) | Field-by-field answers for the allowlist Typeform, ready to paste |
| [`FLASK-E2E.md`](./FLASK-E2E.md)           | Runbook for the live Flask end-to-end, pre-flight already done    |
| `images/1.png`–`3.png`                     | The three promotional images, 960×540 PNG                         |
| `frames/`                                  | HTML sources for the images, so they can be regenerated or edited |

## How submission works

It is a **Typeform, not a pull request**:

- New snap: <https://go.metamask.io/snaps-directory-request>
  → `https://consensys-software.typeform.com/snaps-request`
- Version update: <https://go.metamask.io/snaps-directory-update-request>
  → `https://consensys-software.typeform.com/snaps-update`

MetaMask staff write the `MetaMask/snaps-registry` entry themselves. Do not open
a PR against that repo — externally-opened ones sit unreviewed for months. The
form's own confirmation screen says review takes up to a month.

Every published version needs its own update-request form: the registry pins
per-version checksums, and users cannot install a version that is not
allowlisted.

## Submission record

| Field                         | Sent                                                |
| ----------------------------- | --------------------------------------------------- |
| Date                          | 19 Aug 2026                                         |
| Version                       | 0.1.1                                               |
| Form                          | `snaps-request` (new snap), 26 fields               |
| Promotional images            | `images/1.png`, `2.png`, `3.png`, uploaded in order |
| Audit URL and upload (14, 15) | Left blank, no key-management permissions           |
| Demo video (23)               | Left blank, optional                                |
| Follow-up contact (26)        | `support@peer.xyz, or @andrewwilkinson on X`        |

Every other field went in verbatim from [`ALLOWLIST-FORM.md`](./ALLOWLIST-FORM.md).

Field 12 was the one real gate, and it is now answered honestly: the snap was
installed from npm in MetaMask Flask through the Snap Install Tester before the
form was filed. What that run proved is recorded in
[`FLASK-E2E.md`](./FLASK-E2E.md#what-was-verified-under-flask).

**Next time this changes:** every published version needs its own
update-request form, and the registry pins per-version checksums, so 0.1.2 is
not installable by users until it is separately allowlisted.

## Why allowlisting is needed

MetaMask has an open-permission list that installs on stable MetaMask with no
allowlisting. This snap requests two permissions that are not on it —
`endowment:network-access` and `endowment:rpc` — so it is Flask-only until
listed.

## Audit: not required

An audit is mandatory only for snaps calling `snap_getBip32Entropy`,
`snap_getBip32PublicKey`, `snap_getBip44Entropy`, `snap_getEntropy`, or
`snap_manageAccounts`. This snap calls none of them — it holds no keys and never
signs; every mutation returns an unsigned plan. Leave both audit fields blank.

## Regenerating the images

```shell
cd submission/frames
for n in 1 2 3; do
  chrome --headless --screenshot="../images/$n.png" \
    --window-size=960,540 --force-device-scale-factor=1 "file://$PWD/$n.html"
done
```

The spec is strict and verified against the registry schema
(`size(array(ImagePathStruct), 3, 3)`) and against 45 live assets, all of which
measure exactly 960×540: **exactly three images, exactly 960×540, PNG or JPG.**
Not two, not four. The form calls them "promotional images" rather than
screenshots, and 960×540 landscape is deliberately not MetaMask's tall narrow
UI shape — the corpus is designed frames, which is what these are. All copy and
every number in them is taken verbatim from the shipped snap components and
live production reads.
