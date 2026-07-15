import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const SCRIPT_PATH = resolve(import.meta.dir, "../scripts/prep-release.sh");
const tempDirectories: string[] = [];

function run(command: string[], cwd: string) {
  return Bun.spawnSync(command, { cwd, stdout: "pipe", stderr: "pipe" });
}

function git(cwd: string, ...args: string[]) {
  const result = run(["git", ...args], cwd);
  if (result.exitCode !== 0) {
    throw new Error(new TextDecoder().decode(result.stderr));
  }
}

function createRepository() {
  const directory = mkdtempSync(resolve(tmpdir(), "raindrop-cli-release-prep-"));
  tempDirectories.push(directory);

  git(directory, "init", "--quiet");
  git(directory, "config", "user.email", "test@example.com");
  git(directory, "config", "user.name", "Release Prep Test");

  return directory;
}

function commitFile(directory: string, filename: string, content: string, message: string) {
  writeFileSync(resolve(directory, filename), content);
  git(directory, "add", filename);
  git(directory, "commit", "--quiet", "-m", message);
}

function runReleasePrep(directory: string, ...args: string[]) {
  const result = run(["bash", SCRIPT_PATH, ...args], directory);
  return {
    exitCode: result.exitCode,
    stderr: new TextDecoder().decode(result.stderr),
    stdout: new TextDecoder().decode(result.stdout),
  };
}

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { force: true, recursive: true });
  }
});

describe("release prep helper", () => {
  test("summarizes files for an initial release without tags", () => {
    const directory = createRepository();
    commitFile(directory, "initial.txt", "initial release\n", "feat: initial release");

    const result = runReleasePrep(directory);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("No previous tag found. Showing all commits.");
    expect(result.stdout).toMatch(/initial\.txt\s+\|\s+1 \+/);
    expect(result.stdout).toContain("1 file changed, 1 insertion(+)");
  });

  test("uses an explicitly supplied release tag", () => {
    const directory = createRepository();
    commitFile(directory, "released.txt", "released\n", "feat: released change");
    git(directory, "tag", "v1.0.0");
    commitFile(directory, "next.txt", "next\n", "fix: next change");

    const result = runReleasePrep(directory, "v1.0.0");

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Changes since: v1.0.0");
    expect(result.stdout).toContain("next.txt");
    expect(result.stdout).not.toContain("released.txt");
  });

  test("rejects an invalid explicit release reference", () => {
    const directory = createRepository();
    commitFile(directory, "initial.txt", "initial release\n", "feat: initial release");

    const result = runReleasePrep(directory, "not-a-revision");

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Error: 'not-a-revision' is not a valid tag or commit.");
  });
});
