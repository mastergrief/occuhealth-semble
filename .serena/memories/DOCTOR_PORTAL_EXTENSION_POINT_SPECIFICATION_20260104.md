# Doctor Portal Extension Point Specification
**Analysis Date**: 2026-01-04  
**Scope**: Extensibility architecture, API contracts, plugin points, refactoring opportunities  
**Coverage**: 100% of Doctor Portal frontend + backend integration points

---

## EXECUTIVE SUMMARY

The Doctor Portal exhibits a **moderately extensible architecture** with clear patterns but several areas requiring improvement. Adding new pages is straightforward following established patterns, but lacks formal abstractions for common operations. The architecture is functional but could benefit from shared utilities and stronger typing.

### Extensibility Score: 7/10

**Strengths**:
- Clear layout/page separation via Outlet pattern
- Consistent Convex query/mutation usage
- Shared authentication hook (useDoctorAuth)
- Backend authorization helpers (requireDoctorAccess)
- Helper modules for pagination, audit logging, batch fetching

**Weaknesses**:
- DoctorContextType duplicated across files (no shared definition)
- No shared page wrapper component
- Missing form abstractions (each page creates form handling)
- No standardized loading/error states
- Logout logic duplicated in layout

---

## PART 1: API CONTRACTS

### 1.1 Frontend Interface Contracts

#### DoctorContextType (Outlet Context)
**Status**: DUPLICATED - Defined in 2 files
**Location**: `src/pages/doctor/Dashboard.tsx` (line 8-10), `src/pages/doctor/Settings.tsx` (line 10-12)

```typescript
interface DoctorContextType {
  doctor: Doc<"doctorSettings"> | null | undefined;
}
```

**Fields from Doc<"doctorSettings">**:
```typescript
{
  _id: Id<"doctorSettings">;
  _creationTime: number;
  workosUserId: string;
  email: string;
  name: string;
  zoomPersonalLink: string;
  createdAt: number;
}
```

**Recommendation**: Move to shared types file (`src/types/doctor.ts`)

---

#### useDoctorAuth Hook Contract
**Location**: `src/lib/workos-auth.tsx` (line 421-460)

```typescript
function useDoctorAuth(): {
  isAuthenticated: boolean;     // True if role=doctor AND tokens exist
  isLoading: boolean;           // True during localStorage hydration
  doctor: Doctor | null;        // Always null (fetched via Convex)
  workosUserId: string | null;  // From tokens if doctor role
  accessToken: string | null;   // For API calls
  sessionId: string | null;     // For logout redirect
  loginAsDoctor: (
    workosUserId: string,
    accessToken: string,
    refreshToken: string,
    sessionId?: string
  ) => void;
  logoutDoctor: () => void;     // Clears tokens, sets role null
}
```

**Usage Pattern**:
```typescript
const { isAuthenticated, isLoading, workosUserId, logoutDoctor, sessionId } = useDoctorAuth();
```

---

### 1.2 Backend API Contracts

#### Doctor Settings Functions
**File**: `convex/doctorSettings.ts`

| Function | Type | Args | Returns | Auth |
|----------|------|------|---------|------|
| `getById` | query | `{ doctorId: Id<"doctorSettings"> }` | `Doc<"doctorSettings"> | null` | None |
| `getByWorkosUserId` | query | `{ workosUserId: string }` | `Doc<"doctorSettings"> | null` | None |
| `getByWorkosId` | internalQuery | `{ workosUserId: string }` | `Doc<"doctorSettings"> | null` | None |
| `create` | mutation | `{ workosUserId, email, name, zoomPersonalLink: string }` | `Id<"doctorSettings">` | None |
| `update` | mutation | `{ doctorId, name?, zoomPersonalLink?: string }` | void | None |

#### Appointments Functions (Doctor-facing)
**File**: `convex/appointments.ts`

| Function | Type | Args | Returns | Auth |
|----------|------|------|---------|------|
| `getTodaysAppointments` | query | `{}` | `Appointment[]` | requireDoctorAccess |
| `listByDate` | query | `{ date: string, ...paginationOpts }` | `{ items: Appointment[], ... }` | requireDoctorAccess |
| `markCompleted` | mutation | `{ appointmentId: Id<"appointments"> }` | void | requireDoctorAccess |

#### Available Slots Functions
**File**: `convex/availableSlots.ts`

| Function | Type | Args | Returns | Auth |
|----------|------|------|---------|------|
| `getByDateRange` | query | `{ startDate, endDate: string }` | `AvailableSlot[]` | None |
| `getAvailable` | query | `{ date: string }` | `AvailableSlot[]` (status=available) | None |
| `createSlots` | mutation | `{ slots: Array<{ date, startTime, endTime }> }` | `Id<"availableSlots">[]` | None |
| `blockSlot` | mutation | `{ slotId: Id<"availableSlots"> }` | void | None |
| `unblockSlot` | mutation | `{ slotId: Id<"availableSlots"> }` | void | None |

#### Reports Functions
**File**: `convex/reports.ts`

| Function | Type | Args | Returns | Auth |
|----------|------|------|---------|------|
| `create` | mutation | `{ appointmentId, fitForWork, summary, restrictions?, followUpRequired, followUpNotes? }` | `Id<"reports">` | requireDoctorAccess |
| `sendToEmployer` | mutation | `{ reportId: Id<"reports"> }` | void | requireDoctorAccess |
| `getByAppointment` | query | `{ appointmentId: Id<"appointments"> }` | `Report | null` | Doctor OR Employer |

---

### 1.3 Backend Authorization Contract

**Location**: `convex/authModules/authorization.ts`

```typescript
// Context type for all Convex functions
type AuthContext = {
  db: DatabaseReader | DatabaseWriter;
  auth: Auth;
};

// Get authenticated user or null
async function getAuthenticatedUser(ctx: AuthContext): Promise<AuthenticatedUser | null> {
  // Returns { workosUserId: string, identity: {...} } or null
}

// Require doctor access, returns doctor record
async function requireDoctorAccess(ctx: AuthContext): Promise<Doc<"doctorSettings">> {
  // Throws ConvexError { code: "UNAUTHENTICATED" | "DOCTOR_NOT_FOUND" }
}

// Error codes enum
type AuthErrorCode = "UNAUTHENTICATED" | "UNAUTHORIZED" | "DOCTOR_NOT_FOUND" | "NOT_FOUND";
```

---

## PART 2: EXTENSION PATTERNS

### 2.1 Adding a New Doctor Page

**Step 1**: Create page component
```typescript
// src/pages/doctor/NewPage.tsx
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";

interface DoctorContextType {
  doctor: Doc<"doctorSettings"> | null | undefined;
}

export function DoctorNewPage() {
  const { doctor } = useOutletContext<DoctorContextType>();
  
  // Queries
  const data = useQuery(api.yourModule.yourQuery);
  
  // Mutations
  const doAction = useMutation(api.yourModule.yourMutation);
  
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Page Title</h1>
      {/* Content */}
    </div>
  );
}
```

**Step 2**: Add route in App.tsx
```typescript
// Currently routes are NOT wired - would need to add:
// Option A: Add nested Route in App.tsx
<Route path="/doctor/*" element={...}>
  <Route path="newpage" element={<DoctorNewPage />} />
</Route>

// Option B (current architecture): DoctorLayout needs Routes block
```

**Step 3**: Add sidebar link
```typescript
// In DoctorLayout.tsx, add to nav section:
<NavLink to="/doctor/newpage" className={...}>
  <YourIcon className="h-5 w-5" />
  Page Name
</NavLink>
```

**Step 4**: Create backend functions (if needed)
```typescript
// convex/yourModule.ts
import { requireDoctorAccess } from "./authModules/authorization";

export const yourQuery = query({
  args: { ... },
  handler: async (ctx, args) => {
    await requireDoctorAccess(ctx);
    // Query logic
  },
});

export const yourMutation = mutation({
  args: { ... },
  handler: async (ctx, args) => {
    await requireDoctorAccess(ctx);
    // Mutation logic
  },
});
```

---

### 2.2 Implicit Contracts (Patterns to Follow)

#### Page Structure Pattern
All doctor pages follow this structure:
```typescript
export function DoctorXXX() {
  // 1. Get context (if needed)
  const { doctor } = useOutletContext<DoctorContextType>();
  
  // 2. Local state
  const [state, setState] = useState(...);
  
  // 3. Convex queries
  const data = useQuery(api.module.query, args);
  
  // 4. Convex mutations
  const mutate = useMutation(api.module.mutation);
  
  // 5. Event handlers
  const handleAction = async () => { await mutate({...}); };
  
  // 6. Render
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Title</h1>
      <Card>...</Card>
    </div>
  );
}
```

#### Date String Format
All date fields use `YYYY-MM-DD` format:
```typescript
const today = new Date().toISOString().split("T")[0];
```

#### Time String Format
All time fields use `HH:MM` format:
```typescript
const startTime = "09:00";
```

#### Pagination Pattern
```typescript
import { defaultPaginationOpts } from "../../../convex/helpers/pagination";

const result = useQuery(api.module.listQuery, { 
  date, 
  ...defaultPaginationOpts() 
});
const items = result?.items ?? [];
```

---

## PART 3: REUSABLE COMPONENTS & HOOKS

### 3.1 Available Reusable Components

#### UI Components (shadcn/ui)
**Location**: `src/components/ui/`

| Component | Props | Usage |
|-----------|-------|-------|
| Card, CardHeader, CardTitle, CardContent | children, className | Container for sections |
| Button | variant, size, onClick, disabled | Actions |
| Input | type, value, onChange, className | Form inputs |
| Label | children | Form labels |
| Dialog, DialogTrigger, DialogContent | open, onOpenChange | Modals |
| Textarea | value, onChange, placeholder | Multi-line input |

#### Auth Components
**Location**: `src/components/auth/`

| Component | Props | Usage |
|-----------|-------|-------|
| SignOutButton | variant, className, showIcon | Logout button |

#### Layout Components
**Location**: `src/components/layout/`

| Component | Props | Usage |
|-----------|-------|-------|
| Container | children | Max-width wrapper |
| NavigationBar | - | Landing page header |
| Footer | - | Landing page footer |

### 3.2 Available Reusable Hooks

| Hook | Location | Returns | Usage |
|------|----------|---------|-------|
| useDoctorAuth | `src/lib/workos-auth.tsx` | Auth state + actions | All doctor pages |
| useEmployerAuth | `src/lib/workos-auth.tsx` | Auth state + actions | Employer portal |
| useAdminAuth | `src/lib/workos-auth.tsx` | Auth state + actions | Admin portal |
| useWorkOSAuth | `src/lib/workos-auth.tsx` | Generic auth state | Internal |

### 3.3 Backend Helper Functions

**Location**: `convex/helpers/`

| Helper | File | Purpose |
|--------|------|---------|
| defaultPaginationOpts(n) | pagination.ts | Standard pagination args |
| nextPageOpts(cursor) | pagination.ts | Next page args |
| toPaginatedResult(data) | pagination.ts | Format paginated response |
| logAppointmentAction | auditLogger.ts | Audit trail for appointments |
| logReportAction | auditLogger.ts | Audit trail for reports |
| logPatientAction | auditLogger.ts | Audit trail for patients |
| getActorInfo(ctx) | auditLogger.ts | Get actor from identity |
| batchGet(ctx, ids) | batchFetch.ts | Batch fetch by IDs |
| extractUniqueIds(items, fn) | batchFetch.ts | Get unique IDs from array |
| enrichWithRelation(items, map, key) | batchFetch.ts | Join related data |
| batchEnrich(ctx, items, table, key) | batchFetch.ts | Convenience enrichment |

---

## PART 4: LIFECYCLE HOOKS & CLEANUP

### 4.1 Component Mount Behavior

#### DoctorLayout Mount Sequence
1. Component mounts
2. `useDoctorAuth()` returns from context (immediate)
3. If `isLoading=true`, renders "Loading..." 
4. Once loaded, if `!isAuthenticated`, redirects to `/`
5. Starts Convex query `getByWorkosUserId(workosUserId)`
6. Renders sidebar + Outlet with context `{ doctor }`

#### Page Component Mount Sequence
1. Component mounts inside Outlet
2. Receives `doctor` via `useOutletContext()`
3. Starts Convex queries (automatic subscription)
4. Renders content (queries return undefined initially, then data)

### 4.2 Data Initialization Patterns

**Real-time Subscriptions**:
All `useQuery` hooks create live subscriptions. Data auto-updates when:
- Backend mutation modifies data
- Another tab/user modifies data
- No manual refresh needed

**Effect-based State Sync** (Settings page pattern):
```typescript
useEffect(() => {
  if (doctor?.zoomPersonalLink) {
    setZoomLink(doctor.zoomPersonalLink);
  }
}, [doctor?.zoomPersonalLink]);
```

### 4.3 Cleanup on Logout

**Location**: `DoctorLayout.tsx` (handleLogout function)

```typescript
const handleLogout = () => {
  logoutDoctor();                    // Clear auth state
  localStorage.clear();              // Clear ALL localStorage
  sessionStorage.clear();            // Clear session storage
  if (sessionId) {
    // Redirect to WorkOS logout endpoint
    window.location.href = `${CONVEX_URL}/auth/logout?sessionId=${sessionId}`;
  } else {
    window.location.href = "/";      // Fallback to landing
  }
};
```

**Issue**: `localStorage.clear()` clears ALL storage, not just auth tokens. This could clear user preferences, cached data, etc.

**Cleanup on Convex Query Unmount**:
- Automatic unsubscription when component unmounts
- No manual cleanup needed for useQuery/useMutation

---

## PART 5: GAPS & MISSING ABSTRACTIONS

### 5.1 Duplicated Patterns

#### GAP-001: DoctorContextType Duplicated
**Impact**: Medium - Risk of type drift
**Current State**: Defined separately in Dashboard.tsx and Settings.tsx
**Recommendation**: Create shared type file

```typescript
// src/types/doctor.ts
import { Doc } from "../../convex/_generated/dataModel";

export interface DoctorContextType {
  doctor: Doc<"doctorSettings"> | null | undefined;
}
```

#### GAP-002: Logout Logic Duplicated
**Impact**: Medium - Maintenance burden
**Current State**: Same logout code in DoctorLayout and EmployerLayout
**Recommendation**: Extract to shared utility

```typescript
// src/lib/auth-utils.ts
export function handlePortalLogout(
  logoutFn: () => void,
  sessionId: string | null
) {
  logoutFn();
  localStorage.removeItem(STORAGE_KEY); // Role-specific, not clear()
  sessionStorage.clear();
  if (sessionId) {
    window.location.href = `${CONVEX_URL}/auth/logout?sessionId=${sessionId}`;
  } else {
    window.location.href = "/";
  }
}
```

#### GAP-003: Date Initialization Repeated
**Impact**: Low - Consistency issue
**Current State**: Each page initializes date differently
**Recommendation**: Create utility function

```typescript
// src/lib/date-utils.ts
export function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}
```

### 5.2 Missing Shared Components

#### MISSING-001: DoctorPageWrapper
**Impact**: High - Repeated loading/error patterns
**Need**: Wrapper component for consistent page structure

```typescript
// src/components/doctor/DoctorPageWrapper.tsx
export function DoctorPageWrapper({ 
  title, 
  children, 
  actions 
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const { doctor } = useOutletContext<DoctorContextType>();
  
  if (!doctor) {
    return <LoadingState />;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{title}</h1>
        {actions}
      </div>
      {children}
    </div>
  );
}
```

#### MISSING-002: LoadingState Component
**Impact**: Medium - Inconsistent loading UIs
**Need**: Shared loading indicator

```typescript
// src/components/shared/LoadingState.tsx
export function LoadingState({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <Spinner className="animate-spin h-8 w-8 mr-2" />
      <span>{message}</span>
    </div>
  );
}
```

#### MISSING-003: EmptyState Component
**Impact**: Medium - Repeated empty state patterns
**Need**: Reusable empty state

```typescript
// src/components/shared/EmptyState.tsx
export function EmptyState({ 
  title, 
  description, 
  action 
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-12">
      <h3 className="font-medium text-lg">{title}</h3>
      {description && <p className="text-muted-foreground mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

### 5.3 Missing Form Abstractions

#### MISSING-004: Form Handling Hook
**Impact**: High - Each page implements form state differently
**Need**: Standardized form handling

```typescript
// src/hooks/useForm.ts
export function useForm<T extends Record<string, unknown>>(
  initialValues: T,
  onSubmit: (values: T) => Promise<void>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleChange = (field: keyof T) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setValues(prev => ({ ...prev, [field]: e.target.value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return { values, setValues, isSubmitting, error, handleChange, handleSubmit };
}
```

### 5.4 Missing Backend Abstractions

#### MISSING-005: Consistent Error Handling
**Impact**: Medium - Error responses vary
**Need**: Standardized error response format

```typescript
// convex/helpers/errors.ts
export function createError(
  code: AuthErrorCode | string,
  message: string,
  details?: Record<string, unknown>
): ConvexError<{ code: string; message: string; details?: unknown }> {
  return new ConvexError({ code, message, details });
}
```

#### MISSING-006: Doctor Context Helper
**Impact**: Low - Convenience function missing
**Need**: Get doctor from context in one call

```typescript
// convex/helpers/doctorContext.ts
export async function getDoctorFromContext(ctx: AuthContext) {
  const doctor = await requireDoctorAccess(ctx);
  return {
    doctor,
    doctorId: doctor._id,
    workosUserId: doctor.workosUserId,
  };
}
```

---

## PART 6: REFACTORING OPPORTUNITIES

### 6.1 High Priority (Architecture Impact)

#### REF-001: Centralize Type Definitions
**Effort**: Low (2-4 hours)
**Impact**: High (type safety, maintainability)

Create `src/types/` directory:
```
src/types/
├── doctor.ts      # DoctorContextType, Doctor, etc.
├── employer.ts    # EmployerContextType, Employer
├── admin.ts       # AdminContextType
├── appointments.ts # Appointment types
└── index.ts       # Re-exports
```

#### REF-002: Create Shared Layout Utilities
**Effort**: Medium (4-8 hours)
**Impact**: High (reduce duplication)

Create shared utilities:
```
src/lib/
├── auth-utils.ts    # handlePortalLogout, etc.
├── date-utils.ts    # getTodayString, formatDate
└── workos-auth.tsx  # Existing
```

### 6.2 Medium Priority (Code Quality)

#### REF-003: Extract Empty States
**Effort**: Low (2-4 hours)
**Impact**: Medium (consistency)

Create shared EmptyState component used by all portal pages.

#### REF-004: Create Form Hook
**Effort**: Medium (4-8 hours)
**Impact**: Medium (developer experience)

Implement useForm hook to standardize form handling across pages.

### 6.3 Low Priority (Nice to Have)

#### REF-005: Add Data-Testid Attributes
**Effort**: Low (2-4 hours)
**Impact**: Low (testing only)

Add `data-testid` attributes to key elements for E2E testing.

#### REF-006: Create Storybook Stories
**Effort**: High (8-16 hours)
**Impact**: Low (documentation)

Document components with Storybook for visual testing and documentation.

---

## PART 7: EXTENSION CHECKLIST

When adding a new feature to the Doctor Portal:

### Frontend Checklist
- [ ] Create page component in `src/pages/doctor/`
- [ ] Use `useOutletContext<DoctorContextType>()` for doctor data
- [ ] Follow page structure pattern (state, queries, mutations, handlers, render)
- [ ] Use shadcn/ui components (Card, Button, Input, etc.)
- [ ] Add sidebar navigation link in DoctorLayout.tsx
- [ ] Use `space-y-6` for page content spacing
- [ ] Use `text-2xl font-bold` for page titles

### Backend Checklist
- [ ] Create Convex functions in `convex/` directory
- [ ] Use `requireDoctorAccess(ctx)` for auth
- [ ] Use `defaultPaginationOpts()` for lists
- [ ] Use audit logger helpers for trackable actions
- [ ] Use batch fetch helpers for N+1 prevention
- [ ] Add indexes to schema for query performance

### Testing Checklist
- [ ] Verify auth redirect when unauthenticated
- [ ] Verify data loads correctly
- [ ] Verify mutations update UI (real-time)
- [ ] Check console for errors
- [ ] Check network for failed requests

---

## SUMMARY

The Doctor Portal has a **functional but not fully extensible architecture**. Key findings:

| Aspect | Score | Notes |
|--------|-------|-------|
| Page Addition Ease | 8/10 | Clear pattern, but routes need manual wiring |
| Type Safety | 6/10 | Types duplicated, no central definition |
| Code Reuse | 5/10 | Missing shared components/hooks |
| Backend Organization | 8/10 | Good helper modules, consistent patterns |
| Documentation | 4/10 | No inline docs, no README for patterns |

### Immediate Actions
1. Create `src/types/doctor.ts` with shared types
2. Extract logout logic to shared utility
3. Create LoadingState and EmptyState components

### Future Improvements
1. Implement useForm hook
2. Create DoctorPageWrapper component
3. Add data-testid attributes for testing
4. Document extension patterns in README
