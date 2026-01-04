# Database Schema Context: Auth System Remediation
**Date**: 2026-01-04  
**Purpose**: Discover DB context for WorkOS + Convex Auth integration fixes  
**Status**: COMPLETE

---

## Executive Summary

OccuHealth uses a hybrid authentication model:
- **Frontend**: WorkOS OAuth tokens stored in localStorage
- **Backend**: Convex database with role-specific tables (adminUsers, employers, doctorSettings)
- **Gap**: Convex Convex client doesn't send tokens → `ctx.auth.getUserIdentity()` returns null → guards fail

**Schema includes 13 tables**: 5 auth-related, 8 business-logic tables

---

## Auth Tables (5 total)

### 1. **adminUsers** - Admin accounts (WorkOS AuthKit)
```
Columns:
- _id: ObjectId (primary key)
- workosUserId: string (required, unique via index)
- email: string (required, unique via index)
- firstName: optional string
- lastName: optional string
- profilePictureUrl: optional string
- lastLoginAt: number (Unix timestamp)
- createdAt: number (Unix timestamp)

Indexes:
- by_workos_user_id: ["workosUserId"]
- by_email: ["email"]

Query Patterns:
- getByWorkosId(workosUserId) → internalQuery
- getByWorkosIdPublic(workosUserId) → query (PUBLIC, security risk)
- getByEmail(email) → query (PUBLIC, security risk)
- upsertAdminUser(workosUserId, email, firstName, lastName, profilePictureUrl) → internalMutation
```

**Used by**: 
- `http.ts` - Auth callback creates/updates admin on login
- `employers.ts` - Admin verification workflow references via `verifiedBy` field
- `authModules/authorization.ts` - requireAdmin() guard

---

### 2. **employers** - Company/Insurer accounts
```
Columns:
- _id: ObjectId (primary key)
- workosUserId: string (required)
- email: string (required)
- companyType: "employer" | "insurer"
- companyName: string (required)
- companyRegistrationNumber: optional string
- contactName: string (required)
- contactPhone: optional string
- addressLine1: string (required)
- addressLine2: optional string
- city: string (required)
- postcode: string (required)
- status: "pending" | "verified" | "rejected"
- verifiedAt: optional number
- verifiedBy: optional Id<adminUsers> (foreign key to adminUsers)
- rejectionReason: optional string
- createdAt: number
- updatedAt: number

Indexes:
- by_workos_user: ["workosUserId"]
- by_status: ["status"]
- by_email: ["email"]

Query Patterns:
- getByWorkosId(workosUserId) → internalQuery (auth routing)
- getByWorkosIdPublic(workosUserId) → query (PUBLIC)
- getById(employerId) → query (PUBLIC)
- create(workosUserId, email, ...) → mutation
- listPending() → query (used by admin portal)
- verify(employerId) → mutation (restricted by requireAdmin)
- reject(employerId, rejectionReason) → mutation (restricted by requireAdmin)
```

**Relationships**:
- `verifiedBy: Id<adminUsers>` → Admin who verified the employer
- Referenced by `patients.employerId`, `appointments.employerId`, `reports.employerId`, `consents.collectedByEmployerId`

**Guard**: `requireEmployerOwnership(ctx, employerId)` - verifies caller owns employer

---

### 3. **doctorSettings** - Doctor/clinician profiles
```
Columns:
- _id: ObjectId (primary key)
- workosUserId: string (required)
- email: string (required)
- name: string (required, display name "Dr. {name}")
- zoomPersonalLink: string (required)
- createdAt: number

Indexes:
- by_workos_user: ["workosUserId"]

Query Patterns:
- getByWorkosId(workosUserId) → internalQuery (auth routing)
- create(workosUserId, email, name, zoomPersonalLink) → mutation
```

**Guard**: `requireDoctorAccess(ctx)` - verifies caller is registered doctor, returns doctorSettings record

---

### 4. **oauthStates** - CSRF Protection (OAuth state tokens)
```
Columns:
- _id: ObjectId (primary key)
- state: string (UUID, required)
- expiresAt: number (Unix timestamp)

Indexes:
- by_state: ["state"]

Query Patterns:
- create(state, expiresAt) → internalMutation (called from /auth/login)
- validate(state) → internalQuery (called from /auth/callback)
- deleteState(state) → internalMutation (called after validation)

Lifecycle:
1. User clicks login → /auth/login generates UUID state
2. State stored in oauthStates with 5-minute TTL
3. Redirect to WorkOS with state parameter
4. WorkOS redirects back with code + state
5. /auth/callback validates state matches (CSRF check)
6. State deleted after validation (prevents replay)
```

**Security**: Protects against CSRF attacks during OAuth flow

---

### 5. **authTables** - Convex Auth framework tables (imported)
```
From: @convex-dev/auth/server

Tables auto-created by Convex Auth:
- authSessions (session management)
- authRefreshTokens (token refresh)
- authUsers (user identity)

⚠️ Currently NOT USED in this app because:
- ctx.auth.getUserIdentity() returns null
- ConvexProvider (no auth) wraps app instead of ConvexProviderWithAuth
- WorkOS tokens not sent to Convex client

Status: PLACEHOLDER for future integration
```

---

## Business Logic Tables (8 total)

### 6. **patients** - Employee health records
```
Key Auth Fields:
- employerId: Id<employers> (foreign key, required)

Relationships:
- Linked to employer (all patient data scoped to employer)
- One consent per patient (consentId required)

Access Control:
- query list(employerId) → requires requireEmployerOwnership
- query getById(patientId) → requires requireEmployerOwnership on patient's employer

Guard Used: requireEmployerOwnership
```

### 7. **appointments** - Booking/scheduling
```
Key Auth Fields:
- employerId: Id<employers> (foreign key)
- patientId: Id<patients> (foreign key)

Indexes:
- by_employer
- by_patient
- by_date
- by_status

Access Control:
- Employer queries scoped to their employerId
- Doctor queries scoped to their doctorSettings

Guards Used: requireEmployerOwnership, requireDoctorAccess
```

### 8. **reports** - Fit-for-work assessments
```
Key Auth Fields:
- employerId: Id<employers> (foreign key)
- patientId: Id<patients> (foreign key)
- appointmentId: Id<appointments> (foreign key)

Access Control:
- Created by doctors (requireDoctorAccess)
- Viewed by employers (requireEmployerOwnership)

Guards Used: requireDoctorAccess, requireEmployerOwnership
```

### 9. **consents** - GDPR consent records
```
Key Auth Fields:
- collectedByEmployerId: Id<employers> (foreign key)
- patientId: optional Id<patients> (foreign key)

Operations:
- createConsent(patientEmail, patientId, consentType, ..., collectedByEmployerId)
- withdrawConsent(consentId)

⚠️ NOTE: createConsent is PUBLIC (no guard!) - security concern
```

### 10. **auditLogs** - GDPR audit trail
```
Columns:
- action: string (mutation action name)
- actorType: "employer" | "doctor" | "admin" | "system"
- actorId: optional string (workosUserId or userId)
- resourceType: string (table name: patients, appointments, etc)
- resourceId: optional string (document ID)
- details: optional any (mutation payload)
- timestamp: number

Indexes:
- by_action: ["action"]
- by_timestamp: ["timestamp"]
- by_resource: ["resourceType", "resourceId"]

Used by:
- gdpr.ts logAction() → internal mutation
- All mutations call logAction to audit GDPR-relevant events

⚠️ No guard on audit log queries - public read? Check gdpr.ts
```

### 11. **erasureRequests** - GDPR right-to-be-forgotten
```
Columns:
- requesterEmail: string
- patientId: optional Id<patients>
- status: "pending" | "in_progress" | "completed" | "rejected"
- reason: optional string
- requestedAt: number
- completedAt: optional number
- processedBy: optional string

Indexes:
- by_status
- by_email

Used by:
- Admin portal /admin/gdpr/erasure
- Displays pending erasure requests
```

### 12. **appointmentTypes** - Service catalog
```
Public catalog of appointment types (clinician rates, durations)
No auth required - lookup only
```

### 13. **availableSlots** - Clinician availability
```
Doctor schedule slots for booking
No direct auth - referenced by appointments
```

---

## Authorization Flow

### Current (Broken) Flow
```
1. User clicks Login button
   ↓
2. Frontend: window.location.href = WorkOS AuthKit
   ↓
3. WorkOS authenticates user
   ↓
4. Redirect to /auth/callback?code=...&state=...&sessionId=...
   ↓
5. Backend (convex/http.ts):
   - Validate CSRF state against oauthStates table
   - Exchange code for JWT tokens
   - Parallel queries:
     * adminUsers.getByWorkosId(workosUserId)
     * employers.getByWorkosId(workosUserId)
     * doctorSettings.getByWorkosId(workosUserId)
   - Determine role from query results
   - Return tokens in URL fragment
   ↓
6. Frontend (AdminAuthCallback):
   - Extract tokens from URL
   - Store in localStorage (workos_admin_auth, workos_employer_auth, workos_doctor_auth)
   - Navigate to role dashboard
   ↓
7. Frontend: useQuery() calls Convex RPC
   ↓
8. Convex RPC:
   - ⚠️ ConvexProvider sends NO auth header
   - ⚠️ ctx.auth.getUserIdentity() = null
   - ⚠️ requireAdmin() throws UNAUTHENTICATED
   - ⚠️ requireEmployerOwnership() throws UNAUTHENTICATED
   - ⚠️ requireDoctorAccess() throws UNAUTHENTICATED
   ↓
9. Frontend: Query fails with UNAUTHENTICATED error
```

### Guard Usage Statistics
| Guard | Calls | Files |
|-------|-------|-------|
| `requireAdmin` | 6 | employers.ts |
| `requireEmployerOwnership` | 20+ | patients.ts, appointments.ts, reports.ts, employers.ts |
| `requireDoctorAccess` | 15+ | reports.ts, appointments.ts, availableSlots.ts |
| **Total** | **41+** | **6 files** |

### Guard Implementations
```typescript
// authorModules/authorization.ts

async function getAuthenticatedUser(ctx): Promise<AuthenticatedUser | null>
  - Calls: ctx.auth.getUserIdentity()
  - Returns: { workosUserId: identity.subject, identity }
  - ⚠️ Returns null (no Convex auth integration)

async function requireEmployerOwnership(ctx, employerId): Promise<Doc<"employers">>
  - Calls: getAuthenticatedUser()
  - Throws: UNAUTHENTICATED if null
  - Verifies: employer.workosUserId === user.workosUserId
  - Throws: EMPLOYER_NOT_FOUND, UNAUTHORIZED

async function requireDoctorAccess(ctx): Promise<Doc<"doctorSettings">>
  - Calls: getAuthenticatedUser()
  - Throws: UNAUTHENTICATED if null
  - Queries: doctorSettings.by_workos_user (workosUserId)
  - Throws: DOCTOR_NOT_FOUND if not found

async function requireAdmin(ctx): Promise<Doc<"adminUsers">>
  - Calls: getAuthenticatedUser()
  - Throws: UNAUTHENTICATED if null
  - Queries: adminUsers.by_workos_user_id (workosUserId)
  - Throws: ADMIN_NOT_FOUND if not found
```

---

## Index Usage for Auth Lookups

| Table | Index | Query | Use Case |
|-------|-------|-------|----------|
| adminUsers | by_workos_user_id | eq(workosUserId) | Admin auth routing, guard verification |
| adminUsers | by_email | eq(email) | Email-based lookup (public query) |
| employers | by_workos_user | eq(workosUserId) | Employer auth routing, guard verification |
| employers | by_status | eq(status) | Pending verification, admin dashboards |
| employers | by_email | eq(email) | Email-based lookup (public query) |
| doctorSettings | by_workos_user | eq(workosUserId) | Doctor auth routing, guard verification |
| oauthStates | by_state | eq(state) | CSRF validation during OAuth callback |
| patients | by_employer | eq(employerId) | Scoped patient list queries |
| patients | by_email | eq(email) | Email lookup (not used in guards) |
| patients | by_deleted | eq(deletedAt) | Soft-delete filtering |
| appointments | by_employer | eq(employerId) | Scoped appointment list |
| appointments | by_patient | eq(patientId) | Patient appointment history |
| appointments | by_date | eq(date) | Schedule queries |
| appointments | by_status | eq(status) | Status-based filtering |
| reports | by_employer | eq(employerId) | Employer report access |
| reports | by_appointment | eq(appointmentId) | Report lookup by appointment |
| reports | by_patient | eq(patientId) | Patient report history |
| consents | by_patient | eq(patientId) | Consent lookup |
| consents | by_email | eq(patientEmail) | Email-based consent lookup |
| consents | by_type | eq(consentType) | Consent type filtering |
| auditLogs | by_action | eq(action) | Audit filtering by action |
| auditLogs | by_timestamp | eq(timestamp) | Audit trail by date |
| auditLogs | by_resource | eq(resourceType, resourceId) | Resource audit history |
| erasureRequests | by_status | eq(status) | Pending erasure lookup |
| erasureRequests | by_email | eq(requesterEmail) | Erasure request by email |
| appointmentTypes | by_active | eq(isActive) | Active service listing |
| availableSlots | by_date | eq(date) | Slot lookup by date |
| availableSlots | by_status | eq(status) | Available slot filtering |
| availableSlots | by_date_status | eq(date, status) | Combined date + status query |

---

## Security Observations

### Auth Table Security Status

| Table | Public Queries | Risk | Impact |
|-------|---|---|---|
| adminUsers | `getByWorkosIdPublic`, `getByEmail` | High | Leaks admin identities |
| employers | `getByWorkosIdPublic`, `getById` | Medium | Public employer data is intended |
| doctorSettings | None public | Low | Only internal queries |
| oauthStates | None public | Low | Internal CSRF protection |
| authTables | Placeholder | Low | Not currently used |

### Business Table Security

| Table | Guards | Risk | Status |
|-------|--------|------|--------|
| patients | requireEmployerOwnership | Low | ✅ Protected |
| appointments | requireEmployerOwnership, requireDoctorAccess | Low | ✅ Protected |
| reports | requireEmployerOwnership, requireDoctorAccess | Low | ✅ Protected |
| consents | **NONE** | 🔴 High | ⚠️ Public create |
| auditLogs | Unknown | Medium | ⚠️ Check gdpr.ts |
| clinicalNotes | Unknown | High | ⚠️ Medical data |
| erasureRequests | Unknown | Medium | ⚠️ Check gdpr.ts |

---

## Relationships Map

```
adminUsers (admins)
  ↓ verifiedBy (foreign key)
  ├─→ employers.verifiedBy
  
employers (companies)
  ↓ by workosUserId
  ├─→ patients.employerId
  ├─→ appointments.employerId
  ├─→ reports.employerId
  └─→ consents.collectedByEmployerId
  
doctorSettings (clinicians)
  ↓ by workosUserId
  ├─→ appointments (doctor queries appointments)
  └─→ reports (doctor creates reports)
  
patients (employees)
  ├─→ consentId (required)
  ├─→ employerId
  ├─→ appointments.patientId
  ├─→ reports.patientId
  ├─→ clinicalNotes.patientId
  └─→ erasureRequests.patientId
  
appointments (bookings)
  ├─→ patientId
  ├─→ employerId
  ├─→ appointmentTypeId
  ├─→ slotId
  └─→ reportId
  
reports (assessments)
  ├─→ appointmentId
  ├─→ patientId
  ├─→ employerId
  └─→ clinicalNotes reference

consents (GDPR)
  ├─→ patientId (optional)
  ├─→ collectedByEmployerId
  └─→ auditLogs (consent created)

auditLogs (compliance)
  ├─→ actorId (workosUserId or userId)
  ├─→ resourceId (any document ID)
  └─→ timestamp

erasureRequests (GDPR)
  ├─→ patientId (optional)
  ├─→ requesterEmail
  └─→ processedBy (admin workosUserId)
```

---

## Key Findings for Auth Remediation

### 1. **Auth State Storage**
- Frontend: localStorage with role-specific keys
  - `workos_admin_auth`: { userId, accessToken, refreshToken, sessionId }
  - `workos_employer_auth`: { workosUserId, accessToken, refreshToken }
  - `workos_doctor_auth`: { workosUserId, accessToken, refreshToken }

### 2. **Role Routing Logic**
Located in `convex/http.ts` - `/auth/callback` endpoint:
1. Validates CSRF state from oauthStates table
2. Exchanges code for JWT tokens from WorkOS
3. Parallel queries to determine role:
   - `adminUsers.getByWorkosId(workosUserId)` → Admin
   - `employers.getByWorkosId(workosUserId)` → Employer
   - `doctorSettings.getByWorkosId(workosUserId)` → Doctor
4. Routes based on role to dashboard

### 3. **Index Optimization**
- Auth lookups use efficient indexes (single-field equality)
- No composite indexes needed for auth flow
- `by_workos_user*` indexes critical for guard performance

### 4. **Guard Dependency Chain**
All guards depend on `ctx.auth.getUserIdentity()`:
```
getAuthenticatedUser()
  → requireAdmin() (6 calls)
  → requireEmployerOwnership() (20+ calls)
  → requireDoctorAccess() (15+ calls)
```

**Fix needed**: Make `ctx.auth.getUserIdentity()` return user identity instead of null

---

## Required Files for Remediation

| File | Current State | Needed Change | Priority |
|------|---|---|---|
| convex/schema.ts | ✅ Complete, indexes OK | None | - |
| convex/authModules/authorization.ts | ✅ Guards correct | None | - |
| convex/adminUsers.ts | ⚠️ Public queries exposed | Remove public queries or add guards | P2 |
| convex/employers.ts | ⚠️ Public queries exposed | Optional (public employer data OK) | P3 |
| convex/gdpr.ts | ⚠️ createConsent public | Add requireEmployerOwnership | P2 |
| src/lib/workos-auth.tsx | ⚠️ No Convex token integration | Add useConvexAuth() hook | P1 |
| src/main.tsx | ❌ ConvexProvider (no auth) | Use ConvexProviderWithAuth | P1 |
| convex/auth.config.ts | ❌ MISSING | Create if using built-in Convex Auth | P1 |
| convex/http.ts | ⚠️ Token handling | Add /auth/refresh endpoint | P2 |

---

## Testing Checkpoints

### Schema Integrity
- [ ] All 13 tables present in deployment
- [ ] All indexes created (28 total)
- [ ] Foreign key relationships enforced in mutation handlers

### Auth Flow
- [ ] /auth/login generates and stores oauthStates
- [ ] /auth/callback validates state (CSRF check)
- [ ] Role queries return correct role results
- [ ] Tokens stored in localStorage

### Guard Behavior (After Fix)
- [ ] getAuthenticatedUser() returns user identity ✅
- [ ] requireAdmin() allows admin operations
- [ ] requireEmployerOwnership() allows employer access
- [ ] requireDoctorAccess() allows doctor operations

### Data Isolation
- [ ] Employer A cannot access Employer B patients
- [ ] Doctor cannot access other doctor's appointments
- [ ] Admin can access all employers (verification workflow)

---

## Related Contexts
- AUTH_ANALYSIS_SPRINT_02_ARCHITECTURE (guard usage details)
- PLAN_CONVEX_WORKOS_AUTH_INTEGRATION (implementation roadmap)
- AUTH_ANALYSIS_SPRINT_03_SECURITY (security assessment)
- E2E_VALIDATION_REPORT (testing outcomes)
