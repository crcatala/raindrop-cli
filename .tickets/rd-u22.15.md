---
id: rd-u22.15
status: closed
deps: []
links: []
created: 2026-01-09T05:57:21.227421073-08:00
type: task
priority: 2
parent: rd-u22
---
# Add CODEOWNERS for .github/workflows/

Add a CODEOWNERS file to require maintainer approval for workflow changes.

```
# .github/CODEOWNERS
/.github/workflows/ @crcatala
```

This ensures workflow changes require explicit approval before merge. Note: This doesn't prevent workflows from *running* on PRs, just from *merging* without review.

Combined with GitHub's fork approval settings, this provides defense in depth for CI security.


