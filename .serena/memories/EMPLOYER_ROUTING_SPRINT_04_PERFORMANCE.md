# Performance & Error Handling Analysis

**Sprint**: 04 of 06
**Index**: EMPLOYER_ROUTING_INDEX
**Depends On**: EMPLOYER_ROUTING_SPRINT_01_EXECUTIVE_SUMMARY
**Next**: EMPLOYER_ROUTING_SPRINT_05_SECURITY

---

## Performance Profile

### Bundle Splitting Strategy

```
MAIN BUNDLE (Initial Load):
├── App.tsx
├── main.tsx
├── WorkOSAuthProvider
├── ConvexProviderWithAuthKit
├── NavigationBar, Footer
└── 6x Landing Sections (NOT lazy) ← Optimization opportunity

LAZY CHUNKS (On navigation):
├── EmployerLayout.tsx (single chunk)
├── DoctorLayout.tsx + 5 child pages (nested lazy)
├── AdminLayout.tsx (sync-imported children) ← Optimization opportunity
├── ChooseRole.tsx
├── EmployerRegistrationForm.tsx
└── DoctorRegistrationForm.tsx
```

### Loading Waterfall: Employer Portal

```
Time    Action                              Duration
──────  ──────────────────────────────────  ────────
T+0     main.tsx parses                     ~50ms
T+50    ConvexProviderWithAuthKit init      ~50ms
T+100   WorkOSAuthProvider loads            ~50ms
T+150   App.tsx Routes evaluates            ~50ms
T+200   React.lazy() → chunk fetch          200-500ms ← Network
T+400   EmployerLayout mounts               ~50ms
T+450   useQuery() initiated                50-200ms ← Network
T+600   Employer data received              ~50ms
T+650   Outlet/Routes renders pages         varies
T+850   All dashboard queries complete      INTERACTIVE

TOTAL TIME TO INTERACTIVE: ~850ms (optimal) to ~1500ms (slow network)
```

### Suspense Boundary Analysis

| Layout | Suspense Count | Optimal? | Issue |
|--------|----------------|----------|-------|
| Employer | 1 (App-level) | No | All pages wait for layout + page bundle |
| Doctor | 2 (nested) | **Yes** | Layout shows, pages load separately |
| Admin | 1 (App-level) | No | Admin pages bundled synchronously |

---

## Error Handling Taxonomy

### Errors Caught

| Error Type | Caught By | User Experience |
|------------|-----------|-----------------|
| React render errors | ErrorBoundary | Error page with Try Again/Go Home |
| Token expired on mount | WorkOSAuthProvider | Redirect to "/" |
| Convex query throws | ErrorBoundary | Error page |

### Errors NOT Caught (Gaps)

| Error Type | Current Behavior | Risk |
|------------|------------------|------|
| Token expired mid-session | Stale data, failed mutations | **HIGH** |
| Convex query undefined | Shows "Loading..." forever | **HIGH** |
| Lazy chunk load fails | PageLoader spinner forever | **HIGH** |
| No child route match | Empty Outlet area | **CRITICAL** (current bug) |

---

## Error Recovery Gaps

### Gap 1: No Automatic Token Refresh

**Current**: `refreshAccessToken()` exists but never called proactively
**Impact**: Users logged out mid-session
**Fix**: Add refresh before expiry in `useLocalStorageAuth`

### Gap 2: No Loading Timeout

**Current**: Could hang indefinitely on loading states
**Impact**: Spinner forever on network failure
**Fix**: Add 30s timeout with error UI

### Gap 3: No Convex Error Distinction

**Current**: `undefined` could mean loading OR error
**Impact**: Can't tell if query failed vs pending
**Fix**: Use Convex error handling patterns

### Gap 4: No Lazy Load Retry

**Current**: Failed chunk loads show spinner forever
**Impact**: Users stuck on network blip
**Fix**: Add retry button on chunk load failure

---

## Performance Optimization Recommendations

### Priority 1: Landing Page Lazy Loading (HIGH)

**Current**: All 6 landing sections in main bundle
**Fix**: Lazy-load below-fold sections

```typescript
// App.tsx
const FeaturesSection = lazy(() => import("@/components/landing/FeaturesSection"));
const HowItWorksSection = lazy(() => import("@/components/landing/HowItWorksSection"));
const PricingSection = lazy(() => import("@/components/landing/PricingSection"));
```

### Priority 2: Nested Suspense for EmployerLayout (MEDIUM)

**Current**: Single Suspense at App level
**Fix**: Add nested Suspense like DoctorLayout

```typescript
// EmployerLayout.tsx
<main className="flex-1">
  <Suspense fallback={<div>Loading page...</div>}>
    <Routes>...</Routes>
  </Suspense>
</main>
```

### Priority 3: Route Prefetching (LOW)

```typescript
// App.tsx
useEffect(() => {
  if (tokens?.role === 'employer') {
    import('./pages/EmployerLayout'); // Warm cache
  }
}, [tokens?.role]);
```

---

## Memory Management

**Analysis Result**: LOW RISK

All patterns have proper cleanup:
- Event listeners: cleanup in useEffect return
- Convex subscriptions: managed by library
- Context providers: React handles unmount
- Token refresh mutex: clears itself after refresh

---

## Convex Query Patterns

### Skip Pattern (Correct Usage)

All layouts correctly prevent queries when not authenticated:

```typescript
const employer = useQuery(
  api.employers.getByWorkosIdPublic,
  workosUserId ? { workosUserId } : "skip"
);
```

### Real-Time Subscriptions

- All `useQuery()` calls create WebSocket subscriptions
- Auto-update when data changes
- No HTTP caching overhead
- Memory: 1 subscription per unique query + args

---

## Performance Metrics

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| Time to Interactive | 850-1500ms | <1000ms | MEDIUM |
| Main bundle size | Large (landing) | Optimized | HIGH |
| Code splitting | 8 lazy chunks | 10+ chunks | LOW |
| Memory leaks | None detected | None | ACHIEVED |

---

→ Next: EMPLOYER_ROUTING_SPRINT_05_SECURITY
