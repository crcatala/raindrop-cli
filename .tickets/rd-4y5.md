---
id: rd-4y5
status: tombstone
deps: []
links: []
created: 2026-01-02T12:40:12.627003766-08:00
type: task
priority: 1
---
# CLI Guidelines Alignment

Adhere to https://clig.dev/ guidelines to ensure a robust and standard CLI experience.

## Scope
1. **XDG Compliance:** 
   - Update `src/config.ts` to respect `XDG_CONFIG_HOME` environment variable.
   - Fallback to `~/.config` only if unset.

2. **Robust Input (TTY Checks):**
   - Update `src/commands/auth.ts` `prompt()` function.
   - Check `process.stdin.isTTY`.
   - If not TTY and input is required/missing, fail gracefully with a clear error message instead of hanging or erroring on readline.

3. **Stream Hygiene (Stdout vs Stderr):**
   - Audit existing `console.log` usage.
   - Ensure "chatty" informational messages (e.g., "Validating token...", "Token saved") are sent to `stderr`.
   - Reserve `stdout` strictly for the requested data output (JSON, Tables, TSV) to facilitate piping.

4. **Progress Indicators:**
   - Add simple spinners (e.g., using `ora` or simple stderr animations) for network-blocking operations like token validation.

## References
- https://clig.dev/
- Existing issue `rd-4x1` covers the Output System framework, but this issue focuses on specific compliance details.


