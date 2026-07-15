# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Fixed
- Added `rd auth whoami` as an alias for viewing authentication status, including JSON output support (rc-fa9w).

## [0.3.0] - 2026-07-15

### Added
- Structured JSON error output, standard exit codes, and graceful signal handling for CLI failures (#7)

### Changed
- Require Node.js 22 or later for compatibility with the Raindrop client update (#14)

### Fixed
- Restore startup of the installed CLI.
- Suppress a Node.js deprecation warning during CLI use.

### Security
- Remediated vulnerable transitive dependencies with enforced safe versions (rc-79cy)

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
