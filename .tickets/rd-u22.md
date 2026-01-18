---
id: rd-u22
status: open
deps: []
links: []
created: 2026-01-06T16:40:01.559650973-08:00
type: epic
priority: 0
---
# OSS + npm v0.1.0 release readiness

Track the remaining work to make this repo ready for a public OSS release and first npm publish.

**Primary reference:** plans/RELEASE-READINESS-v0.1.0.md

## Release Flow

**Phase 1: Prep work (in private spike repo)**
- P0 tasks: LICENSE, package.json, CI security, dynamic version
- P1 tasks: TypeScript cleanup, CI hardening, README, CONTRIBUTING, CHANGELOG

**Phase 2: Pre-migration verification**
- Run full verification checklist in spike repo
- Confirm npm pack, build, tests all work

**Phase 3: Public repo + publish**
- Create public `raindrop-cli` repo with clean history
- Copy verified code, final smoke test
- npm publish

## Exit Criteria
- Public repo `github.com/crcatala/raindrop-cli` exists
- `npm install -g raindrop-cli` works
- Package contains only intended files
- All documentation accurate and complete


