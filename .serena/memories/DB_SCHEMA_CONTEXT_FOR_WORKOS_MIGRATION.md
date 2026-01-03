# Database Schema Context for WorkOS Auth Migration

**Created**: 2026-01-03  
**Scope**: Convex database tables, relationships, and indexes relevant to WorkOS authentication migration  
**Status**: Complete inventory

---

## Schema Overview

The database is defined in `/home/gabe/projects/convex-medical-starter/convex/schema.ts` and includes:
- **Convex Auth tables** (from `@convex-dev/auth/server` package)
- **WorkOS-managed user tables** (adminUsers, employers, doctorSettings)
- **Business domain tables** (patients, appointments, reports, clinical notes)
- **GDPR compliance tables** (consents, auditLogs, erasureRequests)

---

## Core Authentication Tables

### 1. adminUsers Table
**Role**: Stores WorkOS AuthKit admin users  
**Access Pattern**: WorkOS-managed, updated on login  
**Schema**:
```typescript
adminUsers: defineTable({
  workosUserId: v.string(),        // PK: WorkOS user ID
  email: v.string(),                // Admin email
  firstName: v.optional(v.string()), // Optional first name
  lastName: v.optional(v.string()),  // Optional last name
  profilePictureUrl: v.optional(v.string()), // User avatar
  lastLoginAt: v.number(),          // Timestamp of last login
  createdAt: v.number(),            // Account creation timestamp
})
  .index("by_workos_user_id", ["workosUserId"])  // PK lookup for auth routing
  .index("by_email", ["email"])                  // Email-based lookups
```

**Mutations**:
- `upsertAdminUser()` (in `/convex/adminUsers.ts`): Creates new or updates existing admin on OAuth callback
- Updates `lastLoginAt` on every login

**Queries**:
- `getByWorkosId()` (internal): Auth routing decision
- `getByWorkosUserId()` (public): Client-side lookups
- `getByEmail()` (public): Email-based admin lookups

**Relationships**:
- Referenced by `employers.verifiedBy` (admin who verified employer)
- No foreign key constraints (weak reference)

---

### 2. employers Table
**Role**: Stores employer/insurer company accounts (users who aren't admins or doctors)  
**Access Pattern**: Verification workflow (pending → verified/rejected)  
**Schema**:
```typescript
employers: defineTable({
  workosUserId: v.string(),                    // OAuth user ID (same as WorkOS)
  email: v.string(),                            // Company contact email
  companyType: v.union(v.literal("employer"), v.literal("insurer")), // Account type
  companyName: v.string(),                     // Company legal name
  companyRegistrationNumber: v.optional(v.string()), // Optional: CHR/Companies House
  contactName: v.string(),                     // Main contact person
  contactPhone: v.optional(v.string()),        // Contact phone
  addressLine1: v.string(),                    // Street address
  addressLine2: v.optional(v.string()),        // Apt/unit
  city: v.string(),                            // City
  postcode: v.string(),                        // ZIP/postcode
  status: v.union(v.literal("pending"), v.literal("verified"), v.literal("rejected")),
  verifiedAt: v.optional(v.number()),          // Admin verification timestamp
  verifiedBy: v.optional(v.id("adminUsers")), // Which admin verified
  rejectionReason: v.optional(v.string()),     // Why rejected
  createdAt: v.number(),                       // Account creation
  updatedAt: v.number(),                       // Last update
})
  .index("by_workos_user", ["workosUserId"])   // Auth routing lookup
  .index("by_status", ["status"])              // Find pending for admin review
  .index("by_email", ["email"])                // Email lookups
```

**Mutations**:
- `create()`: Register new employer (status="pending")
- `update()`: Employer updates their profile
- `verify()`: Admin approves employer
- `reject()`: Admin rejects employer

**Queries**:
- `getByWorkosId()` (internal): Auth routing decision
- `getByWorkosIdPublic()` (public): Employer self-lookup
- `getById()`: Fetch employer details
- `listPending()`: Show admins all pending verifications
- `listAll()`: Admin dashboard employer list

**Relationships**:
- References `adminUsers._id` via `verifiedBy`
- Referenced by `patients.employerId` (employer owns patients)
- Referenced by `appointments.employerId`
- Referenced by `reports.employerId`
- Referenced by `consents.collectedByEmployerId`

---

### 3. doctorSettings Table
**Role**: Stores doctor/occupational health professional accounts  
**Access Pattern**: Lightweight, minimal update frequency  
**Schema**:
```typescript
doctorSettings: defineTable({
  workosUserId: v.string(),         // OAuth user ID
  email: v.string(),                 // Doctor email
  name: v.string(),                  // Doctor full name
  zoomPersonalLink: v.string(),      // Zoom meeting URL for consultations
  createdAt: v.number(),            // Account creation
})
  .index("by_workos_user", ["workosUserId"]) // Auth routing lookup
```

**Mutations**:
- `create()`: Doctor registration
- `update()`: Doctor updates name or Zoom link

**Queries**:
- `getByWorkosId()` (internal): Auth routing decision
- `getById()`: Fetch doctor settings
- `getByWorkosUserId()` (public): Client-side doctor lookup

**Relationships**:
- Referenced by `appointments.appointmentTypeId` (doctor runs appointments - indirect)
- No explicit FK but doctors associated via clinical notes

---

## Convex Auth Tables (Embedded from @convex-dev/auth)

**Defined by**: `...authTables` spread in schema (line 19)  
**Provider**: Password provider for legacy Convex Auth

**Expected tables** (from package):
- `users` - Convex Auth user accounts
- `sessions` - Active session tokens
- `auth_sessions` - Internal session tracking
- `tokens` - Password reset/verification tokens
- `authSessions` - Backend token management

**Status in migration**:
- Currently active (coaches/clients still use Convex Auth)
- Will be **DEPRECATED** after WorkOS migration complete
- Must keep until all Convex Auth flows removed

---

## MISSING: oauthState Table

**Current Status**: NOT CREATED (security gap identified)

**Purpose**: Store CSRF protection tokens during OAuth flow

**Why needed**:
- WorkOS OAuth callback at `/auth/callback` currently has NO CSRF protection
- No `state` parameter validation in flow
- Vulnerable to CSRF attacks

**Recommended schema**:
```typescript
oauthState: defineTable({
  state: v.string(),                 // CSRF token (unique, random)
  workosUserId: v.optional(v.string()), // Populated after auth
  expiresAt: v.number(),            // Token expiration (e.g., +5 minutes)
  createdAt: v.number(),            // When token created
  usedAt: v.optional(v.number()),   // When used
})
  .index("by_state", ["state"])      // Verify token on callback
  .index("by_expiry", ["expiresAt"]) // Cleanup expired tokens
```

**Related implementation**: `/convex/http.ts` lines 27-131
- Line 35-39: Generate authorization URL (missing `state` parameter)
- Line 54: Parse `state` from callback (NOT CURRENTLY DONE)
- **Gap**: No validation that returned `state` matches stored value

---

## Session/Token Storage

**Current approach**: Tokens stored in **browser localStorage**
- `accessToken` - WorkOS JWT (line 114 in http.ts)
- `refreshToken` - WorkOS refresh token (line 116)
- `userId` - WorkOS user ID (line 118)

**Risks**:
- XSS vulnerability can steal tokens
- No server-side session record
- Token expiration not validated server-side
- Refresh token rotation not enforced

**No server-side session table** currently exists for:
- Token revocation
- Device tracking
- Concurrent session limits
- Logout invalidation

---

## Relationships & Cross-Table Dependencies

```
adminUsers
├── Referenced by: employers.verifiedBy
└── No incoming FK constraints

employers
├── References: adminUsers._id (weak reference)
├── Referenced by:
│   ├── patients.employerId (strong)
│   ├── appointments.employerId
│   ├── reports.employerId
│   └── consents.collectedByEmployerId
└── Indexed by: workosUserId (auth routing), status (workflow)

doctorSettings
├── No FK references
└── Indexed by: workosUserId (auth routing)

patients
├── References: employers._id
├── Referenced by:
│   ├── appointments.patientId
│   ├── reports.patientId
│   ├── clinicalNotes.patientId
│   └── consents.patientId
└── Soft-delete via: deletedAt field

appointments
├── References: patientId, employerId, appointmentTypeId, slotId
├── Referenced by: reports.appointmentId, clinicalNotes.appointmentId
└── Cascades: reportId linked appointments

reports
├── References: appointmentId, patientId, employerId
└── Soft-deleted: No, uses status field

clinicalNotes
├── References: appointmentId, patientId
└── GDPR-protected: Doctor-only access
```

---

## Indexes Summary

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| **adminUsers** | `by_workos_user_id` | workosUserId | Auth routing (CRITICAL) |
| **adminUsers** | `by_email` | email | Email-based lookups |
| **employers** | `by_workos_user` | workosUserId | Auth routing (CRITICAL) |
| **employers** | `by_status` | status | Pending verification query |
| **employers** | `by_email` | email | Email lookups |
| **doctorSettings** | `by_workos_user` | workosUserId | Auth routing (CRITICAL) |
| **patients** | `by_employer` | employerId | Patient list for employer |
| **patients** | `by_email` | email | Patient lookup |
| **patients** | `by_deleted` | deletedAt | GDPR erasure queries |
| **appointments** | `by_employer` | employerId | Appointments for employer |
| **appointments** | `by_patient` | patientId | Patient's appointments |
| **appointments** | `by_date` | scheduledDate | Calendar queries |
| **appointments** | `by_status` | status | Workflow queries |
| **reports** | `by_employer` | employerId | Reports for employer |
| **reports** | `by_appointment` | appointmentId | Report for appointment |
| **reports** | `by_patient` | patientId | Reports for patient |
| **clinicalNotes** | `by_appointment` | appointmentId | Notes for appointment |
| **clinicalNotes** | `by_patient` | patientId | Doctor's notes for patient |
| **consents** | `by_patient` | patientId | Patient consents |
| **consents** | `by_email` | patientEmail | Email-based consent |
| **consents** | `by_type` | consentType | Consent workflow |
| **auditLogs** | `by_action` | action | Audit filtering |
| **auditLogs** | `by_timestamp` | timestamp | Audit history |
| **auditLogs** | `by_resource` | resourceType, resourceId | Resource audit trail |
| **erasureRequests** | `by_status` | status | GDPR processing |
| **erasureRequests** | `by_email` | requesterEmail | Requester lookup |
| **availableSlots** | `by_date` | date | Slot availability |
| **availableSlots** | `by_status` | status | Booking queries |
| **availableSlots** | `by_date_status` | date, status | Composite slot lookup |
| **appointmentTypes** | `by_active` | isActive | Active appointment types |

---

## Auth Routing Logic (from http.ts lines 83-99)

When OAuth callback occurs, system determines which table user belongs to:

```
WorkOS OAuth → Get user ID → Check 3 tables in parallel:
  ├─ employers.by_workos_user? → Redirect to /employer
  ├─ doctorSettings.by_workos_user? → Redirect to /doctor
  └─ adminUsers.by_workos_user? → Redirect to /admin
                                   └─ Upsert adminUser (update lastLoginAt)
                                   
If none found → /register/choose-role (new user registration)
```

**Critical insight**: Same WorkOS user ID can only exist in ONE table (enforced by application logic, not schema constraint).

---

## GDPR-Specific Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| **consents** | Track patient data processing agreement | grantedAt, withdrawnAt, consentVersion |
| **clinicalNotes** | Doctor notes (protected from employer view) | findings, diagnosis |
| **auditLogs** | All data access/modifications | action, actorType, actorId, resourceType |
| **erasureRequests** | "Right to be forgotten" requests | status, processedBy, completedAt |
| **patients** | Soft-delete support | deletedAt field |

---

## Key Findings for Migration

### Table Readiness: ✅ Ready
- `adminUsers` - Fully functional, updated in http.ts
- `employers` - Supports WorkOS user ID, has auth routing query
- `doctorSettings` - Supports WorkOS user ID, has auth routing query

### Security Gaps: ❌ CRITICAL
1. **No CSRF protection**: oauthState table missing
2. **Token handling**: Stored in localStorage only, no server-side session
3. **Token revocation**: No way to invalidate tokens server-side
4. **Logout**: No session cleanup mechanism

### Data Consistency: ✅ Good
- Auth routing indexes efficient (by_workos_user on all user tables)
- Foreign key relationships clear (employers → patients → appointments/reports)
- GDPR tables properly separated from business logic

---

## SQL-Equivalent Queries for Auth Flow

```sql
-- Auth routing decision
SELECT * FROM adminUsers WHERE workosUserId = ?;
SELECT * FROM employers WHERE workosUserId = ?;
SELECT * FROM doctorSettings WHERE workosUserId = ?;

-- Admin dashboard
SELECT * FROM employers WHERE status = 'pending';

-- Employer operations
SELECT * FROM patients WHERE employerId = ?;
SELECT * FROM appointments WHERE employerId = ? AND scheduledDate >= ?;

-- Doctor operations
SELECT * FROM clinicalNotes WHERE patientId = ?;

-- GDPR compliance
SELECT * FROM patients WHERE deletedAt IS NOT NULL;
SELECT * FROM erasureRequests WHERE status = 'pending';
```

---

## Migration Action Items

| # | Action | Location | Priority |
|---|--------|----------|----------|
| 1 | Create oauthState table | schema.ts | **CRITICAL** |
| 2 | Add CSRF state parameter to auth flow | http.ts line 35 | **CRITICAL** |
| 3 | Validate state on callback | http.ts line 54 | **CRITICAL** |
| 4 | Create server-side session table | schema.ts | HIGH |
| 5 | Implement token revocation | http.ts, session table | HIGH |
| 6 | Add logout mutation | New: logout.ts | HIGH |
| 7 | Test auth routing logic | E2E: auth.spec.ts | HIGH |
| 8 | Verify employer/doctor auth flows | E2E: roles.spec.ts | HIGH |

---

**Last Updated**: 2026-01-03  
**Source**: Direct schema analysis + http.ts implementation review  
**Related Memories**: WORKOS_AUTH_MIGRATION_INDEX.md
