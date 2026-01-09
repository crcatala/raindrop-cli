# Ralph Progress Log: CI Security Hardening
Started: 2026-01-09 07:11

## Codebase Patterns
- **bun install** may need to be run if node_modules is stale or missing dev dependencies like `nock`
- **Workflow files**: ci.yml has 4 jobs (lint, typecheck, test, format) each with checkout+setup-bun
- **ci-live.yml**: Uses github-script action 6 times for GitHub API interactions (checks, comments)

---

## [2026-01-09 07:12] - rd-u22.13
- Pinned all GitHub Actions to SHA commits for supply chain security
- Updated actions/checkout@v4 → @8e8c483db84b4bee98b60c0593521ed34d9990e8 (v6.0.1)
- Updated oven-sh/setup-bun@v2 → @b7a1c7ccf290d58743029c4f6903da283811b979 (v2.1.0)
- Updated actions/github-script@v7 → @ed597411d8f924073f98dfc5c65a23a2325f34cd (v8.0.0)
- Files changed: .github/workflows/ci.yml, .github/workflows/ci-live.yml
- **Learnings:** Keep version comments after SHA for Dependabot compatibility and maintainability
---
