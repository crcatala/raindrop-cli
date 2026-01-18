---
id: rd-u22.2
status: closed
deps: []
links: []
created: 2026-01-07T07:59:29.55279599-08:00
type: chore
priority: 0
parent: rd-u22
---
# Package.json cleanup for npm publish

Bundle of package.json fixes required for clean npm publish.

**Context:** Current package.json has several issues:
- Missing `files` field (would expose internal files like `.beads/`, `plans/`)
- `postinstall: lefthook install` breaks npm consumers
- Metadata points to `-spike` repo variant
- Missing npx compatibility
- Missing prepublishOnly safety script

**Note:** Set URLs to final repo name (`raindrop-cli`) now. The repo does not exist yet but that is fine - these are metadata for npm, and we will create the public repo before publishing.

## Changes Required

### 1. Add files field (controls npm pack contents)
```json
"files": [
  "dist",
  "README.md",
  "LICENSE"
]
```

### 2. Remove postinstall hook, add prepare
```json
"scripts": {
  "prepare": "lefthook install || true"
}
```
Remove postinstall entirely.

### 3. Update metadata to final repo name
```json
"author": "Christian Catalan <crcatala@gmail.com>",
"repository": {
  "type": "git",
  "url": "git+https://github.com/crcatala/raindrop-cli.git"
},
"bugs": {
  "url": "https://github.com/crcatala/raindrop-cli/issues"
},
"homepage": "https://github.com/crcatala/raindrop-cli#readme"
```

### 4. Add npx compatibility
```json
"bin": {
  "rd": "dist/index.js",
  "rdcli": "dist/index.js",
  "raindrop-cli": "dist/index.js"
}
```

### 5. Add prepublishOnly script
```json
"scripts": {
  "prepublishOnly": "bun run verify && bun run build"
}
```

**Acceptance Criteria:**
- [ ] `npm pack --dry-run` shows ONLY: dist/*, README.md, LICENSE, package.json
- [ ] No postinstall hook
- [ ] prepare script handles lefthook gracefully  
- [ ] Author field populated
- [ ] Repository URLs point to `raindrop-cli` (not `-spike`)
- [ ] Three bin entries: rd, rdcli, raindrop-cli

**Reference:** plans/RELEASE-READINESS-v0.1.0.md §2, §3, §5, §12, §13


