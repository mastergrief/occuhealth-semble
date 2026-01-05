# Architecture & Fix Implementation

**Sprint**: 02 of 06
**Index**: EMPLOYER_ROUTING_INDEX
**Depends On**: EMPLOYER_ROUTING_SPRINT_01_EXECUTIVE_SUMMARY
**Next**: EMPLOYER_ROUTING_SPRINT_03_BROWSER_TESTING

---

## Architecture Diagram

```
                            main.tsx (Entry Point)
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
   BrowserRouter          ConvexProviderWithAuthKit      WorkOSAuthProvider
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    │
                               App.tsx (262 lines)
                                    │
     ┌──────────────┬───────────────┼───────────────┬──────────────┐
     │              │               │               │              │
 /auth/*      /register/*     /employer/*     /doctor/*       /admin/*
                                    │               │              │
                               EmployerLayout  DoctorLayout   AdminLayout
                               (142 lines)     (160 lines)    (140 lines)
                                    │               │              │
                                <Outlet>        <Routes>       <Routes>
                                    │               │              │
                                 EMPTY!         5 Routes       5 Routes
                              (No Routes!)      ✓ Working      ✓ Working
```

---

## Provider Hierarchy

```
BrowserRouter (react-router-dom v7.11.0)
└── ConvexProviderWithAuthKit (@convex-dev/workos)
    └── useLocalStorageAuth (custom hook)
        ├── workos_admin_auth (localStorage)
        ├── workos_employer_auth (localStorage)
        └── workos_doctor_auth (localStorage)
    └── WorkOSAuthProvider (role-based context)
        └── App.tsx (Routes)
            └── EmployerAuthProvider
                └── ErrorBoundary
                    └── Suspense (PageLoader)
                        └── EmployerLayout (lazy)
```

---

## Fix Implementation

### Option A: Add Routes to EmployerLayout (Recommended)

**File**: `src/pages/EmployerLayout.tsx`

**Step 1**: Add imports at top
```typescript
import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

// Lazy load pages
const EmployerDashboard = lazy(() => import("./employer/Dashboard"));
const Employees = lazy(() => import("./employer/Employees"));
const Bookings = lazy(() => import("./employer/Bookings"));
const Reports = lazy(() => import("./employer/Reports"));
const Settings = lazy(() => import("./employer/Settings"));
```

**Step 2**: Replace `<Outlet />` (line 137) with:
```typescript
<Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
  <Routes>
    <Route path="dashboard" element={<EmployerDashboard />} />
    <Route path="employees" element={<Employees />} />
    <Route path="bookings" element={<Bookings />} />
    <Route path="reports" element={<Reports />} />
    <Route path="settings" element={<Settings />} />
    <Route index element={<Navigate to="dashboard" replace />} />
  </Routes>
</Suspense>
```

**Step 3**: Context Handling (Two Options)

**Option A1**: Keep useOutletContext (requires wrapper)
```typescript
// Create EmployerContext to replace Outlet context
const EmployerContext = createContext<LayoutContext | null>(null);

// Wrap Routes in provider
<EmployerContext.Provider value={{ employer, isVerified }}>
  <Routes>...</Routes>
</EmployerContext.Provider>

// Pages update: useOutletContext → useEmployerContext
```

**Option A2**: Create EmployerContext (matches DoctorLayout pattern)
- More consistent with DoctorLayout
- Explicit context definition
- Type-safe hook export

---

## Reference Implementation: DoctorLayout

```typescript
// DoctorLayout.tsx lines 147-154
<Suspense fallback={<div>Loading...</div>}>
  <Routes>
    <Route path="dashboard" element={<DoctorDashboard />} />
    <Route path="appointments" element={<DoctorAppointments />} />
    <Route path="schedule" element={<DoctorSchedule />} />
    <Route path="reports" element={<DoctorReports />} />
    <Route path="settings" element={<DoctorSettings />} />
    <Route index element={<Navigate to="dashboard" replace />} />
  </Routes>
</Suspense>
```

---

## File Changes Summary

| File | Action | Lines Changed |
|------|--------|---------------|
| `EmployerLayout.tsx` | Add Routes block | +20 lines |
| `employer/Dashboard.tsx` | Optional: update context hook | 1 line |
| `employer/Employees.tsx` | Optional: update context hook | 1 line |
| `employer/Bookings.tsx` | Optional: update context hook | 1 line |
| `employer/Reports.tsx` | Optional: update context hook | 1 line |
| `employer/Settings.tsx` | Optional: update context hook | 1 line |

**Total**: ~25 lines changed for full fix

---

## Verification After Fix

1. Navigate to `/employer/dashboard` → Should show Dashboard stats
2. Click "Employees" in sidebar → Should show employee list
3. Click "Bookings" in sidebar → Should show bookings
4. Direct URL `/employer/settings` → Should show settings page
5. Browser back/forward → Should maintain route state

---

→ Next: EMPLOYER_ROUTING_SPRINT_03_BROWSER_TESTING
