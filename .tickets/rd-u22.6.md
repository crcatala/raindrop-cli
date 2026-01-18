---
id: rd-u22.6
status: closed
deps: []
links: []
created: 2026-01-07T08:00:30.0685767-08:00
type: task
priority: 1
parent: rd-u22
---
# Review and harden existing CI workflow

Review and harden the existing GitHub Actions CI workflow.

**Context:** A CI workflow already exists at `.github/workflows/ci.yml` with lint, typecheck, test, and format jobs. Review for improvements.

**Issues to address:**
1. Uses `bun-version: latest` - should pin to specific version (1.1.42) for reproducibility
2. Uses `bun install` without `--frozen-lockfile` - should add for CI determinism
3. Four separate jobs means 4x setup overhead - consider consolidating

**Option A - Minimal fix (recommended for v0.1.0):**
- Pin bun version
- Add `--frozen-lockfile`

**Option B - Full consolidation:**
- Combine into single job running `bun run verify`
- Reduces CI time and resource usage

**Current workflow structure:**
```yaml
jobs:
  lint: ...
  typecheck: ...
  test: ...      # includes build and coverage
  format: ...
```

**Acceptance Criteria:**
- [ ] Bun version pinned (not `latest`)
- [ ] `--frozen-lockfile` used in CI
- [ ] CI passes on current main branch

**Reference:** plans/RELEASE-READINESS-v0.1.0.md §11


