/**
 * CLI test helper utilities for integration testing.
 *
 * Provides helpers to spawn the CLI as a subprocess and capture
 * stdout, stderr, and exit codes for assertions.
 */

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface CliOptions {
  /** Environment variables to pass to the CLI */
  env?: Record<string, string>;
  /** Working directory for the CLI process */
  cwd?: string;
  /** Timeout in milliseconds (default: 10000) */
  timeout?: number;
  /** Input to send to stdin */
  stdin?: string;
}

/**
 * Run the CLI with the given arguments and return the result.
 *
 * @example
 * ```ts
 * const result = await runCli('auth', 'status');
 * expect(result.exitCode).toBe(0);
 * expect(result.stdout).toContain('token');
 * ```
 */
export async function runCli(args: string[], options: CliOptions = {}): Promise<CliResult> {
  const { env = {}, cwd, timeout = 10000, stdin } = options;

  const proc = Bun.spawn(["bun", "src/index.ts", ...args], {
    stdout: "pipe",
    stderr: "pipe",
    stdin: stdin !== undefined ? new Blob([stdin]) : undefined,
    cwd: cwd ?? import.meta.dir.replace("/src/test-utils", ""),
    env: {
      ...process.env,
      RAINDROP_TOKEN: "", // Default to empty to prevent accidental network calls in tests
      ...env,
      // Ensure consistent output for tests (disable colors)
      NO_COLOR: "1",
      // Explicitly set FORCE_COLOR=0 to avoid Bun's warning about NO_COLOR being ignored
      FORCE_COLOR: "0",
    },
  });

  // Set up timeout with proper cleanup
  const timeoutState = { id: null as Timer | null };
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutState.id = setTimeout(() => {
      proc.kill();
      reject(new Error(`CLI timed out after ${timeout}ms`));
    }, timeout);
  });

  // Wait for process to complete or timeout
  try {
    const [stdout, stderr, exitCode] = await Promise.race([
      Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ]),
      timeoutPromise,
    ]);
    return { stdout, stderr, exitCode };
  } finally {
    if (timeoutState.id) {
      clearTimeout(timeoutState.id);
    }
  }
}

/**
 * Run the CLI and expect it to succeed (exit code 0).
 * Throws if the CLI exits with a non-zero code.
 */
export async function runCliExpectSuccess(
  args: string[],
  options: CliOptions = {}
): Promise<CliResult> {
  const result = await runCli(args, options);
  if (result.exitCode !== 0) {
    throw new Error(
      `CLI exited with code ${result.exitCode}\nstderr: ${result.stderr}\nstdout: ${result.stdout}`
    );
  }
  return result;
}

/**
 * Run the CLI and expect it to fail (non-zero exit code).
 * Throws if the CLI exits with code 0.
 */
export async function runCliExpectFailure(
  args: string[],
  options: CliOptions = {}
): Promise<CliResult> {
  const result = await runCli(args, options);
  if (result.exitCode === 0) {
    throw new Error(`Expected CLI to fail but it succeeded\nstdout: ${result.stdout}`);
  }
  return result;
}

/**
 * Parse JSON from CLI stdout. Throws if the output is not valid JSON.
 */
export function parseJsonOutput<T>(result: CliResult): T {
  try {
    return JSON.parse(result.stdout) as T;
  } catch {
    throw new Error(
      `Failed to parse CLI output as JSON:\n${result.stdout}\nstderr: ${result.stderr}`
    );
  }
}
