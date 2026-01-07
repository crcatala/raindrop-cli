# Release Readiness Plan v0.1.0

> **Synthesized from three independent agent reviews:**
> - PR #62 (Opus-Big): Comparative analysis vs bird/ccusage
> - PR #61 (Opus-Focus): Deep 10-document codebase audit  
> - PR #63 (GPT-5.2-Pro): npm/OSS security focus
>
> **Created:** January 6, 2026

---

## Executive Summary

All three agents agree: **the codebase is fundamentally solid and ready for 0.1.0** with a handful of must-fix items. The project has excellent foundations:

| Aspect | Assessment | Source |
|--------|------------|--------|
| Architecture | 9/10 | PR #61 |
| TypeScript Quality | 9/10 (strict mode, 1 `any` to fix) | PR #61 |
| Test Coverage | 520+ tests passing | All |
| CLI UX | 9.5/10 | PR #61 |
| Security Posture | 9.5/10 (secure perms, clean audit) | PR #61 |
| Open Source Readiness | **4/10** (missing files) | PR #61 |

The gap is entirely in **open source hygiene**, not code quality.

---

## 🔴 P0: Must Fix Before npm Publish

These items were flagged as critical by **all three agents**:

### 1. Add LICENSE File ⏱️ 5 min
All agents identified this as the #1 blocker.

```bash
# Create MIT license with current year
curl -s https://api.github.com/licenses/mit | jq -r '.body' | sed 's/\[year\]/2026/' | sed 's/\[fullname\]/Christian Catalan/' > LICENSE
```

### 2. Add `files` Field to package.json ⏱️ 5 min
Control what gets published to npm. Currently `.beads/`, `plans/`, coverage files would ship.

```json
{
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ]
}
```

**Verification:** `npm pack --dry-run` must show only intended files.

### 3. Remove `postinstall` Hook 🆕 ⏱️ 2 min
*Unique insight from PR #63 (GPT-5.2-Pro)*

Current `"postinstall": "lefthook install"` will break for npm consumers and is a security red flag.

**Fix:** Remove `postinstall`, move to `prepare` script (only runs from git, not npm).

### 4. Harden CI Live Tests Workflow 🆕 ⏱️ 15 min
*Unique insight from PR #63 (GPT-5.2-Pro)*

`.github/workflows/ci-live.yml` can leak `RAINDROP_TOKEN` if a malicious PR modifies test code.

**Options (pick one):**
- **Safest:** Remove workflow from public repo entirely
- **If keeping:** Require `OWNER`/`MEMBER` actors only, use GitHub environments with manual approval

### 5. Fix Package Metadata ⏱️ 2 min
```json
{
  "author": "Christian Catalan <crcatala@gmail.com>",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/crcatala/raindrop-cli.git"
  }
}
```

Note: Remove `-spike` from repo URLs before publish.

### 6. Read Version from package.json ⏱️ 10 min
*Identified by PR #63 (GPT-5.2-Pro)*

Currently hardcoded: `.version("0.1.0")`. This will drift.

```typescript
import pkg from '../package.json' with { type: 'json' };
program.version(pkg.version);
```

### 7. Verify Built Output ⏱️ 2 min
```bash
bun run build
head -1 dist/index.js  # Must show: #!/usr/bin/env node
node dist/index.js --help
node dist/index.js --version
```

---

## 🟠 P1: Strongly Recommended for Polish

### README Alignment ⏱️ 30 min
*All agents flagged this*

Current README uses `rd raindrops ...` but actual commands are `rd bookmarks ...`.

**Update:**
- Installation examples
- Feature list matches actual commands
- Document shortcuts (`rd list`, `rd search`)
- Add badges (npm version, license)
- Document env vars: `RAINDROP_TOKEN`, `RDCLI_TIMEOUT`, `RDCLI_API_DELAY_MS`

### Fix Single `any` Type ⏱️ 5 min
*From PR #61 (Opus-Focus) TypeScript audit*

```typescript
// src/commands/bookmarks.ts:356
} catch (error: any) {  // ← Fix this

// Change to:
} catch (error: unknown) {
  if (error instanceof AxiosError && error.response?.status !== 404) {
    throw error;
  }
}
```

### Add Basic CI Workflow ⏱️ 15 min
```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: '1.1.42'  # Pin version!
      - run: bun install
      - run: bun run verify
```

### Add CHANGELOG.md ⏱️ 15 min
```markdown
# Changelog

## [0.1.0] - 2026-01-XX

### Added
- Initial public release
- Full bookmark CRUD operations (`list`, `show`, `add`, `update`, `delete`)
- Batch operations (`batch-update`, `batch-delete`)
- Collection management
- Tag operations
- Highlights viewing
- Multiple output formats: json, table, tsv, plain
- Root-level shortcuts: `rd list`, `rd search`, `rd add`, `rd show`
- Smart TTY detection for output format
```

### npx Compatibility 🆕 ⏱️ 2 min
*From PR #63 (GPT-5.2-Pro)*

`npx raindrop-cli` won't work because bin entries don't match package name.

**Option A:** Add matching bin entry
```json
{
  "bin": {
    "rd": "dist/index.js",
    "rdcli": "dist/index.js",
    "raindrop-cli": "dist/index.js"
  }
}
```

**Option B:** Document: `npx -p raindrop-cli rd --help`

### Contributor Docs ⏱️ 30 min
Add minimal `CONTRIBUTING.md`:
- Prerequisites: Node 20+, Bun
- Setup: `bun install`, `bun run verify`
- How to run live tests safely
- PR process

---

## 🟡 P2: Nice to Have (Post-0.1.0)

These are good improvements but not blocking release:

| Item | Source | Notes |
|------|--------|-------|
| CHANGELOG auto-generation | PR #62 | Consider changesets or conventional commits |
| Library exports (`exports` field) | PR #62 | Enable using as both CLI and importable library |
| Coverage thresholds | PR #62 | Prevent regression |
| Add `--no-emoji` mode | PR #63 | For script-friendly plain output |
| Publish automation workflow | All | GitHub Actions + npm on version tags |
| API coverage expansion | PR #61 | Add `collections update`, import commands |
| Split large bookmark.ts file | PR #61 | 1500+ lines → modular structure |
| Spell checking in CI | PR #62 | `typos` tool |

---

## Pre-Publish Checklist

Run these **in order** before `npm publish`:

```bash
# 1. Quality gates
bun run verify

# 2. Build
bun run build

# 3. Smoke tests
node dist/index.js --help
node dist/index.js --version

# 4. Package audit
npm pack --dry-run
# Verify: only dist/, README.md, LICENSE appear

# 5. Dry run publish
npm publish --dry-run --access public

# 6. Final docs check
# - README examples match actual commands
# - LICENSE file exists
# - CHANGELOG has 0.1.0 entry
```

---

## Comparison: What Each Agent Contributed

| Insight | PR #61 (Opus-Focus) | PR #62 (Opus-Big) | PR #63 (GPT-5.2-Pro) |
|---------|---------------------|-------------------|----------------------|
| LICENSE file needed | ✅ | ✅ | ✅ |
| `files` field needed | ✅ | ✅ | ✅ |
| CI security risk (secrets) | ❌ | ❌ | ✅ 🆕 |
| postinstall hook risk | ❌ | ❌ | ✅ 🆕 |
| npx compatibility | ❌ | ❌ | ✅ 🆕 |
| TypeScript `any` audit | ✅ | ❌ | ❌ |
| API coverage analysis | ✅ | ❌ | ❌ |
| Comparison with bird/ccusage | ❌ | ✅ | ✅ |
| Library export pattern | ❌ | ✅ | ❌ |
| Version from package.json | ❌ | ✅ | ✅ |
| Architecture scoring | ✅ | ❌ | ❌ |
| Phased action plan | ❌ | ✅ | ✅ |

**Key unique insights by agent:**
- **PR #61**: Deep code quality audit, API coverage gaps, architecture assessment
- **PR #62**: External project comparison, library export patterns, CI/CD templates
- **PR #63**: Security focus (CI secrets, postinstall), npm consumer perspective

---

## Recommended Merge Strategy

1. **Merge PR #63 first** - It has the tracking epic (rd-u22) and most critical security findings
2. **Cherry-pick from PR #62** - The CI workflow templates and comparison table
3. **Reference PR #61** - The detailed audits are valuable documentation for v0.2.0 planning

Or: Create a single consolidated PR that takes the best from all three.

---

## Quick Wins Summary

| Task | Time | Impact |
|------|------|--------|
| Add LICENSE | 5 min | Unblocks release |
| Add `files` field | 5 min | Clean npm package |
| Remove postinstall | 2 min | Safe for npm users |
| Fix author field | 1 min | Package metadata |
| Read version from pkg | 10 min | No drift |
| **Total P0** | **~25 min** | **Release ready** |

---

## References

- [bird repo](https://github.com/steipete/bird) - Excellent npm package patterns
- [ccusage repo](https://github.com/ryoppippi/ccusage) - Good publishing workflow
- [npm package.json docs](https://docs.npmjs.com/cli/v10/configuring-npm/package-json)
- [Keep a Changelog](https://keepachangelog.com/)
- [clig.dev](https://clig.dev) - CLI guidelines (already followed well)
