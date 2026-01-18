---
id: rd-u22.14
status: closed
deps: []
links: []
created: 2026-01-09T05:57:14.207213537-08:00
type: task
priority: 2
parent: rd-u22
---
# Add secret scanning with gitleaks or GitGuardian

Add automated secret scanning to CI to catch accidentally committed secrets (API keys, passwords, tokens).

Options:
1. **gitleaks** (open source):
```yaml
- uses: gitleaks/gitleaks-action@v2
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

2. **GitGuardian** (SaaS, more features):
```yaml
- uses: GitGuardian/ggshield-action@v1
  env:
    GITGUARDIAN_API_KEY: ${{ secrets.GITGUARDIAN_API_KEY }}
```

This is complementary to runtime secret protection - it prevents YOUR secrets from being committed to the repo.


