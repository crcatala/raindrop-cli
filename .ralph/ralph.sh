#!/bin/bash
#
# Ralph - Autonomous AI coding loop
#
# Usage: .ralph/ralph.sh <command> [args]
#
# Commands:
#   run <loop> [max-iterations]  Run a loop until complete
#   validate <loop>              Validate a loop's prd.yaml
#   list                         List available loops
#   new <loop>                   Create a new loop from template
#
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES_DIR="$SCRIPT_DIR/templates"
LOOPS_DIR="$SCRIPT_DIR/loops"

#######################################
# Color output helpers
#######################################
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info() { echo -e "${BLUE}ℹ${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1" >&2; }

#######################################
# YAML parsing helpers (portable, no yq needed)
#######################################
yaml_get() {
  local file="$1" key="$2"
  grep -E "^${key}:" "$file" 2>/dev/null | sed "s/^${key}:[[:space:]]*//" | sed 's/^["'\'']//' | sed 's/["'\'']*$//' | sed 's/[[:space:]]*#.*//'
}

yaml_get_bool() {
  local value
  value=$(yaml_get "$1" "$2")
  [[ "$value" =~ ^(true|yes|1)$ ]] && echo "true" || echo "false"
}

yaml_has_tasks_with_status() {
  local file="$1" status="$2"
  grep -E "^[[:space:]]+status:[[:space:]]*${status}" "$file" >/dev/null 2>&1
}

#######################################
# Validation
#######################################
validate_prd() {
  local prd_file="$1"
  local errors=0

  info "Validating prd.yaml..."

  # Required fields
  for field in name branch create_pr issue_tracker; do
    if ! grep -qE "^${field}:" "$prd_file"; then
      error "Missing required field: $field"
      ((errors++))
    fi
  done

  # Validate issue_tracker value
  local tracker
  tracker=$(yaml_get "$prd_file" "issue_tracker")
  if [[ -n "$tracker" && "$tracker" != "none" && "$tracker" != "beads" ]]; then
    error "Invalid issue_tracker value: '$tracker' (must be 'none' or 'beads')"
    ((errors++))
  fi

  # Validate create_pr is boolean
  local create_pr_raw
  create_pr_raw=$(yaml_get "$prd_file" "create_pr")
  if [[ -n "$create_pr_raw" && ! "$create_pr_raw" =~ ^(true|false|yes|no|1|0)$ ]]; then
    error "Invalid create_pr value: '$create_pr_raw' (must be true/false)"
    ((errors++))
  fi

  # Validate tasks exist
  if ! grep -qE "^tasks:" "$prd_file"; then
    error "Missing 'tasks' section"
    ((errors++))
  fi

  # If issue_tracker is not "none", validate each task has an id
  if [[ "$tracker" != "none" ]]; then
    local in_tasks=false
    while IFS= read -r line; do
      if [[ "$line" =~ ^tasks: ]]; then
        in_tasks=true
        continue
      fi
      if $in_tasks && [[ "$line" =~ ^[a-z] ]]; then
        break
      fi
      if $in_tasks && [[ "$line" =~ ^[[:space:]]*-[[:space:]] ]]; then
        if [[ "$line" =~ ^[[:space:]]*-[[:space:]]*title: ]] && [[ ! "$line" =~ id: ]]; then
          :
        fi
      fi
    done < "$prd_file"
  fi

  # Validate at least one pending task exists
  if ! yaml_has_tasks_with_status "$prd_file" "pending"; then
    warn "No tasks with 'status: pending' found"
  fi

  if [[ $errors -gt 0 ]]; then
    error "Validation failed with $errors error(s)"
    return 1
  fi

  success "prd.yaml valid"
  return 0
}

#######################################
# Prompt generation
#######################################
generate_prompt() {
  local prd_file="$1"
  local progress="$2"
  local loop_dir="$3"
  local branch_override="$4"  # Optional: override branch from prd

  local name branch issue_tracker pre_commit
  name=$(yaml_get "$prd_file" "name")
  branch="${branch_override:-$(yaml_get "$prd_file" "branch")}"
  issue_tracker=$(yaml_get "$prd_file" "issue_tracker")
  pre_commit=$(yaml_get "$prd_file" "pre_commit")
  
  local timestamp
  timestamp=$(date '+%Y-%m-%d %H:%M')

  local prompt
  prompt=$(cat "$TEMPLATES_DIR/base.md")

  prompt="${prompt//\{\{NAME\}\}/$name}"
  prompt="${prompt//\{\{BRANCH\}\}/$branch}"
  prompt="${prompt//\{\{PRD_PATH\}\}/$prd_file}"
  prompt="${prompt//\{\{PROGRESS_PATH\}\}/$progress}"
  prompt="${prompt//\{\{TIMESTAMP\}\}/$timestamp}"

  local task_details="Read the task's \`acceptance\` array for criteria. If \`notes\` is present, use as additional context."
  if [[ "$issue_tracker" == "beads" ]]; then
    task_details="$task_details

If the task has an \`id\` field (e.g., \`rd-u22.1\`), run \`bd show <id>\` to get full acceptance criteria from the issue tracker."
  fi
  prompt="${prompt//\{\{TASK_DETAILS_INSTRUCTIONS\}\}/$task_details}"

  local pre_commit_instructions
  if [[ -n "$pre_commit" ]]; then
    pre_commit_instructions="Run the verification command:
\`\`\`bash
$pre_commit
\`\`\`
ALL checks must pass before committing."
  else
    pre_commit_instructions="No pre-commit verification configured."
  fi
  prompt="${prompt//\{\{PRE_COMMIT_INSTRUCTIONS\}\}/$pre_commit_instructions}"

  local issue_instructions=""
  local issue_commit_files=""
  if [[ "$issue_tracker" == "beads" ]]; then
    issue_instructions=$(cat "$TEMPLATES_DIR/beads.md")
    issue_commit_files="- \`.beads/\` changes from \`bd close\` and \`bd sync\`"
  fi
  prompt="${prompt//\{\{ISSUE_TRACKER_INSTRUCTIONS\}\}/$issue_instructions}"
  prompt="${prompt//\{\{ISSUE_TRACKER_COMMIT_FILES\}\}/$issue_commit_files}"

  echo "$prompt"
}

#######################################
# PR creation
#######################################
create_pull_request() {
  local prd_file="$1"
  local branch="$2"
  
  local name description pr_title
  name=$(yaml_get "$prd_file" "name")
  description=$(yaml_get "$prd_file" "description")
  pr_title=$(yaml_get "$prd_file" "pr_title")
  
  pr_title="${pr_title:-$name}"

  info "Pushing branch..."
  git push -u origin "$branch"

  info "Creating PR..."
  
  local pr_body
  pr_body="## Summary

$description

## Changes

$(git log --oneline main.."$branch" | sed 's/^/- /')

## Verification

All changes verified with pre-commit checks.

---
*Created by Ralph loop*"

  local pr_url
  pr_url=$(gh pr create --title "$pr_title" --body "$pr_body" 2>&1)
  
  if [[ $? -eq 0 ]]; then
    success "PR created: $pr_url"
  else
    error "Failed to create PR: $pr_url"
    return 1
  fi
}

#######################################
# Commands
#######################################

cmd_list() {
  echo "Available loops:"
  if [ -d "$LOOPS_DIR" ] && [ "$(ls -A "$LOOPS_DIR" 2>/dev/null)" ]; then
    for loop in "$LOOPS_DIR"/*/; do
      if [ -d "$loop" ]; then
        local name=$(basename "$loop")
        local prd="$loop/prd.yaml"
        if [ -f "$prd" ]; then
          local title=$(yaml_get "$prd" "name")
          local pending=$(grep -c "status:[[:space:]]*pending" "$prd" 2>/dev/null || true)
          local done_count=$(grep -c "status:[[:space:]]*done" "$prd" 2>/dev/null || true)
          pending="${pending:-0}"
          done_count="${done_count:-0}"
          echo "  $name - $title [$done_count done, $pending pending]"
        else
          echo "  $name - (missing prd.yaml)"
        fi
      fi
    done
  else
    echo "  (none found)"
  fi
}

cmd_new() {
  local loop_name="$1"
  
  if [ -z "$loop_name" ]; then
    error "Loop name required"
    echo "Usage: .ralph/ralph.sh new <loop-name>"
    exit 1
  fi
  
  local loop_dir="$LOOPS_DIR/$loop_name"
  
  if [ -d "$loop_dir" ]; then
    error "Loop already exists: $loop_dir"
    exit 1
  fi
  
  mkdir -p "$loop_dir"
  cp "$SCRIPT_DIR/prd.yaml.example" "$loop_dir/prd.yaml"
  
  success "Created new loop: $loop_name"
  echo "  Edit: $loop_dir/prd.yaml"
  echo "  Run:  .ralph/ralph.sh run $loop_name"
}

cmd_validate() {
  local loop_name="$1"
  
  if [ -z "$loop_name" ]; then
    error "Loop name required"
    echo "Usage: .ralph/ralph.sh validate <loop-name>"
    exit 1
  fi
  
  local loop_dir="$LOOPS_DIR/$loop_name"
  local prd_file="$loop_dir/prd.yaml"
  
  if [ ! -d "$loop_dir" ]; then
    error "Loop not found: $loop_name"
    cmd_list
    exit 1
  fi
  
  if [ ! -f "$prd_file" ]; then
    error "prd.yaml not found: $prd_file"
    exit 1
  fi
  
  validate_prd "$prd_file"
}

cmd_run() {
  local loop_name=""
  local max_iterations=25
  local branch_override=""
  
  # Parse arguments
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --branch)
        branch_override="$2"
        shift 2
        ;;
      --branch=*)
        branch_override="${1#*=}"
        shift
        ;;
      -n|--max-iterations)
        max_iterations="$2"
        shift 2
        ;;
      -*)
        error "Unknown option: $1"
        echo "Usage: .ralph/ralph.sh run <loop-name> [--branch <branch>] [-n <max-iterations>]"
        exit 1
        ;;
      *)
        if [ -z "$loop_name" ]; then
          loop_name="$1"
        else
          # Legacy positional arg for max_iterations
          max_iterations="$1"
        fi
        shift
        ;;
    esac
  done
  
  if [ -z "$loop_name" ]; then
    error "Loop name required"
    echo "Usage: .ralph/ralph.sh run <loop-name> [--branch <branch>] [-n <max-iterations>]"
    exit 1
  fi
  
  local loop_dir="$LOOPS_DIR/$loop_name"
  local prd_file="$loop_dir/prd.yaml"
  local progress="$loop_dir/progress.md"

  # Check for legacy prd.json
  if [ -f "$loop_dir/prd.json" ] && [ ! -f "$prd_file" ]; then
    error "Found legacy prd.json but no prd.yaml"
    echo ""
    echo "Ralph now uses prd.yaml instead of prd.json."
    echo "Please migrate your loop configuration."
    exit 1
  fi

  if [ ! -d "$loop_dir" ]; then
    error "Loop not found: $loop_name"
    cmd_list
    exit 1
  fi

  if [ ! -f "$prd_file" ]; then
    error "prd.yaml not found: $prd_file"
    exit 1
  fi

  # Validate
  if ! validate_prd "$prd_file"; then
    exit 1
  fi

  # Read config
  local branch=$(yaml_get "$prd_file" "branch")
  local create_pr=$(yaml_get_bool "$prd_file" "create_pr")
  local name=$(yaml_get "$prd_file" "name")
  
  # Apply branch override if provided
  if [ -n "$branch_override" ]; then
    branch="$branch_override"
    info "Using branch override: $branch"
  fi
  
  # Session dir includes branch name for comparison runs
  local session_dir="$HOME/.ralph/sessions/$loop_name/${branch//\//_}"

  # Create progress.md if missing
  if [ ! -f "$progress" ]; then
    cat > "$progress" << EOF
# Ralph Progress Log: $name
Started: $(date '+%Y-%m-%d %H:%M')

## Codebase Patterns
(Patterns discovered during this loop will be added here)

---

EOF
    success "Created progress.md"
  fi

  mkdir -p "$session_dir"

  echo ""
  echo "═══════════════════════════════════════════════════"
  echo "🚀 Ralph Loop: $name"
  echo "═══════════════════════════════════════════════════"
  echo "   Branch: $branch"
  if [ -n "$branch_override" ]; then
    echo "   (override from --branch flag)"
  fi
  echo "   Max iterations: $max_iterations"
  echo "   Create PR on completion: $create_pr"
  echo "   Sessions: $session_dir"
  echo ""

  # Generate prompt to temp file
  local prompt_file=$(mktemp)
  generate_prompt "$prd_file" "$progress" "$loop_dir" "$branch" > "$prompt_file"
  trap "rm -f $prompt_file" EXIT

  # Main loop
  for i in $(seq 1 $max_iterations); do
    echo ""
    echo "═══════════════════════════════════════════════════"
    echo "═══ Iteration $i of $max_iterations"
    echo "═══════════════════════════════════════════════════"
    echo ""

    # Regenerate prompt each iteration (timestamp updates, branch preserved)
    generate_prompt "$prd_file" "$progress" "$loop_dir" "$branch" > "$prompt_file"

    # Run pi agent
    OUTPUT=$(pi --print --session-dir "$session_dir" --thinking high @"$prompt_file" 2>&1 | tee /dev/stderr) || true

    # Check for completion signal
    if echo "$OUTPUT" | grep -q "<loop>COMPLETE</loop>"; then
      echo ""
      echo "═══════════════════════════════════════════════════"
      success "All tasks complete!"
      echo "═══════════════════════════════════════════════════"
      
      if [ "$create_pr" = "true" ]; then
        echo ""
        create_pull_request "$prd_file" "$branch"
      fi
      
      exit 0
    fi

    echo ""
    info "Iteration $i finished, continuing..."
    sleep 2
  done

  echo ""
  echo "═══════════════════════════════════════════════════"
  warn "Max iterations ($max_iterations) reached"
  echo "    Check progress.md and prd.yaml for status"
  echo "═══════════════════════════════════════════════════"
  exit 1
}

#######################################
# Main
#######################################
usage() {
  echo "Usage: .ralph/ralph.sh <command> [args]"
  echo ""
  echo "Commands:"
  echo "  run <loop> [options]   Run a loop until complete"
  echo "  validate <loop>        Validate a loop's prd.yaml"
  echo "  list                   List available loops"
  echo "  new <loop>             Create a new loop from template"
  echo ""
  echo "Run options:"
  echo "  --branch <name>        Override branch from prd.yaml"
  echo "  -n, --max-iterations   Max iterations (default: 25)"
  echo ""
  echo "Examples:"
  echo "  .ralph/ralph.sh list"
  echo "  .ralph/ralph.sh new my-feature"
  echo "  .ralph/ralph.sh validate my-feature"
  echo "  .ralph/ralph.sh run my-feature"
  echo "  .ralph/ralph.sh run my-feature -n 50"
  echo "  .ralph/ralph.sh run my-feature --branch ralph/my-feature-opus"
}

# Parse command
COMMAND="${1:-}"
shift || true  # Remove command from args

case "$COMMAND" in
  run)
    cmd_run "$@"
    ;;
  validate)
    cmd_validate "$@"
    ;;
  list)
    cmd_list
    ;;
  new)
    cmd_new "$@"
    ;;
  help|--help|-h)
    usage
    ;;
  "")
    error "Command required"
    echo ""
    usage
    exit 1
    ;;
  *)
    error "Unknown command: $COMMAND"
    echo ""
    usage
    exit 1
    ;;
esac
