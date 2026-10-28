import { describe, test, expect } from "bun:test";
import {
  compareVersions,
  formatVersion,
  gitCloneUrl,
  gitInstallUrl,
  versionLine,
} from "./cli-meta.js";

/**
 * Unit tests for the release standard's version line and self-update helpers.
 *
 * These are pure functions: no git, no network, no installed package.
 */

describe("formatVersion", () => {
  test("prints the name and version alone without commit information", () => {
    expect(formatVersion("rd", { version: "0.3.1" })).toBe("rd 0.3.1");
  });

  test("prints the short commit and commit date", () => {
    expect(
      formatVersion("rd", {
        version: "0.3.1",
        commit: "c0100eba6012ddb0e8d02aeecb842fab02aadfc8",
        date: "2026-10-26",
        dirty: false,
      })
    ).toBe("rd 0.3.1 (c0100eb 2026-10-26)");
  });

  test("marks builds from uncommitted changes", () => {
    expect(
      formatVersion("rd", {
        version: "0.3.1",
        commit: "9f8e7d6c5b4a39281706f5e4d3c2b1a098765432",
        date: "2026-10-28",
        dirty: true,
      })
    ).toBe("rd 0.3.1 (9f8e7d6-dirty 2026-10-28)");
  });

  test("prints the commit without a date when the date is missing", () => {
    expect(formatVersion("rd", { version: "1.0.0", commit: "abcdef1234567" })).toBe(
      "rd 1.0.0 (abcdef1)"
    );
  });
});

describe("versionLine", () => {
  test("prints the standard version line for this checkout", () => {
    // Runs from src/ inside a git checkout, so the commit is read from git.
    expect(versionLine("rd")).toMatch(
      /^rd \d+\.\d+\.\d+( \([0-9a-f]{7}(-dirty)? \d{4}-\d{2}-\d{2}\))?$/
    );
  });
});

describe("compareVersions", () => {
  test("orders plain versions", () => {
    expect(compareVersions("0.3.0", "0.3.1")).toBeLessThan(0);
    expect(compareVersions("0.3.1", "0.3.1")).toBe(0);
    expect(compareVersions("1.0.0", "0.9.9")).toBeGreaterThan(0);
  });

  test("sorts a prerelease before its release", () => {
    expect(compareVersions("1.0.0-beta.0", "1.0.0")).toBeLessThan(0);
    expect(compareVersions("1.0.0", "1.0.0-beta.0")).toBeGreaterThan(0);
    expect(compareVersions("1.0.0-alpha", "1.0.0-beta")).toBeLessThan(0);
  });
});

describe("git URLs", () => {
  test("turns a repository field into a clone URL", () => {
    expect(gitCloneUrl("github:crcatala/raindrop-cli")).toBe(
      "https://github.com/crcatala/raindrop-cli.git"
    );
    expect(gitCloneUrl("git@github.com:crcatala/raindrop-cli.git")).toBe(
      "ssh://git@github.com/crcatala/raindrop-cli.git"
    );
    expect(gitCloneUrl("git+https://github.com/crcatala/raindrop-cli.git")).toBe(
      "https://github.com/crcatala/raindrop-cli.git"
    );
  });

  test("turns a clone URL into the form npm installs from", () => {
    expect(gitInstallUrl("crcatala/raindrop-cli")).toBe(
      "git+https://github.com/crcatala/raindrop-cli.git"
    );
  });
});
