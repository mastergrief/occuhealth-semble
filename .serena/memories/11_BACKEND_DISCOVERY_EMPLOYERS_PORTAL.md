# Backend Discovery: Employers Portal
**Scope**: Complete backend inventory for Employers Portal (AUDIT SCOUT 2/3)
**Date**: 2026-01-05
**Status**: COMPLETE

---

## API Layer - Convex Functions

### EMPLOYERS (convex/employers.ts)
Manages employer/insurer account lifecycle with verification workflow.

| Function | Type | Args | Returns | Auth | Purpose |
|----------|------|------|---------|------|---------|
| `getByWorkosId` | InternalQuery | `workosUserId: string` | `Employer \| null` | Internal only | Route auth lookup (HTTP callback handler) |
| `getByWorkosIdPublic` | Query | `workosUserId: string` | `Employer \| null` | None | Public employer lookup by WorkOS ID |
| `getById` | Query | `employerId: Id<"employers">` | `Employer \| null` | None | Public lookup by ID |
| `create` | Mutation | `workosUserId, email, companyType ("employer"\|"insurer"), companyName, companyRegistrationNumber?, contactName, contactPhone?, addressLine1, addressLine2?, city, postcode` | `Id<"employers">` | None | Registration flow creates new employer |
| `update` | Mutation | `employerId, companyName?, contactName?, contactPhone?, addressLine1?, addressLine2?, city?, postcode?` | `void` | Requires employer ownership | Employer can update profile |
| `listPending` | Query | None | `Employer[]` | Admin only | Admin: list employers awaiting verification |
| `listAll` | Query | None | `Employer[]` | Admin only | Admin: list all employers |
| `verify` | Mutation | `employerId` | `void` | Admin only | Admin: approve employer (sets status="verified", verifiedAt, verifiedBy) |
| `reject` | Mutation | `employerId, reason: string` | `void` | Admin only | Admin: reject employer (sets status="rejected", rejectionReason) |
| `linkWorkosUser` | InternalMutation | `email: string, workosUserId: string` | `{updated: boolean, email: string}` | Internal only | Fix workosUserId link for existing employers |

**Key Fields**:
- `status`: "pending" \| "verified" \| "rejected"
- `workosUserId`: Matches JWT subject for ownership
- `companyType`: Distinguishes employer from insurer

**Authorization Pattern**:
- All employer mutations/queries (except create) call `requireEmployerOwnership(ctx, employerId)`
- Checks: `employer.workosUserId === authenticatedUser.workosUserId`

---

### PATIENTS (convex/patients.ts)
Employee management with consent tracking and GDPR soft deletion.

| Function | Type | Args | Returns | Auth | Purpose |
|----------|------|------|---------|------|---------|
| `list` | Query | `employerId, ...paginatedQueryArgs` | `PaginatedResult<Patient>` | Requires employer ownership | Paginated list of employer's employees (excludes soft-deleted) |
| `getById` | Query | `patientId` | `Patient \| null` | Requires employer ownership | Fetch single employee |
| `getByEmail` | Query | `email: string` | `Patient \| null` | Authenticated user + employer ownership | Lookup by email |
| `create` | Mutation | `employerId, firstName, lastName, email, phone?, dateOfBirth, jobTitle?, department?, employeeReference?, consentId` | `Id<"patients">` | Requires employer ownership | Add employee with initial consent |
| `update` | Mutation | `patientId, firstName?, lastName?, phone?, jobTitle?, department?, employeeReference?` | `void` | Requires employer ownership | Update employee details |
| `softDelete` | Mutation | `patientId` | `void` | Requires employer ownership | GDPR erasure: redact PII + set deletedAt timestamp |

**Pagination**:
- Standard Convex pagination with `paginationOpts` validator
- Returns: `{items: Patient[], cursor: string | null, hasMore: boolean}`

**GDPR Compliance**:
- Soft deletion redacts: firstName, lastName, email, phone, dateOfBirth
- Queries filter `deletedAt === undefined`
- Audit logged via `logPatientAction()`

---

### APPOINTMENTS (convex/appointments.ts)
Booking and scheduling with slot validation and audit logging.

| Function | Type | Args | Returns | Auth | Purpose |
|----------|------|------|---------|------|---------|
| `getById` | Query | `appointmentId` | `Appointment + {patient, employer, appointmentType}` | Requires employer ownership | Fetch with enriched relations |
| `listByEmployer` | Query | `employerId, ...paginatedQueryArgs` | `PaginatedResult<Appointment + {patient}>` | Requires employer ownership | Paginated list of employer's bookings (batch-fetches patients, filters soft-deleted) |
| `listByDate` | Query | `date: "YYYY-MM-DD", ...paginatedQueryArgs` | `PaginatedResult<Appointment + {patient, employer, appointmentType}>` | Doctor only | Doctor: appointments by date with all relations enriched |
| `getTodaysAppointments` | Query | None | `Appointment[]` | Doctor only | Doctor: today's schedule (no pagination) |
| `book` | Mutation | `patientId, employerId, appointmentTypeId, slotId, reasonForAppointment?, preAppointmentNotes?` | `Id<"appointments">` | Requires employer ownership | Employer: book appointment, validates slot is available, verifies patient ownership, marks slot as booked, logs audit |
| `cancel` | Mutation | `appointmentId` | `void` | Requires employer ownership | Employer: cancel booking, frees slot to "available" |
| `markCompleted` | Mutation | `appointmentId` | `void` | Doctor only | Doctor: mark appointment as completed after consultation |
| `updateStatus` | Mutation | `appointmentId, status: "scheduled"\|"confirmed"\|"completed"\|"cancelled"\|"no_show"` | `void` | Requires employer ownership | Employer: update appointment status |

**Data Enrichment** (N+1 optimization):
- Uses batch fetching: `extractUniqueIds()`, `batchGet()`, `enrichWithRelation()`
- `listByEmployer` fetches all patient IDs in 1 query, then enriches (2 queries total)
- `listByDate` batches all 3 relations (patients, employers, types) in parallel (4 queries total)

**Booking Validation**:
1. Slot must exist and status === "available"
2. Patient must belong to employer
3. Appointment created with status="scheduled"
4. Slot updated: status="booked", appointmentId set

**Audit Logging**:
- All mutations call `logAppointmentAction()` → `internal.gdpr.logAction`

---

### REPORTS (convex/reports.ts)
Medical fit-for-work reports with employer delivery tracking.

| Function | Type | Args | Returns | Auth | Purpose |
|----------|------|------|---------|------|---------|
| `getById` | Query | `reportId` | `Report \| null` | Requires employer ownership | Fetch single report |
| `getByAppointment` | Query | `appointmentId` | `Report \| null` | Doctor OR employer ownership | Fetch report by appointment (doctors see any, employers see own) |
| `listByEmployer` | Query | `employerId, ...paginatedQueryArgs` | `PaginatedResult<Report + {patient}>` | Requires employer ownership | Paginated reports for employer, filters soft-deleted patients |
| `create` | Mutation | `appointmentId, fitForWork ("fit"\|"fit_with_restrictions"\|"temporarily_unfit"\|"needs_further_assessment"), summary, restrictions?, followUpRequired, followUpNotes?` | `Id<"reports">` | Doctor only | Create medical report, links to appointment, logs audit |
| `sendToEmployer` | Mutation | `reportId` | `void` | Doctor only | Mark report as sent (sets sentToEmployerAt timestamp) |
| `markViewed` | Mutation | `reportId` | `void` | Requires employer ownership | Employer: mark report as received (sets viewedByEmployerAt) |

**Report Lifecycle**:
1. Doctor creates report after appointment
2. Report linked to appointment via `reportId`
3. Doctor sends to employer (sends email notification via external service - not in convex)
4. Employer views report (markViewed sets timestamp for audit)

**GDPR Compliance**:
- Reports for soft-deleted patients filtered in `listByEmployer`

---

### AVAILABLE SLOTS (convex/availableSlots.ts)
Doctor schedule management for booking availability.

| Function | Type | Args | Returns | Auth | Purpose |
|----------|------|------|---------|------|---------|
| `getByDateRange` | Query | `startDate, endDate: "YYYY-MM-DD"` | `AvailableSlot[]` | Public | Calendar view: slots within date range |
| `getAvailable` | Query | `date: "YYYY-MM-DD"` | `AvailableSlot[]` | Public | Booking flow: available slots for date |
| `getByMonth` | Query | `yearMonth: "YYYY-MM"` | `AvailableSlot[]` | Public | Calendar month view |
| `createSlots` | Mutation | `slots: {date, startTime, endTime}[]` | `Id<"availableSlots">[]` | Doctor only | Doctor: add multiple slots to schedule |
| `blockSlot` | Mutation | `slotId` | `void` | Doctor only (must own slot) | Block slot (vacation, admin time) |
| `unblockSlot` | Mutation | `slotId` | `void` | Doctor only (must own slot) | Unblock previously blocked slot |

**Slot Status**: "available" \| "booked" \| "blocked"

**Doctor Ownership Check**:
- `blockSlot` and `unblockSlot` verify `slot.doctorId === doctor._id`

---

### APPOINTMENT TYPES (convex/appointmentTypes.ts)
Catalog of appointment type definitions.

| Function | Type | Args | Returns | Auth | Purpose |
|----------|------|------|---------|------|---------|
| `listActive` | Query | None | `AppointmentType[]` | Public | Booking flow: active appointment types |
| `listAll` | Query | None | `AppointmentType[]` | Public | Admin: all types (active + inactive) |
| `getById` | Query | `typeId` | `AppointmentType \| null` | Public | Fetch by ID |
| `create` | Mutation | `name, description, durationMinutes, price` | `Id<"appointmentTypes">` | Admin (not enforced) | Create appointment type |
| `update` | Mutation | `typeId, name?, description?, durationMinutes?, price?, isActive?` | `void` | Admin (not enforced) | Update type |

**Note**: Admin auth not enforced on create/update (potential security gap)

---

### GDPR (convex/gdpr.ts)
Consent management, audit logging, and erasure request processing.

| Function | Type | Args | Returns | Auth | Purpose |
|----------|------|------|---------|------|---------|
| `logAction` | InternalMutation | `action, actorType ("employer"\|"doctor"\|"admin"\|"system"), actorId?, resourceType, resourceId?, details?` | `Id<"auditLogs">` | Internal only | Audit log entry creation (called by audit helpers) |
| `createConsent` | Mutation | `patientEmail, patientId?, consentType ("data_processing"\|"health_data"\|"employer_sharing"), consentText, consentVersion, collectedByEmployerId` | `Id<"consents">` | Requires employer ownership | Create consent record for employee (granted=true by default) |
| `withdrawConsent` | Mutation | `consentId` | `void` | Requires employer ownership | Withdraw consent |
| `getConsentsByPatient` | Query | `patientId` | `Consent[]` | Requires employer ownership | Fetch all consents for patient |
| `requestErasure` | Mutation | `requesterEmail, reason?` | `Id<"erasureRequests">` | Public | Customer: request right to be forgotten |
| `listErasureRequests` | Query | `status?, ...paginatedQueryArgs` | `PaginatedResult<ErasureRequest>` | Admin only | Paginated list of erasure requests (optional status filter) |
| `processErasure` | Mutation | `requestId, processedBy: string` | `void` | Admin only | Admin: process erasure (5-step redaction) |
| `getAuditLogs` | Query | `limit?` | `AuditLog[]` | Admin only | Recent audit logs (desc by timestamp) |
| `getAuditLogsByResource` | Query | `resourceType, resourceId` | `AuditLog[]` | Admin only | Audit logs for specific resource |
| `getGDPRStats` | Query | None | `GDPRStats` | Admin only | GDPR dashboard: stats + metrics |

**Consent Types**: 
- `data_processing`: Processing personal data
- `health_data`: Processing health information
- `employer_sharing`: Sharing reports with employer

**Erasure Processing** (5-step):
1. Mark request "in_progress"
2. Redact appointments (reasonForAppointment, preAppointmentNotes → "[REDACTED]")
3. Redact reports (summary, restrictions, followUpNotes → "[REDACTED]")
4. Redact clinical notes (findings, diagnosis → "[REDACTED]")
5. Withdraw all consents + soft delete patient
6. Mark request "completed"

**GDPR Stats** (`GDPRStats` type):
- `pendingErasureCount`: Erasure requests with status="pending"
- `totalPatients`: Active patients (deletedAt is undefined)
- `activeConsents`: Consents with granted=true
- `recentAuditLogs`: Last 10 audit logs (desc)
- `patientsWithAllConsents`: Count with all 3 consent types
- `auditLogsByAction`: Last 7 days actions + counts
- `erasureApproachingDeadline`: Requests within 7 days of 30-day SLA
- `erasureOverdue`: Requests past 30-day SLA

---

## Database Schema (Employer-Relevant Tables)

### employers
```
{
  workosUserId: string          // Unique: matches JWT subject
  email: string                 // Unique: invitation email
  companyType: "employer" | "insurer"
  companyName: string
  companyRegistrationNumber?: string
  contactName: string
  contactPhone?: string
  addressLine1: string
  addressLine2?: string
  city: string
  postcode: string
  status: "pending" | "verified" | "rejected"
  verifiedAt?: number           // Timestamp when approved
  verifiedBy?: Id<"adminUsers"> // Admin who approved
  rejectionReason?: string      // Reason for rejection
  createdAt: number
  updatedAt: number
}
```

**Indexes**:
- `by_workos_user` - for auth routing
- `by_status` - for admin queries
- `by_email` - for lookup

### patients
```
{
  employerId: Id<"employers">   // Foreign key
  firstName: string
  lastName: string
  email: string                 // Non-unique (soft-deleted may leave duplicates)
  phone?: string
  dateOfBirth: string           // Format: YYYY-MM-DD
  jobTitle?: string
  department?: string
  employeeReference?: string    // Employer's internal ID
  consentId: Id<"consents">     // Required: initial consent
  createdAt: number
  deletedAt?: number            // GDPR soft delete
}
```

**Indexes**:
- `by_employer` - list employees
- `by_email` - lookup by email
- `by_deleted` - filter deleted records

**GDPR Soft Delete Fields**:
- firstName, lastName, email, phone, dateOfBirth all set to "[REDACTED]"
- deletedAt timestamp added

### appointments
```
{
  patientId: Id<"patients">
  employerId: Id<"employers">
  appointmentTypeId: Id<"appointmentTypes">
  slotId: Id<"availableSlots">
  scheduledDate: string         // YYYY-MM-DD
  scheduledTime: string         // HH:MM
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show"
  reasonForAppointment?: string
  preAppointmentNotes?: string
  reportId?: Id<"reports">      // Linked when report created
  createdAt: number
  completedAt?: number
  cancelledAt?: number
}
```

**Indexes**:
- `by_employer` - list employer's bookings
- `by_patient` - list patient's appointments
- `by_date` - filter by date
- `by_status` - filter by status

### reports
```
{
  appointmentId: Id<"appointments">  // Required: link to appointment
  patientId: Id<"patients">
  employerId: Id<"employers">
  fitForWork: "fit" | "fit_with_restrictions" | "temporarily_unfit" | "needs_further_assessment"
  summary: string                // Clinical summary
  restrictions?: string[]        // Workplace restrictions
  followUpRequired: boolean
  followUpNotes?: string
  signedAt: number              // When doctor signed
  sentToEmployerAt?: number     // When doctor sent to employer
  viewedByEmployerAt?: number   // When employer opened
}
```

**Indexes**:
- `by_employer` - list employer's reports
- `by_appointment` - fetch by appointment
- `by_patient` - fetch by patient

### availableSlots
```
{
  doctorId: Id<"doctorSettings">
  date: string                  // YYYY-MM-DD
  startTime: string             // HH:MM
  endTime: string               // HH:MM
  status: "available" | "booked" | "blocked"
  appointmentId?: Id<"appointments">  // Set when booked
}
```

**Indexes**:
- `by_date` - range queries for calendar
- `by_status` - filter available slots
- `by_date_status` - available slots for date
- `by_doctor` - doctor's slots
- `by_doctor_date` - doctor's slots for date

### consents
```
{
  patientEmail: string
  patientId?: Id<"patients">
  consentType: "data_processing" | "health_data" | "employer_sharing"
  granted: boolean
  grantedAt: number
  withdrawnAt?: number
  consentText: string
  consentVersion: string
  collectedByEmployerId: Id<"employers">
}
```

**Indexes**:
- `by_patient` - consents for patient
- `by_email` - consents by email
- `by_type` - filter by type

### auditLogs
```
{
  action: string                // "patient_created", "appointment_booked", etc.
  actorType: "employer" | "doctor" | "admin" | "system"
  actorId?: string              // workosUserId or system identifier
  resourceType: string          // "patient", "appointment", "report"
  resourceId?: string           // Document ID
  details?: any                 // Extra context
  timestamp: number
}
```

**Indexes**:
- `by_action` - filter by action
- `by_timestamp` - sort recent
- `by_resource` - filter by resource

### appointmentTypes
```
{
  name: string
  description: string
  durationMinutes: number
  price: number
  isActive: boolean
}
```

**Indexes**:
- `by_active` - filter active types

---

## Authorization Model

### Three Role-Based Auth Systems

#### 1. Employer (requireEmployerOwnership)
**Check**: Authenticated user's `workosUserId` matches `employer.workosUserId`
**Used by**:
- All patient operations (list, get, create, update, softDelete)
- All appointment operations (listByEmployer, book, cancel, updateStatus)
- All report operations (getById, listByEmployer, markViewed)
- Consent operations (createConsent, withdrawConsent, getConsentsByPatient)

**Flow**:
1. Extract user identity: `const user = await getAuthenticatedUser(ctx)`
2. Fetch employer: `const employer = await ctx.db.get(employerId)`
3. Compare: `employer.workosUserId === user.workosUserId`
4. Throw if mismatch: `UNAUTHORIZED: "You do not have access to this employer's data"`

#### 2. Doctor (requireDoctorAccess)
**Check**: Authenticated user has doctorSettings record with matching workosUserId
**Used by**:
- Appointment operations (listByDate, getTodaysAppointments, markCompleted)
- Report operations (create, sendToEmployer)
- Available slot operations (createSlots, blockSlot, unblockSlot)

**Flow**:
1. Extract user identity
2. Query doctorSettings by workosUserId
3. Throw if not found: `DOCTOR_NOT_FOUND: "Doctor access required"`

#### 3. Admin (requireAdmin)
**Check**: Authenticated user has adminUsers record with matching workosUserId
**Used by**:
- Employer operations (listPending, listAll, verify, reject)
- GDPR operations (listErasureRequests, processErasure, getAuditLogs, getGDPRStats)

**Flow**:
1. Extract user identity
2. Query adminUsers by workosUserId
3. Throw if not found: `ADMIN_NOT_FOUND: "Admin access required"`

### Verification Status Checks
**Employers have status field**: "pending" | "verified" | "rejected"
- Frontend shows warning banner if status !== "verified"
- Booking disabled for pending employers (UX-enforced, not backend)
- Backend does NOT block booking for pending status (potential security gap)

---

## Data Flow: Employer Portal Pages

### Dashboard Page
**Queries Called**:
1. `appointments.listByEmployer(employerId)` - recent bookings
2. `patients.list(employerId)` - employee count
3. `reports.listByEmployer(employerId)` - recent reports

**Expected Response**: Dashboard cards with counts, recent items

### Employees Page
**Queries Called**:
1. `patients.list(employerId, paginationOpts)` - paginated list

**Mutations**:
- `patients.create(...)` - add employee
- `patients.update(...)` - edit details
- `patients.softDelete(patientId)` - GDPR erasure

**Pagination**: 
- Initial: `{paginationOpts: {numItems: 50, cursor: null}}`
- Next: `{paginationOpts: {numItems: 50, cursor: "..."}}`

### Bookings Page (Multi-Step Modal)
**Step 1: Select Employee & Type**
- Query: `appointmentTypes.listActive()` - dropdown options
- Query: `patients.list(employerId)` - employee dropdown

**Step 2: Select Date & Time**
- Query: `availableSlots.getAvailable(date)` - time slots for selected date
- Called when date changes (triggers reload)

**Step 3: Confirm & Book**
- Mutation: `appointments.book(patientId, employerId, appointmentTypeId, slotId, reason?, notes?)`
- Returns: `appointmentId`
- Real-time update: Bookings page refreshes via subscription

**Booking Constraints**:
- Slot must be available (status="available")
- Patient must belong to employer
- Form validates: employee, type, date, slot, reason

### Reports Page
**Queries Called**:
1. `reports.listByEmployer(employerId, paginationOpts)` - paginated list

**Mutations**:
- `reports.markViewed(reportId)` - mark as read

**Report Card Display**:
- Status indicators: "Pending" (created but not sent), "Sent", "Viewed"
- Fit-for-work status: "Fit", "Fit with Restrictions", "Temporarily Unfit", "Needs Assessment"
- Doctor's summary visible
- Restrictions listed
- Follow-up info displayed

### Settings Page
**Mutations**:
- `employers.update(employerId, ...)` - update company details

**Verification Status Banner**:
- Shows if status !== "verified"
- "Account Pending Verification - Some features are restricted"

---

## Real-Time Subscriptions (Convex Automatic)
All queries automatically subscribe to changes:
- `patients.list` - realtime updates when employees added/updated
- `appointments.listByEmployer` - realtime updates when bookings change
- `reports.listByEmployer` - realtime updates when reports created/sent
- No manual refresh needed: UI updates automatically

---

## Error Codes & Handling

### Authorization Errors
- `UNAUTHENTICATED` - Not logged in
- `UNAUTHORIZED` - Not owner of resource
- `EMPLOYER_NOT_FOUND` - Employer doesn't exist
- `DOCTOR_NOT_FOUND` - User is not doctor
- `ADMIN_NOT_FOUND` - User is not admin

### Data Errors
- `NOT_FOUND` - Resource doesn't exist
- `SLOT_UNAVAILABLE` - Slot booked or blocked
- `INVALID_STATE` - Slot in wrong state (e.g., try to block already-booked slot)

### Validation Errors
- Pagination cursor invalid (Convex handles)
- Required fields missing (Convex validation)

---

## Performance Characteristics

### Query Optimization
- **N+1 Prevention**: Batch fetching used in `listByEmployer` and `listByDate`
  - `extractUniqueIds()` - collect IDs
  - `batchGet()` - fetch all in parallel
  - `enrichWithRelation()` - attach to items
- **Indexed Lookups**: All foreign key queries use indexes (O(1))
- **Pagination**: Cursor-based (no offset skipping)

### Mutation Characteristics
- **Transactional**: All mutations atomic
- **Audit Logged**: Every mutation creates audit log entry
- **Real-time**: Subscriptions notify immediately

---

## GDPR Compliance Mechanisms

### 1. Consent Management
- Three consent types per employee: data_processing, health_data, employer_sharing
- Created during employee registration
- Can be withdrawn anytime

### 2. Audit Logging
- Every action logged: actor, action, resource, timestamp
- 7-day and full history available to admins
- Dashboard shows audit stats

### 3. Soft Deletion (Right to be Forgotten)
- Data redacted, not deleted (maintains referential integrity)
- Flag: `deletedAt` timestamp
- Queries filter `deletedAt === undefined`
- Affected records: patients, appointments, reports, clinical notes

### 4. Data Retention
- No automatic deletion (manual erasure request → admin approval)
- SLA tracking: 30-day deadline for erasure completion

---

## Known Gaps & Security Notes

1. **appointmentTypes**: `create` and `update` don't enforce admin auth (UX layer only)
2. **Booking Verification Status**: Not backend-enforced (pending employers can book)
3. **No encryption**: PII stored plaintext (should use Convex encryption in production)
4. **Soft delete recovery**: "[REDACTED]" values not reversible
5. **Clinical notes**: Only visible to doctors (not employer-facing via this API)
6. **Reporting access**: Employers see own reports only, doctors see all (correct)

---

## Integration Points

### Frontend (React)
- Uses `useQuery()` and `useMutation()` hooks
- Calls via `api.module.function`
- Handles real-time updates via subscriptions
- Error handling via ConvexError serialization

### HTTP Endpoints (convex/http.ts)
- `/auth/callback` → uses `employers.getByWorkosId` for routing
- Creates or updates employer on first login

### Auth System (convex/auth.config.ts)
- Two JWT providers: SSO (admin/doctor) and User Management (employer)
- `ctx.auth.getUserIdentity()` extracts WorkOS subject as workosUserId

---

## Summary: Employer Portal Data Model

```
┌─────────────────┐
│    Employer     │
│  (workosUserId) │
└────────┬────────┘
         │
         ├─ creates ──→ Patients (employees)
         │              ├─ requires Consent
         │              └─ soft deleted on erasure
         │
         ├─ creates ──→ Appointments
         │              ├─ books AvailableSlots
         │              └─ links to Reports
         │
         ├─ receives ──→ Reports
         │              ├─ created by Doctor
         │              ├─ contains fit-for-work status
         │              └─ tracks sent/viewed timestamps
         │
         └─ follows ──→ GDPR Rules
                        ├─ Consent management
                        ├─ Audit logging
                        └─ Erasure requests (admin-approved)
```

**End of Backend Discovery Report**
