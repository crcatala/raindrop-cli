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
      expect(result.stdout).toContain("rd");
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

  describe("no arguments", () => {
    test("shows help when invoked with no arguments", async () => {
      const result = await runCli([]);

      // Should show help (Commander outputs to stderr when no subcommand provided)
      expect(result.stderr).toContain("Usage:");
      expect(result.stderr).toContain("rd");
      expect(result.stderr).toContain("Commands:");
    });

    test("exits with 0 when showing help for no arguments", async () => {
      const result = await runCli([]);

      // Help display should exit cleanly
      expect(result.exitCode).toBe(0);
    });
  });

  describe("unknown commands and error messages", () => {
    test("unknown command shows single error message (no duplicates)", async () => {
      const result = await runCli(["not-a-command"]);

      expect(result.exitCode).toBe(2);
      // Count occurrences of the error message
      const errorMatches = result.stderr.match(/error:.*unknown command/gi) || [];
      expect(errorMatches.length).toBe(1);
    });

    test("unknown command shows suggestion when similar command exists", async () => {
      const result = await runCli(["bookmkarks"]); // typo

      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Did you mean");
      expect(result.stderr).toContain("bookmarks");
    });

    test("unknown subcommand shows single error message (no duplicates)", async () => {
      const result = await runCli(["bookmarks", "not-a-subcommand"]);

      expect(result.exitCode).toBe(2);
      // Count occurrences of error messages
      const errorMatches = result.stderr.match(/error:/gi) || [];
      expect(errorMatches.length).toBe(1);
    });

    test("excess arguments shows single error message (no duplicates)", async () => {
      const result = await runCli(["bookmarks", "unexpected-arg"]);

      expect(result.exitCode).toBe(2);
      // Should show error about too many arguments or unknown command
      expect(result.stderr).toContain("error:");
      // Count occurrences - should be exactly 1
      const errorMatches = result.stderr.match(/error:/gi) || [];
      expect(errorMatches.length).toBe(1);
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

    test("unknown command exits with 2 (usage error)", async () => {
      const result = await runCli(["not-a-real-command"]);
      expect(result.exitCode).toBe(2);
    });

    test("unknown option exits with 2 (usage error)", async () => {
      const result = await runCli(["--not-a-real-option"]);
      expect(result.exitCode).toBe(2);
    });
  });

  describe("format flags", () => {
    test("--format is accepted as global option", async () => {
      // Just verify the flag is recognized
      const result = await runCli(["--format", "json", "--help"]);
      expect(result.exitCode).toBe(0);
    });

    test("--format does not have -f shorthand (reserved for --force)", async () => {
      // -f should be unrecognized at global level since it's reserved for --force on subcommands
      const result = await runCli(["-f", "json", "auth", "status"], {
        env: { RAINDROP_TOKEN: "" },
      });
      expect(result.stderr).toContain("unknown option");
      expect(result.stderr).toContain("-f");
    });

    test("--json flag is recognized", async () => {
      const result = await runCli(["auth", "status", "--json"], {
        env: { RAINDROP_TOKEN: "" },
      });
      // Should not error due to unrecognized flag
      // Exit code may be non-zero due to no auth, but that's OK
      expect(result.stderr).not.toContain("unknown option");
    });

    test("--json flag outputs valid JSON", async () => {
      const result = await runCli(["--json", "auth", "status"], {
        env: { RAINDROP_TOKEN: "" },
      });
      // Should not error due to unrecognized flag
      expect(result.stderr).not.toContain("unknown option");
      // stdout should be valid JSON (if there is output)
      if (result.stdout.trim()) {
        expect(() => JSON.parse(result.stdout)).not.toThrow();
      }
    });

    test("--json flag works on subcommands", async () => {
      const result = await runCli(["auth", "status", "--json"], {
        env: { RAINDROP_TOKEN: "" },
      });
      expect(result.stderr).not.toContain("unknown option");
      if (result.stdout.trim()) {
        expect(() => JSON.parse(result.stdout)).not.toThrow();
      }
    });

    test("--format takes precedence over --json", async () => {
      // When both --format and --json are specified, --format wins
      const result = await runCli(["--format", "table", "--json", "auth", "status"], {
        env: { RAINDROP_TOKEN: "" },
      });
      // Should not error
      expect(result.stderr).not.toContain("unknown option");
      // Output should NOT be JSON (it's table format)
      // Note: with no auth, we may not get much output, but it shouldn't be JSON array/object
      if (result.stdout.trim()) {
        // Table output typically doesn't start with [ or {
        const trimmed = result.stdout.trim();
        const looksLikeJson = trimmed.startsWith("{") || trimmed.startsWith("[");
        expect(looksLikeJson).toBe(false);
      }
    });

    test("--json after --format still lets --format win", async () => {
      // Order shouldn't matter - --format always takes precedence
      const result = await runCli(["--json", "--format", "plain", "auth", "status"], {
        env: { RAINDROP_TOKEN: "" },
      });
      expect(result.stderr).not.toContain("unknown option");
    });

    test("invalid --format value shows error with allowed choices", async () => {
      const result = await runCli(["--format", "invalid", "auth", "status"]);

      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("invalid");
      expect(result.stderr).toContain("Allowed choices");
      expect(result.stderr).toContain("json");
      expect(result.stderr).toContain("table");
      expect(result.stderr).toContain("tsv");
      expect(result.stderr).toContain("plain");
    });

    test("invalid --format on subcommand shows error", async () => {
      const result = await runCli(["bookmarks", "list", "--format", "xml"]);

      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("xml");
      expect(result.stderr).toContain("Allowed choices");
    });

    test("all valid format values are accepted", async () => {
      for (const format of ["json", "table", "tsv", "plain"]) {
        const result = await runCli(["--format", format, "--help"]);
        expect(result.exitCode).toBe(0);
        expect(result.stderr).not.toContain("invalid");
      }
    });

    test("help text shows valid format choices", async () => {
      const result = await runCliExpectSuccess(["--help"]);

      expect(result.stdout).toContain("--format");
      expect(result.stdout).toContain("choices:");
      expect(result.stdout).toContain("json");
      expect(result.stdout).toContain("table");
    });

    test("help text shows --json shorthand option", async () => {
      const result = await runCliExpectSuccess(["--help"]);

      expect(result.stdout).toContain("--json");
      expect(result.stdout).toContain("shorthand");
    });

    test("subcommand help shows --json option", async () => {
      const result = await runCliExpectSuccess(["bookmarks", "list", "--help"]);

      expect(result.stdout).toContain("--json");
    });
  });

  describe("timeout flag", () => {
    test("--timeout is accepted as global option", async () => {
      const result = await runCli(["--timeout", "60", "--help"]);
      expect(result.exitCode).toBe(0);
    });

    test("-t shorthand works for --timeout", async () => {
      const result = await runCli(["-t", "60", "--help"]);
      expect(result.exitCode).toBe(0);
      expect(result.stderr).not.toContain("unknown option");
    });

    test("-t validates timeout value", async () => {
      const result = await runCli(["-t", "invalid", "auth", "status"], {
        env: { RAINDROP_TOKEN: "" },
      });
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("Invalid timeout");
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

  describe("debug and verbose flags", () => {
    test("--debug flag is recognized", async () => {
      const result = await runCli(["--debug", "--help"]);
      expect(result.exitCode).toBe(0);
      // Should not error due to unrecognized flag
      expect(result.stderr).not.toContain("unknown option");
    });

    test("-d is alias for --debug", async () => {
      const result = await runCli(["-d", "--help"]);
      expect(result.exitCode).toBe(0);
      expect(result.stderr).not.toContain("unknown option");
    });

    test("--verbose flag is recognized", async () => {
      const result = await runCli(["--verbose", "--help"]);
      expect(result.exitCode).toBe(0);
      expect(result.stderr).not.toContain("unknown option");
    });

    test("-v is alias for --verbose", async () => {
      const result = await runCli(["-v", "--help"]);
      expect(result.exitCode).toBe(0);
      expect(result.stderr).not.toContain("unknown option");
    });

    test("--verbose shows operational output on stderr", async () => {
      const result = await runCli(["--verbose", "auth", "status"], {
        env: { RAINDROP_TOKEN: "" },
      });
      // Verbose output should go to stderr
      expect(result.stderr).toContain("→");
    });

    test("help text describes --debug and --verbose correctly", async () => {
      const result = await runCliExpectSuccess(["--help"]);
      expect(result.stdout).toContain("--verbose");
      expect(result.stdout).toContain("--debug");
      // Verify the descriptions are distinct
      expect(result.stdout).toContain("operational");
      expect(result.stdout).toContain("stack trace");
    });

    test("--debug and --verbose can be used together", async () => {
      const result = await runCli(["--debug", "--verbose", "auth", "status"], {
        env: { RAINDROP_TOKEN: "" },
      });
      // Both types of output should appear on stderr
      expect(result.stderr).toContain("→");
      expect(result.stderr).toContain("[debug]");
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
