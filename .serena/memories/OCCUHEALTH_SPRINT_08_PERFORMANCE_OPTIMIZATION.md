# Performance & Optimization

**Sprint**: 08 of 09
**Index**: OCCUHEALTH_EXPLORATION_INDEX
**Depends On**: OCCUHEALTH_SPRINT_02_BACKEND_MODULES, OCCUHEALTH_SPRINT_03_FRONTEND_ARCHITECTURE
**Next**: OCCUHEALTH_SPRINT_09_IMPROVEMENT_ROADMAP

---

## Performance Profile Summary

| Component | Score | Assessment |
|-----------|-------|------------|
| Index Coverage | A | All queries indexed |
| Query Efficiency | C | N+1 patterns present |
| Pagination | F | **Not implemented** |
| Lazy Loading | F | **Not implemented** |
| Memoization | D | Only in auth context |
| Auth Performance | B | Good, missing auto-refresh |
| Real-time Sync | B+ | Efficient, could debounce |
| Bundle Size | C+ | No splitting configured |
| Caching | B | Convex-only, sufficient |
| **OVERALL** | **C+** | Functional but not scalable |

---

## Critical Issues

### 1. No Pagination (CRITICAL)

**Problem**: All queries use `.collect()` without limits.

```typescript
// Example: getGDPRStats fetches ENTIRE TABLES
const totalPatients = await ctx.db
  .query("patients")
  .filter((q) => q.eq(q.field("deletedAt"), undefined))
  .collect();  // Returns ALL patients!
```

**Affected Queries**:
| Query | Risk at Scale |
|-------|---------------|
| patients.list | HIGH (>1000 employees) |
| appointments.listByEmployer | HIGH |
| reports.listByEmployer | HIGH |
| gdpr.getGDPRStats | HIGH (full table scans) |
| employers.listAll | MEDIUM |

**Solution**:
```typescript
// Use Convex pagination
const patients = await ctx.db.query("patients")
  .withIndex("by_employer", q => q.eq("employerId", employerId))
  .paginate({ numItems: 50, cursor: args.cursor });
```

### 2. N+1 Query Patterns

**Problem**: Enrichment loops cause sequential queries.

```typescript
// appointments.ts - N+1 pattern
return Promise.all(
  appointments.map(async (apt) => ({
    ...apt,
    patient: await ctx.db.get(apt.patientId),  // N additional queries!
  }))
);
```

**Files with N+1 Patterns**:
| File | Function | N+1 Count |
|------|----------|-----------|
| appointments.ts | listByEmployer | +1 patient |
| appointments.ts | listByDate | +3 (patient, employer, type) |
| appointments.ts | getById | +3 |
| reports.ts | listByEmployer | +1 patient |

**Solution**:
```typescript
// Batch fetch with Promise.all or denormalize
const patientIds = appointments.map(a => a.patientId);
const patients = await Promise.all(patientIds.map(id => ctx.db.get(id)));
// Map back to appointments
```

### 3. No Lazy Loading

**Problem**: All portal code loaded upfront regardless of route.

```typescript
// App.tsx - ALL imports are static
import { EmployerDashboard } from "@/pages/employer/Dashboard";
import { DoctorDashboard } from "@/pages/doctor/Dashboard";
import { GDPRDashboard } from "@/pages/admin/GDPRDashboard";
// ... 40+ more static imports
```

**Impact**: Initial bundle includes ALL portal code even for unauthenticated users viewing landing page.

**Solution**:
```typescript
// Use React.lazy for portals
const EmployerDashboard = lazy(() => import("@/pages/employer/Dashboard"));
const DoctorDashboard = lazy(() => import("@/pages/doctor/Dashboard"));
const GDPRDashboard = lazy(() => import("@/pages/admin/GDPRDashboard"));

// Wrap with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <Route path="dashboard" element={<EmployerDashboard />} />
</Suspense>
```

---

## Frontend Performance

### React 19 Features Used
- ✅ StrictMode enabled
- ✅ Standard hooks (useState, useEffect, useCallback, useMemo)
- ❌ `React.lazy()` - NOT USED
- ❌ `Suspense` boundaries - PARTIAL
- ❌ `useTransition` - NOT USED

### Memoization Coverage

| Area | useMemo | useCallback | React.memo | Status |
|------|---------|-------------|------------|--------|
| Auth Context | 1 | 6 | 0 | ✅ Good |
| Page Components | 0 | 0 | 0 | ❌ Missing |
| List Components | 0 | 0 | 0 | ❌ Missing |
| Layout Components | 0 | 0 | 0 | ❌ Missing |

### Bundle Size Concerns

| Package | Size | Tree-Shakeable |
|---------|------|----------------|
| react@19 | ~45KB | YES |
| convex@1.31.2 | ~100KB | PARTIAL |
| lucide-react | ~200KB | YES |
| @radix-ui/* | ~150KB | YES |
| react-router-dom | ~30KB | YES |

**Vite Build Config** (Missing optimization):
```typescript
// vite.config.ts - NO code splitting configured
plugins: [react(), tailwindcss()]
// NO manual chunks
// NO dynamic imports
```

---

## Backend Performance

### Database Index Coverage

| Table | Indices | Status |
|-------|---------|--------|
| adminUsers | by_workos_user_id, by_email | ✅ Good |
| employers | by_workos_user, by_status, by_email | ✅ Good |
| patients | by_employer, by_email, by_deleted | ✅ Good |
| appointments | by_employer, by_patient, by_date, by_status | ✅ Good |
| availableSlots | by_date, by_status, by_date_status | ✅ Good |
| auditLogs | by_action, by_timestamp, by_resource | ✅ Good |

**Finding**: All common query patterns have appropriate indices.

### Real-time Subscriptions

**Subscriptions per route**:
| Route | Subscriptions | Real-Time Tables |
|-------|---------------|------------------|
| /employer/dashboard | 3 | patients, appointments, reports |
| /doctor/dashboard | 1 | appointments |
| /admin/gdpr | 1 | gdpr.getGDPRStats |
| /employer/bookings | 3 | patients, appointmentTypes, availableSlots |

**Assessment**: Reasonable subscription count. No excessive re-renders detected.

---

## Authentication Performance

### Token Handling
- ✅ Expiration check on mount (single check)
- ✅ Expired tokens removed from localStorage
- ❌ No periodic refresh mechanism
- ❌ No refresh token rotation

### LocalStorage Access
| Operation | Frequency |
|-----------|-----------|
| Read all keys | Once per page load |
| Read single key | Cross-tab sync events |
| Write single key | Once per login |
| Delete single key | Once per logout |

**Assessment**: Minimal, well-designed.

---

## Optimization Recommendations

### Priority 1: CRITICAL (Scalability Blockers)

| Issue | Solution | Effort | Impact |
|-------|----------|--------|--------|
| No pagination | Implement cursor-based `.paginate()` | HIGH | HIGH |
| N+1 queries | Batch `ctx.db.get()` calls | MEDIUM | MEDIUM |
| Full table scans in getGDPRStats | Use indexed counts | MEDIUM | HIGH |

### Priority 2: HIGH (User Experience)

| Issue | Solution | Effort | Impact |
|-------|----------|--------|--------|
| No lazy loading | Add `React.lazy()` for portals | MEDIUM | HIGH |
| No loading states | Add Suspense boundaries | LOW | MEDIUM |
| Token refresh missing | Proactive token refresh | MEDIUM | MEDIUM |

### Priority 3: MEDIUM (Polish)

| Issue | Solution | Effort | Impact |
|-------|----------|--------|--------|
| No component memoization | Add React.memo to list items | LOW | MEDIUM |
| No list virtualization | Add react-window for long lists | MEDIUM | MEDIUM |
| No Vite chunk config | Configure manualChunks | LOW | LOW |

---

## Implementation Examples

### Pagination Implementation

```typescript
// Before (loads all)
export const list = query({
  args: { employerId: v.id("employers") },
  handler: async (ctx, { employerId }) => {
    return ctx.db.query("patients")
      .withIndex("by_employer", q => q.eq("employerId", employerId))
      .collect();  // ALL records
  },
});

// After (paginated)
export const list = query({
  args: {
    employerId: v.id("employers"),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { employerId, cursor, limit = 50 }) => {
    return ctx.db.query("patients")
      .withIndex("by_employer", q => q.eq("employerId", employerId))
      .paginate({ numItems: limit, cursor });
  },
});
```

### Vite Chunking

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          convex: ['convex'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-navigation-menu'],
        }
      }
    }
  }
});
```

### Lazy Loading

```typescript
// App.tsx
import { lazy, Suspense } from 'react';

const EmployerDashboard = lazy(() => import("@/pages/employer/Dashboard"));
const DoctorDashboard = lazy(() => import("@/pages/doctor/Dashboard"));

// In routes
<Route path="/employer" element={
  <Suspense fallback={<LoadingSpinner />}>
    <EmployerLayout />
  </Suspense>
}>
  <Route path="dashboard" element={<EmployerDashboard />} />
</Route>
```

---

## Implementation Timeline

| Phase | Tasks | Duration |
|-------|-------|----------|
| Week 1-2 | Add pagination to all list queries | 5 days |
| Week 2 | Implement lazy loading for portals | 2 days |
| Week 3 | Refactor N+1 patterns | 3 days |
| Week 3 | Add counter caches for stats | 2 days |
| Week 4 | Add React.memo to list components | 2 days |
| Week 4 | Configure Vite chunks | 1 day |
| Week 4 | Implement token refresh | 2 days |

---

→ Next: OCCUHEALTH_SPRINT_09_IMPROVEMENT_ROADMAP
