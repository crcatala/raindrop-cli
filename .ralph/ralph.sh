#!/bin/bash
#
# Ralph - Autonomous AI coding loop
# Runs pi agent iteratively until all tasks are complete.
#
# Usage: .ralph/ralph.sh <loop-name> [max-iterations]
#   loop-name: Name of the loop directory under .ralph/loops/ (required)
#   max-iterations: Maximum iterations before stopping (default: 25)
#
# Example:
#   .ralph/ralph.sh oss-prep-phase1      # Run with 25 iterations
#   .ralph/ralph.sh oss-prep-phase1 50   # Run with 50 iterations
#
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Require loop name
if [ -z "$1" ]; then
  echo "❌ Error: loop name is required"
  echo ""
  echo "Usage: .ralph/ralph.sh <loop-name> [max-iterations]"
  echo ""
  echo "Available loops:"
  if [ -d "$SCRIPT_DIR/loops" ] && [ "$(ls -A "$SCRIPT_DIR/loops" 2>/dev/null)" ]; then
    ls -1 "$SCRIPT_DIR/loops/"
  else
    echo "  (none found in $SCRIPT_DIR/loops/)"
  fi
  echo ""
  echo "Example: .ralph/ralph.sh oss-prep-phase1"
  exit 1
fi

LOOP_NAME="$1"
MAX_ITERATIONS="${2:-25}"
LOOP_DIR="$SCRIPT_DIR/loops/$LOOP_NAME"

# Validate loop directory exists
if [ ! -d "$LOOP_DIR" ]; then
  echo "❌ Loop directory not found: $LOOP_DIR"
  echo ""
  echo "Available loops:"
  if [ -d "$SCRIPT_DIR/loops" ] && [ "$(ls -A "$SCRIPT_DIR/loops" 2>/dev/null)" ]; then
    ls -1 "$SCRIPT_DIR/loops/"
  else
    echo "  (none found in $SCRIPT_DIR/loops/)"
  fi
  exit 1
fi

# Validate required files exist
for file in prompt.md prd.json; do
  if [ ! -f "$LOOP_DIR/$file" ]; then
    echo "❌ Required file not found: $LOOP_DIR/$file"
    exit 1
  fi
done

# Create progress.md if it doesn't exist
if [ ! -f "$LOOP_DIR/progress.md" ]; then
  echo "# Ralph Progress Log" > "$LOOP_DIR/progress.md"
  echo "Started: $(date '+%Y-%m-%d %H:%M')" >> "$LOOP_DIR/progress.md"
  echo "" >> "$LOOP_DIR/progress.md"
  echo "## Codebase Patterns" >> "$LOOP_DIR/progress.md"
  echo "(Patterns discovered during this loop will be added here)" >> "$LOOP_DIR/progress.md"
  echo "" >> "$LOOP_DIR/progress.md"
  echo "---" >> "$LOOP_DIR/progress.md"
  echo "" >> "$LOOP_DIR/progress.md"
fi

echo "🚀 Starting Ralph"
echo "   Loop: $LOOP_NAME"
echo "   Max iterations: $MAX_ITERATIONS"
echo "   Prompt: $LOOP_DIR/prompt.md"
echo ""

for i in $(seq 1 $MAX_ITERATIONS); do
  echo "═══════════════════════════════════════════════════"
  echo "═══ Iteration $i of $MAX_ITERATIONS"
  echo "═══════════════════════════════════════════════════"
  echo ""

  # Run pi with the prompt file
  # --print: non-interactive mode
  # --no-session: fresh context each iteration (memory via files/git)
  # --thinking high: use extended thinking for complex tasks
  OUTPUT=$(pi --print --no-session --thinking high @"$LOOP_DIR/prompt.md" 2>&1 | tee /dev/stderr) || true

  # Check for completion signal
  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    echo ""
    echo "═══════════════════════════════════════════════════"
    echo "✅ All tasks complete!"
    echo "═══════════════════════════════════════════════════"
    exit 0
  fi

  echo ""
  echo "--- Iteration $i finished, continuing... ---"
  echo ""
  sleep 2
done

echo ""
echo "═══════════════════════════════════════════════════"
echo "⚠️  Max iterations ($MAX_ITERATIONS) reached"
echo "    Check progress.md and prd.json for status"
echo "═══════════════════════════════════════════════════"
exit 1
