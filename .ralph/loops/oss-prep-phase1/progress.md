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
