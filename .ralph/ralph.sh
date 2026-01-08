#!/bin/bash
#
# Ralph - Autonomous AI coding loop
# Runs pi agent iteratively until all tasks are complete.
#
# Usage: .ralph/ralph.sh <loop-name> [max-iterations]
#
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES_DIR="$SCRIPT_DIR/templates"

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
    # Check for tasks without id field (simplified check)
    local in_tasks=false
    while IFS= read -r line; do
      if [[ "$line" =~ ^tasks: ]]; then
        in_tasks=true
        continue
      fi
      if $in_tasks && [[ "$line" =~ ^[a-z] ]]; then
        # Hit another top-level key, stop
        break
      fi
      if $in_tasks && [[ "$line" =~ ^[[:space:]]*-[[:space:]] ]]; then
        # Task entry - check if next lines have id before next task or end
        if [[ "$line" =~ ^[[:space:]]*-[[:space:]]*title: ]] && [[ ! "$line" =~ id: ]]; then
          # Inline title without id on same line - need to check following lines
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

  # Read prd values
  local name branch issue_tracker pre_commit
  name=$(yaml_get "$prd_file" "name")
  branch=$(yaml_get "$prd_file" "branch")
  issue_tracker=$(yaml_get "$prd_file" "issue_tracker")
  pre_commit=$(yaml_get "$prd_file" "pre_commit")
  
  local timestamp
  timestamp=$(date '+%Y-%m-%d %H:%M')

  # Start with base template
  local prompt
  prompt=$(cat "$TEMPLATES_DIR/base.md")

  # Replace placeholders
  prompt="${prompt//\{\{NAME\}\}/$name}"
  prompt="${prompt//\{\{BRANCH\}\}/$branch}"
  prompt="${prompt//\{\{PRD_PATH\}\}/$prd_file}"
  prompt="${prompt//\{\{PROGRESS_PATH\}\}/$progress}"
  prompt="${prompt//\{\{TIMESTAMP\}\}/$timestamp}"

  # Task details instructions
  local task_details="Read the task's \`acceptance\` array for criteria. If \`notes\` is present, use as additional context."
  if [[ "$issue_tracker" == "beads" ]]; then
    task_details="$task_details

If the task has an \`id\` field (e.g., \`rd-u22.1\`), run \`bd show <id>\` to get full acceptance criteria from the issue tracker."
  fi
  prompt="${prompt//\{\{TASK_DETAILS_INSTRUCTIONS\}\}/$task_details}"

  # Pre-commit instructions
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

  # Issue tracker instructions
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
  
  # Default PR title to name if not specified
  pr_title="${pr_title:-$name}"

  info "Pushing branch..."
  git push -u origin "$branch"

  info "Creating PR..."
  
  # Generate PR body from git log and prd
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
# Main
#######################################
usage() {
  echo "Usage: .ralph/ralph.sh <loop-name> [max-iterations]"
  echo ""
  echo "Arguments:"
  echo "  loop-name       Name of the loop directory under .ralph/loops/"
  echo "  max-iterations  Maximum iterations before stopping (default: 25)"
  echo ""
  echo "Available loops:"
  if [ -d "$SCRIPT_DIR/loops" ] && [ "$(ls -A "$SCRIPT_DIR/loops" 2>/dev/null)" ]; then
    ls -1 "$SCRIPT_DIR/loops/" | sed 's/^/  /'
  else
    echo "  (none found)"
  fi
}

# Parse arguments
if [ -z "$1" ]; then
  error "Loop name is required"
  echo ""
  usage
  exit 1
fi

LOOP_NAME="$1"
MAX_ITERATIONS="${2:-25}"
LOOP_DIR="$SCRIPT_DIR/loops/$LOOP_NAME"
PRD_FILE="$LOOP_DIR/prd.yaml"
PROGRESS="$LOOP_DIR/progress.md"
SESSION_DIR="$HOME/.ralph/sessions/$LOOP_NAME"

# Check for legacy prd.json and suggest migration
if [ -f "$LOOP_DIR/prd.json" ] && [ ! -f "$PRD_FILE" ]; then
  error "Found legacy prd.json but no prd.yaml"
  echo ""
  echo "Ralph now uses prd.yaml instead of prd.json."
  echo "Please migrate your loop configuration."
  exit 1
fi

# Validate loop exists
if [ ! -d "$LOOP_DIR" ]; then
  error "Loop directory not found: $LOOP_DIR"
  echo ""
  usage
  exit 1
fi

if [ ! -f "$PRD_FILE" ]; then
  error "prd.yaml not found: $PRD_FILE"
  exit 1
fi

# Validate prd
if ! validate_prd "$PRD_FILE"; then
  exit 1
fi

# Read config
BRANCH=$(yaml_get "$PRD_FILE" "branch")
CREATE_PR=$(yaml_get_bool "$PRD_FILE" "create_pr")
NAME=$(yaml_get "$PRD_FILE" "name")

# Create progress.md if missing
if [ ! -f "$PROGRESS" ]; then
  cat > "$PROGRESS" << EOF
# Ralph Progress Log: $NAME
Started: $(date '+%Y-%m-%d %H:%M')

## Codebase Patterns
(Patterns discovered during this loop will be added here)

---

EOF
  success "Created progress.md"
fi

# Create session directory
mkdir -p "$SESSION_DIR"

echo ""
echo "═══════════════════════════════════════════════════"
echo "🚀 Ralph Loop: $NAME"
echo "═══════════════════════════════════════════════════"
echo "   Branch: $BRANCH"
echo "   Max iterations: $MAX_ITERATIONS"
echo "   Create PR on completion: $CREATE_PR"
echo "   Sessions: $SESSION_DIR"
echo ""

# Generate prompt to temp file
PROMPT_FILE=$(mktemp)
generate_prompt "$PRD_FILE" "$PROGRESS" "$LOOP_DIR" > "$PROMPT_FILE"
trap "rm -f $PROMPT_FILE" EXIT

# Main loop
for i in $(seq 1 $MAX_ITERATIONS); do
  echo ""
  echo "═══════════════════════════════════════════════════"
  echo "═══ Iteration $i of $MAX_ITERATIONS"
  echo "═══════════════════════════════════════════════════"
  echo ""

  # Regenerate prompt each iteration (timestamp updates)
  generate_prompt "$PRD_FILE" "$PROGRESS" "$LOOP_DIR" > "$PROMPT_FILE"

  # Run pi agent
  OUTPUT=$(pi --print --session-dir "$SESSION_DIR" --thinking high @"$PROMPT_FILE" 2>&1 | tee /dev/stderr) || true

  # Check for completion signal
  if echo "$OUTPUT" | grep -q "<loop>COMPLETE</loop>"; then
    echo ""
    echo "═══════════════════════════════════════════════════"
    success "All tasks complete!"
    echo "═══════════════════════════════════════════════════"
    
    # Create PR if configured
    if [ "$CREATE_PR" = "true" ]; then
      echo ""
      create_pull_request "$PRD_FILE" "$BRANCH"
    fi
    
    exit 0
  fi

  echo ""
  info "Iteration $i finished, continuing..."
  sleep 2
done

echo ""
echo "═══════════════════════════════════════════════════"
warn "Max iterations ($MAX_ITERATIONS) reached"
echo "    Check progress.md and prd.yaml for status"
echo "═══════════════════════════════════════════════════"
exit 1
