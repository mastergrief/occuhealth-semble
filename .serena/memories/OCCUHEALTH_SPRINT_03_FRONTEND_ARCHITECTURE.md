# Frontend Architecture

**Sprint**: 03 of 09
**Index**: OCCUHEALTH_EXPLORATION_INDEX
**Depends On**: OCCUHEALTH_SPRINT_01_EXECUTIVE_SUMMARY
**Next**: OCCUHEALTH_SPRINT_04_AUTHENTICATION_SECURITY

---

## Frontend Overview

**Location**: `/home/gabe/projects/convex-medical-starter/src/`
**Total LOC**: 4,166
**Component Count**: 52
**Framework**: React 19 + Vite 6 + TypeScript 5.7

---

## Component Inventory

### Entry Points

| File | LOC | Purpose |
|------|-----|---------|
| `main.tsx` | 21 | App bootstrap, providers |
| `App.tsx` | 312 | Router, layouts, routes |
| `index.css` | ~100 | Global styles, Tailwind |

### Page Components (17 files, 1,333 LOC)

**Employer Portal** (`src/pages/employer/`):
| Page | LOC | Route | Purpose |
|------|-----|-------|---------|
| `Dashboard.tsx` | 114 | `/employer/dashboard` | Stats, appointments |
| `Employees.tsx` | ~80 | `/employer/employees` | Employee list |
| `Bookings.tsx` | ~100 | `/employer/bookings` | BookingFlow |
| `Reports.tsx` | ~80 | `/employer/reports` | View reports |
| `Settings.tsx` | ~60 | `/employer/settings` | Company profile |

**Doctor Portal** (`src/pages/doctor/`):
| Page | LOC | Route | Purpose |
|------|-----|-------|---------|
| `Dashboard.tsx` | ~100 | `/doctor/dashboard` | Today's schedule |
| `Appointments.tsx` | ~80 | `/doctor/appointments` | All appointments |
| `Schedule.tsx` | ~100 | `/doctor/schedule` | Availability |
| `Reports.tsx` | 137 | `/doctor/reports` | Create reports |
| `Settings.tsx` | ~60 | `/doctor/settings` | Zoom config |

**Admin Portal** (`src/pages/admin/`):
| Page | LOC | Route | Purpose |
|------|-----|-------|---------|
| `GDPRDashboard.tsx` | ~100 | `/admin/gdpr` | Compliance overview |
| `EmployerVerification.tsx` | 79 | `/admin/employers` | Approve/reject |
| `AuditLogs.tsx` | ~80 | `/admin/gdpr/audit` | Audit trail |
| `ErasureRequests.tsx` | 55 | `/admin/gdpr/erasure` | Process erasures |

**Layouts**:
| Layout | LOC | Purpose |
|--------|-----|---------|
| `EmployerLayout.tsx` | 132 | Employer portal shell |
| `DoctorLayout.tsx` | ~120 | Doctor portal shell |

### Feature Components (25 files, 2,044 LOC)

**Auth Components** (`src/components/auth/`):
| Component | LOC | Purpose |
|-----------|-----|---------|
| `AdminAuthCallback.tsx` | 82 | OAuth token processing |
| `SignOutButton.tsx` | 31 | Logout button |

**Employer Components** (`src/components/employer/`):
| Component | LOC | Purpose |
|-----------|-----|---------|
| `EmployerRegistrationForm.tsx` | 219 | Multi-field registration |
| `BookingFlow.tsx` | 186 | 5-step booking wizard |
| `EmployeeForm.tsx` | 142 | Add/edit employee |
| `EmployeeList.tsx` | 55 | Employee table |
| `ReportsList.tsx` | 65 | Reports table |

**Landing Components** (`src/components/landing/`):
| Component | LOC | Purpose |
|-----------|-----|---------|
| `HeroSection.tsx` | 78 | Hero banner |
| `FeaturesSection.tsx` | 67 | Feature cards |
| `TestimonialsSection.tsx` | 71 | Social proof |
| `CTASection.tsx` | 42 | Call-to-action |

**Layout Components** (`src/components/layout/`):
| Component | LOC | Purpose |
|-----------|-----|---------|
| `NavigationBar.tsx` | 89 | Top navigation |
| `Footer.tsx` | 114 | Site footer |
| `Container.tsx` | ~20 | Max-width wrapper |

### UI Components (shadcn/ui, 13 files)

All from `src/components/ui/`:
- `button.tsx` - Variants: default, destructive, outline, secondary, ghost, link, medical
- `card.tsx` - Card, CardHeader, CardContent, CardTitle, CardDescription
- `dialog.tsx` - Modal dialogs (Radix)
- `sheet.tsx` - Slide-out panels (Radix)
- `input.tsx` - Text inputs
- `label.tsx` - Form labels
- `textarea.tsx` - Multi-line input
- `badge.tsx` - Status badges
- `avatar.tsx` - User avatars (Radix)
- `separator.tsx` - Visual dividers
- `navigation-menu.tsx` - Nav menus (Radix)

---

## Routing Structure

```typescript
// App.tsx routes
<Routes>
  {/* Auth */}
  <Route path="/auth/callback" element={<AdminAuthCallback />} />
  <Route path="/register/choose-role" element={<ChooseRole />} />
  <Route path="/register/employer" element={<EmployerRegistrationForm />} />

  {/* Employer Portal */}
  <Route path="/employer" element={<EmployerAuthProvider><EmployerLayout /></EmployerAuthProvider>}>
    <Route path="dashboard" element={<EmployerDashboard />} />
    <Route path="employees" element={<EmployeesPage />} />
    <Route path="bookings" element={<BookingsPage />} />
    <Route path="reports" element={<ReportsPage />} />
    <Route path="settings" element={<EmployerSettings />} />
  </Route>

  {/* Doctor Portal */}
  <Route path="/doctor" element={<DoctorAuthProvider><DoctorLayout /></DoctorAuthProvider>}>
    <Route path="dashboard" element={<DoctorDashboard />} />
    <Route path="appointments" element={<DoctorAppointments />} />
    <Route path="schedule" element={<DoctorSchedule />} />
    <Route path="reports" element={<DoctorReports />} />
    <Route path="settings" element={<DoctorSettings />} />
  </Route>

  {/* Admin Portal */}
  <Route path="/admin" element={<AdminLayout />}>
    <Route index element={<AdminDashboardContent />} />
    <Route path="employers" element={<EmployerVerification />} />
    <Route path="gdpr" element={<GDPRDashboard />} />
    <Route path="gdpr/erasure" element={<ErasureRequests />} />
    <Route path="gdpr/audit" element={<AuditLogs />} />
  </Route>

  {/* Public */}
  <Route path="/*" element={<MainLayout />} />
</Routes>
```

---

## Provider Hierarchy

```
<StrictMode>
  <BrowserRouter>
    <ConvexProvider client={convex}>
      <WorkOSAuthProvider>
        <App />
      </WorkOSAuthProvider>
    </ConvexProvider>
  </BrowserRouter>
</StrictMode>
```

---

## Facade Pattern Implementation

### Component Index Files

```typescript
// src/components/employer/index.ts
export * from "./EmployerRegistrationForm";
export * from "./EmployeeList";
export * from "./EmployeeForm";
export * from "./BookingFlow";
export * from "./ReportsList";

// Usage: import { BookingFlow } from "@/components/employer";
```

### Auth Context Facade

```typescript
// src/lib/workos-auth.tsx (404 LOC)
// Unified provider for all 3 roles

export function WorkOSAuthProvider({ children }) {
  // State management for admin, employer, doctor tokens
  // Cross-tab sync via StorageEvent
  // Token expiration checking
}

// Role-specific hooks (facades over unified context)
export function useAdminAuth() { ... }
export function useEmployerAuth() { ... }
export function useDoctorAuth() { ... }
```

---

## State Management

### Convex Queries (Real-time)
```typescript
// Auto-subscribe, auto-refresh on mutation
const appointments = useQuery(api.appointments.listByEmployer, { employerId });

// Loading state
if (appointments === undefined) return <Spinner />;
```

### Convex Mutations
```typescript
const bookAppointment = useMutation(api.appointments.book);

const handleBook = async () => {
  await bookAppointment({ patientId, employerId, slotId });
};
```

### Local State (Auth)
```typescript
// LocalStorage keys by role
const STORAGE_KEYS = {
  admin: "workos_admin_auth",
  employer: "workos_employer_auth",
  doctor: "workos_doctor_auth",
};
```

---

## Key Patterns

### Loading States
```typescript
// Consistent spinner pattern
if (isLoading) {
  return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}
```

### Empty States
```typescript
if (appointments.length === 0) {
  return <p className="text-muted-foreground">No appointments yet</p>;
}
```

### Auth Guards
```typescript
// Redirect if not authenticated
if (!isAuthenticated) {
  return <Navigate to="/" replace />;
}
```

---

## Known Issues

| Issue | Location | Impact | Priority |
|-------|----------|--------|----------|
| No lazy loading | App.tsx (all static imports) | Bundle size | P2 |
| No memoization | All components except auth | Re-renders | P3 |
| Inconsistent "Page" suffix | employer pages only | Naming | P4 |
| Error state not shown | BookingFlow, EmployeeForm | UX | P1 |
| No Error Boundaries | App.tsx | Crash recovery | P1 |

---

→ Next: OCCUHEALTH_SPRINT_04_AUTHENTICATION_SECURITY
