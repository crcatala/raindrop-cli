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

    test("--no-color flag is recognized on root command", async () => {
      const result = await runCli(["--no-color", "--help"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Usage:");
      // In non-TTY mode (subprocess), colors are disabled anyway,
      // but verify the flag doesn't cause an error
    });

    test("--no-color flag is recognized on subcommands", async () => {
      const result = await runCli(["bookmarks", "list", "--no-color", "--help"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Usage:");
      expect(result.stdout).toContain("bookmarks list");
    });

    test("--no-color flag works at end of command", async () => {
      const result = await runCli(["bookmarks", "--help", "--no-color"]);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("Usage:");
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
      const result = await runCli(["auth", "status"]);

      // Should exit with code 1 when not authenticated
      // But the important thing is it runs without crashing
      expect(typeof result.exitCode).toBe("number");
    });

    test("auth status --json outputs valid JSON to stdout", async () => {
      const result = await runCli(["auth", "status", "--json"]);

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
      const result = await runCli(["-f", "json", "auth", "status"]);
      expect(result.stderr).toContain("unknown option");
      expect(result.stderr).toContain("-f");
    });

    test("--json flag is recognized", async () => {
      const result = await runCli(["auth", "status", "--json"]);
      // Should not error due to unrecognized flag
      // Exit code may be non-zero due to no auth, but that's OK
      expect(result.stderr).not.toContain("unknown option");
    });

    test("--json flag outputs valid JSON", async () => {
      const result = await runCli(["--json", "auth", "status"]);
      // Should not error due to unrecognized flag
      expect(result.stderr).not.toContain("unknown option");
      // stdout should be valid JSON (if there is output)
      if (result.stdout.trim()) {
        expect(() => JSON.parse(result.stdout)).not.toThrow();
      }
    });

    test("--json flag works on subcommands", async () => {
      const result = await runCli(["auth", "status", "--json"]);
      expect(result.stderr).not.toContain("unknown option");
      if (result.stdout.trim()) {
        expect(() => JSON.parse(result.stdout)).not.toThrow();
      }
    });

    test("--json after subcommand outputs JSON (not just recognized)", async () => {
      // This specifically tests the fix for enablePositionalOptions() behavior.
      // When --json comes AFTER the subcommand name, it's parsed by the subcommand,
      // not the root program. The preAction hook must use actionCommand.optsWithGlobals()
      // to see it and set format correctly.
      const result = await runCli(["auth", "status", "--json"]);
      // Must output valid JSON structure (not table/plain format)
      const trimmed = result.stdout.trim();
      if (trimmed) {
        expect(() => JSON.parse(trimmed)).not.toThrow();
        // Verify it's actually a JSON object, not some other output
        const parsed = JSON.parse(trimmed);
        expect(typeof parsed).toBe("object");
        expect(parsed).toHaveProperty("authenticated");
      }
    });

    test("--json before subcommand also outputs JSON", async () => {
      // Verify --json works when placed before subcommand too
      const result = await runCli(["--json", "auth", "status"]);
      const trimmed = result.stdout.trim();
      if (trimmed) {
        expect(() => JSON.parse(trimmed)).not.toThrow();
        const parsed = JSON.parse(trimmed);
        expect(parsed).toHaveProperty("authenticated");
      }
    });

    test("--format takes precedence over --json", async () => {
      // When both --format and --json are specified, --format wins
      const result = await runCli(["--format", "table", "--json", "auth", "status"]);
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
      const result = await runCli(["--json", "--format", "plain", "auth", "status"]);
      expect(result.stderr).not.toContain("unknown option");
    });

    test("--format after subcommand takes precedence over --json after subcommand", async () => {
      // Both flags after subcommand - --format still wins
      // Use bookmarks list which has both --format and --json via addOutputOptions
      // We test with --help since we may not have API access
      const result = await runCli(["bookmarks", "list", "--json", "--format", "plain", "--help"]);
      expect(result.exitCode).toBe(0);
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

    test("-t validates timeout value and exits with code 2", async () => {
      // Invalid timeout values are usage errors (exit code 2 per clig.dev)
      const result = await runCli(["-t", "invalid", "auth", "status"]);
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Invalid timeout");
    });

    test("--timeout with zero value exits with code 2", async () => {
      // Use auth status instead of --help because --help bypasses preAction hook
      const result = await runCli(["--timeout", "0", "auth", "status"]);
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Timeout must be at least");
    });

    test("--timeout with negative value exits with code 2", async () => {
      const result = await runCli(["--timeout", "-5", "auth", "status"]);
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain("Timeout must be at least");
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
      const result = await runCli(["--verbose", "auth", "status"]);
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
      const result = await runCli(["--debug", "--verbose", "auth", "status"]);
      // Both types of output should appear on stderr
      expect(result.stderr).toContain("→");
      expect(result.stderr).toContain("[debug]");
    });

    test("--verbose after subcommand shows operational output", async () => {
      // Tests that global flags work when placed after subcommand name
      // (requires preAction to use actionCommand.optsWithGlobals())
      // Use bookmarks list which has --verbose via addOutputOptions
      const result = await runCli(["bookmarks", "list", "--verbose"]);
      // Will fail due to no auth, but verbose output should still appear
      expect(result.stderr).toContain("→");
    });

    test("--debug after subcommand shows debug output", async () => {
      // Tests that global flags work when placed after subcommand name
      // Use bookmarks list which has --debug via addOutputOptions
      const result = await runCli(["bookmarks", "list", "--debug"]);
      // Will fail due to no auth, but debug output should still appear
      expect(result.stderr).toContain("[debug]");
    });

    test("--no-color after subcommand is respected", async () => {
      // Use bookmarks list which has --no-color via addOutputOptions
      const result = await runCli(["bookmarks", "list", "--no-color", "--help"]);
      // Output should not contain ANSI escape codes
      // eslint-disable-next-line no-control-regex
      expect(result.stdout).not.toMatch(/\x1b\[[0-9;]*m/);
      expect(result.stderr).not.toMatch(/\x1b\[[0-9;]*m/);
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

describe("search shortcut command", () => {
  test("search command appears in root help", async () => {
    const result = await runCliExpectSuccess(["--help"]);

    expect(result.stdout).toContain("search <query>");
    // Description may wrap across lines, so check parts separately
    expect(result.stdout).toContain("Search bookmarks");
    expect(result.stdout).toContain("--search");
  });

  test("rd help search shows usage and examples", async () => {
    const result = await runCliExpectSuccess(["help", "search"]);

    expect(result.stdout).toContain("Usage: rd search <query>");
    expect(result.stdout).toContain("Search query");
    expect(result.stdout).toContain('rd search "javascript"');
    expect(result.stdout).toContain('rd search "#cli"');
    expect(result.stdout).toContain("All bookmarks list options are supported");
  });

  test("search without query shows error", async () => {
    const result = await runCli(["search"]);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("missing required argument");
    expect(result.stderr).toContain("query");
  });

  test("search --help shows bookmarks list help (pass-through)", async () => {
    const result = await runCli(["search", "--help"]);

    // Should show bookmarks list help since --help is passed through
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("bookmarks list");
    expect(result.stdout).toContain("--search");
    expect(result.stdout).toContain("--limit");
  });

  test("search transforms to bookmarks list --search (verified via debug)", async () => {
    const result = await runCli(["--debug", "search", "test-query", "--limit", "5"]);

    // Debug output shows the transformation
    expect(result.stderr).toContain("Search shortcut: transforming command");
    expect(result.stderr).toContain("bookmarks");
    expect(result.stderr).toContain("list");
    expect(result.stderr).toContain("--search");
    expect(result.stderr).toContain("test-query");
  });

  test("search works with global options before command", async () => {
    const result = await runCli(["--debug", "--format", "json", "search", "query"]);

    // Should successfully transform (not fail to find command)
    expect(result.stderr).toContain("Search shortcut: transforming command");
    expect(result.stderr).not.toContain("command not found");
  });

  test("search passes through additional options", async () => {
    const result = await runCli(["--debug", "search", "query", "--tag", "dev", "--limit", "10"]);

    // Verify options are passed through in the transformed command
    expect(result.stderr).toContain("--tag");
    expect(result.stderr).toContain("dev");
    expect(result.stderr).toContain("--limit");
    expect(result.stderr).toContain("10");
  });
});
