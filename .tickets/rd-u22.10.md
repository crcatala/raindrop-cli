---
id: rd-u22.10
status: closed
deps: [rd-u22.1, rd-u22.2, rd-u22.3, rd-u22.4, rd-u22.5, rd-u22.6, rd-u22.7, rd-u22.8, rd-u22.9]
links: []
created: 2026-01-07T08:01:12.190432309-08:00
type: gate
priority: 0
parent: rd-u22
---
# Pre-migration verification gate

Verification checkpoint before creating public repo. Run in the private spike repo.

**Purpose:** Confirm all prep work is complete and working before migrating to public repo.

## Pre-Migration Checklist (run in spike repo)

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

# 5. Package audit - THIS IS KEY
npm pack --dry-run
# ✓ Must show ONLY: dist/*, README.md, LICENSE, package.json
# ✗ Must NOT show: .beads/, plans/, .github/, bun.lock, *.test.d.ts

# 6. Dry run publish
npm publish --dry-run --access public

# 7. Doc review
head -50 README.md        # Verify examples use "bookmarks" not "raindrops"
ls LICENSE                # Verify exists
head -20 CHANGELOG.md     # Verify 0.1.0 entry exists (date can be XX placeholder)
```

**Acceptance Criteria:**
- [ ] All checklist commands pass
- [ ] `npm pack --dry-run` shows ONLY intended files
- [ ] `--version` shows correct version (matches package.json)
- [ ] `--help` works
- [ ] README examples are accurate (bookmarks, not raindrops)
- [ ] LICENSE and CHANGELOG exist

**After this gate passes:** Proceed to create public repo (rd-u22.11)

**Reference:** plans/RELEASE-READINESS-v0.1.0.md - Pre-Publish Checklist (adapted for pre-migration)


