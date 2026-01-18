---
id: rd-u22.11
status: closed
deps: [rd-u22.10]
links: []
created: 2026-01-07T08:37:48.957734853-08:00
type: task
priority: 0
parent: rd-u22
---
# Create public raindrop-cli repo and migrate code

Create clean public repository and migrate verified code from spike repo.

**Prerequisites:** rd-u22.10 (pre-migration verification) must pass first.

## Steps

### 1. Create new public repo on GitHub
- Name: `raindrop-cli`
- Visibility: Public
- No README/LICENSE/gitignore (we have our own)

### 2. Prepare migration in spike repo
```bash
cd raindrop-cli-spike

# Create a clean export (no .git history)
mkdir -p ../raindrop-cli-export
rsync -av --exclude=.git --exclude=node_modules --exclude=dist --exclude=coverage ./ ../raindrop-cli-export/
```

### 3. Initialize and push to public repo
```bash
cd ../raindrop-cli-export
git init
git add -A
git commit -m "Initial release v0.1.0

Features:
- Bookmark operations: list, show, add, update, delete, batch-update, batch-delete
- Collection management: list, show, add, delete, stats
- Tag operations: list, rename, delete  
- Highlights: list, show
- Filters: list
- Trash: list, empty
- Multiple output formats: json, table, tsv, plain
- Root shortcuts: rd list, rd search, rd add, rd show
- Smart TTY detection for output format defaults"

git remote add origin git@github.com:crcatala/raindrop-cli.git
git branch -M main
git push -u origin main
```

### 4. Decision: What to include?

**Definitely include:**
- src/, scripts/, dist/ (after build)
- package.json, tsconfig.json, bunfig.toml, etc.
- README.md, LICENSE, CHANGELOG.md, CONTRIBUTING.md
- .github/workflows/ (CI)
- .gitignore, .prettierrc, lefthook.yml

**Your choice:**
- `.beads/` - Issue tracker. Include for transparency, exclude for cleaner repo
- `plans/` - Planning docs. Same consideration

### 5. Clone fresh and verify
```bash
cd ..
git clone git@github.com:crcatala/raindrop-cli.git raindrop-cli-fresh
cd raindrop-cli-fresh
bun install
bun run verify
bun run build
```

**Acceptance Criteria:**
- [ ] github.com/crcatala/raindrop-cli exists and is public
- [ ] Single clean initial commit (no spike history)
- [ ] All source files present
- [ ] `bun install && bun run verify` passes in fresh clone
- [ ] Repo has appropriate description/topics on GitHub

**After completion:** Proceed to final publish (rd-u22.12)


