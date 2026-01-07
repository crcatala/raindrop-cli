# Release Readiness Plan v0.1.0

> **The authoritative checklist for the 0.1.0 open source release.**
>
> Consolidates insights from three independent agent reviews (PRs #61, #62, #63).
> Those PRs can be closed after this plan is merged - their value is captured here.
>
> **Created:** January 6, 2026  
> **Tracking Epic:** rd-u22

---

## Executive Summary

**The codebase is fundamentally solid.** The gap is entirely in open source hygiene, not code quality.

| Aspect | Score | Notes |
|--------|-------|-------|
| Architecture | 9/10 | Clean separation, good patterns |
| TypeScript Quality | 9/10 | Strict mode, 1 `any` to fix |
| Test Coverage | ✅ | 520+ tests passing |
| CLI UX | 9.5/10 | Great help, shortcuts, TTY detection |
| Security | 9.5/10 | Secure file perms, clean `bun audit` |
| **OSS Readiness** | **4/10** | Missing files, CI risks |

**Estimated time to release-ready: ~2-3 hours of focused work.**

---

## 🔴 P0: Must Fix Before npm Publish

These are **release blockers**. Do not publish without completing all P0 items.

### 1. Add LICENSE File ⏱️ 5 min

No LICENSE file exists despite `package.json` claiming MIT.

```bash
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2026 Christian Catalan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
```

---

### 2. Control npm Package Contents ⏱️ 5 min

Currently `npm pack` would include `.beads/`, `plans/`, `coverage/`, etc.

**Add to package.json:**
```json
{
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ]
}
```

**Verify:**
```bash
npm pack --dry-run
# Should show ONLY: dist/*, README.md, LICENSE, package.json
```

---

### 3. Remove `postinstall` Hook ⏱️ 2 min

Current `"postinstall": "lefthook install"` will:
- Break for npm consumers (they don't have lefthook)
- Trigger security warnings in enterprise environments

**Fix:** Replace with `prepare` (only runs on git clone, not npm install):

```json
{
  "scripts": {
    "prepare": "lefthook install || true"
  }
}
```

Remove `postinstall` entirely.

---

### 4. Secure CI Live Tests Workflow ⏱️ 15 min

**Risk:** `.github/workflows/ci-live.yml` injects `RAINDROP_TOKEN` and can be triggered by PRs. A malicious PR could exfiltrate the token.

**Options (pick one):**

**Option A - Safest:** Delete the workflow before going public
```bash
rm .github/workflows/ci-live.yml
git add -A && git commit -m "chore: remove live tests workflow for OSS security"
```

**Option B - Keep but harden:**
```yaml
# Only run for repo members, not forks
on:
  pull_request:
    types: [opened, synchronize]
    
jobs:
  live-tests:
    # Skip for forks
    if: github.event.pull_request.head.repo.full_name == github.repository
    # ... rest of job
```

Also consider: GitHub Environments with required reviewers.

---

### 5. Fix Package Metadata ⏱️ 5 min

```json
{
  "author": "Christian Catalan <crcatala@gmail.com>",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/crcatala/raindrop-cli.git"
  },
  "bugs": {
    "url": "https://github.com/crcatala/raindrop-cli/issues"
  },
  "homepage": "https://github.com/crcatala/raindrop-cli#readme"
}
```

**Note:** Decide if you're keeping `-spike` in the repo name or renaming before publish.

---

### 6. Dynamic Version (Don't Hardcode) ⏱️ 10 min

Currently `src/index.ts` has `.version("0.1.0")` hardcoded.

**Fix:**
```typescript
// src/index.ts
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

program.version(pkg.version);
```

**Or** inject at build time via tsup define.

---

### 7. Verify Build Output ⏱️ 2 min

```bash
bun run build
head -1 dist/index.js        # Must show: #!/usr/bin/env node
node dist/index.js --help    # Must work
node dist/index.js --version # Must show version
```

---

## 🟠 P1: Strongly Recommended

Complete these for a polished first impression. Can be done same day as P0.

### 8. Update README ⏱️ 30 min

Current README uses `rd raindrops ...` but CLI uses `rd bookmarks ...`.

**Checklist:**
- [ ] Fix all command examples to use `bookmarks` not `raindrops`
- [ ] Document root shortcuts: `rd list`, `rd search`, `rd add`, `rd show`
- [ ] Add installation section with badges
- [ ] Document environment variables:
  - `RAINDROP_TOKEN` - API token (required)
  - `RDCLI_TIMEOUT` - Request timeout in seconds
  - `RDCLI_API_DELAY_MS` - Delay between API calls
- [ ] Add "Requirements" section: Node 20+
- [ ] Keep the `rd` vs `rdcli` alias note (Windows/oh-my-zsh) - it's helpful

**Badges to add:**
```markdown
[![npm version](https://img.shields.io/npm/v/raindrop-cli)](https://npmjs.com/package/raindrop-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
```

---

### 9. Fix TypeScript `any` Usage ⏱️ 5 min

One `any` found in codebase:

```typescript
// src/commands/bookmarks.ts:356
} catch (error: any) {

// Fix:
import { AxiosError } from 'axios';

} catch (error: unknown) {
  if (error instanceof AxiosError && error.response?.status !== 404) {
    throw error;
  }
}
```

---

### 10. Add CHANGELOG.md ⏱️ 15 min

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [0.1.0] - 2026-01-XX

### Added
- Initial public release
- Bookmark operations: `list`, `show`, `add`, `update`, `delete`
- Batch operations: `batch-update`, `batch-delete`
- Collection management: `list`, `show`, `add`, `delete`, `stats`
- Tag operations: `list`, `rename`, `delete`
- Highlights: `list`, `show`
- Filters: `list`
- Trash management: `list`, `empty`
- Output formats: `json`, `table`, `tsv`, `plain`
- Root shortcuts: `rd list`, `rd search`, `rd add`, `rd show`
- Smart TTY detection for output format defaults
- `--dry-run` support for destructive operations
```

---

### 11. Add Basic CI Workflow ⏱️ 10 min

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
          bun-version: '1.1.42'
      - run: bun install --frozen-lockfile
      - run: bun run verify
```

---

### 12. npx Compatibility ⏱️ 2 min

`npx raindrop-cli` won't work because bin names don't match package name.

**Add to package.json:**
```json
{
  "bin": {
    "rd": "dist/index.js",
    "rdcli": "dist/index.js",
    "raindrop-cli": "dist/index.js"
  }
}
```

---

### 13. Add prepublishOnly Script ⏱️ 2 min

Ensure build runs before publish:

```json
{
  "scripts": {
    "prepublishOnly": "bun run verify && bun run build"
  }
}
```

---

### 14. Add CONTRIBUTING.md ⏱️ 20 min

```markdown
# Contributing to raindrop-cli

## Prerequisites

- Node.js 20+
- Bun (for development)

## Setup

```bash
git clone https://github.com/crcatala/raindrop-cli.git
cd raindrop-cli
bun install
```

## Development

```bash
bun run verify    # Run all checks (lint, typecheck, test, format)
bun run build     # Build for production
bun run dev       # Watch mode
```

## Running Live Tests

Live tests require a Raindrop.io API token:

```bash
export RAINDROP_TOKEN=your-test-token
bun run test:live
```

**Note:** Use a dedicated test account, not your personal bookmarks.

## Pull Request Process

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Run `bun run verify`
5. Submit PR
```

---

## 🟡 P2: Post-Release Improvements

Track these for v0.2.0. Not blocking initial release.

### Documentation & Polish
- [ ] Add `CODE_OF_CONDUCT.md`
- [ ] Add `SECURITY.md` (how to report vulnerabilities)
- [ ] Add GitHub issue/PR templates
- [ ] Consider docs site (GitHub Pages or similar)

### Package Improvements
- [ ] Add `exports` field for ESM/CJS compatibility
- [ ] Separate library exports (use as both CLI and importable module)
- [ ] Add version + git SHA display (like `bird` does)
- [ ] Add `--no-emoji` flag for script-friendly plain output

### CI/CD
- [ ] Add npm publish workflow (on version tags)
- [ ] Add coverage thresholds
- [ ] Pin all CI dependency versions
- [ ] Add spell checking (`typos`)

### Code Quality
- [ ] Split `bookmarks.ts` (1500+ lines) into smaller modules
- [ ] Extract duplicated validation logic to shared utils
- [ ] Add test coverage reporting

### API Coverage (currently ~65%)
- [ ] `rd collections update` - rename, change visibility
- [ ] `rd bookmarks check-url` - duplicate detection
- [ ] `rd import html` - import from browser export
- [ ] `rd highlights add` - create highlights

---

## Pre-Publish Checklist

Run these **in order** immediately before `npm publish`:

```bash
# 1. Clean slate
rm -rf dist node_modules
bun install --frozen-lockfile

# 2. Quality gates
bun run verify

# 3. Build
bun run build

# 4. Smoke tests
node dist/index.js --help
node dist/index.js --version
node dist/index.js auth status 2>&1 | head -5  # Should show auth error, not crash

# 5. Package audit
npm pack --dry-run
# ✓ Only dist/, README.md, LICENSE, package.json

# 6. Dry run publish
npm publish --dry-run --access public

# 7. Final doc review
cat README.md | head -50  # Verify examples are correct
ls LICENSE                 # Verify exists
cat CHANGELOG.md | head -20 # Verify 0.1.0 entry
```

**Then publish:**
```bash
npm publish --access public
git tag v0.1.0
git push origin v0.1.0
```

---

## Time Estimates

| Priority | Items | Est. Time |
|----------|-------|-----------|
| **P0** | 7 items | ~45 min |
| **P1** | 7 items | ~1.5 hours |
| **Total for polished release** | 14 items | **~2-3 hours** |

---

## Appendix: Analysis Sources

This plan synthesizes three independent reviews:

| Agent | Focus | Key Contributions |
|-------|-------|-------------------|
| Opus-Focus (PR #61) | Deep code audit | Architecture scoring, API coverage analysis, TypeScript audit |
| Opus-Big (PR #62) | External comparison | bird/ccusage patterns, CI templates, library export ideas |
| GPT-5.2-Pro (PR #63) | npm/Security | CI secret risks, postinstall issues, npx compatibility |

All three PRs agreed on LICENSE and `files` field. GPT-5.2-Pro uniquely identified the CI security risk and postinstall problem. Opus-Focus provided the deepest code analysis. Opus-Big had the best external comparisons.

---

## References

- [bird](https://github.com/steipete/bird) - Excellent npm package patterns
- [ccusage](https://github.com/ryoppippi/ccusage) - Good publishing workflow  
- [npm package.json](https://docs.npmjs.com/cli/v10/configuring-npm/package-json)
- [Keep a Changelog](https://keepachangelog.com/)
- [clig.dev](https://clig.dev) - CLI guidelines
