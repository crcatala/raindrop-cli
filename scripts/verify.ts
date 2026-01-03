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

// Colors
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

interface CheckConfig {
  name: string;
  command: string[];
  verboseHint: string;
}

interface CheckResult {
  config: CheckConfig;
  success: boolean;
  output: string;
  status?: string;
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
  setStatus: (status: string) => void
): Promise<CheckResult> {
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
    let status: string | undefined;
    // Try to extract useful info for tests
    if (config.name === "Tests") {
      const passMatch = output.match(/(\d+)\s*pass/);
      if (passMatch) {
        status = `${passMatch[1]} passed`;
        setStatus(status);
      }
    }
    return { config, success: true, output, status };
  } else {
    return { config, success: false, output };
  }
}

function printFinalResults(results: CheckResult[]) {
  // Print each check's final status (no indent to match tasuku's format)
  for (const result of results) {
    if (result.success) {
      const status = result.status ? ` ${DIM}(${result.status})${RESET}` : "";
      console.log(`${GREEN}✔${RESET} ${result.config.name}${status}`);
    } else {
      console.log(`${RED}✖${RESET} ${result.config.name}`);
      // Show failure output indented
      if (result.output) {
        const lines = result.output.split("\n").slice(0, 30); // Limit to 30 lines
        for (const line of lines) {
          console.log(`  ${DIM}${line}${RESET}`);
        }
        if (result.output.split("\n").length > 30) {
          console.log(`  ${DIM}... (truncated)${RESET}`);
        }
        console.log(`  ${YELLOW}→ ${result.config.verboseHint}${RESET}`);
      }
    }
  }
}

async function main() {
  const results: CheckResult[] = [];

  // Run all checks in parallel with tasuku for spinners
  await task.group(
    (t) =>
      checks.map((check) =>
        t(check.name, async ({ setStatus, setError }) => {
          const result = await runCheck(check, setStatus);
          results.push(result);
          if (!result.success) {
            // Mark as error in tasuku (shows X)
            setError(new Error("failed"));
          }
          return result;
        })
      ),
    {
      concurrency: Infinity,
      stopOnError: false,
    }
  );

  // Sort results to match original check order
  results.sort(
    (a, b) =>
      checks.findIndex((c) => c.name === a.config.name) -
      checks.findIndex((c) => c.name === b.config.name)
  );

  // Print our own final summary (tasuku clears its output)
  printFinalResults(results);

  // Print overall summary
  const failures = results.filter((r) => !r.success);
  console.log("");
  if (failures.length === 0) {
    console.log(`${GREEN}All checks passed${RESET}`);
    process.exit(0);
  } else {
    console.log(`${RED}${failures.length} check(s) failed${RESET}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
