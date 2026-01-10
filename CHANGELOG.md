# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

## [0.1.1] - 2026-01-10

### Added
- Automated releases with release-it
- Support for `XDG_CONFIG_HOME` environment variable to override config directory

### Fixed
- Graceful handling of broken pipes (EPIPE) when piping CLI output

## [0.1.0] - 2026-01-09

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
