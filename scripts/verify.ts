#!/usr/bin/env bun
/**
 * verify.ts - Run all verification checks in parallel with nice output
 *
 * Uses tasuku for beautiful task display with spinners and real-time updates.
 *
 * Usage:
 *   bun scripts/verify.ts          # Run all checks in parallel
 *   VERBOSE=1 bun scripts/verify.ts # Show full output on success too
 */

import task from "tasuku";

const VERBOSE = process.env.VERBOSE === "1";

interface CheckConfig {
  name: string;
  command: string[];
  verboseHint: string;
}

const checks: CheckConfig[] = [
  {
    name: "Tests",
    command: ["bun", "test", "--bail", "--only-failures"],
    verboseHint: "bun run test:verbose",
  },
  {
    name: "Lint",
    command: ["oxlint", "--type-aware", "src/"],
    verboseHint: "bun run lint:verbose",
  },
  {
    name: "Typecheck",
    command: ["tsc", "--noEmit"],
    verboseHint: "bun run typecheck:verbose",
  },
  {
    name: "Format",
    command: ["prettier", "--check", "src/**/*.ts"],
    verboseHint: "bun run format:check:verbose",
  },
];

async function runCheck(
  config: CheckConfig,
  setStatus: (status: string) => void,
  setOutput: (output: string) => void
): Promise<{ success: boolean; output: string }> {
  const proc = Bun.spawn(config.command, {
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);

  const exitCode = await proc.exited;
  const output = (stdout + stderr).trim();

  if (exitCode === 0) {
    // Try to extract useful info for tests
    if (config.name === "Tests") {
      const passMatch = output.match(/(\d+)\s*pass/);
      if (passMatch) {
        setStatus(`${passMatch[1]} passed`);
      }
    }
    if (VERBOSE && output) {
      setOutput(output.slice(0, 500)); // Limit output length
    }
    return { success: true, output };
  } else {
    // Show truncated error output
    const truncated = output.slice(0, 1000);
    setOutput(truncated + (output.length > 1000 ? "\n..." : ""));
    return { success: false, output };
  }
}

async function main() {
  const failures: CheckConfig[] = [];

  await task.group(
    (t) =>
      checks.map((check) =>
        t(check.name, async ({ setStatus, setOutput, setError }) => {
          const result = await runCheck(check, setStatus, setOutput);
          if (!result.success) {
            failures.push(check);
            setError(new Error(`Run: ${check.verboseHint}`));
          }
          return result;
        })
      ),
    {
      concurrency: Infinity, // Run all checks in parallel
      stopOnError: false, // Continue running other checks even if one fails
    }
  );

  // Print summary
  console.log("");
  if (failures.length === 0) {
    console.log("\x1b[32mAll checks passed\x1b[0m");
    process.exit(0);
  } else {
    console.log(`\x1b[31m${failures.length} check(s) failed\x1b[0m`);
    console.log("");
    console.log("Run for details:");
    for (const check of failures) {
      console.log(`  ${check.verboseHint}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
