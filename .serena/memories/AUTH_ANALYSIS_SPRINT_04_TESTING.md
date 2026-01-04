# Testing Infrastructure: Auth Coverage

**Sprint**: 04 of 07
**Index**: AUTH_ANALYSIS_INDEX
**Depends On**: AUTH_ANALYSIS_SPRINT_02_ARCHITECTURE
**Next**: AUTH_ANALYSIS_SPRINT_05_BROWSER_CLI

---

## Current Test Coverage: ~30%

---

## Existing Test Files

| Category | Path | Count |
|----------|------|-------|
| E2E Auth | `tests/e2e/auth/` | 3 files |
| Browser-CLI | `BROWSER-CLI/tests/` | 32 files |
| Orchestration | `ORCHESTRATION/tests/` | 12 files |

### E2E Auth Tests (Playwright)
```
tests/e2e/auth/
├── login.spec.ts       # 5 tests - login button href verification
├── logout.spec.ts      # 4 tests - storage clearance
└── role-routing.spec.ts # 4 tests - token-based routing
```

**Pattern**: Tests verify hrefs point to WorkOS, NOT actual OAuth flow

---

## Missing Test Infrastructure

### No Unit Testing Framework ❌
```json
// package.json - MISSING
{
  "vitest": "NOT INSTALLED",
  "@testing-library/react": "NOT INSTALLED",
  "@testing-library/user-event": "NOT INSTALLED"
}
```

### No Unit Tests for Auth Hooks ❌
| Hook | Test Status |
|------|-------------|
| `useAdminAuth()` | MISSING |
| `useEmployerAuth()` | MISSING |
| `useDoctorAuth()` | MISSING |
| `useWorkOSAuth()` | MISSING |
| `isTokenExpired()` | MISSING |
| `WorkOSAuthProvider` | MISSING |

### No Backend Authorization Tests ❌
| Function | Test Status |
|----------|-------------|
| `getAuthenticatedUser()` | MISSING |
| `requireAdmin()` | MISSING |
| `requireEmployerOwnership()` | MISSING |
| `requireDoctorAccess()` | MISSING |

---

## Untested Error Paths

| Error Scenario | Location | Status |
|----------------|----------|--------|
| Invalid JWT structure | `isTokenExpired` catch | NO TEST |
| Missing identity | `getAuthenticatedUser` | NO TEST |
| Employer not found | `requireEmployerOwnership` | NO TEST |
| Doctor not found | `requireDoctorAccess` | NO TEST |
| Admin not found | `requireAdmin` | NO TEST |
| WorkOS API failure | Network errors | NO TEST |
| Token refresh failure | Refresh expired | NO TEST |

---

## Untested Edge Cases

1. Multi-tab auth sync (localStorage events)
2. Token refresh race conditions
3. Role escalation attempts
4. Stale token scenarios (expired mid-session)
5. Network failure during OAuth callback
6. Cross-role contamination (multiple role tokens)

---

## TypeScript Configuration

```json
// tsconfig.app.json - GOOD
{
  "strict": true,                        // ENABLED ✅
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noFallthroughCasesInSwitch": true
}
```

### ESLint - RELAXED ⚠️
```javascript
// eslint.config.js - Type safety disabled
{
  "@typescript-eslint/no-explicit-any": "off",      // DISABLED
  "@typescript-eslint/no-unsafe-argument": "off",   // DISABLED
  "@typescript-eslint/no-unsafe-assignment": "off", // DISABLED
}
```

---

## Recommended Test Structure

```
tests/
├── setup.ts                    # Mocks, globals
├── utils/
│   ├── workos-mocks.ts         # JWT creation, WorkOS API mocks
│   ├── auth-test-utils.ts      # Common auth helpers
│   └── convex-mocks.ts         # Convex context mocks
├── unit/
│   └── auth/
│       ├── isTokenExpired.test.ts
│       ├── useAdminAuth.test.ts
│       ├── useEmployerAuth.test.ts
│       ├── useDoctorAuth.test.ts
│       └── workos-provider.test.ts
└── e2e/
    └── auth/
        ├── login.spec.ts       # EXISTS
        ├── logout.spec.ts      # EXISTS
        ├── role-routing.spec.ts # EXISTS
        ├── multi-tab.spec.ts   # NEW
        ├── token-expiration.spec.ts # NEW
        └── token-refresh.spec.ts # NEW
```

---

## Mock Utilities Needed

```typescript
// tests/utils/workos-mocks.ts
export const createMockJWT = (payload, expiresIn = 3600) => {
  const exp = Math.floor(Date.now() / 1000) + expiresIn;
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify({ ...payload, exp }));
  return `${header}.${body}.mock_signature`;
};

export const createExpiredToken = () => createMockJWT({}, -3600);
export const createValidToken = (userId) => createMockJWT({ sub: userId });
```

---

## Implementation Priority

| Priority | Test Category | Effort |
|----------|---------------|--------|
| P1 | Add Vitest + testing-library | 2 hours |
| P1 | isTokenExpired unit tests | 1 hour |
| P1 | Authorization guard tests | 3 hours |
| P2 | Auth hook unit tests | 4 hours |
| P2 | Multi-tab E2E tests | 2 hours |
| P3 | Token expiration E2E | 2 hours |

---

→ Next: AUTH_ANALYSIS_SPRINT_05_BROWSER_CLI
