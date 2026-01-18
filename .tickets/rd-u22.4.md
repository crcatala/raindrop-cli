---
id: rd-u22.4
status: closed
deps: []
links: []
created: 2026-01-07T07:59:49.590322021-08:00
type: task
priority: 0
parent: rd-u22
---
# Dynamic version from package.json

Stop hardcoding CLI version; read from package.json at runtime.

**Problem:** `src/index.ts` line 20 has `.version("0.1.0")` hardcoded. This causes version drift when package.json is updated but source is not.

**Solution:**
```typescript
// src/index.ts
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf-8"));

program.version(pkg.version);
```

**Important:** After build, the `dist/` folder structure means `../package.json` resolves correctly from `dist/index.js`.

**Alternative:** Inject at build time via tsup/esbuild define. This is more complex but avoids runtime file reads.

**Acceptance Criteria:**
- [ ] `rd --version` shows version from package.json
- [ ] No hardcoded version strings in source (`grep -r "0.1.0" src/` finds nothing version-related)
- [ ] Version updates only require changing package.json
- [ ] Works both in dev (`bun src/index.ts --version`) and built (`node dist/index.js --version`)

**Reference:** plans/RELEASE-READINESS-v0.1.0.md §6


