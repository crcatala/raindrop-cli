---
id: rd-u22.12
status: open
deps: [rd-u22.11]
links: []
created: 2026-01-07T08:38:00.712274843-08:00
type: gate
priority: 0
parent: rd-u22
---
# Final verification and npm publish

Final verification in public repo and npm publish.

**Prerequisites:** rd-u22.11 (public repo created and code migrated)

## Final Verification Checklist

Run these in the freshly cloned public repo:

```bash
cd raindrop-cli  # The public repo

# 1. Clean install
rm -rf node_modules dist
bun install --frozen-lockfile

# 2. Full verification
bun run verify

# 3. Build
bun run build

# 4. Smoke tests
node dist/index.js --help
node dist/index.js --version
node dist/index.js auth status 2>&1 | head -5

# 5. Package audit
npm pack --dry-run
# Verify: ONLY dist/*, README.md, LICENSE, package.json

# 6. Final publish dry-run
npm publish --dry-run --access public
```

## Pre-Publish Final Checks

- [ ] CHANGELOG.md has actual release date (not XX placeholder)
- [ ] README badges will resolve once published
- [ ] You are logged into npm (`npm whoami`)

## Publish!

```bash
# Update CHANGELOG date first
# e.g., ## [0.1.0] - 2026-01-07

# Commit the date change
git add CHANGELOG.md
git commit -m "chore: set release date for v0.1.0"
git push

# Publish to npm
npm publish --access public

# Tag the release
git tag v0.1.0
git push origin v0.1.0

# Verify it worked
npm info raindrop-cli
npx raindrop-cli --version
```

## Post-Publish

- [ ] Create GitHub release from v0.1.0 tag
- [ ] Verify `npm install -g raindrop-cli` works
- [ ] Verify `npx raindrop-cli --help` works
- [ ] Celebrate! 🎉

**Acceptance Criteria:**
- [ ] Package published to npm as `raindrop-cli`
- [ ] v0.1.0 git tag exists and pushed
- [ ] `npm install -g raindrop-cli && rd --version` works
- [ ] GitHub release created (optional but nice)


