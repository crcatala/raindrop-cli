---
id: rd-u22.13
status: closed
deps: []
links: []
created: 2026-01-09T05:57:06.752524061-08:00
type: task
priority: 2
parent: rd-u22
---
# Pin GitHub Actions to SHA commits

Pin all actions in workflows to specific SHA commits instead of version tags for supply chain security.

## Action SHAs (researched 2026-01-09)

| Action | SHA | Version |
|--------|-----|---------|
| actions/checkout | 34e114876b0b11c390a56381ad16ebd13914f8d5 | v4.3.1 |
| actions/github-script | f28e40c7f34bde8b3046d885e986cb6290c5673b | v7.1.0 |
| oven-sh/setup-bun | b7a1c7ccf290d58743029c4f6903da283811b979 | v2.1.0 |

## Example
```yaml
# Instead of:
uses: actions/checkout@v4
# Use:
uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5  # v4.3.1
```

Keep version comment for maintainability and Dependabot compatibility.

## Files to update
- .github/workflows/ci.yml
- .github/workflows/ci-live.yml

## Why
Prevents supply chain attacks where a tag could be moved to a malicious commit. SHAs are immutable.


