---
id: rd-tr4
status: closed
deps: [rd-8h5]
links: []
created: 2026-01-05T12:54:15.904525215-08:00
type: task
priority: 2
---
# Refactor test suite: split live tests, add throttling, and cleanup

## Summary
Refactor the test suite to separate live API tests from unit tests, add rate limit protection, and implement test artifact cleanup.

## Background
As our live test cases grow, we're encountering:
- Rate limits from Raindrop API
- Test artifacts (bookmarks, tags) lingering in the account
- All tests running together, making it hard to run just unit tests or just live tests

## Implementation Plan

### 1. Rate Limiting / Throttling (DRY approach)
Add throttling at the Axios interceptor level via environment variable:

```typescript
// In src/utils/axios-interceptors.ts
const apiDelay = process.env.RDCLI_API_DELAY_MS;
if (apiDelay) {
  await sleep(parseInt(apiDelay, 10));
}
```

Default delay for live tests: **250ms** between requests.

### 2. Split Test Files
Move live API tests to separate files:
- `src/commands/bookmarks.test.ts` → keep unit tests only
- `src/commands/bookmarks.live.test.ts` → move 'with auth' describe blocks
- Same for: collections, tags, highlights

### 3. Update package.json Scripts
```json
{
  "test": "bun test --ignore '**/**.live.test.ts'",
  "test:live": "RDCLI_API_DELAY_MS=250 bun test '**/*.live.test.ts'",
  "test:all": "RDCLI_API_DELAY_MS=250 bun test",
  "test:verbose": "bun test --ignore '**/**.live.test.ts'"
}
```

### 4. Update lefthook.yml Pre-push
```yaml
pre-push:
  commands:
    verify:
      run: SIMPLE_OUTPUT=1 bun run verify
      # verify.ts should run test:all (includes live tests)
```

### 5. Test Artifact Naming Convention
All test-created resources should use identifiable prefixes:
- **Bookmarks**: Title starts with `[RDCLI-TEST]`
- **Tags**: Prefixed with `rdcli-test-`
- **Collections**: Named `RDCLI-TEST-*`

Update existing test helpers (`createTestBookmark`, etc.) to use these conventions.

### 6. Test Cleanup Utility
Create `src/test-utils/cleanup.ts`:

```typescript
export async function cleanupTestArtifacts() {
  // 1. Search for [RDCLI-TEST] bookmarks
  // 2. Batch delete them permanently
  // 3. Empty trash (requires rd-8h5)
}
```

Run cleanup **once before** the live test suite (not before each test).

### 7. Live Test Setup
Add a bun test preload or beforeAll at suite level:
```typescript
// src/test-utils/live-setup.ts
import { beforeAll } from 'bun:test';
import { cleanupTestArtifacts } from './cleanup.js';

beforeAll(async () => {
  if (process.env.RAINDROP_TOKEN) {
    await cleanupTestArtifacts();
  }
});
```

## Acceptance Criteria
- [ ] `bun run test` runs only unit tests (no API calls)
- [ ] `bun run test:live` runs only live tests with 250ms throttle
- [ ] `bun run test:all` runs everything with throttle
- [ ] Live tests skip cleanly when RAINDROP_TOKEN is not set
- [ ] Pre-push hook runs all tests (live tests skip if no token)
- [ ] Test artifacts use `[RDCLI-TEST]` naming convention
- [ ] Cleanup runs once before live test suite
- [ ] No orphaned test artifacts after successful test run

## Dependencies
- Blocked by rd-8h5 (trash empty command) - needed for cleanup


