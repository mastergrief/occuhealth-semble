# Doctor Portal - Routing Architecture Fix

**Sprint**: 01 of 06
**Index**: DOCTOR_PORTAL_SPRINT_INDEX
**Depends On**: None
**Next**: DOCTOR_PORTAL_SPRINT_02_SECURITY
**Priority**: P0 - CRITICAL (Blocks all other work)

---

## Executive Summary

The Doctor Portal has a **critical routing bug (ROUTE-001)** that prevents all 5 page components from rendering. The sidebar and authentication work correctly, but the main content area is empty because `DoctorLayout.tsx` is missing a `<Routes>` block.

**Impact**: 67% of audit tests blocked | **Effort**: 2-4 hours | **Risk**: Low (additive change)

---

## Problem Statement

### Current Architecture (BROKEN)
```
App.tsx
└── Route path="/doctor/*"
    └── DoctorLayout
        └── <Outlet context={{ doctor }} />  ← NO child routes defined
            └── (renders nothing)
```

### Root Cause
- `App.tsx` defines `/doctor/*` route pointing to `DoctorLayout`
- `DoctorLayout` has `<Outlet />` but NO `<Routes>` block
- 5 page components exist but are never imported/rendered:
  - `src/pages/doctor/Dashboard.tsx` (88 LOC)
  - `src/pages/doctor/Appointments.tsx` (72 LOC)
  - `src/pages/doctor/Schedule.tsx` (89 LOC)
  - `src/pages/doctor/Reports.tsx` (136 LOC)
  - `src/pages/doctor/Settings.tsx` (70 LOC)

---

## Implementation

### File to Modify
`src/pages/DoctorLayout.tsx`

### Changes Required

**1. Add lazy imports at top of file:**
```tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";

const DoctorDashboard = lazy(() => 
  import("./doctor/Dashboard").then(m => ({ default: m.DoctorDashboard }))
);
const DoctorAppointments = lazy(() => 
  import("./doctor/Appointments").then(m => ({ default: m.DoctorAppointments }))
);
const DoctorSchedule = lazy(() => 
  import("./doctor/Schedule").then(m => ({ default: m.DoctorSchedule }))
);
const DoctorReports = lazy(() => 
  import("./doctor/Reports").then(m => ({ default: m.DoctorReports }))
);
const DoctorSettings = lazy(() => 
  import("./doctor/Settings").then(m => ({ default: m.DoctorSettings }))
);
```

**2. Replace `<Outlet />` with `<Routes>` block (around line 96):**

**Before:**
```tsx
<main className="flex-1 p-6">
  <Outlet context={{ doctor }} />
</main>
```

**After:**
```tsx
<main className="flex-1 p-6">
  <Suspense fallback={<div className="flex items-center justify-center h-full">Loading...</div>}>
    <Routes>
      <Route path="dashboard" element={<DoctorDashboard />} />
      <Route path="appointments" element={<DoctorAppointments />} />
      <Route path="schedule" element={<DoctorSchedule />} />
      <Route path="reports" element={<DoctorReports />} />
      <Route path="settings" element={<DoctorSettings />} />
      <Route index element={<Navigate to="dashboard" replace />} />
    </Routes>
  </Suspense>
</main>
```

**3. Update child components to NOT use useOutletContext:**

Since we're no longer using `<Outlet />`, child components that need doctor data must get it differently. Two options:

**Option A (Recommended)**: Create a DoctorContext provider
```tsx
// Add to DoctorLayout.tsx
export const DoctorContext = createContext<{ doctor: Doc<"doctorSettings"> | null | undefined }>({ doctor: undefined });

// Wrap Routes in provider
<DoctorContext.Provider value={{ doctor }}>
  <Suspense ...>
    <Routes>...</Routes>
  </Suspense>
</DoctorContext.Provider>
```

**Option B**: Pass doctor as route state (less clean)

---

## Acceptance Criteria

- [ ] Navigate to `/doctor` → redirects to `/doctor/dashboard`
- [ ] Dashboard shows stats cards and today's appointments
- [ ] All 5 sidebar links navigate to correct pages
- [ ] Each page renders its content (not blank)
- [ ] Browser refresh on any `/doctor/*` route works
- [ ] Direct URL navigation works (deep linking)
- [ ] Typecheck passes: `npm run typecheck`

---

## Verification Commands

### Manual Verification
```bash
# Start dev server
npm run dev

# Test routes (all should render content, not blank)
open http://localhost:5175/doctor
open http://localhost:5175/doctor/dashboard
open http://localhost:5175/doctor/appointments
open http://localhost:5175/doctor/schedule
open http://localhost:5175/doctor/reports
open http://localhost:5175/doctor/settings
```

### Browser-CLI Verification
```bash
# Restore doctor auth state
restoreState authenticated-doctor

# Verify dashboard renders
navigate /doctor/dashboard
wait 1000
snapshot
assert "text:Today's Schedule" visible

# Verify all pages load
navigate /doctor/appointments
wait 500
snapshot
assert "role:main" visible

navigate /doctor/schedule
wait 500
snapshot

navigate /doctor/reports
wait 500
snapshot

navigate /doctor/settings
wait 500
snapshot
```

---

## Related Files

| File | Change Type | Description |
|------|-------------|-------------|
| `src/pages/DoctorLayout.tsx` | MODIFY | Add Routes block |
| `src/pages/doctor/Dashboard.tsx` | MODIFY | Switch from useOutletContext to DoctorContext |
| `src/pages/doctor/Settings.tsx` | MODIFY | Switch from useOutletContext to DoctorContext |

---

## Risk Mitigation

1. **Test auth guard still works** - Verify unauthenticated users redirect to landing
2. **Test lazy loading** - Verify Suspense fallback shows during load
3. **Test error boundary** - Verify errors in child pages don't crash layout

---

## Post-Implementation

After this sprint, run:
```bash
npm run typecheck
```

Then proceed to **Sprint 02: Security Remediation**.

---

→ Next: DOCTOR_PORTAL_SPRINT_02_SECURITY
