# Patient Appointment Access - API Discovery Report
**Date**: 2026-01-07  
**Feature**: Magic Link + Calendar Integration (Token-based appointment access)  
**Status**: READY FOR IMPLEMENTATION  
**Scope**: Sprint 02 Backend - New API modules and schema

---

## EXECUTIVE SUMMARY

Discovery complete for Patient Appointment Access feature. All required integration points identified:
- **Schema**: 14 tables ready, appointmentTokens table needs to be added
- **Existing modules**: appointments, gdpr, helpers patterns established
- **HTTP patterns**: auth routes, CORS, error handling all documented
- **Auth patterns**: requireEmployerOwnership, requireDoctorAccess established
- **Audit logging**: logAppointmentAction pattern ready for reuse

---

## 1. SCHEMA STRUCTURE (convex/schema.ts)

### Current State
**File Location**: `/home/gabe/projects/convex-medical-starter/convex/schema.ts`  
**Status**: 287 lines, 14 tables defined  
**Lines 1-15**: Imports and schema initialization

### Table Inventory (Relevant to Feature)
| Table | Lines | Purpose | Key Fields |
|-------|-------|---------|-----------|
| `appointments` | 160-185 | Booking records | patientId, employerId, slotId, status, reason, notes |
| `appointmentTypes` | 106-115 | Service catalog | name, description, durationMinutes, price |
| `availableSlots` | 120-134 | Doctor schedule | doctorId, date, startTime, endTime, status |
| `employers` | 47-68 | Company accounts | companyName, status (pending/verified/rejected) |
| `patients` | 85-101 | Employee records | employerId, firstName, lastName, email, dateOfBirth |
| `doctorSettings` | 73-80 | Doctor profiles | workosUserId, email, name, zoomPersonalLink |
| `reports` | 190-210 | Medical findings | appointmentId, patientId, fitForWork, summary |
| `clinicalNotes` | 215-223 | Doctor notes | appointmentId, patientId, findings, diagnosis |
| `consents` | 228-245 | GDPR consents | patientEmail, patientId, consentType, granted |
| `auditLogs` | 250-266 | Compliance audit | action, actorType, resourceType, timestamp |

### REQUIRED ADDITION: appointmentTokens Table
**Suggested Location**: After `erasureRequests` (after line 286)

```typescript
appointmentTokens: defineTable({
  tokenHash: v.string(),                    // SHA-256 hash of token
  appointmentId: v.id("appointments"),      // Foreign key
  patientId: v.id("patients"),              // For quick lookup
  createdAt: v.number(),                    // Creation timestamp
  expiresAt: v.number(),                    // 48-hour expiration
  viewedAt: v.optional(v.number()),         // First access time
  invalidated: v.optional(v.boolean()),     // Revocation flag
})
  .index("by_token", ["tokenHash"])         // Token validation lookup
  .index("by_appointment", ["appointmentId"])  // Find tokens for appointment
  .index("by_expiry", ["expiresAt"])        // Cleanup queries
```

**Schema Reasoning**:
- `tokenHash`: Never store plain token (security best practice)
- `by_token` index: Critical for O(1) token validation in public endpoint
- `by_appointment` index: For invalidating all tokens when appointment cancelled
- `by_expiry` index: For future cleanup/retention policies
- `viewedAt`: Tracks if patient accessed magic link (analytics)
- `invalidated`: Soft revocation (non-destructive audit trail)

---

## 2. APPOINTMENTS MODULE (convex/appointments.ts)

### File Details
**Location**: `/home/gabe/projects/convex-medical-starter/convex/appointments.ts`  
**Lines**: 365 total  
**Structure**: Query + Mutation facade with detailed JSDoc

### Key Functions (Integration Points)

#### Queries
```typescript
// Line 34-49: getById(appointmentId)
// Returns appointment with enriched relations
// Auth: Requires employer ownership via requireEmployerOwnership()
// Returns: { ...appointment, patient, employer, appointmentType }

// Line 62-95: listByEmployer(employerId, paginationOpts)
// Employer portal booking history
// Filters soft-deleted patients (GDPR compliance)
// Batch fetches to avoid N+1 queries

// Line 109-140: listByDate(date, paginationOpts)
// Doctor schedule view
// Auth: Doctor access required via requireDoctorAccess()
// Returns: Enriched with patient, employer, appointmentType

// Line 151-162: getTodaysAppointments()
// Doctor dashboard widget
// No auth check (internal use)
// Returns: Array of Doc<"appointments">
```

#### Mutations
```typescript
// Line 182-250: book(patientId, employerId, appointmentTypeId, slotId, reason, notes)
// CREATE appointment + mark slot as booked + log action
// Auth: Employer ownership + employer verified status
// Error codes: SLOT_UNAVAILABLE, EMPLOYER_NOT_VERIFIED, UNAUTHORIZED
// Audit: Calls logAppointmentAction("appointment_booked", ...)

// Line 264-287: markCompleted(appointmentId)
// Doctor marks appointment as finished
// Auth: Doctor access required
// Side effect: Audit log entry

// Line 301-325: cancel(appointmentId)
// Release booked slot back to available
// Auth: Employer ownership required
// Note: Does NOT call logAppointmentAction (potential audit gap)

// Line 339-363: updateStatus(appointmentId, status)
// Change status: scheduled/confirmed/completed/cancelled/no_show
// Auth: Employer ownership required
// Note: No audit logging (potential compliance issue)
```

### Authorization Pattern (IMPORTANT)
```typescript
// Line 41: await requireEmployerOwnership(ctx, appointment.employerId);
// Returns Doc<"employers"> with workosUserId verification
// Throws ConvexError with code "UNAUTHORIZED" if mismatch

// Line 113: await requireDoctorAccess(ctx);
// Returns Doc<"doctorSettings">
// Throws ConvexError with code "DOCTOR_NOT_FOUND" if not doctor
```

### Audit Logging Pattern (TO FOLLOW)
```typescript
// Line 242-247:
await logAppointmentAction(ctx, "appointment_booked", appointmentId, patientId, {
  employerId: args.employerId,
  appointmentTypeId: args.appointmentTypeId,
  scheduledDate: slot.date,
  scheduledTime: slot.startTime,
});
// From: convex/helpers/auditLogger.ts
// Signature: logAppointmentAction(ctx, action, appointmentId, patientId, details)
```

---

## 3. HTTP ROUTER PATTERNS (convex/http.ts)

### File Details
**Location**: `/home/gabe/projects/convex-medical-starter/convex/http.ts`  
**Lines**: 296 total  
**Architecture**: httpRouter with 6 routes

### Existing Routes (Pattern Reference)

#### 1. /auth/login (Lines 26-63)
```typescript
http.route({
  path: "/auth/login",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    // Pattern: Extract query params + call internal mutation/query
    const url = new URL(request.url);
    const fresh = url.searchParams.get("fresh") === "true";
    
    // Pattern: Generate CSRF state token
    const state = crypto.randomUUID();
    await ctx.runMutation(internal.oauthState.create, { state, expiresAt: ... });
    
    // Pattern: External service integration (WorkOS)
    const workos = getWorkOS();
    const authorizationUrl = workos.userManagement.getAuthorizationUrl({...});
    
    // Pattern: Redirect response
    return Response.redirect(authorizationUrl, 302);
  }),
});
```

#### 2. /auth/callback (Lines 96-202)
**Critical Pattern**: Token extraction + role-based routing
```typescript
// Line 100-104: Extract query params
const code = url.searchParams.get("code");
const state = url.searchParams.get("state");
const error = url.searchParams.get("error");

// Line 122: Validate CSRF state
const storedState = await ctx.runQuery(internal.oauthState.validate, { state });

// Line 153-157: Role-based lookup pattern
const [employer, doctor, adminUser] = await Promise.all([
  ctx.runQuery(internal.employers.getByWorkosId, { workosUserId: user.id }),
  ctx.runQuery(internal.doctorSettings.getByWorkosId, { workosUserId: user.id }),
  ctx.runQuery(internal.adminUsers.getByWorkosId, { workosUserId: user.id }),
]);

// Line 184-193: Return tokens in URL params (cross-origin auth pattern)
const callbackUrl = new URL(`${appUrl}/auth/callback`);
callbackUrl.searchParams.set("accessToken", accessToken);
callbackUrl.searchParams.set("refreshToken", refreshToken);
callbackUrl.searchParams.set("userId", user.id);
callbackUrl.searchParams.set("sessionId", sessionId);
callbackUrl.searchParams.set("redirectPath", redirectPath);
return Response.redirect(callbackUrl.toString(), 302);
```

#### 3. /health (Lines 227-243)
**Simple pattern**: JSON response with headers
```typescript
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "convex-medical-starter",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...securityHeaders },
      }
    );
  }),
});
```

#### 4. /auth/refresh (Lines 248-294)
**POST pattern**: JSON request + response
```typescript
http.route({
  path: "/auth/refresh",
  method: "POST",
  handler: httpAction(async (_, request) => {
    const body = await request.json();
    const refreshToken = body?.refreshToken;
    
    if (!refreshToken) {
      return new Response(
        JSON.stringify({ error: "Missing refresh token" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    const workos = getWorkOS();
    const result = await workos.userManagement.authenticateWithRefreshToken({...});
    
    return new Response(
      JSON.stringify({ accessToken: result.accessToken, refreshToken: result.refreshToken }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }),
});
```

### Security Headers Pattern (Lines 216-222)
```typescript
const securityHeaders = {
  "Content-Security-Policy": "default-src 'self'; ...",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};
```

### CORS Headers Pattern (Lines 207-211)
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
```

### New Route Template (FOR appointmentTokens)
```typescript
http.route({
  path: "/calendar/:token",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    // 1. Parse token from path
    const url = new URL(request.url);
    const token = url.pathname.split("/").pop();
    
    // 2. Validate token (public, no auth required)
    const result = await ctx.runQuery(
      internal.appointmentTokens.validateAndGetAppointment,
      { token }
    );
    
    // 3. Return ICS file
    return new Response(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="appointment.ics"`,
      },
    });
  }),
});
```

---

## 4. AUTHORIZATION PATTERNS (convex/authModules/authorization.ts)

### File Details
**Location**: `/home/gabe/projects/convex-medical-starter/convex/authModules/authorization.ts`  
**Lines**: 209 total  
**Exports**: 4 helper functions + 2 types

### Key Functions (TO FOLLOW)

#### getAuthenticatedUser(ctx) - Lines 59-76
```typescript
export async function getAuthenticatedUser(ctx: AuthContext): Promise<AuthenticatedUser | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  
  return {
    workosUserId: identity.subject,
    identity: { subject, issuer, tokenIdentifier },
  };
}
// Returns: AuthenticatedUser { workosUserId, identity } or null
// No error thrown (allows null check)
```

#### requireEmployerOwnership(ctx, employerId) - Lines 94-124
```typescript
export async function requireEmployerOwnership(
  ctx: AuthContext,
  employerId: Id<"employers">
): Promise<Doc<"employers">> {
  const user = await getAuthenticatedUser(ctx);
  if (!user) throw ConvexError({ code: "UNAUTHENTICATED", message: "Authentication required" });
  
  const employer = await ctx.db.get(employerId);
  if (!employer) throw ConvexError({ code: "EMPLOYER_NOT_FOUND", message: "..." });
  
  if (employer.workosUserId !== user.workosUserId) {
    throw ConvexError({ code: "UNAUTHORIZED", message: "..." });
  }
  
  return employer; // Verified!
}
```

#### requireDoctorAccess(ctx) - Lines 140-165
```typescript
export async function requireDoctorAccess(ctx: AuthContext): Promise<Doc<"doctorSettings">> {
  const user = await getAuthenticatedUser(ctx);
  if (!user) throw ConvexError({ code: "UNAUTHENTICATED", message: "..." });
  
  const doctor = await ctx.db
    .query("doctorSettings")
    .withIndex("by_workos_user", (q) => q.eq("workosUserId", user.workosUserId))
    .first();
  
  if (!doctor) throw ConvexError({ code: "DOCTOR_NOT_FOUND", message: "..." });
  
  return doctor;
}
```

#### requireAdmin(ctx) - Lines 181-208
```typescript
export async function requireAdmin(ctx: AuthContext): Promise<Doc<"adminUsers">> {
  const user = await getAuthenticatedUser(ctx);
  if (!user) throw ConvexError({ code: "UNAUTHENTICATED", message: "..." });
  
  const admin = await ctx.db
    .query("adminUsers")
    .withIndex("by_workos_user_id", (q) => q.eq("workosUserId", user.workosUserId))
    .first();
  
  if (!admin) throw ConvexError({ code: "ADMIN_NOT_FOUND", message: "..." });
  
  return admin;
}
```

### Auth Pattern for appointmentTokens
**IMPORTANT**: Magic link endpoint is PUBLIC (no auth required)
- No `requireEmployerOwnership()` call
- No `requireDoctorAccess()` call
- No `getAuthenticatedUser()` call
- Instead: Hash token + lookup + validate expiration

```typescript
export const validateAndGetAppointment = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    // NO AUTH CHECK - This is public
    const tokenHash = await hashToken(token);
    const tokenRecord = await ctx.db
      .query("appointmentTokens")
      .withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
      .first();
    
    if (!tokenRecord || tokenRecord.expiresAt < Date.now()) {
      return { valid: false, error: "Invalid or expired link" };
    }
    
    // Fetch appointment + relations
    return { valid: true, appointment: {...}, patient: {...}, doctor: {...} };
  }
});
```

---

## 5. AUDIT LOGGING PATTERNS (convex/helpers/auditLogger.ts)

### File Details
**Location**: `/home/gabe/projects/convex-medical-starter/convex/helpers/auditLogger.ts`  
**Lines**: 161 total  
**Purpose**: Typed wrapper for audit logging mutations

### Key Functions (TO FOLLOW)

#### logAppointmentAction(ctx, action, appointmentId, patientId, details) - Lines 109-129
```typescript
export async function logAppointmentAction(
  ctx: MutationCtx,
  action: string,                    // "appointment_booked", "appointment_completed"
  appointmentId: Id<"appointments">,
  patientId: Id<"patients">,
  details?: Record<string, unknown>  // { employerId, appointmentTypeId, ... }
): Promise<void> {
  const { actorType, actorId } = await getActorInfo(ctx);
  
  await ctx.runMutation(internal.gdpr.logAction, {
    action,
    actorType,              // "employer" | "doctor" | "admin" | "system"
    actorId,                // workosUserId or undefined
    resourceType: "appointment",
    resourceId: appointmentId,
    details,
  });
}
```

#### Similar functions (TO FOLLOW)
- `logPatientAction(ctx, action, patientId, details)` - Lines 53-69
- `logReportAction(ctx, action, reportId, patientId, details)` - Lines 79-99
- `logSlotAction(ctx, action, slotId, doctorId, details)` - Lines 140-160

### Pattern for appointmentTokens Audit Log
```typescript
export async function logTokenAction(
  ctx: MutationCtx,
  action: string,           // "magic_link_generated", "magic_link_accessed", "magic_link_invalidated"
  appointmentId: Id<"appointments">,
  tokenId: string,          // ID or hash identifier
  details?: Record<string, unknown>
): Promise<void> {
  const { actorType, actorId } = await getActorInfo(ctx);
  
  await ctx.runMutation(internal.gdpr.logAction, {
    action,
    actorType,
    actorId,
    resourceType: "magic_link",
    resourceId: tokenId,
    details: { appointmentId, ...details },
  });
}
```

---

## 6. GDPR MODULE STRUCTURE (convex/gdpr.ts + gdprModules/)

### Facade File Details
**Location**: `/home/gabe/projects/convex-medical-starter/convex/gdpr.ts`  
**Lines**: 33 total  
**Pattern**: Re-exports from modular implementations

### Re-exported Functions
```typescript
// From gdprModules/audit.ts
export { logAction, getAuditLogs, getAuditLogsByResource }

// From gdprModules/consent.ts
export { createConsent, withdrawConsent, getConsentsByPatient }

// From gdprModules/erasure.ts
export { requestErasure, listErasureRequests, processErasure }

// From gdprModules/stats.ts
export { getGDPRStats }

// From gdprModules/export.ts
export { exportPatientData }

// From gdprModules/types.ts (type re-exports)
export type { ConsentType, ErasureStatus, ActorType, AuditLogEntry, GDPRStats }
```

### Module Organization Pattern (TO FOLLOW)
**File**: `convex/appointmentTokensModules/index.ts` (Facade)
```typescript
// Facade pattern: re-export only, no implementation
export { generate, validateAndGetAppointment, markViewed, invalidateForAppointment } 
  from "./mutations";
export { hashToken } from "./utilities";
export type { AppointmentToken, TokenValidationResult } from "./types";
```

**Files**: 
- `convex/appointmentTokensModules/mutations.ts` - generate, invalidateForAppointment (mutations)
- `convex/appointmentTokensModules/queries.ts` - validateAndGetAppointment, getTokenInfo (queries)
- `convex/appointmentTokensModules/utilities.ts` - hashToken, token crypto
- `convex/appointmentTokensModules/types.ts` - TypeScript interfaces
- `convex/appointmentTokensModules/icsGenerator.ts` - ICS calendar generation

---

## 7. GDPR AUDIT MODULE EXAMPLE (convex/gdprModules/audit.ts)

### File Details
**Location**: `/home/gabe/projects/convex-medical-starter/convex/gdprModules/audit.ts`  
**Lines**: ~90 total  
**Pattern**: Internal mutation + public query

### logAction (Internal Mutation) - Lines 12-32
```typescript
export const logAction = internalMutation({
  args: {
    action: v.string(),
    actorType: v.union(v.literal("employer"), v.literal("doctor"), v.literal("admin"), v.literal("system")),
    actorId: v.optional(v.string()),
    resourceType: v.string(),
    resourceId: v.optional(v.string()),
    details: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("auditLogs", {
      ...args,
      timestamp: Date.now(),
    });
  },
});
```

**Key Pattern**:
- `internalMutation` - Can only be called via `ctx.runMutation(internal.gdpr.logAction, ...)`
- Adds `timestamp` automatically
- No auth check (called internally from other mutations)

### getAuditLogs (Query) - Lines 38-80+
```typescript
export const getAuditLogs = query({
  args: {
    limit: v.optional(v.number()),
    action: v.optional(v.string()),
    actorType: v.optional(...),
    resourceType: v.optional(v.string()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Admin-only check
    await requireAdmin(ctx);
    
    // Query with filtering
    let results = await ctx.db
      .query("auditLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .collect();
    
    // Apply filters...
    return results;
  },
});
```

---

## 8. TYPE DEFINITIONS (convex/gdprModules/types.ts)

### Current Type Exports (Lines 1-33)
```typescript
export type ConsentType = "data_processing" | "health_data" | "employer_sharing";

export type ErasureStatus = "pending" | "in_progress" | "completed" | "rejected";

export type ActorType = "employer" | "doctor" | "admin" | "system";

export interface AuditLogEntry {
  action: string;
  actorType: ActorType;
  actorId?: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  timestamp: number;
}

export type GDPRStats = {
  pendingErasureCount: number;
  totalPatients: number;
  activeConsents: number;
  recentAuditLogs: Doc<"auditLogs">[];
  // ... more fields
};
```

### Types Needed for appointmentTokens
```typescript
export type TokenStatus = "active" | "viewed" | "expired" | "invalidated";

export interface AppointmentToken extends Doc<"appointmentTokens"> {
  tokenHash: string;
  appointmentId: Id<"appointments">;
  patientId: Id<"patients">;
  createdAt: number;
  expiresAt: number;
  viewedAt?: number;
  invalidated?: boolean;
}

export interface TokenGenerationResult {
  token: string;              // Unhashed token (only returned once)
  expiresAt: number;          // Expiration timestamp
}

export interface TokenValidationResult {
  valid: boolean;
  error?: string;
  appointment?: {
    id: Id<"appointments">;
    status: string;
    reason?: string;
    scheduledDate: string;
    startTime: string;
    endTime: string;
  };
  patient?: {
    firstName: string;
    lastName: string;
  };
  doctor?: {
    name: string;
    zoomLink?: string;
  };
  appointmentType?: {
    name: string;
    duration: number;
    description: string;
  };
}
```

---

## 9. INTEGRATION CHECKLIST

### Schema Changes
- [ ] Add `appointmentTokens` table to `convex/schema.ts` (after line 286)
- [ ] Indexes: `by_token`, `by_appointment`, `by_expiry`
- [ ] Run `npm run typecheck` after schema change

### New Modules
- [ ] Create `convex/appointmentTokensModules/` directory
- [ ] Create `convex/appointmentTokensModules/index.ts` (facade)
- [ ] Create `convex/appointmentTokensModules/mutations.ts`
- [ ] Create `convex/appointmentTokensModules/queries.ts`
- [ ] Create `convex/appointmentTokensModules/utilities.ts` (hashToken)
- [ ] Create `convex/appointmentTokensModules/types.ts`
- [ ] Create `convex/appointmentTokensModules/icsGenerator.ts`

### HTTP Routes
- [ ] Add `/calendar/:token` GET route to `convex/http.ts` (after line 295)
- [ ] Return `text/calendar` content type
- [ ] Add Content-Disposition header for .ics file download

### Audit Logging
- [ ] Create `logTokenAction()` in `convex/helpers/auditLogger.ts`
- [ ] Call in token generation: `logTokenAction(ctx, "magic_link_generated", ...)`
- [ ] Call in token validation (optional for analytics)
- [ ] Call on invalidation: `logTokenAction(ctx, "magic_link_invalidated", ...)`

### Mutations to Appointments Module
- [ ] Call `invalidateForAppointment()` when appointment is cancelled
- [ ] Import: `import { invalidateForAppointment } from "./appointmentTokensModules"`
- [ ] In `cancel()` mutation: `await ctx.runMutation(internal.appointmentTokens.invalidateForAppointment, ...)`

---

## 10. KEY INTEGRATION POINTS

### 1. Token Generation (Employer Portal)
```typescript
// Location: Booking confirmation page or dashboard
// Caller: Employer (authenticated via requireEmployerOwnership)
// Flow:
//   1. employerId verified via auth
//   2. appointmentId provided
//   3. Call: await ctx.runMutation(internal.appointmentTokens.generate, { appointmentId })
//   4. Response: { token, expiresAt }
//   5. Generate magic link: ${APP_URL}/appointments/${token}
//   6. Share with patient (email, SMS, etc.)
```

### 2. Magic Link Access (Patient - Public)
```typescript
// Location: /appointments/:token (frontend route)
// Caller: Patient (unauthenticated)
// Flow:
//   1. Extract token from URL
//   2. Call: await ctx.runQuery(internal.appointmentTokens.validateAndGetAppointment, { token })
//   3. Display appointment details + calendar download button
//   4. Optional: Call logTokenAction("magic_link_accessed", ...) for analytics
```

### 3. Calendar Download (Patient - Public)
```typescript
// Location: GET /calendar/:token (HTTP endpoint)
// Caller: Patient browser (unauthenticated)
// Flow:
//   1. Extract token from URL path
//   2. Call: ctx.runQuery(internal.appointmentTokens.validateAndGetAppointment, { token })
//   3. Generate ICS file with appointment details
//   4. Return Response with Content-Type: text/calendar
//   5. Browser downloads as .ics file
```

### 4. Appointment Cancellation (Employer)
```typescript
// Location: convex/appointments.ts cancel() mutation
// Existing: appointmentId provided, employer verified
// New flow:
//   1. After marking appointment as cancelled
//   2. Call: await ctx.runMutation(internal.appointmentTokens.invalidateForAppointment, { appointmentId })
//   3. All tokens for this appointment marked invalidated: true
//   4. Magic links still exist but return error: "This link is no longer valid"
```

---

## 11. SECURITY CONSIDERATIONS

### Token Security
- **Hashing**: Store SHA-256 hash, never plain token
- **TTL**: 48 hours from creation
- **Invalidation**: Soft delete via `invalidated` flag (audit trail)
- **No reuse**: Each token is single-use (implicit via soft delete)

### Public Endpoint Security
- **No auth required**: By design (patients don't have accounts)
- **Rate limiting**: NOT implemented (add to infrastructure)
- **IP blocking**: NOT implemented (add to infrastructure)
- **Token validation**: Hash + expiration + invalidation checks

### GDPR Compliance
- **Audit logging**: All token actions logged
- **Data exposure**: Endpoint returns only appointment-related data (no medical details)
- **Redaction**: Patient names, doctor notes NOT exposed via magic link
- **Erasure**: `invalidateForAppointment()` called on data erasure

---

## 12. TESTING PATTERNS (FROM MEMORIES)

### Example Convex CLI Tests
```bash
# Generate token
npx tsx CONVEX-CLI/SCRIPTS/convex-run.ts appointmentTokens:generate \
  '{\"appointmentId\":\"<valid-id>\"}' --json

# Validate token
npx tsx CONVEX-CLI/SCRIPTS/convex-run.ts appointmentTokens:validateAndGetAppointment \
  '{\"token\":\"<generated-token>\"}' --json

# Mark as viewed
npx tsx CONVEX-CLI/SCRIPTS/convex-run.ts appointmentTokens:markViewed \
  '{\"token\":\"<generated-token>\"}' --json

# Test HTTP endpoint
curl https://<convex-deployment>/calendar/<token> \
  -H "Accept: text/calendar" \
  -o appointment.ics
```

### Browser Testing (FROM NAV-MAP.md)
```bash
# 1. Navigate to employer dashboard
navigate /employer/dashboard
snapshot

# 2. Open booking details modal
click 'a[href="/employer/bookings"]'
snapshot

# 3. Click "Share Link" button (new feature)
click "text:Share Link"
snapshot

# 4. Verify magic link displayed
assert "text:Copy Link" visible
assert e5.textContent.includes("https://")

# 5. Test magic link (patient view - open in new tab)
tabs new <magic-link-url>
snapshot  # Should show appointment details
click "text:Add to Calendar"
# Browser downloads .ics file
```

---

## 13. FILE LOCATIONS SUMMARY

### Existing Files (Reference)
| File | Lines | Purpose |
|------|-------|---------|
| `/home/gabe/projects/convex-medical-starter/convex/schema.ts` | 287 | Database schema |
| `/home/gabe/projects/convex-medical-starter/convex/appointments.ts` | 365 | Appointment mutations/queries |
| `/home/gabe/projects/convex-medical-starter/convex/http.ts` | 296 | HTTP routes |
| `/home/gabe/projects/convex-medical-starter/convex/authModules/authorization.ts` | 209 | Auth helpers |
| `/home/gabe/projects/convex-medical-starter/convex/helpers/auditLogger.ts` | 161 | Audit logging |
| `/home/gabe/projects/convex-medical-starter/convex/gdpr.ts` | 33 | GDPR facade |
| `/home/gabe/projects/convex-medical-starter/convex/gdprModules/audit.ts` | ~90 | Audit implementation |

### Files to Create (NEW)
| File | Purpose |
|------|---------|
| `convex/appointmentTokensModules/index.ts` | Facade re-exports |
| `convex/appointmentTokensModules/mutations.ts` | generate, invalidateForAppointment |
| `convex/appointmentTokensModules/queries.ts` | validateAndGetAppointment |
| `convex/appointmentTokensModules/utilities.ts` | hashToken, tokenGeneration |
| `convex/appointmentTokensModules/types.ts` | TypeScript interfaces |
| `convex/appointmentTokensModules/icsGenerator.ts` | RFC 5545 ICS file generation |

### Files to Modify
| File | Changes |
|------|---------|
| `convex/schema.ts` | Add appointmentTokens table (~20 lines) |
| `convex/http.ts` | Add /calendar/:token route (~40 lines) |
| `convex/appointments.ts` | Import + call invalidateForAppointment in cancel() |
| `convex/helpers/auditLogger.ts` | Add logTokenAction() function |

---

## 14. CONVENTIONS & PATTERNS TO FOLLOW

### Module Organization (FROM CODE)
- **Facade file**: `convex/appointmentTokens.ts` with re-exports only
- **Modular dir**: `convex/appointmentTokensModules/` with focused files
- **No circular deps**: Mutations don't import queries (use ctx.runQuery)
- **Types shared**: All types in `appointmentTokensModules/types.ts`

### Convex Function Patterns
- **Query**: `query({ args: {...}, handler: async (ctx, args) => {...} })`
- **Mutation**: `mutation({ args: {...}, handler: async (ctx, args) => {...} })`
- **Internal Mutation**: `internalMutation()` - only via `ctx.runMutation(internal.xxx)`
- **Error handling**: `throw new ConvexError({ code: "NAME", message: "..." })`

### Authorization Patterns
- **Public endpoints**: No auth check
- **Employer-only**: `await requireEmployerOwnership(ctx, employerId)`
- **Doctor-only**: `await requireDoctorAccess(ctx)`
- **Admin-only**: `await requireAdmin(ctx)`

### Audit Logging Pattern
- **Call from mutation**: `await ctx.runMutation(internal.gdpr.logAction, {...})`
- **Helper wrapper**: Use `logAppointmentAction()` / `logTokenAction()`
- **Details object**: Pass context-specific data (IDs, metadata)
- **Timestamp**: Added automatically by logAction

### HTTP Route Pattern
- **Path parameter**: Extract with `url.pathname.split("/")`
- **Query parameter**: Extract with `url.searchParams.get()`
- **Response**: `new Response(content, { status: 200, headers: {...} })`
- **Redirect**: `Response.redirect(url, 302)`

### Hashing Pattern (FOLLOW)
```typescript
// Web Crypto API (built-in, no npm package needed)
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
```

---

## SUMMARY FOR IMPLEMENTATION

### Ready to Build:
1. **Schema**: appointmentTokens table structure defined
2. **Modules**: Directory structure and facade pattern documented
3. **HTTP**: /calendar/:token route pattern established
4. **Auth**: Public endpoint pattern (no requireEmployerOwnership needed)
5. **Audit**: logTokenAction pattern ready to implement
6. **Integration**: cancel() mutation hook identified
7. **ICS Generation**: RFC 5545 compliance needed

### No Blockers:
- All required Convex APIs available
- Auth patterns established
- Module organization proven (gdprModules pattern exists)
- HTTP route patterns documented
- Audit logging infrastructure ready

### Next Steps:
- Proceed with PATIENT_ACCESS_SPRINT_02_BACKEND implementation
- Create appointmentTokensModules directory structure
- Implement mutations.ts first (generate, invalidateForAppointment)
- Implement queries.ts (validateAndGetAppointment)
- Add /calendar/:token HTTP route
- Update appointments.cancel() to call invalidate hook
- Run typecheck and test

---

**Report Prepared By**: SCOUT Agent (API Discovery)  
**Status**: Complete - Ready for Development  
**Next Memory**: PATIENT_ACCESS_SPRINT_02_BACKEND (Implementation guide)
"