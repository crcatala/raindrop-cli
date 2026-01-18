---
id: rd-u22.5
status: closed
deps: []
links: []
created: 2026-01-07T08:00:22.674283164-08:00
type: chore
priority: 1
parent: rd-u22
---
# Fix TypeScript any usage

Replace the single `any` usage with proper typing.

**Location:** `src/commands/bookmarks.ts` line 356

**Current code:**
```typescript
// Line 354-361
try {
  await client.raindrop.removeRaindrop(id);
} catch (error: any) {
  // If it was already in trash, the first delete killed it.
  // So the second delete returns 404. We strictly consider 404 here 'success' (it's gone).
  if (error?.response?.status !== 404) {
    throw error;
  }
}
```

**Fix:**
```typescript
import { AxiosError } from "axios";

// Then in the catch block:
} catch (error: unknown) {
  // If it was already in trash, the first delete killed it.
  // So the second delete returns 404. We strictly consider 404 here 'success' (it's gone).
  if (error instanceof AxiosError && error.response?.status !== 404) {
    throw error;
  }
  // If not an AxiosError, re-throw
  if (!(error instanceof AxiosError)) {
    throw error;
  }
}
```

**Note:** `AxiosError` is already used elsewhere in the codebase (see `src/utils/axios-interceptors.test.ts`), so the import is safe and consistent.

**Acceptance Criteria:**
- [ ] No `any` types in codebase
- [ ] `bun run typecheck` passes
- [ ] `bun run test` passes (error handling behavior unchanged)
- [ ] 404 errors during delete are still treated as success

**Reference:** plans/RELEASE-READINESS-v0.1.0.md §9


