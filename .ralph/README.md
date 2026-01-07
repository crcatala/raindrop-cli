# Ralph - Autonomous AI Coding Loop

Ralph is an autonomous coding loop that runs an AI agent iteratively until all tasks are complete. Each iteration gets a fresh context window, with memory persisting through git commits and text files.

Based on [Geoffrey Huntley's Ralph](https://ghuntley.com/ralph).

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│                    ralph.sh loop                        │
├─────────────────────────────────────────────────────────┤
│  1. Read prompt.md                                      │
│  2. Agent reads prd.json (task list)                    │
│  3. Agent reads progress.md (learnings from past runs)  │
│  4. Agent picks first task where passes=false           │
│  5. Agent reads full details via `bd show <id>`         │
│  6. Agent implements the task                           │
│  7. Agent runs `bun run verify`                         │
│  8. Agent commits if passing                            │
│  9. Agent marks task done in prd.json                   │
│ 10. Agent logs learnings to progress.md                 │
│ 11. Loop repeats until all tasks pass                   │
└─────────────────────────────────────────────────────────┘
```

## Directory Structure

```
.ralph/
├── README.md           # This file
├── ralph.sh            # The loop script
└── loops/
    └── <loop-name>/
        ├── prd.json    # Task list with status
        ├── prompt.md   # Instructions for the agent
        └── progress.md # Learnings log (appended each iteration)
```

## Usage

```bash
# Run the default loop (oss-prep-phase1) with 25 iterations
.ralph/ralph.sh

# Run a specific loop with custom iteration limit
.ralph/ralph.sh oss-prep-phase1 50

# Run a different loop
.ralph/ralph.sh some-other-loop 25
```

## Creating a New Loop

1. Create a new directory under `.ralph/loops/`:
   ```bash
   mkdir -p .ralph/loops/my-feature
   ```

2. Create `prd.json` with your tasks:
   ```json
   {
     "name": "My Feature",
     "branch": "ralph/my-feature",
     "tasks": [
       { "id": "task-1", "title": "First task", "passes": false },
       { "id": "task-2", "title": "Second task", "passes": false }
     ]
   }
   ```

3. Create `prompt.md` with instructions (copy from an existing loop and modify)

4. Run: `.ralph/ralph.sh my-feature`

## Integration with Beads

This setup integrates with the `bd` (beads) issue tracker:

- Tasks in `prd.json` reference beads issue IDs (e.g., `rd-u22.1`)
- The agent uses `bd show <id>` to get full acceptance criteria
- The agent uses `bd close <id>` to mark issues complete
- The `notes` field in prd.json can override/clarify beads issue details

## Memory Persistence

Ralph maintains context across iterations through:

1. **prd.json** - Task status (passes: true/false)
2. **progress.md** - Learnings and patterns from each iteration
3. **Git commits** - The actual work product
4. **Beads issues** - Detailed acceptance criteria and status

Each iteration is a fresh context window - the agent doesn't remember previous iterations directly, but learns from progress.md and git history.

## Stop Conditions

Ralph stops when:
- All tasks have `"passes": true` (agent outputs `<promise>COMPLETE</promise>`)
- Maximum iterations reached (default: 25)
- Script is interrupted (Ctrl+C)

## Tips

- **Small tasks**: Each task should fit in one context window
- **Explicit criteria**: Use beads issues with clear acceptance criteria
- **Fast feedback**: `bun run verify` provides quick pass/fail signal
- **Log learnings**: Patterns in progress.md help future iterations
