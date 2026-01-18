---
id: rd-6v1
status: closed
deps: []
links: []
created: 2026-01-09T22:47:06.107614585-08:00
type: feature
priority: 2
---
# Add release-it for automated releases

Integrate release-it to automate the release process without requiring conventional commits.

## Why release-it?

- Agnostic to commit message conventions (no conventional commits required)
- Interactive prompts for version selection
- Automates: version bump, git tag, GitHub release, npm publish
- Hooks for running tests/builds before release
- CI mode for fully automated releases

## Tasks

- [ ] Install release-it as dev dependency
- [ ] Add `.release-it.json` config
- [ ] Add `release` script to package.json
- [ ] Configure GitHub releases (uses GITHUB_TOKEN)
- [ ] Consider @release-it/keep-a-changelog plugin for CHANGELOG.md integration
- [ ] Test with `--dry-run`
- [ ] Document release process in CONTRIBUTING.md

## Minimal Config

```json
{
  "$schema": "https://unpkg.com/release-it@19/schema/release-it.json",
  "git": {
    "commitMessage": "chore: release v${version}"
  },
  "github": {
    "release": true
  },
  "hooks": {
    "before:init": ["bun run verify", "bun run build"]
  }
}
```

## Optional: Keep a Changelog Plugin

If we want CHANGELOG.md integration:
```bash
npm install -D @release-it/keep-a-changelog
```

Reads "Unreleased" section for GitHub release notes and updates heading with version/date.

## References

- https://github.com/release-it/release-it
- https://github.com/release-it/keep-a-changelog


