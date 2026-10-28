#!/usr/bin/env node
// release-standard: scripts/release.mjs r2 (do not edit; see RELEASING.md)
//
//   node scripts/release.mjs release [release-it args]   preflight, release-it (bump, changelog, tag, push,
//                                                         GitHub Release), then publish from the tag
//   node scripts/release.mjs publish [--dry-run] [--tag <tag>]
//                                                        publish the tagged HEAD to npm (resume a release)
//
// release-it publishes to npm before it commits and tags, so its npm step is turned off in
// .release-it.json and this script publishes afterwards: the published build is stamped with the
// release commit and a clean tree. A package with "private": true is never published.
// A prerelease (1.2.0-beta.1) is published under a dist-tag (`beta`), never as `latest`; npm 11
// refuses a prerelease without one. `--tag` (publish) or `--npm.tag` (release) chooses another.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pkg = () => JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

function out(cmd, args) {
  try {
    return execFileSync(cmd, args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

// true: on npm, false: not on npm (E404), null: could not tell (network, auth).
function publishedOnNpm(name, version) {
  const r = spawnSync('npm', ['view', `${name}@${version}`, 'version'], { cwd: root, encoding: 'utf8' });
  if (r.status === 0) return r.stdout.trim() === version;
  return /E404/.test(r.stderr) ? false : null;
}

// The dist-tag for a version: none (npm's `latest`) for a release, the first prerelease identifier
// for a prerelease (`beta` for 1.2.0-beta.1), or `next` when that identifier is numeric (1.2.0-0).
function distTag(version) {
  const pre = /^\d+\.\d+\.\d+-([0-9A-Za-z-]+)/.exec(version)?.[1];
  if (!pre) return undefined;
  return /^\d+$/.test(pre) ? 'next' : pre;
}

// The value of `--name <value>` or `--name=<value>` in args: undefined when absent, '' when empty.
function optionValue(args, name) {
  const i = args.findIndex((a) => a === name || a.startsWith(`${name}=`));
  if (i === -1) return undefined;
  return args[i] === name ? (args[i + 1] ?? '') : args[i].slice(name.length + 1);
}

function publish({ dryRun, tag: chosenTag, resumeHint }) {
  const { name, version, private: isPrivate } = pkg();
  if (isPrivate) {
    console.error(`${name} is private; nothing to publish.`);
    return;
  }
  const gitTag = `v${version}`;
  const distTagName = chosenTag ?? distTag(version);
  const problems = [];
  const tagsAtHead = (out('git', ['tag', '--points-at', 'HEAD']) ?? '').split('\n');
  if (!tagsAtHead.includes(gitTag)) problems.push(`HEAD is not tagged ${gitTag}; publish only from the release commit.`);
  if (chosenTag === '') problems.push('--tag needs a value.');
  if (out('git', ['status', '--porcelain']) !== '') problems.push('the working tree is not clean.');
  const user = out('npm', ['whoami']);
  if (!user) problems.push('not logged in to npm (run `npm login`).');
  const published = publishedOnNpm(name, version);
  if (published === true) problems.push(`${name}@${version} is already on npm.`);
  if (published === null) problems.push(`could not check whether ${name}@${version} is on npm (network?).`);
  if (problems.length > 0) {
    fail(`Not publishing ${name}@${version}:\n${problems.map((p) => `  - ${p}`).join('\n')}\n${resumeHint}`);
  }
  const tagNote = distTagName ? ` under the "${distTagName}" dist-tag` : '';
  console.error(`Publishing ${name}@${version}${tagNote} as ${user}${dryRun ? ' (dry run)' : ''}...`);
  // Inherit stdio: npm asks for a one-time password or opens a browser here when the account uses 2FA.
  // No --access flag: it would override package.json "publishConfig"; scoped packages set
  // "publishConfig": { "access": "public" } there.
  const args = ['publish', ...(distTagName ? ['--tag', distTagName] : []), ...(dryRun ? ['--dry-run'] : [])];
  const r = spawnSync('npm', args, {
    cwd: root,
    stdio: 'inherit',
  });
  if (r.status !== 0) fail(`npm publish failed. ${resumeHint}`);
  if (!dryRun) console.error(`Published. Check: npm view ${name}@${version}`);
}

const [command, ...rest] = process.argv.slice(2);
switch (command) {
  case 'release': {
    const info = rest.some((a) => ['--help', '-h', '--version', '-v', '--release-version', '--changelog'].includes(a));
    const dryRun = rest.some((a) => a === '--dry-run' || a === '-d');
    const { name, version, private: isPrivate } = pkg();
    if (!info) {
      const problems = [];
      if ((out('git', ['tag', '--points-at', 'HEAD']) ?? '').split('\n').includes(`v${version}`)) {
        problems.push(`HEAD is already the v${version} release. If only the npm publish failed, run \`npm run release:publish\`.`);
      }
      if (!isPrivate && !out('npm', ['whoami'])) problems.push('not logged in to npm (run `npm login`); the publish step needs it.');
      if (problems.length > 0) fail(`Not releasing ${name}:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
    }
    const bin = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'release-it.cmd' : 'release-it');
    const r = spawnSync(bin, rest, { cwd: root, stdio: 'inherit' });
    if (r.error) fail(`could not run release-it (${r.error.message}); install dev dependencies first.`);
    if (r.status !== 0) process.exit(r.status ?? 1);
    if (info || dryRun) break;
    const npmTag = optionValue(rest, '--npm.tag');
    const resume = `npm run release:publish${npmTag ? ` -- --tag ${npmTag}` : ''}`;
    publish({
      dryRun: false,
      tag: npmTag,
      resumeHint: `The release commit, tag and GitHub Release are done; only the npm publish is left. Fix this, then run \`${resume}\`.`,
    });
    break;
  }
  case 'publish':
    publish({
      dryRun: rest.includes('--dry-run'),
      tag: optionValue(rest, '--tag'),
      resumeHint: 'Fix this, then run `npm run release:publish` again.',
    });
    break;
  default:
    fail('usage: node scripts/release.mjs release [release-it args] | publish [--dry-run] [--tag <tag>]  (see RELEASING.md)');
}
