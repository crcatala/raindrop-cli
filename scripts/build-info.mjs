#!/usr/bin/env node
// release-standard: scripts/build-info.mjs r1 (do not edit; see RELEASING.md)
// Usage: node scripts/build-info.mjs [output]   (default: dist/build-info.json)
// Stamps the version, commit, commit date and dirty state into the build. Run it at the end of `build`.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const output = process.argv[2] ?? 'dist/build-info.json';
const git = (...args) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return undefined;
  }
};

const { version } = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const info = { version };
const commit = git('rev-parse', 'HEAD');
if (commit) {
  info.commit = commit;
  info.date = git('show', '-s', '--format=%cs', 'HEAD');
  // Ignored files (the build output itself) do not count.
  info.dirty = git('status', '--porcelain') !== '';
}

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(info, null, 2)}\n`);
