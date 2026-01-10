/**
 * Semantic output utilities for proper stdout/stderr separation.
 *
 * Per clig.dev guidelines:
 * - stdout: primary output, machine-readable data
 * - stderr: log messages, errors, warnings, progress
 *
 * This enables proper piping (e.g., `rd raindrops list | jq`).
 */

// Injectable streams for testability (default to process.* for normal operation)
let stdoutStream: NodeJS.WritableStream = process.stdout;
let stderrStream: NodeJS.WritableStream = process.stderr;

/**
 * Override output streams. Use in tests to capture output.
 */
export function setOutputStream(
  stdout: NodeJS.WritableStream,
  stderr: NodeJS.WritableStream
): void {
  stdoutStream = stdout;
  stderrStream = stderr;
}

/**
 * Reset output streams to defaults. Call in test cleanup.
 */
export function resetOutputStream(): void {
  stdoutStream = process.stdout;
  stderrStream = process.stderr;
}

/**
 * Output data to stdout. Use for primary output that may be piped.
 * Examples: JSON data, table output, IDs in quiet mode
 */
export function outputData(message: string): void {
  stdoutStream.write(message + "\n");
}

/**
 * Output a message to stderr. Use for informational/status messages.
 * Examples: "Validating token...", "Token saved successfully!"
 */
export function outputMessage(message: string): void {
  stderrStream.write(message + "\n");
}

/**
 * Output an error to stderr. Use for errors and warnings.
 * Examples: "Invalid token", "Warning: Rate limit approaching"
 */
export function outputError(message: string): void {
  stderrStream.write(message + "\n");
}

/**
 * Output data without trailing newline. Use for partial output.
 * TODO: Currently unused - reserved for future streaming output (rd-8o9)
 */
export function outputDataRaw(message: string): void {
  stdoutStream.write(message);
}

/**
 * Output message without trailing newline. Use for progress/spinners.
 * TODO: Currently unused - reserved for future progress indicators (rd-8o9)
 */
export function outputMessageRaw(message: string): void {
  stderrStream.write(message);
}
