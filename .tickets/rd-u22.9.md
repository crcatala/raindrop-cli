---
id: rd-u22.9
status: closed
deps: []
links: []
created: 2026-01-07T08:01:00.149360143-08:00
type: task
priority: 1
parent: rd-u22
---
# Add CHANGELOG.md

Add changelog documenting the 0.1.0 release.

**Note:** Can be worked on in parallel with other tasks. Only the release date needs to be filled in just before publish.

**Content:**
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

**Acceptance Criteria:**
- [ ] CHANGELOG.md exists at repo root
- [ ] Follows Keep a Changelog format (link to spec included)
- [ ] Documents all major features for 0.1.0
- [ ] `XX` placeholder noted - fill in actual date just before publish

**Reference:** plans/RELEASE-READINESS-v0.1.0.md §10


