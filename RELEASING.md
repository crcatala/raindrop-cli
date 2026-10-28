# Releasing

Releases are cut by hand from a clean `main` with
[release-it](https://github.com/release-it/release-it), wrapped by
`scripts/release.mjs`. One command bumps the version, moves the changelog's
Unreleased section into the new version, commits, tags `vX.Y.Z`, pushes,
creates the GitHub Release, and then publishes `raindrop-cli` to npm from the
tagged commit.

## Prerequisites

- Push access to `main`, and a GitHub token for the release (`GITHUB_TOKEN`,
  or release-it opens the GitHub release form in the browser instead):

  ```bash
  export GITHUB_TOKEN=github_pat_xxxx
  ```

  A fine-grained token needs **Contents: Read and write** on
  `crcatala/raindrop-cli`; a classic token needs the `repo` scope.
- An npm login with publish rights to `raindrop-cli`: `npm whoami`, else `npm login`.
- `ggshield` installed and authenticated (`ggshield auth status`). `npm publish`
  runs `prepublishOnly`, which rebuilds and then scans the source tree and
  `dist/` for secrets, so a publish fails without it.

## Before releasing

1. Start from an up-to-date `main`:

   ```bash
   git checkout main
   git pull --ff-only
   ```

2. Draft the changelog:

   ```bash
   bun run release:prep
   ```

   Paste the output into an LLM, review the result, and put it under
   `## [Unreleased]` in `CHANGELOG.md` (Added, Changed, Fixed, Removed,
   Security; user-facing changes only). Commit it to `main` and push.

## Release

```bash
bun run release:dry       # preview; changes nothing and skips the hooks
bun run release           # asks for the version; or: bun run release -- patch|minor|major
```

In order, `bun run release`:

1. refuses to start when not logged in to npm or when `HEAD` is already a release;
2. checks that Unreleased has entries and runs `bun run verify`;
3. bumps the version and the changelog, then runs `bun run test:package` (packs
   the tarball, installs it, checks `--help` and `--version` for every command);
4. commits `chore: release vX.Y.Z`, tags `vX.Y.Z`, pushes both;
5. creates the GitHub Release;
6. publishes to npm from the tagged commit (npm may ask for a one-time password).
   Its `prepublishOnly` hook rebuilds and runs the `ggshield` secret scans
   before the tarball is uploaded.

A prerelease is published under a dist-tag named after its identifier, so
`latest` keeps pointing at the last full release:

```bash
bun run release -- --preRelease=beta    # 1.3.0-beta.0, published as raindrop-cli@beta
bun run release -- --preRelease=beta --npm.tag=next    # same version, under "next"
```

## When a step fails

- **Before the commit** (steps 1–3): nothing was changed on the remote. Fix the
  cause and run `bun run release` again; `git checkout -- .` discards a
  half-made bump.
- **GitHub Release** (step 5): the tag is pushed. Create the release from the
  tag with that version's CHANGELOG section as notes
  (`gh release create vX.Y.Z --title vX.Y.Z --notes-file <section>`), then run
  `bun run release:publish`.
- **npm publish** (step 6): the tag is pushed; only the publish is left. Run
  `bun run release:publish` from the tagged commit (it picks the prerelease
  dist-tag again; `bun run release:publish -- --tag <tag>` chooses another).

## Verify

```bash
npm view raindrop-cli version
npx raindrop-cli@latest --version     # rd X.Y.Z (sha7 YYYY-MM-DD)
```

## Notes

- **Immutable** — published npm versions cannot be changed, only deprecated.
- **Clean working directory required** — commit or stash changes before releasing.
- **Main branch only** — releases must be from the `main` branch.
- **Secrets** — the publish fails if `ggshield` detects secrets in the source
  tree or the freshly built `dist/`.
