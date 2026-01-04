# Error Handling & Edge Cases

**Sprint**: 05 of 07
**Index**: AUTH_REMEDIATION_INDEX
**Depends On**: Sprint 02
**Next**: AUTH_REMEDIATION_SPRINT_06_BROWSER_TESTING

---

## Error Handling Gaps Summary

| ID | Location | Issue | Severity |
|----|----------|-------|----------|
| ERR-001 | `login()` | localStorage.setItem uncaught | 🔴 High |
| ERR-002 | AdminAuthCallback | loginAsAdmin returns void, no error surface | 🟡 Medium |
| ERR-003 | AdminAuthCallback | No ErrorBoundary wrapping | 🔴 High |
| ERR-004 | EmployerLayout | useQuery error not handled | 🟡 Medium |
| ERR-005 | ChooseRole | No ErrorBoundary | 🟡 Medium |

---

## ERR-001: localStorage Write Unhandled

**File**: `src/lib/workos-auth.tsx` (line 267)

**Current Code**:
```typescript
const login = useCallback((role: UserRole, tokens: AuthTokens) => {
  // ... format storageData
  localStorage.setItem(STORAGE_KEYS[role], JSON.stringify(storageData));  // ❌ Can throw
  setState({ isAuthenticated: true, ... });
}, []);
```

**Risk**: `QuotaExceededError` or `SecurityError` crashes app.

**Fix**:
```typescript
const login = useCallback((role: UserRole, tokens: AuthTokens) => {
  try {
    localStorage.setItem(STORAGE_KEYS[role], JSON.stringify(storageData));
    setState({ isAuthenticated: true, ... });
  } catch (error) {
    console.error('Failed to store auth tokens:', error);
    setState({ isAuthenticated: false, isLoading: false, tokens: null, role: null });
    // Optionally show user notification
  }
}, []);
```

---

## ERR-002: AdminAuthCallback loginAsAdmin Silent

**File**: `src/components/auth/AdminAuthCallback.tsx` (lines 44-50)

**Current Code**:
```typescript
loginAsAdmin({
  accessToken,
  refreshToken: refreshToken || undefined,
  userId,
  sessionId: sessionId || undefined,
});
// No error handling - loginAsAdmin returns void
```

**Risk**: If login fails silently, user gets inconsistent state.

**Fix**: While loginAsAdmin doesn't throw, add state verification:
```typescript
loginAsAdmin({ ... });

// Verify auth state was set correctly
setTimeout(() => {
  const stored = localStorage.getItem(STORAGE_KEYS.admin);
  if (!stored) {
    setError('Failed to save authentication state');
  }
}, 100);
```

---

## ERR-003: Missing ErrorBoundary on Auth Routes

**File**: `src/App.tsx`

**Current Routes** (no ErrorBoundary):
```typescript
<Route path="/auth/callback" element={<AdminAuthCallback />} />
<Route path="/register/choose-role" element={<ChooseRole />} />
<Route path="/register/employer" element={<EmployerRegistrationForm />} />
```

**Protected Routes** (have ErrorBoundary):
```typescript
<Route path="/admin/*" element={
  <ErrorBoundary>
    <AdminLayout />
  </ErrorBoundary>
} />
```

**Fix**: Wrap auth routes with ErrorBoundary:
```typescript
<Route path="/auth/callback" element={
  <ErrorBoundary fallback={<AuthErrorFallback />}>
    <AdminAuthCallback />
  </ErrorBoundary>
} />
```

---

## ERR-004: Layout Query Errors

**File**: `src/pages/EmployerLayout.tsx`

**Current Code**:
```typescript
const employer = useQuery(api.employers.getByWorkosUserId, 
  workosUserId ? { workosUserId } : "skip"
);

if (!isAuthenticated) {
  return <Navigate to="/" replace />;
}

// No handling for employer query error/null
```

**Risk**: If query returns null (user not found), shows infinite "Loading..." or blank content.

**Fix**:
```typescript
if (!isAuthenticated) {
  return <Navigate to="/" replace />;
}

if (employer === undefined) {
  return <LoadingSpinner />;  // Query in progress
}

if (employer === null) {
  return <ErrorPage message="Employer account not found. Please register first." />;
}
```

---

## ERR-005: ChooseRole Missing ErrorBoundary

**File**: `src/pages/register/ChooseRole.tsx`

**Risk**: Any React error during role selection shows blank page.

**Same fix as ERR-003** - wrap route in ErrorBoundary.

---

## Edge Cases Analysis

### Token Extraction Edge Cases

| Scenario | Current Handling | Status |
|----------|------------------|--------|
| accessToken missing | Shows error UI | ✅ |
| userId missing | Shows error UI | ✅ |
| refreshToken missing | Graceful degradation | ✅ |
| sessionId missing | Graceful degradation | ✅ |
| error param present | Shows error UI | ✅ |
| state param invalid | Backend validates | ✅ |

### Multi-Tab Synchronization

**Current Implementation**:
```typescript
// src/lib/workos-auth.tsx (lines 208-248)
useEffect(() => {
  const handleStorageChange = (e: StorageEvent) => {
    const roleEntry = Object.entries(STORAGE_KEYS).find(
      ([, key]) => key === e.key
    );
    if (roleEntry) {
      // Sync state from storage event
    }
  };
  window.addEventListener("storage", handleStorageChange);
}, []);
```

**Handled Cases**:
- ✅ Login in another tab
- ✅ Logout in another tab
- ❌ Token refresh conflicts (no mutex across tabs)

### Token Refresh Race Condition

**Current Mitigation**:
```typescript
// Single-tab mutex
let isRefreshing = false;
let refreshPromise: Promise<...> | null = null;

export async function refreshAccessToken(...) {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;  // Return existing promise
  }
  // ...
}
```

**Gap**: No cross-tab mutex. Two tabs could both attempt refresh simultaneously.

---

## Error Propagation Flow

```
WorkOS OAuth Error
       │
       ▼
convex/http.ts /auth/callback
       │ Errors: OAuth error, missing state, missing code
       │ Handling: ✅ Redirects to /login?error=...
       │
       ▼
Frontend /auth/callback (AdminAuthCallback.tsx)
       │ Errors: Missing tokens (✅), localStorage fails (❌)
       │
       ▼
login() → localStorage.setItem
       │ Errors: Quota/Security (❌ UNHANDLED)
       │
       ▼
Layout Auth Guards
       │ Errors: Query fails (❌ Shows Loading forever)
```

---

## Recommended Error Boundary Component

```typescript
// src/components/AuthErrorFallback.tsx
export function AuthErrorFallback({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center max-w-md p-6">
        <h1 className="text-2xl font-bold text-red-600">Authentication Error</h1>
        <p className="text-muted-foreground mt-2">
          Something went wrong during authentication.
        </p>
        <p className="text-sm text-slate-500 mt-4 font-mono">
          {error.message}
        </p>
        <a href="/" className="mt-6 inline-block px-4 py-2 bg-blue-600 text-white rounded">
          Return Home
        </a>
      </div>
    </div>
  );
}
```

---

## Properly Handled Errors ✅

| Error | Location | Handling |
|-------|----------|----------|
| OAuth error param | AdminAuthCallback:29-32 | Shows UI with return home |
| Missing tokens | AdminAuthCallback:34-37 | Shows error message |
| Backend OAuth errors | http.ts:110-113 | Redirects with error |
| CSRF state invalid | http.ts:119-125 | Redirects with error |
| Token refresh fails | workos-auth.tsx:144 | Returns null gracefully |
| Corrupt localStorage | workos-auth.tsx:179-201 | Self-heals, removes bad data |

---

→ Next: AUTH_REMEDIATION_SPRINT_06_BROWSER_TESTING
