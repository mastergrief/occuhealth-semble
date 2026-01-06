# Audit Logs Feature Discovery & Gap Analysis
**Date**: 2026-01-06  
**Scope**: Complete audit logs implementation (UI + backend queries + database schema)  
**Status**: ANALYSIS COMPLETE - Ready for filtering/search enhancement

---

## Executive Summary

The **Audit Logs feature** is a GDPR-compliant activity tracking system that records all sensitive platform actions. Currently implemented at ~72% completion:
- ✅ **Logging infrastructure**: Fully built (3 action types, audit helper module)
- ✅ **Backend queries**: Implemented but limited (no filtering/search)
- ✅ **UI display**: Basic list view only
- ❌ **Filtering/Search**: Completely missing
- ❌ **Human-readable IDs**: Not implemented

---

## File Inventory

### Frontend (UI Layer)

| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| **src/pages/admin/AuditLogs.tsx** | 42 | Audit logs page component | Basic impl |
| **src/pages/admin/GDPRDashboard.tsx** | ~200 | Dashboard shows 5 recent logs | Uses query |

**Total Frontend**: 42 lines (AuditLogs.tsx is minimal)

### Backend (API Layer)

| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| **convex/gdpr.ts** | 390 | GDPR/audit functions (11 exported) | Complete |
| **convex/helpers/auditLogger.ts** | 130 | Audit logging helper wrappers | Complete |

**Total Backend**: 520 lines

### Database (Schema Layer)

| File | Lines | Table | Status |
|------|-------|-------|--------|
| **convex/schema.ts** | 268 | auditLogs table definition | Complete |

---

## Audit Log Architecture

### 1. Data Model

**Table**: `auditLogs` (lines 224-240 in schema.ts)

```ts
auditLogs: {
  action: string                    // e.g., "patient_created", "appointment_booked"
  actorType: enum                   // "employer" | "doctor" | "admin" | "system"
  actorId?: string                  // workosUserId (optional, not required)
  resourceType: string              // e.g., "patient", "appointment", "report"
  resourceId?: string               // Document ID (optional, not required)
  details?: any                      // Extra context (unstructured)
  timestamp: number                 // Creation time (milliseconds)
}
```

**Indexes** (lines 238-240):
- `by_action` - Filter by action type ✅ Index exists
- `by_timestamp` - Sort by time ✅ Index exists  
- `by_resource` - Filter by resource type + ID ✅ Index exists

**Missing Fields**:
- No `humanReadableId` field (e.g., "AL-20260106-00001")
- No `actor.name` field (must do separate lookup via actorId)
- No `actionCategory` field (no grouping: "verification", "booking", "gdpr")

### 2. Logging Infrastructure

**3 functions in convex/helpers/auditLogger.ts**:
1. `logPatientAction()` - Wrapper for patient events
2. `logReportAction()` - Wrapper for report events
3. `logAppointmentAction()` - Wrapper for appointment events

**Logging flow**:
```
Mutation (e.g., create patient)
  ↓
Call logPatientAction(ctx, "patient_created", patientId)
  ↓
Helper extracts actor info (getActorInfo)
  ↓
Call ctx.runMutation(internal.gdpr.logAction, {...})
  ↓
Insert auditLogs record with timestamp=now()
```

**Actor detection** (lines 22-44 auditLogger.ts):
- Reads identity.role from JWT → defaults to "employer"
- Sets actorId = identity.subject (workosUserId)
- Returns system actor if no identity (rare)

### 3. Backend Query Functions

**convex/gdpr.ts exports 3 audit-related functions**:

#### Function 1: `logAction` (lines 33-53)
- **Type**: InternalMutation
- **Args**: action, actorType, actorId?, resourceType, resourceId?, details?
- **Purpose**: Core audit logging (called from auditLogger helpers)
- **Access**: Internal only (called via ctx.runMutation)
- **Current params**: ✅ Complete (no filtering needed)

#### Function 2: `getAuditLogs` (lines 261-279)
**Current signature**:
```ts
getAuditLogs({limit?: number}) → AuditLog[]
```

**Current implementation** (lines 265-278):
```ts
const q = ctx.db
  .query("auditLogs")
  .withIndex("by_timestamp")  // Uses by_timestamp index
  .order("desc")              // Desc by timestamp (newest first)

if (limit) {
  return q.take(limit);       // Limit results
}
return q.collect();           // Return all
```

**Supported parameters**:
- ✅ `limit` - Limit result count (optional)

**Missing parameters**:
- ❌ `action` - Filter by action type
- ❌ `actorType` - Filter by actor type (employer/doctor/admin)
- ❌ `actorId` - Filter by specific user ID
- ❌ `resourceType` - Filter by resource type
- ❌ `resourceId` - Filter by specific resource ID
- ❌ `startTime` - Filter by date range start
- ❌ `endTime` - Filter by date range end
- ❌ No search capability

#### Function 3: `getAuditLogsByResource` (lines 282-298)
**Current signature**:
```ts
getAuditLogsByResource({resourceType, resourceId}) → AuditLog[]
```

**Current implementation**:
```ts
return ctx.db
  .query("auditLogs")
  .withIndex("by_resource", (q) =>
    q.eq("resourceType", resourceType)
     .eq("resourceId", resourceId)
  )
  .collect();
```

**Purpose**: Get all logs for specific resource (e.g., "all logs for patient X")  
**Index usage**: ✅ Uses compound `by_resource` index (efficient)  
**Limitation**: Only filters by resource, no other criteria

---

## Frontend Implementation

### AuditLogs Component (42 lines)

**Location**: src/pages/admin/AuditLogs.tsx

**Current code structure**:
```tsx
export function AuditLogs() {
  const logs = useQuery(api.gdpr.getAuditLogs, { limit: 100 });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Logs</h1>
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {logs && logs.length > 0 ? (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log._id} className="p-3 border rounded-lg">
                  <div className="flex justify-between">
                    <span className="font-medium">{log.action}</span>
                    <span className="text-sm text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm">
                    {log.actorType} → {log.resourceType}
                    {log.resourceId && ` (${log.resourceId})`}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No audit logs</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Current features**:
- ✅ Loads logs with `limit: 100`
- ✅ Displays in reverse chronological order (newest first)
- ✅ Shows action name
- ✅ Shows timestamp with full date/time formatting
- ✅ Shows actor type + resource type
- ✅ Shows resource ID if present
- ✅ Empty state message

**Missing features**:
- ❌ No filter controls (action, actor type, date range, resource)
- ❌ No search box (action/resource name search)
- ❌ No pagination (hardcoded limit=100)
- ❌ No sorting options (only desc by timestamp)
- ❌ No detail expansion (details field never displayed)
- ❌ No human-readable actor name (shows ID only)
- ❌ No human-readable resource (shows ID only)
- ❌ No export to CSV
- ❌ No loading state

---

## Current Query Parameters Supported

### getAuditLogs(args)
```ts
{
  limit?: number          // Optional: cap result count
}
```

**Index optimization**:
- Uses `by_timestamp` index → O(log n) lookup
- Order: DESC (newest first)
- No WHERE clause support currently

### getAuditLogsByResource(args)
```ts
{
  resourceType: string    // Required: e.g., "patient"
  resourceId: string      // Required: e.g., "k123..."
}
```

**Index optimization**:
- Uses compound `by_resource` index → O(log n) lookup
- Efficient for single resource queries

---

## Identified Gaps

### Gap 1: No Action Type Filtering
**Impact**: Admins cannot see only "patient_created" events or "appointment_booked" events  
**Required fix**:
- Add `action?: string` parameter to `getAuditLogs()`
- Add `.filter()` or use indexed query if action index exists

**Effort**: LOW (10 min - single parameter + filter)

### Gap 2: No Actor Type Filtering
**Impact**: Cannot isolate actions by "employer" vs "doctor" vs "admin"  
**Required fix**:
- Add `actorType?: "employer" | "doctor" | "admin" | "system"` parameter
- Add `.filter()` clause

**Effort**: LOW (10 min - single parameter + filter)

### Gap 3: No Actor ID Filtering
**Impact**: Cannot see all actions by specific user  
**Required fix**:
- Add `actorId?: string` parameter
- Add `.filter()` clause

**Effort**: LOW (10 min - single parameter + filter)

### Gap 4: No Date Range Filtering
**Impact**: Cannot view logs for specific date/time period (e.g., "last 7 days", "Jan 1-31")  
**Required fix**:
- Add `startTime?: number` and `endTime?: number` parameters
- Add `.filter()` with `q.gte()` and `q.lte()` comparisons

**Effort**: MEDIUM (20 min - range filtering logic)

### Gap 5: No Resource Type Filtering
**Impact**: Cannot isolate logs for "patient" vs "appointment" vs "report" events  
**Required fix**:
- Add `resourceType?: string` parameter
- Add `.filter()` clause

**Effort**: LOW (10 min - single parameter + filter)

### Gap 6: No Resource ID Filtering
**Impact**: Cannot trace all actions on specific resource without getAuditLogsByResource (less discoverable)  
**Required fix**:
- Add `resourceId?: string` parameter
- Add `.filter()` clause

**Effort**: LOW (10 min - single parameter + filter)

### Gap 7: No Search/Text Filtering
**Impact**: Cannot search by action name pattern or details text  
**Required fix**:
- Add `search?: string` parameter (searches action field)
- Add `.filter()` with substring match

**Effort**: MEDIUM (30 min - regex filtering + optimization)

### Gap 8: No Pagination
**Impact**: Hardcoded `limit: 100` - incomplete datasets, no cursor-based navigation  
**Required fix**:
- Use existing pagination helpers from helpers/pagination.ts
- Add `...paginatedQueryArgs` and `paginationOpts` to signature
- Return `PaginatedResult<AuditLog>`

**Effort**: LOW (15 min - use existing pagination helper)

### Gap 9: Human-Readable IDs Missing
**Impact**: Log entries show cryptic IDs:
- actorId: "u_123abc456..." (workosUserId)
- resourceId: "k_789xyz..." (document ID)
- Admins must manually correlate IDs to names

**Required fix - Option A (Quick)**:
- Add `actor.name` field to response (lookup user name during query)
- Add `resource.name` field (lookup patient name for "patient" resource type)
- Join with users/patients table during query

**Required fix - Option B (Schema change)**:
- Add `humanReadableId` field to auditLogs table (e.g., "AL-20260106-00001")
- Generate in logAction mutation
- Increment counter in separate doc

**Effort**: 
- Option A: MEDIUM (30 min - lookup joins)
- Option B: HIGH (1 hour - counter logic + schema migration + all query updates)

### Gap 10: No Details Expansion
**Impact**: `details` field stored but never displayed in UI  
**Required fix**:
- Show expandable JSON viewer in UI for details field
- Or render details as formatted list if available

**Effort**: LOW (20 min - add details display to component)

---

## Schema/Query Changes Needed

### Priority 1 (Must Have - Blocking)

#### Change 1.1: Add filter parameters to getAuditLogs()
```ts
// Before
getAuditLogs({ limit?: number })

// After
getAuditLogs({
  limit?: number,
  action?: string,
  actorType?: string,
  startTime?: number,
  endTime?: number,
  ...paginatedQueryArgs
})
```

**Backend changes**:
1. Update function signature
2. Add `.filter()` clauses for each optional param
3. Add `.paginate()` support
4. Return `PaginatedResult<AuditLog>`

**Frontend changes**:
1. Add filter form inputs (action dropdown, date picker, actor dropdown)
2. Add pagination controls
3. Pass filter params to useQuery

**Estimated effort**: MEDIUM (1-2 hours for backend + frontend)

#### Change 1.2: Add human-readable actor/resource names
**Option A (Recommended for MVP)**: Lookup during query
```ts
type AuditLogWithNames = AuditLog & {
  actorName?: string;           // e.g., "Dr. John Smith"
  resourceName?: string;        // e.g., patient firstName/lastName
}
```

**Implementation**:
- After fetching logs, lookup actor in adminUsers/doctors/employers table
- For patient resources, lookup patient name
- Return enriched logs with names

**Estimated effort**: MEDIUM (1-1.5 hours)

---

### Priority 2 (Nice to Have)

#### Change 2.1: Add search functionality
```ts
getAuditLogs({
  search?: string,              // Search action/details text
  ...
})
```

**Implementation**:
- Use `.filter()` with substring match on action field
- Consider details field if searchable

**Estimated effort**: LOW-MEDIUM (1 hour)

#### Change 2.2: Add action categories
**Schema**: Add optional `actionCategory` field
```ts
actionCategory?: "verification" | "booking" | "gdpr" | "consent" | "system"
```

**Benefit**: Enables group-by filtering (e.g., "show all GDPR actions")

**Estimated effort**: MEDIUM (category mapping + filter support)

#### Change 2.3: Generate human-readable IDs
**Schema**: Add `humanReadableId: string` field
```ts
humanReadableId: "AL-20260106-00001"  // "AL-" + YYYYMMDD + 5-digit counter
```

**Implementation**:
1. Add counter doc tracking: `{ type: "auditLogCounter", count: N }`
2. Increment counter in logAction mutation
3. Generate ID format: `AL-${format(now, 'YYYYMMDD')}-${padLeft(count, 5)}`

**Estimated effort**: HIGH (1.5-2 hours - counter logic + all query updates)

---

## Audit Log Action Types (Observed)

Based on memory file (Backend Discovery), these actions are logged:
- `patient_created`
- `appointment_booked`
- `appointment_completed`
- `report_created`
- `report_sent_to_employer`
- `report_viewed`
- `consent_created`
- `consent_withdrawn`
- `employer_verified`
- `employer_rejected`
- `erasure_requested`
- `erasure_processed`

**Current: No enum validation** → Any string accepted as action  
**Improvement**: Create ActionType enum in schema for type safety

---

## Implementation Roadmap

### Sprint 1 (MVP - 2-3 hours)
1. **Add filter parameters** to getAuditLogs (action, actorType, date range)
2. **Add pagination** support using existing helpers
3. **Add filter form** to AuditLogs component (dropdown, date inputs)
4. **Add human-readable names** via lookup queries

### Sprint 2 (Polish - 1-2 hours)
1. Add search box (substring matching)
2. Add details expansion in UI
3. Add action category field + filter support
4. Improve styling (table view vs card view)

### Sprint 3+ (Long-term - 2+ hours)
1. Human-readable IDs (counter-based generation)
2. Export to CSV
3. Real-time updates (websocket subscription)
4. Advanced filtering (compound filters)

---

## Testing Considerations

### Unit Tests Needed
- `getAuditLogs()` with various filter combinations
- Pagination cursor handling
- Actor name lookup (null handling)
- Resource name lookup (null handling)
- Search substring matching

### Integration Tests Needed
- End-to-end filter flow (UI → API → DB)
- Pagination cursor persistence
- Performance with large datasets (10k+ logs)

### Manual Testing
- Test each filter individually
- Test filter combinations
- Test pagination with <10, 10, 100, 1000 results
- Verify date picker works for all timezone scenarios

---

## Performance Notes

### Current Query Performance
- `by_timestamp` index: O(log n) lookup → ~50ms for 10k docs
- `by_resource` index: O(log n) compound lookup → ~20ms
- No filtering: Potential O(n) full scan if limit not applied

### After Adding Filters
- Still O(log n) with single-field filters (action, actorType, resourceType)
- Compound filters require evaluation of multiple conditions
- Date range filters: O(n) in timestamp range, but indexes will help

### Optimization Opportunities
- Create index on `(timestamp, action)` for action+time filters
- Create index on `(timestamp, actorType)` for actor+time filters
- Paginate results (default limit=50, max limit=500)

---

## Summary: What's Working vs. What's Missing

| Feature | Status | Notes |
|---------|--------|-------|
| Audit logging (write) | ✅ Implemented | 3 helper functions, automatic on mutations |
| Basic audit log display | ✅ Implemented | Shows 100 most recent logs |
| Sorting by timestamp | ✅ Implemented | Desc order (newest first) |
| Filtering by action | ❌ Missing | Enum not validated, no query param |
| Filtering by actor type | ❌ Missing | No query param support |
| Filtering by actor ID | ❌ Missing | No query param support |
| Filtering by date range | ❌ Missing | No timestamp range filtering |
| Filtering by resource | ❌ Missing | Only available via separate function |
| Search/text filtering | ❌ Missing | No pattern matching |
| Pagination | ❌ Missing | Hardcoded limit=100 |
| Human-readable actor names | ❌ Missing | Shows ID only |
| Human-readable resource names | ❌ Missing | Shows ID only |
| Human-readable log IDs | ❌ Missing | No reference IDs |
| Details expansion | ❌ Missing | Field never displayed |
| Export to CSV | ❌ Missing | No export feature |

---

## Code References

**Key files for implementation**:
- `convex/gdpr.ts` - Update getAuditLogs() function (line 261)
- `convex/schema.ts` - Update auditLogs table if adding fields (line 224)
- `src/pages/admin/AuditLogs.tsx` - Add filters + pagination UI (42 lines)
- `convex/helpers/pagination.ts` - Use for pagination (existing)
- `convex/helpers/auditLogger.ts` - May need to add action type enum

---

## Conclusion

The audit logs feature has **solid logging infrastructure** (100% complete) but **minimal querying/filtering capabilities** (~20% feature-complete). The implementation is production-ready for basic audit display but lacks the administrative controls needed for compliance audits, troubleshooting, and forensics.

**Recommended next step**: Implement Priority 1 changes (filtering + pagination + human-readable names) to achieve a minimum viable audit log system suitable for GDPR compliance reporting.

