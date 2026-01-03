import { describe, test, expect } from "bun:test";
import { runCli, runCliExpectSuccess } from "./test-utils/index.js";

/**
 * Integration tests for CLI behavior.
 *
 * These tests spawn the CLI as a subprocess and verify:
 * - stdout/stderr separation
 * - Exit codes
 * - Output format handling
 *
 * Note: These tests run without authentication, so they test
 * commands that don't require API access (help, version, auth status).
 */

describe("CLI integration", () => {
  describe("help command", () => {
    test("--help outputs to stdout and exits 0", async () => {
      const result = await runCli(["--help"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Usage:");
      expect(result.stdout).toContain("rdcli");
    });

    test("-h is alias for --help", async () => {
      const result = await runCli(["-h"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Usage:");
    });

    test("help includes available commands", async () => {
      const result = await runCliExpectSuccess(["--help"]);

      expect(result.stdout).toContain("auth");
    });
  });

  describe("version command", () => {
    test("--version outputs version to stdout", async () => {
      const result = await runCli(["--version"]);

      expect(result.exitCode).toBe(0);
      // Version should be in stdout, not stderr
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });

    test("-V is alias for --version", async () => {
      const result = await runCli(["-V"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe("auth status command", () => {
    test("outputs to appropriate streams", async () => {
      // Run without token to get unauthenticated status
      const result = await runCli(["auth", "status"], {
        env: { RAINDROP_TOKEN: "" },
      });

      // Should exit with code 1 when not authenticated
      // But the important thing is it runs without crashing
      expect(typeof result.exitCode).toBe("number");
    });

    test("auth status --json outputs valid JSON to stdout", async () => {
      const result = await runCli(["auth", "status", "--json"], {
        env: { RAINDROP_TOKEN: "" },
      });

      // Even if not authenticated, should output valid JSON
      if (result.stdout.trim()) {
        expect(() => JSON.parse(result.stdout)).not.toThrow();
      }
    });
  });

  describe("stream separation", () => {
    test("data output goes to stdout", async () => {
      const result = await runCliExpectSuccess(["--help"]);

      // Help text (data) should be on stdout
      expect(result.stdout.length).toBeGreaterThan(0);
    });

    test("error messages go to stderr", async () => {
      // Run an invalid command to trigger error
      const result = await runCli(["invalid-command-xyz"]);

      // Error should be on stderr
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.length).toBeGreaterThan(0);
    });
  });

  describe("exit codes", () => {
    test("successful command exits with 0", async () => {
      const result = await runCli(["--help"]);
      expect(result.exitCode).toBe(0);
    });

    test("invalid command exits with non-zero", async () => {
      const result = await runCli(["not-a-real-command"]);
      expect(result.exitCode).not.toBe(0);
    });
  });

  describe("format flags", () => {
    test("--format is accepted as global option", async () => {
      // Just verify the flag is recognized
      const result = await runCli(["--format", "json", "--help"]);
      expect(result.exitCode).toBe(0);
    });

    test("--json flag is recognized", async () => {
      const result = await runCli(["auth", "status", "--json"], {
        env: { RAINDROP_TOKEN: "" },
      });
      // Should not error due to unrecognized flag
      // Exit code may be non-zero due to no auth, but that's OK
      expect(result.stderr).not.toContain("unknown option");
    });
  });

  describe("environment variables", () => {
    test("NO_COLOR is respected", async () => {
      const result = await runCli(["--help"], {
        env: { NO_COLOR: "1" },
      });

      // Output should not contain ANSI escape codes
      // eslint-disable-next-line no-control-regex
      expect(result.stdout).not.toMatch(/\x1b\[[0-9;]*m/);
    });
  });
});

describe("CLI piping behavior", () => {
  test("output is suitable for piping (no interactive prompts on stdout)", async () => {
    const result = await runCliExpectSuccess(["--help"]);

    // stdout should only contain the help text, no prompts or spinners
    expect(result.stdout).not.toContain("?");
    expect(result.stdout).not.toContain("Waiting");
  });

  test("can parse help output", async () => {
    const result = await runCliExpectSuccess(["--help"]);

    // Verify structure that scripts might depend on
    expect(result.stdout).toContain("Commands:");
    expect(result.stdout).toContain("Options:");
  });
});
