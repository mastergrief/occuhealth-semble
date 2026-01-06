# Testing & Documentation Updates

**Sprint**: 06 of 06
**Index**: ADMIN_GAPS_INDEX
**Depends On**: All previous sprints
**Next**: Complete

---

## Unit Test Plan

### New Test Files Required

```
src/pages/admin/__tests__/
├── AppointmentTypes.test.tsx  (NEW)
├── EmployerVerification.test.tsx  (NEW)
├── AuditLogs.test.tsx  (NEW)
└── GDPRDashboard.test.tsx  (NEW)

src/components/__tests__/
└── ThemeToggle.test.tsx  (NEW)

src/layouts/__tests__/
└── AdminLayout.test.tsx  (NEW)
```

### AppointmentTypes.test.tsx

```typescript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import AppointmentTypes from "../AppointmentTypes";

// Mock Convex hooks
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

describe("AppointmentTypes", () => {
  describe("Edit functionality", () => {
    it("opens edit dialog with pre-populated form for selected type", async () => {
      // Setup mock data
      // Render component
      // Click edit button
      // Assert form fields have existing values
    });

    it("calls appointmentTypes:update mutation with correct payload", async () => {
      // Setup
      // Modify form
      // Submit
      // Assert mutation called with updated values
    });
  });

  describe("Delete functionality", () => {
    it("shows confirmation dialog before delete", async () => {
      // Click delete
      // Assert AlertDialog visible
      // Assert warning message present
    });

    it("calls appointmentTypes:remove mutation on confirm", async () => {
      // Confirm delete
      // Assert mutation called
    });

    it("removes item from list after successful delete", async () => {
      // Mock successful response
      // Assert item no longer in DOM
    });
  });
});
```

### EmployerVerification.test.tsx

```typescript
describe("EmployerVerification", () => {
  describe("Custom rejection reason", () => {
    it("opens rejection reason dialog when Reject clicked", async () => {
      // Click reject
      // Assert dialog with textarea visible
    });

    it("requires rejection reason text before submitting", async () => {
      // Open dialog
      // Assert submit button disabled
      // Enter text
      // Assert submit button enabled
    });

    it("passes custom rejection reason to employers:reject mutation", async () => {
      // Enter custom reason
      // Submit
      // Assert mutation called with custom reason (not hardcoded)
    });
  });
});
```

### ThemeToggle.test.tsx

```typescript
describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("renders theme toggle button", () => {
    render(<ThemeToggle />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("toggles dark class on document when clicked", async () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Dark"));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("loads theme preference from localStorage on mount", () => {
    localStorage.setItem("theme", "dark");
    render(<ThemeToggle />);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("saves theme preference to localStorage when toggled", async () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Dark"));
    expect(localStorage.getItem("theme")).toBe("dark");
  });
});
```

### AdminLayout.test.tsx

```typescript
describe("AdminLayout - Mobile Navigation", () => {
  it("shows horizontal nav on desktop viewport", () => {
    // Set viewport to desktop
    // Render AdminLayout
    // Assert desktop nav visible
    // Assert hamburger hidden
  });

  it("shows hamburger menu icon on mobile viewport", () => {
    // Set viewport to mobile
    // Render AdminLayout
    // Assert hamburger visible
    // Assert desktop nav hidden
  });

  it("opens slide-out menu when hamburger clicked", async () => {
    // Click hamburger
    // Assert Sheet content visible
  });

  it("closes menu when nav link clicked", async () => {
    // Open menu
    // Click nav link
    // Assert menu closed
  });
});
```

---

## Update vitest.config.ts Coverage

```typescript
coverage: {
  provider: "v8",
  include: [
    "src/pages/doctor/**",
    "src/pages/admin/**",  // ADD
    "src/components/**",   // ADD
    "src/layouts/**",      // ADD
    "src/hooks/**",        // ADD
    "src/lib/workos-auth.tsx",
  ],
},
```

---

## Documentation Updates

### 1. NAV-MAP.md - Add Missing Route

**File**: `.claude/rules/BROWSER-CLI/NAV-MAP.md`

**Add to Route Table (line 42):**
```markdown
| `/admin/appointment-types` | Admin | Yes | admin | AppointmentTypes |
```

**Add to Admin Portal Top Nav section:**
```markdown
| Appointment Types | `/admin/appointment-types` | `a[href="/admin/appointment-types"]` | "Appointment Types" link |
```

### 2. Update Backend Discovery Memory

**File**: `.serena/memories/13_BACKEND_DISCOVERY_ADMIN_PORTAL_2026-01-06.md`

**Add Appointment Types API section:**
```markdown
## Appointment Types API

### Queries
- `listActive()` - Public: Get active types for booking
- `listAll({ includeDeleted? })` - Admin: List all types
- `getById(typeId)` - Public: Get single type

### Mutations
- `create(args)` - Admin: Create new type
- `update(typeId, args)` - Admin: Update type fields
- `remove(typeId)` - Admin: Soft/hard delete type

### Schema
- `appointmentTypes` table with `deletedAt` soft delete field
- `by_active`, `by_deleted` indexes
```

### 3. Update Audit Report

**File**: `.serena/memories/AUDIT_REPORT_ADMIN_PORTAL_2026-01-06.md`

**Add new test results (after implementation):**
```markdown
### Suite 7: Appointment Types (9 tests) - UPDATED
| Test ID | Status | Summary |
|---------|--------|---------|
| APPT-10 | ✅ PASS | Edit appointment type with pre-populated form |
| APPT-11 | ✅ PASS | Delete appointment type (hard delete) |
| APPT-12 | ✅ PASS | Delete appointment type (soft delete when in use) |

### Suite 10: New Features (6 tests) - NEW
| Test ID | Status | Summary |
|---------|--------|---------|
| EMP-06 | ✅ PASS | Custom rejection reason dialog |
| EMP-07 | ✅ PASS | Rejection reason validation (min 10 chars) |
| AUD-05 | ✅ PASS | Filter audit logs by action type |
| AUD-06 | ✅ PASS | Filter audit logs by date range |
| UX-10 | ✅ PASS | Dark mode toggle functionality |
| UX-11 | ✅ PASS | Mobile hamburger menu navigation |

### Updated Missing Features
- ~~Edit functionality for appointment types~~ ✅ IMPLEMENTED
- ~~Delete functionality for appointment types~~ ✅ IMPLEMENTED
- ~~Custom rejection reason for employers~~ ✅ IMPLEMENTED
- ~~Audit log filtering/search~~ ✅ IMPLEMENTED
- ~~Dark mode support~~ ✅ IMPLEMENTED
- ~~Mobile responsiveness~~ ✅ IMPLEMENTED
```

---

## Browser-CLI Test Plan Updates

**File**: `AUDIT/context-hub/pending-plans/plan-admin-portal-gaps.json`

```json
{
  "name": "Admin Portal Gaps - Post-Implementation",
  "suites": [
    {
      "id": "appointment-types-crud",
      "tests": ["APPT-10", "APPT-11", "APPT-12"]
    },
    {
      "id": "employer-rejection",
      "tests": ["EMP-06", "EMP-07"]
    },
    {
      "id": "audit-filtering",
      "tests": ["AUD-05", "AUD-06", "AUD-07"]
    },
    {
      "id": "ux-improvements",
      "tests": ["UX-10", "UX-11"]
    },
    {
      "id": "security-audit",
      "tests": ["SEC-01", "SEC-02"]
    }
  ]
}
```

---

## Acceptance Criteria Summary

### Sprint 02: Security
- [ ] All admin mutations have audit logging
- [ ] processedBy uses authenticated admin ID
- [ ] Input validation prevents empty/invalid values

### Sprint 03: CRUD
- [ ] Appointment types can be edited via UI
- [ ] Appointment types can be deleted (soft/hard)
- [ ] Custom rejection reason accepted and stored
- [ ] Audit log filtering works

### Sprint 04: UX
- [ ] Dark mode toggle functional and persists
- [ ] Mobile hamburger menu works with 44px touch targets

### Sprint 05: Testing
- [ ] All manual Browser-CLI tests pass
- [ ] Screenshots collected as evidence

### Sprint 06: Documentation
- [ ] Unit tests created for new features
- [ ] NAV-MAP.md updated with /admin/appointment-types
- [ ] Backend discovery memory updated
- [ ] Audit report updated with new test results

---

## Deployment Checklist

Pre-deployment:
- [ ] Run `npm run typecheck` - no errors
- [ ] Run `npm run test` - all unit tests pass
- [ ] Run `npx convex dev` - schema migrations applied
- [ ] Run Browser-CLI test suite - all tests pass
- [ ] Review console for errors during testing
- [ ] Verify audit logs created for admin actions

Post-deployment:
- [ ] Verify dark mode works in production
- [ ] Verify mobile navigation works
- [ ] Test appointment type CRUD in production
- [ ] Verify audit logs appearing in production
- [ ] Update deployment documentation

---

✓ Final Sprint

---

## Sprint Series Summary

| Sprint | Topic | Status |
|--------|-------|--------|
| 01 | Executive Summary & Architecture | ✅ Complete |
| 02 | Security Vulnerabilities & Fixes | ✅ Complete |
| 03 | Feature Implementation - CRUD Gaps | ✅ Complete |
| 04 | Feature Implementation - UX Gaps | ✅ Complete |
| 05 | Browser-CLI Manual Testing | ✅ Complete |
| 06 | Testing & Documentation | ✅ Complete |

**Total Implementation Effort**: ~35.5 hours
**Recommended Timeline**: 2-3 sprints
