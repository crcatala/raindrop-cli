// release-standard: src/cli-meta.ts r3 (see the release standard before editing)
//
// Version line and self-update for a Node CLI:
//   program.version(versionLine("mytool"), "-V, --version", "print the version and commit");
//   program.command("update").option("--check").option("--force")
//     .action((o) => { process.exitCode = runUpdate("mytool", o); });
//
// A build stamps dist/build-info.json (scripts/build-info.mjs), which is what a run from dist/
// reports. A run from source in a git checkout (tsx, bun) reads git instead, so it always shows the
// current commit; anything else without a stamp prints the version alone.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

// The directory of this module. The only ESM-specific line: in a CommonJS build use `__dirname`.
const HERE = dirname(fileURLToPath(import.meta.url));

export interface BuildInfo {
  version: string;
  commit?: string;
  date?: string;
  dirty?: boolean;
}

export interface PackageMeta {
  root: string;
  name: string;
  version: string;
  isPrivate: boolean;
  repositoryUrl?: string;
}

export type InstallKind = "checkout" | "npx" | "mise" | "bun" | "pnpm" | "npm" | "unknown";

export interface Step {
  cmd: string;
  args: string[];
  cwd?: string;
}

const run = (cmd: string, args: string[], cwd?: string): string | undefined => {
  try {
    return execFileSync(cmd, args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return undefined;
  }
};

// ── version ─────────────────────────────────────────────────────────────────

export function formatVersion(name: string, info: BuildInfo): string {
  if (!info.commit) return `${name} ${info.version}`;
  const sha = info.commit.slice(0, 7) + (info.dirty ? "-dirty" : "");
  return `${name} ${info.version} (${info.date ? `${sha} ${info.date}` : sha})`;
}

export function packageMeta(from: string = HERE): PackageMeta {
  let dir = realpathSync(from);
  while (!existsSync(join(dir, "package.json"))) {
    const parent = dirname(dir);
    if (parent === dir) throw new Error("cli-meta: no package.json above " + from);
    dir = parent;
  }
  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  const repo = typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url;
  return {
    root: dir,
    name: pkg.name,
    version: pkg.version,
    isPrivate: pkg.private === true,
    repositoryUrl: repo,
  };
}

export function isCheckout(root: string): boolean {
  return existsSync(join(root, ".git"));
}

// The build stamp in dist/, if there is a readable one.
export function readStamp(root: string): BuildInfo | undefined {
  try {
    return JSON.parse(readFileSync(join(root, "dist", "build-info.json"), "utf8")) as BuildInfo;
  } catch {
    return undefined;
  }
}

// `runningFrom` is the directory of the running module. In a checkout the stamp describes dist/
// only; code running from src/ reads git, so a stale build cannot hide newer commits or edits.
export function buildInfo(
  meta: PackageMeta = packageMeta(),
  runningFrom: string = HERE
): BuildInfo {
  const checkout = isCheckout(meta.root);
  const fromDist = (realpathSync(runningFrom) + sep).startsWith(join(meta.root, "dist") + sep);
  const stamp = readStamp(meta.root);
  if (stamp && (!checkout || fromDist)) return stamp;
  if (checkout) {
    const commit = run("git", ["rev-parse", "HEAD"], meta.root);
    if (commit) {
      return {
        version: meta.version,
        commit,
        date: run("git", ["show", "-s", "--format=%cs", "HEAD"], meta.root),
        dirty: run("git", ["status", "--porcelain"], meta.root) !== "",
      };
    }
  }
  return { version: meta.version };
}

export function versionLine(name: string): string {
  return formatVersion(name, buildInfo());
}

// For `<tool> version [--json]`.
export function versionDetails(): Record<string, unknown> {
  const meta = packageMeta();
  const info = buildInfo(meta);
  const checkout = isCheckout(meta.root);
  const install = detectInstall(
    meta.root,
    checkout,
    checkout ? undefined : run("npm", ["root", "-g"])
  );
  return { ...info, install, path: meta.root };
}

// ── install detection ───────────────────────────────────────────────────────

// `root` is the real path of the installed package. `npmGlobalRoot` is `npm root -g`, when known.
export function detectInstall(
  root: string,
  checkout: boolean,
  npmGlobalRoot?: string
): InstallKind {
  if (checkout) return "checkout";
  const p = root.split(sep).join("/");
  if (p.includes("/_npx/")) return "npx";
  if (p.includes("/mise/installs/npm-")) return "mise";
  if (p.includes("/.bun/install/global/")) return "bun";
  if (p.includes("/pnpm/global/") || p.includes("/.pnpm-global/")) return "pnpm";
  if (npmGlobalRoot && root.startsWith(npmGlobalRoot + sep)) return "npm";
  return "unknown";
}

export function packageManagerFor(root: string): "pnpm" | "bun" | "npm" {
  if (existsSync(join(root, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(root, "bun.lock")) || existsSync(join(root, "bun.lockb"))) return "bun";
  return "npm";
}

// A package.json "repository" (`github:o/r`, `o/r`, `git@host:o/r.git`, `git+https://...`) as a URL
// git can clone. `gitInstallUrl` is the same URL in the form npm, pnpm and bun install from.
export function gitCloneUrl(repositoryUrl: string): string {
  const url = repositoryUrl.trim().replace(/^git\+/, "");
  const github = /^(?:github:)?([\w.-]+\/[\w.-]+?)(?:\.git)?$/.exec(url);
  if (github) return `https://github.com/${github[1]}.git`;
  const scp = /^([\w.-]+@[\w.-]+):(.+)$/.exec(url);
  if (scp) return `ssh://${scp[1]}/${scp[2]}`;
  return url;
}

export function gitInstallUrl(repositoryUrl: string): string {
  return `git+${gitCloneUrl(repositoryUrl)}`;
}

export function updateSteps(
  kind: InstallKind,
  meta: PackageMeta,
  pm = packageManagerFor(meta.root)
): Step[] | null {
  // An unpublished package is reinstalled from its repository, never looked up on the registry by name.
  if (meta.isPrivate && kind !== "checkout") {
    if (!meta.repositoryUrl || !["npm", "pnpm", "bun"].includes(kind)) return null;
    const url = gitInstallUrl(meta.repositoryUrl);
    return [{ cmd: kind, args: kind === "npm" ? ["install", "-g", url] : ["add", "-g", url] }];
  }
  const spec = `${meta.name}@latest`;
  switch (kind) {
    case "checkout":
      return [
        // The same branch checkForUpdate compares with, whatever main's upstream is.
        { cmd: "git", args: ["pull", "--ff-only", "origin", "main"], cwd: meta.root },
        { cmd: pm, args: ["install"], cwd: meta.root },
        { cmd: pm, args: ["run", "build"], cwd: meta.root },
      ];
    case "mise":
      return [{ cmd: "mise", args: ["upgrade", "--bump", `npm:${meta.name}`] }];
    case "bun":
      return [{ cmd: "bun", args: ["add", "-g", spec] }];
    case "pnpm":
      return [{ cmd: "pnpm", args: ["add", "-g", spec] }];
    case "npm":
      return [{ cmd: "npm", args: ["install", "-g", spec] }];
    default:
      return null;
  }
}

// ── latest version ──────────────────────────────────────────────────────────

// Negative when a < b. Plain X.Y.Z; a prerelease sorts before its release.
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) => {
    const [core, pre] = v.replace(/^v/, "").split("-", 2);
    return { nums: (core ?? "").split(".").map((n) => Number.parseInt(n, 10) || 0), pre };
  };
  const x = parse(a);
  const y = parse(b);
  for (let i = 0; i < 3; i++) {
    const d = (x.nums[i] ?? 0) - (y.nums[i] ?? 0);
    if (d !== 0) return d;
  }
  if (x.pre === y.pre) return 0;
  if (x.pre === undefined) return 1;
  if (y.pre === undefined) return -1;
  return x.pre < y.pre ? -1 : 1;
}

export interface UpdateStatus {
  current: string;
  latest?: string;
  available?: boolean; // undefined: could not tell
  reason?: string; // why it could not tell
  note?: string; // why an update is available, when it is not a newer version
}

function remoteMainCommit(url: string): string | undefined {
  const line = run("git", ["ls-remote", gitCloneUrl(url), "refs/heads/main"]);
  return line?.split(/\s/)[0] || undefined;
}

export function checkForUpdate(
  kind: InstallKind,
  meta: PackageMeta,
  info: BuildInfo
): UpdateStatus {
  if (kind === "checkout") {
    if (run("git", ["fetch", "--quiet", "origin", "main"], meta.root) === undefined) {
      return { current: meta.version, reason: "could not fetch origin/main" };
    }
    const head = run("git", ["rev-parse", "HEAD"], meta.root);
    const remote = run("git", ["rev-parse", "origin/main"], meta.root);
    if (!head || !remote)
      return { current: meta.version, reason: "could not read the checkout's commits" };
    // Ahead of origin/main is not an update.
    const behind = run("git", ["rev-list", "--count", "HEAD..origin/main"], meta.root);
    if (Number(behind) > 0)
      return { current: head.slice(0, 7), latest: remote.slice(0, 7), available: true };
    // Up to date with origin/main, but dist/ was built from another commit: an update whose pull
    // succeeded and whose install or build failed, or a pull without a rebuild. Rebuilding is the update.
    const stamp = readStamp(meta.root);
    if (stamp?.commit && stamp.commit !== head) {
      return {
        current: stamp.commit.slice(0, 7),
        latest: head.slice(0, 7),
        available: true,
        note: "the build is older than the checkout",
      };
    }
    // Built from uncommitted edits that are gone now: dist/ no longer matches the source.
    if (stamp?.dirty && run("git", ["status", "--porcelain"], meta.root) === "") {
      return {
        current: `${head.slice(0, 7)}-dirty`,
        latest: head.slice(0, 7),
        available: true,
        note: "the build has uncommitted edits the checkout no longer has",
      };
    }
    return { current: head.slice(0, 7), latest: remote.slice(0, 7), available: false };
  }
  if (meta.isPrivate) {
    const remote = meta.repositoryUrl ? remoteMainCommit(meta.repositoryUrl) : undefined;
    if (!remote)
      return { current: meta.version, reason: "could not read the repository's main branch" };
    if (!info.commit)
      return {
        current: meta.version,
        latest: remote.slice(0, 7),
        reason: "this build has no commit stamp",
      };
    return {
      current: info.commit.slice(0, 7),
      latest: remote.slice(0, 7),
      available: remote !== info.commit,
    };
  }
  const latest = run("npm", ["view", `${meta.name}@latest`, "version"]);
  if (!latest) return { current: meta.version, reason: "could not reach the npm registry" };
  return { current: meta.version, latest, available: compareVersions(meta.version, latest) < 0 };
}

// ── update command ──────────────────────────────────────────────────────────

export interface UpdateOptions {
  check?: boolean;
  force?: boolean;
}

const show = (s: Step) => [s.cmd, ...s.args].join(" ");

// Returns the exit code: see the release standard's update table.
export function runUpdate(name: string, opts: UpdateOptions = {}): number {
  const meta = packageMeta();
  const info = buildInfo(meta);
  const checkout = isCheckout(meta.root);
  const kind = detectInstall(
    meta.root,
    checkout,
    checkout ? undefined : run("npm", ["root", "-g"])
  );

  if (kind === "npx") {
    console.log(
      `${name} is running through npx; \`npx ${meta.name}@latest\` always runs the latest version.`
    );
    return 0;
  }

  const status = checkForUpdate(kind, meta, info);
  const steps = updateSteps(kind, meta);
  if (status.available === undefined) {
    console.error(`${name}: cannot tell whether an update is available (${status.reason}).`);
    if (opts.check || !opts.force) return 2;
  } else if (!status.available && !opts.force) {
    console.log(`${name} is up to date (${status.current}).`);
    return 0;
  } else if (status.available) {
    console.log(
      `${name}: update available, ${status.current} → ${status.latest}${status.note ? ` (${status.note})` : ""}.`
    );
  }
  if (opts.check) return status.available ? 1 : 0;

  if (!steps) {
    console.error(
      `${name}: installed from ${meta.root}, which is not a recognized install method.`
    );
    console.error(
      `Update it the way it was installed, for example \`npm install -g ${meta.name}@latest\`.`
    );
    return 1;
  }
  if (kind === "checkout") {
    const branch = run("git", ["symbolic-ref", "--quiet", "--short", "HEAD"], meta.root);
    const dirty = run("git", ["status", "--porcelain"], meta.root) !== "";
    if (branch !== "main" || dirty) {
      console.error(
        `${name}: the checkout at ${meta.root} must be clean and on main to update (it is ${dirty ? "dirty" : "clean"}, on ${branch ?? "a detached HEAD"}).`
      );
      return 1;
    }
  }
  for (const step of steps) {
    console.log(`$ ${show(step)}`);
    const r = spawnSync(step.cmd, step.args, { cwd: step.cwd, stdio: "inherit" });
    if (r.status !== 0) {
      console.error(`${name}: \`${show(step)}\` failed${r.error ? ` (${r.error.message})` : ""}.`);
      console.error(`Fix the cause, then run \`${name} update\` again.`);
      return 1;
    }
  }
  console.log(`${name} updated. Check with \`${name} --version\`.`);
  return 0;
}
