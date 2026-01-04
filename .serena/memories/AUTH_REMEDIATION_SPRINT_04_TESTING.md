# Testing Infrastructure Assessment

**Sprint**: 04 of 07
**Index**: AUTH_REMEDIATION_INDEX
**Depends On**: Sprint 02
**Next**: AUTH_REMEDIATION_SPRINT_05_ERROR_HANDLING

---

## Current Test Coverage

| Category | Coverage | Status |
|----------|----------|--------|
| Unit Tests | **0%** | ❌ None exist |
| Integration Tests | **0%** | ❌ None exist |
| E2E Tests | **~10%** | ⚠️ 12 tests, surface-level |

**Critical Finding**: The auth bugs (DOC-001 through DOC-005) were discovered via manual browser testing, NOT automated tests.

---

## Existing E2E Infrastructure

**Framework**: Playwright

**Configuration**: `playwright.config.ts`

**Test Scripts** (package.json):
```json
{
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:debug": "playwright test --debug",
  "test:e2e:headed": "playwright test --headed",
  "test:e2e:auth": "playwright test tests/e2e/auth/"
}
```

**Test Files**:
```
tests/e2e/
├── auth/
│   ├── login.spec.ts       # 4 tests - Landing page redirect checks
│   ├── logout.spec.ts      # 4 tests - Storage clearing verification
│   └── role-routing.spec.ts # 4 tests - Token injection routing
└── fixtures/
    └── auth.fixture.ts     # Playwright fixtures (NOT imported anywhere)
```

---

## E2E Test Gaps

### Tests That Would Have Caught Bugs

| Bug | Missing Test |
|-----|--------------|
| DOC-001 | `test('existing doctor routes to /doctor/dashboard')` |
| DOC-002 | `test('doctor registration form renders')` |
| DOC-003 | `test('doctor token stored in workos_doctor_auth')` |
| DOC-004 | `test('authenticated doctor can access /doctor/*')` |
| DOC-005 | `test('logout redirects to landing without error')` |

### Current Test Weakness

```typescript
// role-routing.spec.ts - WEAK TEST
test('doctor token routes to /doctor', async ({ page }) => {
  // Problem 1: Injects token directly (bypasses real auth flow)
  await page.evaluate(() => {
    localStorage.setItem('workos_doctor_auth', JSON.stringify({...}));
  });
  
  await page.goto('/doctor');
  
  // Problem 2: Only checks URL, not actual content rendered
  await expect(page).toHaveURL(/\/doctor/);
  // Should also check: content visible, no redirects, auth state correct
});
```

---

## Missing Unit Test Infrastructure

**Required Setup**:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**vitest.config.ts** (create):
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/workos-auth.tsx'],
    },
  },
});
```

---

## Critical Unit Tests Needed

### 1. Token Expiration (`isTokenExpired`)
```typescript
// src/lib/__tests__/isTokenExpired.test.ts
describe('isTokenExpired', () => {
  it('returns false for valid future token', () => {
    const token = createMockJWT({ exp: futureTimestamp });
    expect(isTokenExpired(token)).toBe(false);
  });
  
  it('returns true for expired token', () => {
    const token = createMockJWT({ exp: pastTimestamp });
    expect(isTokenExpired(token)).toBe(true);
  });
  
  it('returns true for malformed token', () => {
    expect(isTokenExpired('invalid')).toBe(true);
  });
});
```

### 2. Storage Key Selection (`login`)
```typescript
// src/lib/__tests__/login.test.ts
describe('login', () => {
  it('stores admin token in workos_admin_auth', () => {
    login('admin', mockTokens);
    expect(localStorage.getItem('workos_admin_auth')).toBeTruthy();
    expect(localStorage.getItem('workos_doctor_auth')).toBeNull();
  });
  
  it('stores doctor token in workos_doctor_auth', () => {
    login('doctor', mockTokens);
    expect(localStorage.getItem('workos_doctor_auth')).toBeTruthy();
    expect(localStorage.getItem('workos_admin_auth')).toBeNull();
  });
});
```

### 3. Role-Specific Hooks
```typescript
// src/lib/__tests__/useDoctorAuth.test.tsx
describe('useDoctorAuth', () => {
  it('returns isAuthenticated true when role is doctor', () => {
    // Mock context with role: 'doctor'
    const { result } = renderHook(() => useDoctorAuth(), {
      wrapper: MockAuthProvider({ role: 'doctor' }),
    });
    expect(result.current.isAuthenticated).toBe(true);
  });
  
  it('returns isAuthenticated false when role is admin', () => {
    const { result } = renderHook(() => useDoctorAuth(), {
      wrapper: MockAuthProvider({ role: 'admin' }),
    });
    expect(result.current.isAuthenticated).toBe(false);  // THE BUG
  });
});
```

---

## Missing Test Utilities

### Mock Auth Provider
```typescript
// tests/__mocks__/workos-auth.tsx
export const MockWorkOSAuthProvider = ({ 
  children, 
  role, 
  isAuthenticated = true 
}) => {
  const mockValue = {
    isAuthenticated,
    isLoading: false,
    tokens: isAuthenticated ? createMockTokens(role) : null,
    role,
    login: vi.fn(),
    logout: vi.fn(),
  };
  return (
    <WorkOSAuthContext.Provider value={mockValue}>
      {children}
    </WorkOSAuthContext.Provider>
  );
};
```

### JWT Factory
```typescript
// tests/factories/jwt.ts
export function createMockJWT(payload: { exp?: number; sub?: string }) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify({
    exp: payload.exp ?? Math.floor(Date.now() / 1000) + 3600,
    sub: payload.sub ?? 'test_user',
    ...payload,
  }));
  return `${header}.${body}.signature`;
}
```

### localStorage Mock
```typescript
// tests/__mocks__/localStorage.ts
export const mockLocalStorage = () => {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
  };
};
```

---

## Test Coverage Targets

| Function | Current | Target | Priority |
|----------|---------|--------|----------|
| `isTokenExpired()` | 0% | 100% | P1 |
| `refreshAccessToken()` | 0% | 80% | P2 |
| `login()` | 0% | 100% | P0 |
| `logout()` | 0% | 100% | P1 |
| `useAdminAuth()` | 0% | 80% | P1 |
| `useDoctorAuth()` | 0% | 80% | P1 |
| `useEmployerAuth()` | 0% | 80% | P1 |
| `AdminAuthCallback` | 0% | 80% | P0 |

---

## package.json Script Additions

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest watch"
  }
}
```

---

→ Next: AUTH_REMEDIATION_SPRINT_05_ERROR_HANDLING
