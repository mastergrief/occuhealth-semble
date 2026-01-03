# Backend Modules & Database Schema

**Sprint**: 02 of 09
**Index**: OCCUHEALTH_EXPLORATION_INDEX
**Depends On**: OCCUHEALTH_SPRINT_01_EXECUTIVE_SUMMARY
**Next**: OCCUHEALTH_SPRINT_03_FRONTEND_ARCHITECTURE

---

## Backend Module Inventory

**Location**: `/home/gabe/projects/convex-medical-starter/convex/`
**Total LOC**: 1,677
**Module Count**: 13
**Largest Module**: schema.ts (265 LOC)

### Module Breakdown

| Module | LOC | Purpose | Exports |
|--------|-----|---------|---------|
| `schema.ts` | 265 | Database schema with validators | defineSchema |
| `gdpr.ts` | 229 | GDPR compliance, audit, erasure | 8 functions |
| `http.ts` | 225 | OAuth routes (WorkOS) | httpRouter |
| `appointments.ts` | 170 | Booking workflow | 8 functions |
| `employers.ts` | 139 | Employer CRUD + verification | 6 functions |
| `reports.ts` | 103 | Fit-for-work reports | 4 functions |
| `availableSlots.ts` | 102 | Doctor schedule management | 6 functions |
| `patients.ts` | 95 | Employee/patient CRUD | 5 functions |
| `adminUsers.ts` | 78 | Admin management (WorkOS) | 4 functions |
| `myFunctions.ts` | 78 | Demo template | 3 functions |
| `doctorSettings.ts` | 70 | Doctor profiles | 4 functions |
| `appointmentTypes.ts` | 70 | Service catalog | 3 functions |
| `oauthState.ts` | 53 | CSRF protection | 3 internal |

---

## Database Schema (14 Tables)

### Authentication Tables

```typescript
// adminUsers - WorkOS admin accounts
adminUsers: defineTable({
  workosUserId: v.string(),
  email: v.string(),
  name: v.optional(v.string()),
  lastLoginAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_workos_user_id", ["workosUserId"])
  .index("by_email", ["email"])

// oauthStates - CSRF tokens (5-min TTL)
oauthStates: defineTable({
  state: v.string(),
  expiresAt: v.number(),
})
  .index("by_state", ["state"])
```

### Business Tables

```typescript
// employers - Company/insurer accounts
employers: defineTable({
  workosUserId: v.string(),
  email: v.string(),
  companyType: v.union(v.literal("employer"), v.literal("insurer")),
  companyName: v.string(),
  status: v.union(
    v.literal("pending"),
    v.literal("verified"),
    v.literal("rejected")
  ),
  verifiedBy: v.optional(v.id("adminUsers")),
  // + address, phone, registration number, etc.
})
  .index("by_workos_user", ["workosUserId"])
  .index("by_status", ["status"])
  .index("by_email", ["email"])

// patients - Employees with GDPR support
patients: defineTable({
  employerId: v.id("employers"),
  consentId: v.id("consents"),  // Required for GDPR
  firstName: v.string(),
  lastName: v.string(),
  email: v.string(),
  phone: v.optional(v.string()),
  dateOfBirth: v.string(),
  deletedAt: v.optional(v.number()),  // Soft delete
})
  .index("by_employer", ["employerId"])
  .index("by_email", ["email"])
  .index("by_deleted", ["deletedAt"])

// appointments - Booking records
appointments: defineTable({
  patientId: v.id("patients"),
  employerId: v.id("employers"),
  slotId: v.id("availableSlots"),
  appointmentTypeId: v.id("appointmentTypes"),
  status: v.union(
    v.literal("scheduled"),
    v.literal("completed"),
    v.literal("cancelled")
  ),
  scheduledDate: v.string(),
  reportId: v.optional(v.id("reports")),
})
  .index("by_employer", ["employerId"])
  .index("by_patient", ["patientId"])
  .index("by_date", ["scheduledDate"])
  .index("by_status", ["status"])
```

### GDPR Compliance Tables

```typescript
// consents - Granular consent tracking
consents: defineTable({
  patientEmail: v.string(),
  patientId: v.optional(v.id("patients")),
  consentType: v.union(
    v.literal("data_processing"),
    v.literal("health_data"),
    v.literal("employer_sharing")
  ),
  granted: v.boolean(),
  grantedAt: v.number(),
  withdrawnAt: v.optional(v.number()),
  consentVersion: v.string(),
  collectedByEmployerId: v.id("employers"),
})
  .index("by_patient", ["patientId"])
  .index("by_email", ["patientEmail"])
  .index("by_type", ["consentType"])

// auditLogs - Compliance trail
auditLogs: defineTable({
  action: v.string(),
  actorType: v.union(
    v.literal("employer"),
    v.literal("doctor"),
    v.literal("admin"),
    v.literal("system")
  ),
  actorId: v.optional(v.string()),
  resourceType: v.string(),
  resourceId: v.optional(v.string()),
  details: v.optional(v.any()),
  timestamp: v.number(),
})
  .index("by_action", ["action"])
  .index("by_timestamp", ["timestamp"])
  .index("by_resource", ["resourceType", "resourceId"])

// erasureRequests - Right to be forgotten
erasureRequests: defineTable({
  requesterEmail: v.string(),
  patientId: v.optional(v.id("patients")),
  status: v.union(
    v.literal("pending"),
    v.literal("in_progress"),
    v.literal("completed"),
    v.literal("rejected")
  ),
  reason: v.optional(v.string()),
  requestedAt: v.number(),
  completedAt: v.optional(v.number()),
  processedBy: v.optional(v.string()),
})
  .index("by_status", ["status"])
  .index("by_email", ["requesterEmail"])
```

---

## HTTP Routes

**Location**: `convex/http.ts`

| Route | Method | Purpose | Security |
|-------|--------|---------|----------|
| `/auth/login` | GET | WorkOS OAuth initiation | CSRF state generation |
| `/auth/callback` | GET | OAuth callback + role routing | State validation |
| `/auth/logout` | GET | WorkOS session invalidation | SessionId required |
| `/health` | GET | Health check | Public |

---

## Key Patterns

### Query with Enrichment
```typescript
// appointments.ts - N+1 pattern (needs optimization)
export const listByEmployer = query({
  args: { employerId: v.id("employers") },
  handler: async (ctx, { employerId }) => {
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_employer", (q) => q.eq("employerId", employerId))
      .collect();

    return Promise.all(
      appointments.map(async (apt) => ({
        ...apt,
        patient: await ctx.db.get(apt.patientId),  // N+1!
      }))
    );
  },
});
```

### Mutation with Validation
```typescript
// appointments.ts - Slot availability check
export const book = mutation({
  args: {
    patientId: v.id("patients"),
    employerId: v.id("employers"),
    slotId: v.id("availableSlots"),
  },
  handler: async (ctx, args) => {
    const slot = await ctx.db.get(args.slotId);
    if (!slot || slot.status !== "available") {
      throw new Error("Slot is not available");
    }
    // ... booking logic
  },
});
```

### Internal Functions (Server-Only)
```typescript
// oauthState.ts - Not exposed to client
export const create = internalMutation({
  args: { state: v.string(), expiresAt: v.number() },
  handler: async (ctx, args) => {
    return ctx.db.insert("oauthStates", args);
  },
});

// Called via: ctx.runMutation(internal.oauthState.create, {...})
```

---

## Index Optimization

All tables have appropriate indices:
- Foreign key lookups: `by_employer`, `by_patient`
- Status filtering: `by_status`
- Date ranges: `by_date`, `by_timestamp`
- Email lookups: `by_email`
- GDPR support: `by_deleted`

---

## Known Issues

| Issue | Location | Impact | Priority |
|-------|----------|--------|----------|
| N+1 queries | appointments.ts:27-43 | Performance | P2 |
| No pagination | All list queries | Scalability | P1 |
| Index name mismatch | `by_workos_user` vs `by_workos_user_id` | Inconsistency | P3 |
| Missing cascading delete | gdpr.ts processErasure | GDPR gap | P1 |

---

→ Next: OCCUHEALTH_SPRINT_03_FRONTEND_ARCHITECTURE
