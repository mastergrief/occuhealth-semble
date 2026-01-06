# Employer Verification Feature Discovery
**Date**: 2026-01-06
**Scope**: Complete mapping of current implementation + gaps for custom rejection reasons
**Status**: READY FOR IMPLEMENTATION

---

## Executive Summary

The Employer Verification feature is **90% complete** with one critical gap:
- Rejection mechanism exists ✅ (hardcoded reason)
- Custom rejection reason field doesn't exist ❌ (missing UI form + modal dialog)
- Verification history NOT tracked ❌ (no dedicated table)
- No confirmation dialog for destructive actions ⚠️ (recommended)

**Files Affected**: 3 frontend + 2 backend + 1 schema
**Effort**: Medium (add modal form + schema field)

---

## File Inventory

### Frontend (UI Layer)
| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| `src/pages/admin/EmployerVerification.tsx` | 71 | Render pending employers, trigger verify/reject | ⚠️ INCOMPLETE |
| `src/pages/AdminLayout.tsx` | ~150 | Admin routing, dashboard cards | ✅ COMPLETE |
| Dialog/Modal components | - | NOT USED (missing) | ❌ MISSING |

### Backend (Convex API)
| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| `convex/employers.ts` | 179 | CRUD + verification mutations | ⚠️ PARTIAL |
| `convex/schema.ts` | 268 | Database schema definition | ⚠️ PARTIAL |
| `convex/gdpr.ts` | ~300+ | Audit logging (used by verify/reject) | ✅ COMPLETE |

**Total LOC**: ~518 core files + supporting infrastructure

---

## Current Rejection Implementation

### Frontend Flow (EmployerVerification.tsx)

**Current Hardcoded Reason** (Line 23):
```tsx
const handleReject = async (employerId: string) => {
  await rejectEmployer({
    employerId: employerId as Parameters<typeof rejectEmployer>[0]["employerId"],
    reason: "Did not meet verification requirements",  // ❌ HARDCODED!
  });
};
```

**Issue**: Admin cannot specify custom reason during rejection. All rejections have identical message.

### Backend Mutation (convex/employers.ts)

**Reject Mutation** (Lines 140-155):
```ts
export const reject = mutation({
  args: {
    employerId: v.id("employers"),
    reason: v.string(),  // ✅ Accepts reason parameter
  },
  handler: async (ctx, { employerId, reason }) => {
    const admin = await requireAdmin(ctx);

    await ctx.db.patch(employerId, {
      status: "rejected",
      rejectionReason: reason,  // ✅ Stores in DB
      updatedAt: Date.now(),
    });
  },
});
```

**Status**: Backend READY for custom reasons (parameter exists, field stored)

### Database Schema (convex/schema.ts)

**Employers Table** (Lines 47-68):
```ts
employers: defineTable({
  // ... other fields ...
  status: v.union(v.literal("pending"), v.literal("verified"), v.literal("rejected")),
  rejectionReason: v.optional(v.string()),  // ✅ Field exists (Line 62)
  verifiedAt: v.optional(v.number()),
  verifiedBy: v.optional(v.id("adminUsers")),
  // ... timestamps ...
})
```

**Status**: Schema READY (rejectionReason field already defined)

---

## Gap Analysis: What's Missing

### Gap 1: Custom Rejection Reason Input (CRITICAL)

**Current State**: Hardcoded reason in handleReject function

**What's Needed**:
1. Modal dialog component for rejection
2. Text input/textarea for custom reason
3. Form validation (min/max length)
4. Confirmation before submission
5. Error handling + success feedback

**Implementation Location**: EmployerVerification.tsx

**Estimated Effort**: 30-40 lines of code

### Gap 2: Verification History View (MEDIUM)

**Current State**: No history view, only current status

**What's Missing**:
- Dedicated "Verification History" page/tab
- Show: verified_at, verified_by, rejection_reason, rejection_date
- Timeline or list view
- Filter by status (pending, verified, rejected)
- Export to CSV (optional)

**Data Source**: Already tracked in employers table:
- `status` (pending → verified/rejected)
- `verifiedAt` (timestamp when approved)
- `verifiedBy` (admin ID who approved)
- `rejectionReason` (reason string, if rejected)
- `updatedAt` (timestamp of any status change)

**Implementation Strategy**: Create new page `/admin/employers/history` or tab in `/admin/employers`

**Estimated Effort**: 80-100 lines of code (new component)

### Gap 3: No Confirmation Dialog (UX)

**Current State**: Click "Reject" → immediate mutation (no warning)

**What's Needed**:
- AlertDialog or confirmation modal
- "Are you sure?" message with employer details
- Show custom reason being submitted
- Option to cancel

**Implementation Location**: EmployerVerification.tsx (before sending mutation)

**Estimated Effort**: 20-30 lines of code

---

## Schema Changes Required

### FOR CUSTOM REJECTION REASONS
**Status**: ✅ NO SCHEMA CHANGES NEEDED
- Field `rejectionReason` already exists (Line 62 of schema.ts)
- Backend mutation accepts custom reason
- Only UI needs updating

### FOR VERIFICATION HISTORY TABLE (Optional Enhancement)
**Current Approach**: Use `employers` table fields
- Existing fields track history: status, verifiedAt, verifiedBy, rejectionReason, updatedAt

**Optional New Table** (If denormalizing for performance):
```ts
verificationHistory: defineTable({
  employerId: v.id("employers"),
  previousStatus: v.union(v.literal("pending"), v.literal("verified"), v.literal("rejected")),
  newStatus: v.union(v.literal("pending"), v.literal("verified"), v.literal("rejected")),
  reason: v.optional(v.string()),  // For rejections
  adminId: v.optional(v.id("adminUsers")),  // Who performed action
  timestamp: v.number(),
  details: v.optional(v.any()),
})
  .index("by_employer", ["employerId"])
  .index("by_timestamp", ["timestamp"])
```

**Decision**: Use existing fields first (query is fast with index on status), add table only if audit requirements change.

---

## Current Data Flow: Rejection

```
Frontend (EmployerVerification.tsx)
  │
  ├─ Click "Reject" button
  │   └─ handleReject(employerId)
  │       └─ Call useMutation(api.employers.reject)
  │
  ▼
Convex API (convex/employers.ts)
  │
  ├─ Mutation: employers.reject(employerId, reason)
  │   ├─ requireAdmin(ctx)  [admin-only gate]
  │   │
  │   └─ ctx.db.patch(employerId, {
  │       status: "rejected",
  │       rejectionReason: reason,
  │       updatedAt: Date.now(),
  │     })
  │
  ▼
Database (Convex Cloud)
  │
  └─ employers table
      └─ Update: status + rejectionReason + timestamp
```

**Key Points**:
- ✅ Admin auth enforced via `requireAdmin(ctx)`
- ✅ Mutation is transactional (atomic)
- ✅ Timestamp recorded (updatedAt)
- ❌ No audit log entry created (should log with `gdpr.logAction`)
- ❌ No email sent to employer (future feature?)

---

## Integration Points

### Frontend Components Used
| Component | Import | Purpose |
|-----------|--------|---------|
| Card, CardContent, CardHeader, CardTitle | `@/components/ui/card` | Container layout |
| Button | `@/components/ui/button` | Action buttons |
| CheckCircle, XCircle | `lucide-react` | Icons |
| Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger | `@/components/ui/dialog` | ❌ NOT IMPORTED YET |
| Textarea | `@/components/ui/textarea` | ❌ NEEDED for reason input |

### Convex Hooks
| Hook | Used For |
|------|----------|
| `useQuery(api.employers.listPending)` | Fetch pending employers |
| `useMutation(api.employers.verify)` | Approve employer |
| `useMutation(api.employers.reject)` | Reject with reason |

### Auth
| Function | Purpose |
|----------|---------|
| `requireAdmin(ctx)` | Backend enforcement (enforced in mutations) |
| `useAdminAuth()` | Frontend state (from AdminLayout context) |

---

## Audit Logging Status

### Current State
- ✅ Verify mutation stored in audit (likely via gdpr.logAction call)
- ❌ Reject mutation NOT explicitly logged in convex/employers.ts

**Recommendation**: Add audit logging to reject mutation:
```ts
await ctx.runMutation(internal.gdpr.logAction, {
  action: "employer_rejected",
  actorType: "admin",
  actorId: admin.workosUserId,
  resourceType: "employer",
  resourceId: employerId,
  details: { reason },
});
```

---

## Backend Verification Status

| Feature | Implemented | Tested |
|---------|-------------|--------|
| List pending employers | ✅ Yes | ✅ Yes (audit report) |
| Verify employer | ✅ Yes | ✅ Yes (audit report) |
| Reject employer (with hardcoded reason) | ✅ Yes | ✅ Yes (mutation works) |
| Reject employer (with custom reason) | ✅ Yes (parameter accepted) | ❌ No (UI doesn't pass custom) |
| Reason stored in DB | ✅ Yes | ⚠️ Only if frontend passes it |
| Verification history | ⚠️ Partial (fields exist, no query) | ❌ No query method |

---

## Frontend Issues

### Issue 1: Hardcoded Rejection Reason (CRITICAL)

**File**: src/pages/admin/EmployerVerification.tsx, Line 23

**Current**:
```tsx
const handleReject = async (employerId: string) => {
  await rejectEmployer({
    employerId: employerId as Parameters<typeof rejectEmployer>[0]["employerId"],
    reason: "Did not meet verification requirements",
  });
};
```

**Problem**: All rejections have identical message. Admin cannot explain specific issues.

**Solution**:
1. Add state for rejection modal open/closed
2. Add state for selected employer + custom reason text
3. Render modal dialog with textarea
4. Validate reason (non-empty, length limits)
5. Show confirmation dialog before sending
6. Call mutation with custom reason

### Issue 2: No Modal Dialog Component (CRITICAL)

**Missing**: Dialog for custom reason input + confirmation

**Needed Imports**:
```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
```

### Issue 3: No Verification History View (MEDIUM)

**Missing**: Way to see all verified/rejected employers over time

**Current**: Only "Pending Verification" list visible

**Need**: Query all employers by status + sort by updatedAt, show history

### Issue 4: No Confirmation Dialog Before Destructive Action (UX)

**Issue**: Clicking "Reject" instantly rejects without confirmation

**Solution**: Add AlertDialog asking "Are you sure?" before submit

---

## Recommendation: Implementation Plan

### Phase 1: Custom Rejection Reason (High Priority) - 40 minutes
**Files to modify**: 1 (EmployerVerification.tsx)
**Scope**:
1. Import Dialog and Textarea components
2. Add state for rejection modal (open, selectedEmployer, reason)
3. Render dialog with:
   - Employer details (name, email, registration #)
   - Textarea for custom reason
   - Min 10 chars, max 500 chars validation
   - Cancel/Submit buttons
4. Modify handleReject to:
   - Show modal instead of directly calling mutation
   - Pass custom reason to mutation
5. Add success toast notification
6. Add error handling

**Impact**: Admins can now enter specific rejection reasons

### Phase 2: Verification History View (Medium Priority) - 1.5 hours
**Files to modify**: 1 new + 1 existing
**Scope**:
1. Create `VerificationHistory.tsx` component
2. Query all employers (query exists: `employers.listAll`)
3. Filter by status if needed
4. Render table with columns:
   - Company Name
   - Email
   - Status (Verified/Rejected/Pending)
   - Verified/Rejected Date
   - Reason (if rejected)
   - Admin who verified
5. Add filter/sort options
6. Integrate into AdminLayout routing

**Impact**: Admins can review all verification decisions over time

### Phase 3: Audit Logging Enhancement (Low Priority) - 20 minutes
**Files to modify**: 1 (convex/employers.ts)
**Scope**:
1. Import internal.gdpr.logAction
2. Add audit log call to verify mutation (if not already there)
3. Add audit log call to reject mutation with reason
4. Test via `/admin/gdpr/audit` logs

**Impact**: Full audit trail of verification decisions

### Phase 4: Confirmation Dialog (UX Polish) - 20 minutes
**Files to modify**: 1 (EmployerVerification.tsx)
**Scope**:
1. Import AlertDialog components
2. Add confirmation step before mutation
3. Show details being submitted
4. Prevent accidental rejections

**Impact**: Better UX, prevents accidental rejections

---

## Testing Strategy

### Manual Testing Checklist
- [ ] Login as admin
- [ ] Navigate to /admin/employers
- [ ] Click Reject button
- [ ] Verify modal opens
- [ ] Type custom reason
- [ ] Verify validation (min/max length)
- [ ] Submit rejection
- [ ] Verify employer status changed to "rejected"
- [ ] Verify reason stored in DB
- [ ] Check /admin/gdpr/audit for log entry
- [ ] Verify rejected employer no longer in pending list

### Automated Testing (If applicable)
- Unit test: Reason validation logic
- Integration test: Rejection mutation with custom reason
- E2E test: Full rejection flow with modal

---

## Current Status Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Backend mutation | ✅ Ready | Accepts custom reason param |
| Database schema | ✅ Ready | rejectionReason field exists |
| Frontend UI | ❌ Incomplete | Uses hardcoded reason |
| Modal dialog | ❌ Missing | Need to build rejection form |
| Verification history | ⚠️ Partial | Data exists, no UI view |
| Audit logging | ⚠️ Partial | May need enhancement |
| Confirmation dialog | ❌ Missing | UX recommendation |

---

## Code References

### Key Backend Functions
- `convex/employers.ts:96-108` - listPending query
- `convex/employers.ts:140-155` - reject mutation (accepts reason parameter)
- `convex/schema.ts:47-68` - employers table schema (has rejectionReason field)

### Key Frontend Components
- `src/pages/admin/EmployerVerification.tsx` - Main component
- `src/pages/AdminLayout.tsx` - Routing (imports EmployerVerification)

### Related Convex Functions
- `convex/adminUsers.ts` - Admin auth helpers
- `convex/gdpr.ts` - Audit logging infrastructure
- `authModules/index.ts` - requireAdmin guard

---

## Known Constraints

1. **Schema is Immutable in Production**: Cannot remove rejectionReason field, only add new fields
2. **Backward Compatibility**: Must support existing rejections with hardcoded reason
3. **Admin-Only Feature**: All operations behind requireAdmin() guard
4. **Real-time Subscriptions**: Changes auto-sync to frontend via Convex subscriptions
5. **No Email Notification**: Backend doesn't send rejection email (frontend integration needed separately)

---

**End of Discovery Report**
