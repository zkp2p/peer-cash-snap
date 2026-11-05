# Publishing the snap

`@zkp2p/peer-cash-snap` is published only by
`.github/workflows/publish.yml`, using npm trusted publishing (GitHub OIDC)
and provenance from this public repository. npm requires 2FA and disallows
tokens; local `npm publish` is rejected. No npm token or GitHub secret is needed.

## One-time human setup after merge

Create the GitHub environment **`npm-publish`** in `zkp2p/peer-cash-snap`
and restrict it to `main`. Register this exact workflow and environment with npm:

```shell
npm trust github @zkp2p/peer-cash-snap --file .github/workflows/publish.yml --repo zkp2p/peer-cash-snap --env npm-publish --allow-publish
```

Keep the workflow filename and environment unchanged: they identify the trusted
publisher. Keep npm's require-2FA/disallow-tokens policy enabled.

## Release

1. Bump `packages/snap/package.json` to an unpublished exact SemVer in a PR
   (no `v` prefix or `+metadata`, which npm strips).
   Use Node from `.nvmrc`, run `yarn install --immutable`, then
   `yarn workspace @zkp2p/peer-cash-snap run build`. Commit the updated
   `snap.manifest.json` (version and bundle shasum) with the version bump.
2. Merge the PR to `main` and dispatch from `main`:

   ```shell
   gh workflow run .github/workflows/publish.yml --ref main -f version=X.Y.Z
   ```

3. Check that both workflow jobs succeed, then verify the version and tag:

   ```shell
   npm view @zkp2p/peer-cash-snap@X.Y.Z version
   npm view @zkp2p/peer-cash-snap dist-tags.latest
   ```

An empty `dist_tag` derives `latest` for stable versions and the first prerelease
identifier for prereleases (`X.Y.Z-rc.N` uses `rc`). Override with
`-f dist_tag=next`, for example. Tags must start with a lowercase letter and
contain only lowercase letters, digits, dots, underscores, or hyphens; version
ranges such as `v1` are rejected. A numeric prerelease identifier needs an
explicit tag. Publishing a prerelease to `latest` additionally requires
`-f dist_tag=latest -f allow_prerelease_latest=true`. Verify the selected tag in
step 3 instead of `latest`.

Before building, the workflow rejects other refs, mismatched versions, and
versions already on npm. It installs immutably, runs the snap's build and tests,
lints with ESLint and Prettier, and fails if the build changes `snap.manifest.json`.
It packs once and publishes that exact artifact on a GitHub-hosted runner with
Node 24 and npm 11.9.0. The publish job polls the registry version and tag for
about 60 seconds. If publishing succeeded but verification timed out, check npm
manually; rerunning cannot republish an existing version.

For MetaMask directory distribution, also follow the per-version
[allowlist update process](./submission/README.md).

## Moving an existing dist-tag

OIDC cannot move dist-tags on already published versions. Promotion remains a
manual human operation using passkey 2FA, for example:

```shell
npm dist-tag add @zkp2p/peer-cash-snap@X.Y.Z-rc.N latest
```

Do not add a token or an automated tag-move path.
