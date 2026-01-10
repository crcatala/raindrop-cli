# Ralph - Autonomous AI Coding Loop

Ralph is an autonomous coding loop that runs an AI agent iteratively until all tasks are complete. Each iteration gets a fresh context window, with memory persisting through git commits and a progress log.

Based on [Geoffrey Huntley's Ralph](https://ghuntley.com/ralph).

## Quick Start

```bash
# List available loops
.ralph/ralph.sh list

# Create a new loop from template
.ralph/ralph.sh new my-feature

# Edit the prd
vim .ralph/loops/my-feature/prd.yaml

# Validate before running
.ralph/ralph.sh validate my-feature

# Run the loop
.ralph/ralph.sh run my-feature
```

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│                    ralph.sh loop                        │
├─────────────────────────────────────────────────────────┤
│  1. Validate prd.yaml                              │
│  2. Generate prompt from templates + prd           │
│  3. Agent reads prd (task list)                    │
│  4. Agent reads progress.md (learnings from past runs)  │
│  5. Agent picks first task where status=pending         │
│  6. Agent implements the task                           │
│  7. Agent runs pre_commit verification (if configured)  │
│  8. Agent marks task done in prd                   │
│  9. Agent logs learnings to progress.md                 │
│ 10. Agent commits all changes                           │
│ 11. Loop repeats until all tasks done                   │
│ 12. Creates PR if configured                            │
└─────────────────────────────────────────────────────────┘
```

## Directory Structure

```
.ralph/
├── README.md              # This file
├── ralph.sh               # The loop runner
├── prd.yaml.example       # Template for new loops
├── templates/
│   ├── base.md            # Core loop instructions
│   └── beads.md           # Beads issue tracker integration
├── loops/
│   └── <your-loop>/
│       ├── prd.yaml       # Loop configuration
│       └── progress.md    # Learnings log (auto-created)
└── loops-archived/        # Completed/old loops for reference
    └── <old-loop>/

~/.ralph/sessions/         # Pi session files (for debugging)
└── <loop-name>/
    └── *.jsonl
```

## Manifest Reference

```yaml
# Required fields
name: "Feature Name"
branch: "ralph/feature-branch"
create_pr: true           # Create PR when loop completes
issue_tracker: none       # "none" or "beads"

# Optional fields
description: "Description for PR body"
pr_title: "Custom PR title"  # Defaults to name
pre_commit: "bun run verify" # Command to run before each commit

# Tasks
tasks:
  - title: Task description
    status: pending        # pending | done
    acceptance:            # Inline acceptance criteria
      - "Criterion 1"
      - "Criterion 2"
    notes: "Additional context"

  # With beads integration (issue_tracker: beads)
  - id: rd-u22.1           # Required when using beads
    title: Task from beads
    status: pending
    notes: "Supplements beads issue details"
```

## Issue Tracker Integration

### No Issue Tracker (`issue_tracker: none`)
- Tasks use inline `acceptance` criteria
- No external lookups or issue closing
- Good for: quick batches, experiments, one-off automation

### Beads (`issue_tracker: beads`)
- Agent runs `bd show <id>` to get acceptance criteria
- Agent runs `bd close <id>` when task completes
- Task `id` field is required
- Good for: tracked work, multi-session projects, auditing

## Usage

```bash
# List available loops
.ralph/ralph.sh list

# Create a new loop
.ralph/ralph.sh new <loop-name>

# Validate a loop's prd.yaml
.ralph/ralph.sh validate <loop-name>

# Run a loop (default: 25 iterations)
.ralph/ralph.sh run <loop-name>

# Run with custom iteration limit
.ralph/ralph.sh run <loop-name> -n 50

# Run with branch override (useful for comparing LLM models)
.ralph/ralph.sh run <loop-name> --branch ralph/my-feature-opus
.ralph/ralph.sh run <loop-name> --branch ralph/my-feature-sonnet

# Archive a completed loop
.ralph/ralph.sh archive <loop-name>

# Archive with automatic git commit
.ralph/ralph.sh archive <loop-name> --commit

# Archive an incomplete loop (abandoned/stale)
.ralph/ralph.sh archive <loop-name> --force
```

### Branch Override

Use `--branch` to run the same loop on a different branch. This is useful for:
- Comparing results between different LLM models
- Re-running a loop from scratch without affecting the original branch
- A/B testing different approaches

Sessions are stored separately per branch, so you can compare outputs.

## Creating a New Loop

1. Create from template:
   ```bash
   .ralph/ralph.sh new my-feature
   ```

2. Edit `prd.yaml`:
   ```bash
   vim .ralph/loops/my-feature/prd.yaml
   ```
   - Set `name`, `branch`, `create_pr`
   - Choose `issue_tracker` mode
   - Add your tasks with acceptance criteria

3. Validate and run:
   ```bash
   .ralph/ralph.sh validate my-feature
   .ralph/ralph.sh run my-feature
   ```

## Validation

The script validates prd.yaml files before running:
- Required fields present (`name`, `branch`, `create_pr`, `issue_tracker`)
- Valid `issue_tracker` value (`none` or `beads`)
- Valid `create_pr` value (boolean)
- `tasks` section exists

## Completion Signal

The agent signals completion by outputting:
```
<loop>COMPLETE</loop>
```

When detected, the loop:
1. Stops iterating
2. Creates PR if `create_pr: true`
3. Exits successfully

## PR Creation

When `create_pr: true`, after all tasks complete:
1. Branch is pushed to origin
2. PR is created with:
   - Title from `pr_title` (or `name`)
   - Body from `description` + git log
3. All automated, no agent context used

## Debugging

Session files are saved to `~/.ralph/sessions/<loop-name>/`:

```bash
# List sessions
ls -la ~/.ralph/sessions/<loop-name>/

# Export to HTML for review
pi --export ~/.ralph/sessions/<loop-name>/<session>.jsonl output.html
```

## Tips

- **Small tasks**: Each task should fit in one context window
- **Explicit criteria**: Use clear acceptance criteria
- **Fast feedback**: Configure `pre_commit` for quick verification
- **Log learnings**: Patterns in progress.md help future iterations
- **Iterate**: Start with `issue_tracker: none` for quick experiments
