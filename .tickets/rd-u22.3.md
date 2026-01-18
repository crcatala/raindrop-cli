---
id: rd-u22.3
status: closed
deps: []
links: []
created: 2026-01-07T07:59:41.319165645-08:00
type: task
priority: 0
parent: rd-u22
---
# Secure CI live tests workflow

Harden or remove CI live tests workflow to prevent secret exfiltration.

**Risk:** `.github/workflows/ci-live.yml` injects `RAINDROP_TOKEN` and can be triggered by PRs. A malicious PR could exfiltrate the token.

## Options

### Option A - Safest: Delete the workflow
```bash
rm .github/workflows/ci-live.yml
```

### Option B - Keep but harden
```yaml
on:
  pull_request:
    types: [opened, synchronize]
    
jobs:
  live-tests:
    # Skip for forks - prevents secret access from external PRs
    if: github.event.pull_request.head.repo.full_name == github.repository
    # ... rest of job
```

Also consider: GitHub Environments with required reviewers.

**Recommendation:** Option A is safest for initial OSS release. Can add hardened version later.

**Acceptance Criteria:**
- [ ] CI workflow cannot expose RAINDROP_TOKEN to untrusted PR code
- [ ] Either workflow removed OR protected with fork check

**Reference:** plans/RELEASE-READINESS-v0.1.0.md §4


