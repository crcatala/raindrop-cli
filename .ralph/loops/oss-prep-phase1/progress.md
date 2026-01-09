# Ralph Progress Log
Started: 2026-01-07

## Codebase Patterns
(Patterns discovered during this loop will be added here)

## [2026-01-08 16:28] - rd-u22.1
- Added MIT LICENSE file with 2025 copyright.
- Files changed: LICENSE
- **Learnings:** Standard MIT license text used as per requirement.
---

## [2026-01-08 16:28] - rd-u22.2
- Cleaned up package.json for npm publish.
- Added "files" field to whitelist only dist, README.md, LICENSE.
- Replaced postinstall with prepare script (tolerant of failures).
- Updated metadata (author, repository, bugs, homepage) to point to raindrop-cli.
- Added npx compatibility with "raindrop-cli" bin entry.
- Added prepublishOnly script for safety.
- Files changed: package.json
- **Learnings:** npm pack --dry-run is excellent for verifying "files" field configuration.
---

## [2026-01-08 16:34] - rd-u22.3
- Secured CI live tests workflow to prevent secret exfiltration from forks.
- Added a check in `ci-live.yml` to verify `pr.data.head.repo.full_name` matches `pr.data.base.repo.full_name`.
- Files changed: .github/workflows/ci-live.yml
- **Learnings:** `issue_comment` workflows require explicit checking of PR source repository to be safe for secrets, as `if: github.event.pull_request...` doesn't work directly on top-level job context for this event type.
---

## [2026-01-08 16:38] - rd-u22.4
- Replaced hardcoded version "0.1.0" in `src/index.ts` with dynamic read from `package.json`.
- Used `fs.readFileSync` and `import.meta.url` to robustly locate `package.json` relative to script location.
- Verified works in both dev (`bun src/index.ts`) and built (`node dist/index.js`) modes.
- Files changed: src/index.ts
- **Learnings:** When using `bun build` targeting node, `import.meta.url` and `fs` operations work well for runtime file access, preserving directory structure assumptions.
---

## [2026-01-08 16:45] - rd-u22.5
- Replaced `any` type with `unknown` and `AxiosError` check in `src/commands/bookmarks.ts`.
- Ensured 404 behavior is preserved when deleting bookmarks permanently.
- Files changed: src/commands/bookmarks.ts
- **Learnings:** Explicit error typing with `unknown` and `instanceof` is safer and preferred over `any`.
---

## [2026-01-08 16:50] - rd-u22.6
- Hardened `.github/workflows/ci.yml` by pinning Bun version to 1.1.42 and using `--frozen-lockfile`.
- Implemented "Option A - Minimal fix" to ensure reproducibility and determinism in CI.
- Files changed: .github/workflows/ci.yml
- **Learnings:** Using `sed` is efficient for applying identical changes across multiple jobs in a YAML file. Pinned versions prevent unexpected breakages from upstream updates.
---

## [2026-01-08 16:55] - rd-u22.7
- Updated README.md to match actual CLI behavior and OSS requirements.
- Replaced outdated `rd raindrops` references with `rd bookmarks`.
- Added badges for npm version and license.
- Documented root shortcuts, environment variables, and requirements (Node.js 20+).
- Added `npx` usage instructions.
- Files changed: README.md
- **Learnings:** Direct file overwrite is sometimes cleaner than applying patches when rewriting documentation structures significantly.
---
