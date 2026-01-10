/**
 * Unit tests for CLI using mocked streams.
 *
 * These tests call runCli() directly with captured streams instead of
 * spawning subprocesses. This makes them significantly faster (~10-20ms
 * vs ~100-500ms for integration tests).
 *
 * Pattern:
 *   1. Create captured streams with captureStream() or noopStream()
 *   2. Call runCli() with those streams
 *   3. Assert on the captured output with getOutput()
 *
 * Cleanup:
 *   - Call resetOutputStream() in afterEach to restore process.stdout/stderr
 *
 * Note on API mocking:
 *   Nock has compatibility issues with Bun's native HTTP handling.
 *   For tests that require API responses, use integration tests (subprocess)
 *   or live tests. These unit tests focus on CLI parsing and help output
 *   which don't require network access.
 */

import { describe, it, expect, afterEach } from "bun:test";
import { runCli } from "./run.js";
import { captureStream, noopStream } from "./test-utils/streams.js";
import { resetOutputStream } from "./utils/output-streams.js";

describe("runCli unit tests", () => {
  afterEach(() => {
    resetOutputStream();
  });

  describe("help output", () => {
    it("shows help with --help", async () => {
      const { stream: stdout, getOutput } = captureStream();

      await runCli(["--help"], {
        env: {},
        stdout,
        stderr: noopStream(),
      });

      const output = getOutput();
      expect(output).toContain("rd");
      expect(output).toContain("Commands:");
      expect(output).toContain("bookmarks");
    });

    it("shows subcommand help", async () => {
      const { stream: stdout, getOutput } = captureStream();

      await runCli(["bookmarks", "--help"], {
        env: {},
        stdout,
        stderr: noopStream(),
      });

      expect(getOutput()).toContain("list");
      expect(getOutput()).toContain("add");
    });

    it("shows nested subcommand help", async () => {
      const { stream: stdout, getOutput } = captureStream();

      await runCli(["bookmarks", "list", "--help"], {
        env: {},
        stdout,
        stderr: noopStream(),
      });

      const output = getOutput();
      expect(output).toContain("List bookmarks");
      expect(output).toContain("--format");
      expect(output).toContain("--json");
    });

    it("shows version with --version", async () => {
      const { stream: stdout, getOutput } = captureStream();

      await runCli(["--version"], {
        env: {},
        stdout,
        stderr: noopStream(),
      });

      // Version should match semver pattern
      expect(getOutput()).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe("error handling", () => {
    it("throws on unknown command", async () => {
      const { stream: stderr, getOutput } = captureStream();

      await expect(
        runCli(["unknown-command"], {
          env: {},
          stdout: noopStream(),
          stderr,
        })
      ).rejects.toThrow();

      // Error message should be written to stderr
      expect(getOutput()).toContain("unknown-command");
    });

    it("writes error to stderr for invalid options", async () => {
      const { stream: stderr, getOutput } = captureStream();

      await expect(
        runCli(["bookmarks", "list", "--invalid-option"], {
          env: {},
          stdout: noopStream(),
          stderr,
        })
      ).rejects.toThrow();

      expect(getOutput()).toContain("invalid-option");
    });
  });

  describe("global options parsing", () => {
    it("parses --json flag without executing command", async () => {
      // Just verify --json doesn't cause a parsing error when combined with --help
      const { stream: stdout, getOutput } = captureStream();

      await runCli(["bookmarks", "list", "--json", "--help"], {
        env: {},
        stdout,
        stderr: noopStream(),
      });

      // Should show help for list command
      expect(getOutput()).toContain("List bookmarks");
    });

    it("parses --quiet flag without executing command", async () => {
      const { stream: stdout, getOutput } = captureStream();

      await runCli(["bookmarks", "list", "--quiet", "--help"], {
        env: {},
        stdout,
        stderr: noopStream(),
      });

      expect(getOutput()).toContain("List bookmarks");
    });

    it("parses --verbose flag without executing command", async () => {
      const { stream: stdout, getOutput } = captureStream();

      await runCli(["bookmarks", "list", "--verbose", "--help"], {
        env: {},
        stdout,
        stderr: noopStream(),
      });

      expect(getOutput()).toContain("List bookmarks");
    });
  });
});
