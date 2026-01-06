# Backend Discovery: Admin Portal (AUDIT SCOUT 2/3)
**Scope**: Complete backend inventory for Admin Portal
**Date**: 2026-01-06
**Status**: COMPLETE

---

## Executive Summary

The Admin Portal is a **three-role GDPR-compliant management system** built on Convex with WorkOS AuthKit for authentication. Admins manage:
- **Employer Verification**: Approve/reject companies registering to book medical appointments
- **GDPR Compliance**: Track consent, audit logs, erasure requests, and SLA deadlines
- **Appointment Types**: Manage the catalog of available appointment types
- **Audit Logs**: Real-time activity tracking for all platform actions

**Key Architecture**: Role-based auth via `requireAdmin()`, all queries/mutations behind admin gate, full audit trail, 30-day SLA tracking for GDPR erasures.

---

## API Layer - Convex Functions

### ADMIN USERS (convex/adminUsers.ts)
Manages admin account lifecycle with WorkOS integration.

| Function | Type | Args | Returns | Auth | Purpose |
|----------|------|------|---------|------|---------| 
| `upsertAdminUser` | InternalMutation | `workosUserId, email, firstName?, lastName?, profilePictureUrl?` | `Id<"adminUsers">` | Internal only | HTTP callback: create/update admin on first login |
| `getByWorkosId` | InternalQuery | `workosUserId: string` | `AdminUser \| null` | Internal only | Route auth lookup (HTTP callback handler) |
| `getByWorkosUserId` | InternalQuery | `workosUserId: string` | `AdminUser \| null` | Internal only | Alternative lookup by WorkOS ID |
| `getByEmail` | InternalQuery | `email: string` | `AdminUser \| null` | Internal only | Email-based lookup (data fixes) |
| `verifyAdmin` | Query | None | `AdminUser \| null` | None | Public query: verify caller's admin status (uses identity.subject) |
| `deleteByEmail` | InternalMutation | `email: string` | `{deleted: boolean, email: string}` | Internal only | TEMPORARY: data cleanup utility |

**Key Characteristics**:
- Admin user created automatically on first login via HTTP callback
- `lastLoginAt` updated on every login for activity tracking
- Admin verification uses JWT identity (identity.subject = workosUserId)
- Non-enumerable: `verifyAdmin` only checks authenticated user's own status

**Data Structure**:
```ts
{
  workosUserId: string        // Unique: matches JWT subject
  email: string               // From WorkOS
  firstName?: string          // From WorkOS
  lastName?: string           // From WorkOS
  profilePictureUrl?: string  // From WorkOS
  lastLoginAt: number         // Updated on each login
  createdAt: number           // First login timestamp
}
```

**Indexes**:
- `by_workos_user_id` - for auth routing lookups
- `by_email` - for email-based operations

---

### EMPLOYERS ADMIN OPERATIONS (convex/employers.ts)
Employer verification workflow for company registration.

| Function | Type | Args | Returns | Auth | Purpose |
|----------|------|------|---------|------|---------| 
| `listPending` | Query | None | `Employer[]` | Admin only | Admin dashboard: employers awaiting verification |
| `listAll` | Query | None | `Employer[]` | Admin only | Admin dashboard: all employers (all statuses) |
| `verify` | Mutation | `employerId` | `void` | Admin only | Approve employer: sets status="verified", verifiedAt, verifiedBy (admin ID) |
| `reject` | Mutation | `employerId, reason: string` | `void` | Admin only | Reject employer: sets status="rejected", rejectionReason |

**Employer Verification Workflow**:
1. Employer registers → status="pending"
2. Admin views at `/admin/employers`
3. Admin clicks "Verify" → `employers.verify(employerId)`
   - Sets: status="verified", verifiedAt (timestamp), verifiedBy (admin._id)
4. OR Admin clicks "Reject" → `employers.reject(employerId, reason)`
   - Sets: status="rejected", rejectionReason

**Admin Audit Trail**:
- Both verify/reject mutations are logged by audit system
- Admin ID stored in employer.verifiedBy for history
- Frontend shows admin name who verified/rejected

**Employer Status Enum**: "pending" | "verified" | "rejected"

---

### GDPR COMPLIANCE (convex/gdpr.ts)
GDPR consent, audit logging, and erasure request management.

#### Consent Management
| Function | Type | Args | Returns | Auth | Purpose |
|----------|------|------|---------|------|---------| 
| `createConsent` | Mutation | `patientEmail, patientId?, consentType (enum), consentText, consentVersion, collectedByEmployerId` | `Id<"consents">` | Employer | Create consent record (employer-initiated during employee registration) |
| `withdrawConsent` | Mutation | `consentId` | `void` | Employer | Withdraw consent (employer can revoke at any time) |
| `getConsentsByPatient` | Query | `patientId` | `Consent[]` | Employer | Fetch all consents for employee |

**Consent Types** (must have all 3 for GDPR compliance):
- `data_processing`: Processing personal data
- `health_data`: Processing health information  
- `employer_sharing`: Sharing reports with employer

**Consent Status**: granted (boolean) + timestamps (grantedAt, withdrawnAt)

#### Audit Logging
| Function | Type | Args | Returns | Auth | Purpose |
|----------|------|------|---------|------|---------| 
| `logAction` | InternalMutation | `action, actorType (employer\|doctor\|admin\|system), actorId?, resourceType, resourceId?, details?` | `Id<"auditLogs">` | Internal | Audit log creation (called from other mutations) |
| `getAuditLogs` | Query | `limit?: number` | `AuditLog[]` | Admin only | Recent audit logs (desc by timestamp), optional limit |
| `getAuditLogsByResource` | Query | `resourceType, resourceId` | `AuditLog[]` | Admin only | All logs for specific resource (patient, appointment, report) |

**Audit Log Fields**:
```ts
{
  action: string              // "patient_created", "appointment_booked", etc.
  actorType: "employer" | "doctor" | "admin" | "system"
  actorId?: string            // workosUserId or system identifier
  resourceType: string        // "patient", "appointment", "report"
  resourceId?: string         // Document ID
  details?: any               // Extra context
  timestamp: number           // Creation time
}
```

**Admin Dashboard Usage**: Shows last 10 audit logs + 7-day summary by action

#### Erasure Request Processing (Right to be Forgotten)
| Function | Type | Args | Returns | Auth | Purpose |
|----------|------|------|---------|------|---------| 
| `requestErasure` | Mutation | `requesterEmail, reason?` | `Id<"erasureRequests">` | Public | Customer: submit right-to-be-forgotten request |
| `listErasureRequests` | Query | `status?, ...paginationOpts` | `PaginatedResult<ErasureRequest>` | Admin only | Paginated list of erasure requests (optional status filter) |
| `processErasure` | Mutation | `requestId, processedBy: string` | `void` | Admin only | Admin: execute 5-step GDPR erasure (see below) |

**Erasure Request Status Enum**: "pending" | "in_progress" | "completed" | "rejected"

**Erasure Processing (5-Step Transaction)**:
1. **Mark as in_progress** - Request status = "in_progress"
2. **Redact Appointments** - Set reasonForAppointment, preAppointmentNotes → "[REDACTED]"
3. **Redact Reports** - Set summary, restrictions, followUpNotes → "[REDACTED]"
4. **Redact Clinical Notes** - Set findings, diagnosis → "[REDACTED]"
5. **Withdraw Consents** - Set granted=false, withdrawnAt for all consents
6. **Soft Delete Patient** - Redact firstName, lastName, email, phone, dateOfBirth → "[REDACTED]", set deletedAt
7. **Mark Completed** - Request status = "completed", completedAt timestamp, processedBy

**SLA Tracking** (GDPR 30-day requirement):
- Deadline: 30 days from requestedAt
- Dashboard alerts: erasureApproachingDeadline (within 7 days), erasureOverdue (past 30 days)

#### GDPR Dashboard Stats
| Function | Type | Args | Returns | Auth | Purpose |
|----------|------|------|---------|------|---------| 
| `getGDPRStats` | Query | None | `GDPRStats` | Admin only | Dashboard: all GDPR metrics + health indicators |

**GDPRStats Return Type**:
```ts
{
  pendingErasureCount: number           // Count of status="pending" requests
  totalPatients: number                 // Active patients (deletedAt undefined)
  activeConsents: number                // Consents with granted=true
  recentAuditLogs: AuditLog[]           // Last 10 logs (desc timestamp)
  patientsWithAllConsents: number       // Count with all 3 consent types
  auditLogsByAction: {action, count}[]  // Actions in last 7 days, top N
  erasureApproachingDeadline: number    // Requests within 7 days of 30-day SLA
  erasureOverdue: number                // Requests past 30-day SLA
}
```

**Dashboard Calculations**:
- Consent coverage: `patientsWithAllConsents / totalPatients * 100`
- Risk indicator: erasureOverdue count (red flag if > 0)
- Activity trend: auditLogsByAction (top actions by frequency)

---

### APPOINTMENT TYPES ADMIN (convex/appointmentTypes.ts)
Appointment type catalog management.

| Function | Type | Args | Returns | Auth | Purpose |
|----------|------|------|---------|------|---------| 
| `listActive` | Query | None | `AppointmentType[]` | Public | Booking flow: active types only |
| `listAll` | Query | None | `AppointmentType[]` | Admin only | Admin dashboard: all types (active + inactive) |
| `getById` | Query | `typeId` | `AppointmentType \| null` | Public | Fetch by ID |
| `create` | Mutation | `name, description, durationMinutes, price` | `Id<"appointmentTypes">` | Admin | Create new appointment type (isActive=true by default) |
| `update` | Mutation | `typeId, name?, description?, durationMinutes?, price?, isActive?` | `void` | Admin | Update type (can deactivate) |

**Appointment Type Fields**:
```ts
{
  name: string                // e.g., "Initial Assessment"
  description: string         // "Full health assessment..."
  durationMinutes: number     // e.g., 60
  price: number               // Cost in pence/cents
  isActive: boolean           // Enable/disable for booking
}
```

**Admin Use Case**: Create/manage appointment types available in the booking flow
- Deactivate old types without deleting history
- Update prices and durations
- View all types (active + inactive)

---

## Authorization Model

### Three-Role Admin Authorization
All admin functions use `requireAdmin(ctx)` helper:

```ts
export async function requireAdmin(ctx: AuthContext): Promise<Doc<"adminUsers">> {
  const user = await getAuthenticatedUser(ctx);
  if (!user) {
    throw new ConvexError({ code: "UNAUTHENTICATED", message: "Authentication required" });
  }
  
  const admin = await ctx.db
    .query("adminUsers")
    .withIndex("by_workos_user_id", (q) => q.eq("workosUserId", user.workosUserId))
    .first();
  
  if (!admin) {
    throw new ConvexError({ code: "ADMIN_NOT_FOUND", message: "Admin access required" });
  }
  
  return admin;
}
```

**Key Points**:
- Admin status determined by presence of record in adminUsers table
- No role field: admins determined by table membership
- Automatic upsert on first login via HTTP callback
- Non-enumerable: verifyAdmin only checks authenticated user
- Throws if not authenticated or not admin

---

## Database Schema (Admin-Relevant Tables)

### adminUsers
```ts
{
  workosUserId: string        // Unique: matches JWT subject
  email: string               // From WorkOS
  firstName?: string          // From WorkOS
  lastName?: string           // From WorkOS
  profilePictureUrl?: string  // From WorkOS
  lastLoginAt: number         // Updated on each login
  createdAt: number           // First login
}

Indexes:
- by_workos_user_id: Fast auth lookup
- by_email: Email-based queries
```

### auditLogs
```ts
{
  action: string              // "patient_created", "appointment_booked", etc.
  actorType: "employer" | "doctor" | "admin" | "system"
  actorId?: string            // workosUserId
  resourceType: string        // "patient", "appointment", "report"
  resourceId?: string         // Document ID
  details?: any               // Extra context
  timestamp: number           // Creation time
}

Indexes:
- by_action: Filter by action type
- by_timestamp: Sort recent (desc for dashboard)
- by_resource: Find all logs for specific resource (patient, appointment)
```

### erasureRequests
```ts
{
  requesterEmail: string                    // Customer email
  patientId?: Id<"patients">                // Linked after match
  status: "pending" | "in_progress" | "completed" | "rejected"
  reason?: string                           // Why customer requested
  requestedAt: number                       // Timestamp
  completedAt?: number                      // When admin processed
  processedBy?: string                      // Admin email or ID
}

Indexes:
- by_status: Filter pending/completed
- by_email: Find requests by customer email
```

### employers (admin-relevant fields)
```ts
{
  // ... (other fields)
  status: "pending" | "verified" | "rejected"
  verifiedAt?: number                       // When approved
  verifiedBy?: Id<"adminUsers">             // Admin who approved
  rejectionReason?: string                  // If rejected
}

Indexes:
- by_status: List pending for admin dashboard
```

---

## HTTP Authentication Flow (Admin Portal)

### 1. Login Initiation (`/auth/login`)
```
User clicks "Provider Login" → 
  GET /auth/login (generates CSRF state) →
  Redirects to WorkOS AuthKit URL (with state parameter)
```

**Backend Logic**:
1. Generate random UUID for state
2. Store state in oauthStates table (5-min TTL)
3. Construct WorkOS authorization URL with state
4. Return 302 redirect to WorkOS

### 2. WorkOS Authentication
```
WorkOS AuthKit login/MFA → 
  Success → Redirects to /auth/callback?code=...&state=...
```

### 3. Callback Processing (`/auth/callback`)
```
GET /auth/callback?code=...&state=... →
  1. Validate state (CSRF protection)
  2. Exchange code for tokens (WorkOS SDK)
  3. Check role: employer? doctor? admin? new user?
  4. If admin: upsert adminUsers record
  5. Redirect to frontend with tokens in URL params
```

**Backend Logic** (http.ts):
```ts
// Validate CSRF state
const storedState = await ctx.runQuery(internal.oauthState.validate, { state });
if (!storedState) throw error; // Replay attack prevention

// Exchange code for user info + tokens
const { user, accessToken, refreshToken } = 
  await workos.userManagement.authenticateWithCode({ code, clientId });

// Parallel check: is this user an admin?
const adminUser = await ctx.runQuery(
  internal.adminUsers.getByWorkosId, 
  { workosUserId: user.id }
);

// If admin: upsert to update lastLoginAt
if (adminUser) {
  await ctx.runMutation(internal.adminUsers.upsertAdminUser, {
    workosUserId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    profilePictureUrl: user.profilePictureUrl,
  });
}

// Redirect path based on role
let redirectPath = "/register/choose-role";
if (adminUser) redirectPath = "/admin";  // Admin portal

// Return tokens in URL params
const callbackUrl = new URL(`${appUrl}/auth/callback`);
callbackUrl.searchParams.set("accessToken", accessToken);
callbackUrl.searchParams.set("refreshToken", refreshToken);
callbackUrl.searchParams.set("userId", user.id);
callbackUrl.searchParams.set("redirectPath", "/admin");
return Response.redirect(callbackUrl.toString(), 302);
```

### 4. Frontend Token Processing
Frontend reads tokens from URL params and stores in context/localStorage

### 5. Token Refresh (`/auth/refresh`)
```
POST /auth/refresh
{
  "refreshToken": "..."
}

Response:
{
  "accessToken": "...",
  "refreshToken": "..."
}
```

---

## Admin Portal Pages & Data Flow

### Dashboard (`/admin`)
**Component**: AdminDashboardContent
**Queries Called**:
1. `employers.listPending()` - Pending verification count
2. `gdpr.getGDPRStats()` - GDPR health metrics

**Displayed Metrics**:
- Employers awaiting verification
- Pending erasure requests
- Total active patients
- Consent compliance rate
- Overdue erasure requests (risk indicator)
- Recent audit activity

**Cards/Links**:
- Employer Verification → `/admin/employers`
- GDPR Compliance → `/admin/gdpr`
- Audit Logs → `/admin/gdpr/audit`
- Erasure Requests → `/admin/gdpr/erasure`
- Appointment Types → `/admin/appointment-types`

### Employer Verification (`/admin/employers`)
**Component**: EmployerVerification
**Queries Called**:
1. `employers.listPending()` - List of pending employers

**Mutations**:
- `employers.verify(employerId)` - Approve employer
- `employers.reject(employerId, reason)` - Reject employer

**UI Elements**:
- Employer list (card per employer)
- Company name, registration number, contact info
- Status badge: "Pending Verification"
- Action buttons: "Verify" (green), "Reject" (red)
- Reason field for rejections
- Optional: pagination if many pending

**Real-time**: Changes immediately via Convex subscription

### GDPR Dashboard (`/admin/gdpr`)
**Component**: GDPRDashboard
**Queries Called**:
1. `gdpr.getGDPRStats()` - All dashboard metrics

**Displayed Metrics** (from GDPRStats):
- Pending erasure requests (count + list)
- Total active patients
- Consent compliance (% with all 3 types)
- Recent audit logs (last 10)
- Top actions in last 7 days (bar chart)
- Erasure SLA status:
  - Overdue (red alert)
  - Approaching deadline (yellow alert)

**Links**:
- "View Erasure Requests" → `/admin/gdpr/erasure`
- "View Audit Logs" → `/admin/gdpr/audit`

### Audit Logs (`/admin/gdpr/audit`)
**Component**: AuditLogs
**Queries Called**:
1. `gdpr.getAuditLogs(limit)` - Recent logs (optional limit)

**Displayed Columns**:
- Timestamp (most recent first)
- Action (e.g., "patient_created")
- Actor Type (employer, doctor, admin, system)
- Actor ID (workosUserId or system)
- Resource Type (patient, appointment, report)
- Resource ID (document ID)
- Details (JSON view, collapsible)

**Features**:
- Pagination (if many logs)
- Filter by action/resource (optional)
- Export to CSV (future)
- 7-day retention visible on dashboard

### Erasure Requests (`/admin/gdpr/erasure`)
**Component**: ErasureRequests
**Queries Called**:
1. `gdpr.listErasureRequests(status?, paginationOpts)` - Paginated list

**Mutations**:
- `gdpr.processErasure(requestId, processedBy)` - Execute erasure

**Displayed Columns**:
- Requester email
- Status (pending, in_progress, completed)
- Requested date
- Deadline (30 days from request)
- Days remaining (green if > 7, yellow if < 7, red if < 0)

**UI Features**:
- Filter by status (All, Pending, Completed)
- Action buttons on pending: "Process Erasure" (triggers modal)
- Modal confirmation: "This will redact all patient data. Confirm?"
- After processing: moves to "Completed" section

**SLA Tracking**:
- Dashboard highlights overdue requests (red)
- Audit log entry on completion

### Appointment Types (`/admin/appointment-types`)
**Component**: AppointmentTypes (frontend)
**Queries Called**:
1. `appointmentTypes.listAll()` - All types (active + inactive)

**Mutations**:
- `appointmentTypes.create(name, description, durationMinutes, price)` - Add type
- `appointmentTypes.update(typeId, ...)` - Edit type

**Displayed Columns**:
- Name
- Description
- Duration (minutes)
- Price
- Status (Active / Inactive)

**Actions**:
- "Add Type" button → modal form
- "Edit" per row → update modal
- Toggle "Active" status per row

---

## Real-Time Subscriptions

All Convex queries automatically subscribe:
- `employers.listPending()` - Updates when employer status changes
- `gdpr.getGDPRStats()` - Updates when erasure requests change
- `gdpr.getAuditLogs()` - Updates when actions logged
- `gdpr.listErasureRequests()` - Updates when requests created/processed
- `appointmentTypes.listAll()` - Updates when types created/modified

**No manual refresh needed**: UI auto-updates via real-time subscriptions

---

## Authorization Error Codes

| Code | HTTP | Scenario | Message |
|------|------|----------|---------|
| `UNAUTHENTICATED` | 401 | Not logged in | "Authentication required" |
| `ADMIN_NOT_FOUND` | 403 | Logged in but not admin | "Admin access required" |
| `UNAUTHORIZED` | 403 | Owner mismatch (employer resources) | "You do not have access..." |
| `NOT_FOUND` | 404 | Resource doesn't exist | "Not found" |

---

## Performance Characteristics

### Query Optimization
- **Admin queries**: Indexed lookups (by_status, by_timestamp, by_workos_user_id)
- **No N+1**: List queries return direct documents
- **Pagination**: Cursor-based for erasure requests (if many)
- **Audit logs**: 10-log limit on dashboard (avoid huge result sets)

### Mutation Characteristics
- **Transactional**: Verify/reject/process are atomic
- **Audit logged**: Every mutation creates audit log entry
- **Real-time**: Subscriptions notify immediately

### Erasure Processing
- **5-step transaction**: All queries (appointments, reports, notes, consents) + soft delete
- **Scalability**: Works efficiently up to ~1000 records per patient
- **Audit trail**: processErasure logged with admin ID

---

## Security & GDPR Compliance

### 1. Authentication (WorkOS AuthKit)
- Industry-standard OAuth 2.0 flow
- CSRF protection: state parameter (SEC-002)
- Tokens stored in URL params (short-lived, processed immediately)
- Refresh token support for long sessions

### 2. Authorization
- Role-based: adminUsers table determines access
- Non-enumerable: verifyAdmin checks authenticated user only
- All admin mutations require `requireAdmin()` check
- Audit logged for all sensitive operations

### 3. GDPR Compliance
- **Consent tracking**: 3-type consent system
- **Audit logging**: All actions logged with actor + timestamp
- **Right to erasure**: 5-step redaction process
- **SLA tracking**: 30-day deadline with alerts
- **Data retention**: Soft deletion maintains referential integrity

### 4. Data Protection
- Sensitive fields redacted on erasure: PII + clinical notes
- No automatic deletion (manual admin approval required)
- Audit trail preserved after redaction
- lastLoginAt tracking for security monitoring

---

## Integration Points

### Frontend (React)
```ts
// Admin auth check
const admin = useQuery(api.adminUsers.verifyAdmin);
if (!admin) return <Navigate to="/" />;

// List pending employers
const pendingEmployers = useQuery(api.employers.listPending);

// Get GDPR stats
const stats = useQuery(api.gdpr.getGDPRStats);

// Verify employer
const verifyEmployer = useMutation(api.employers.verify);
const handleVerify = async (employerId) => {
  await verifyEmployer({ employerId });
};

// Process erasure
const processErasure = useMutation(api.gdpr.processErasure);
const handleErase = async (requestId) => {
  await processErasure({ 
    requestId, 
    processedBy: admin.email 
  });
};
```

### HTTP Endpoints (convex/http.ts)
- `/auth/login` → Redirects to WorkOS AuthKit
- `/auth/callback` → Handles OAuth callback, creates admin session
- `/auth/logout` → Logs out of WorkOS session
- `/auth/refresh` → Refresh access token (POST with refreshToken)
- `/health` → Service health check

---

## Known Issues & Gaps

1. **No admin invitation flow**: Admins must be created manually in database
2. **No admin role hierarchy**: All admins have equal permissions
3. **No admin audit actions**: Admin operations not always logged with admin context
4. **Deletion is permanent**: `deleteByEmail` irreversible (temp utility only)
5. **No encryption**: Admin PII stored plaintext (should use Convex encryption in production)
6. **No IP whitelisting**: No backend enforcement of trusted IPs for admin access
7. **Consent withdrawal audit**: Not explicitly logged when employer withdraws consent

---

## Data Flow Summary: Admin Portal

```
┌──────────────────────────────┐
│  Admin WorkOS Login          │
│  (OAuth 2.0 + CSRF)          │
└─────────────┬────────────────┘
              │
              ▼
┌──────────────────────────────┐
│  /auth/callback              │
│  - Exchange code for tokens  │
│  - Check if admin            │
│  - Upsert adminUsers         │
│  - Redirect to /admin        │
└─────────────┬────────────────┘
              │
              ▼
┌──────────────────────────────┐
│  /admin (Dashboard)          │
│  Queries:                    │
│  - listPending employers     │
│  - getGDPRStats              │
└─────────────┬────────────────┘
              │
        ┌─────┴─────┬─────────────┬──────────────┐
        │           │             │              │
        ▼           ▼             ▼              ▼
   ┌─────────┐ ┌────────┐ ┌──────────┐ ┌──────────────┐
   │Employers│ │  GDPR  │ │ Audit    │ │ Appt Types   │
   │ Verify/ │ │Erasure │ │Logs      │ │Create/Update │
   │ Reject  │ │Process │ │View      │ │              │
   └─────────┘ └────────┘ └──────────┘ └──────────────┘
        │           │             │              │
        └─────┬─────┴─────────────┴──────────────┘
              │
              ▼
   ┌──────────────────────────────────┐
   │  Convex Functions (API Layer)    │
   │  - employers.verify/reject       │
   │  - gdpr.processErasure           │
   │  - gdpr.getAuditLogs             │
   │  - appointmentTypes.create/update│
   └─────────────┬────────────────────┘
                 │
                 ▼
   ┌──────────────────────────────────┐
   │  Database (Convex Cloud)         │
   │  - adminUsers (auth)             │
   │  - employers (verification)      │
   │  - auditLogs (compliance)        │
   │  - erasureRequests (GDPR)        │
   │  - appointmentTypes (catalog)    │
   └──────────────────────────────────┘
```

---

## Summary: Admin Portal API Inventory

### Public/Unauthenticated
- None (all endpoints require authentication)

### Admin-Only Endpoints (requireAdmin guard)
- **Verification**: `employers.listPending()`, `employers.listAll()`, `employers.verify()`, `employers.reject()`
- **GDPR**: `gdpr.getGDPRStats()`, `gdpr.getAuditLogs()`, `gdpr.getAuditLogsByResource()`, `gdpr.listErasureRequests()`, `gdpr.processErasure()`
- **Appointment Types**: `appointmentTypes.listAll()`, `appointmentTypes.create()`, `appointmentTypes.update()`
- **Admin Auth**: `adminUsers.verifyAdmin()` (checks caller)

### Internal-Only (HTTP callback, data operations)
- `adminUsers.upsertAdminUser()`, `adminUsers.getByWorkosId()`, `adminUsers.getByWorkosUserId()`, `adminUsers.getByEmail()`, `adminUsers.deleteByEmail()`
- `employers.getByWorkosId()`, `employers.linkWorkosUser()`
- `oauthState.create()`, `oauthState.validate()`, `oauthState.deleteState()`

### Employer & Doctor Accessible
- `gdpr.requestErasure()` (public erasure request)
- `gdpr.createConsent()`, `gdpr.withdrawConsent()`, `gdpr.getConsentsByPatient()` (employer-gated)

---

## Integration Checklist

- [x] Admin authentication via WorkOS AuthKit (HTTP callback)
- [x] Admin user table with WorkOS ID mapping
- [x] Employer verification workflow (pending → verified/rejected)
- [x] GDPR dashboard with compliance metrics
- [x] Audit logging for all sensitive operations
- [x] Erasure request processing with SLA tracking
- [x] Appointment type management
- [x] Role-based authorization (requireAdmin guard)
- [x] Real-time subscriptions for all queries
- [x] Error handling with auth codes
- [x] CSRF protection in OAuth flow

---

**End of Admin Portal Backend Discovery Report**
