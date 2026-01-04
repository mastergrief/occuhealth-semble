# Doctor Portal Backend Discovery - Complete Inventory

**Last Updated**: 2026-01-04  
**Focus**: Doctor portal Convex functions, database schema, data flow, and authorization

---

## 1. CONVEX FUNCTIONS (Backend API)

### 1.1 Doctor Settings Management

**File**: `convex/doctorSettings.ts`

#### Queries (read-only, public)
| Function | Args | Returns | Auth Required | Description |
|----------|------|---------|---------------|-------------|
| `getById` | `doctorId: Id<doctorSettings>` | `DocData<doctorSettings> \| null` | No | Get doctor profile by ID |
| `getByWorkosUserId` | `workosUserId: string` | `DocData<doctorSettings> \| null` | No | Lookup doctor by WorkOS ID (for client-side use) |

#### Queries (internal)
| Function | Args | Returns | Auth Required | Description |
|----------|------|---------|---------------|-------------|
| `getByWorkosId` | `workosUserId: string` | `DocData<doctorSettings> \| null` | No | Internal query for auth routing |

#### Mutations (write operations)
| Function | Args | Returns | Auth Required | Description |
|----------|------|---------|---------------|-------------|
| `create` | `workosUserId: string, email: string, name: string, zoomPersonalLink: string` | `Id<doctorSettings>` | No (admin setup) | Create new doctor profile during registration |
| `update` | `doctorId: Id<doctorSettings>, name?: string, zoomPersonalLink?: string` | `void` | No (doctor owns profile) | Update Zoom link or name |

---

### 1.2 Appointments Management

**File**: `convex/appointments.ts`

#### Queries
| Function | Args | Returns | Auth Required | Details |
|----------|------|---------|---------------|---------|
| `getById` | `appointmentId: Id<appointments>` | `Appointment + patient + employer + appointmentType` | **Employer ownership** | Fetch single appointment with related data |
| `listByEmployer` | `employerId: Id<employers>, ...paginationOpts` | `{ page: Appointment[], ...pagination }` | **Employer ownership** | All appointments for employer (filters soft-deleted patients) |
| `listByDate` | `date: string, ...paginationOpts` | `{ page: Appointment[], ...pagination }` with enriched data | **Doctor access** | Appointments for specific date (doctor-only, enriched with patient/employer/type) |
| `getTodaysAppointments` | `{}` | `Appointment[]` | **Doctor access** | Appointments scheduled for today (YYYY-MM-DD comparison) |

**Enriched Fields** (in listByDate & getTodaysAppointments):
- `patient`: Full patient record
- `employer`: Full employer record  
- `appointmentType`: Appointment type details

#### Mutations
| Function | Args | Returns | Auth Required | Details |
|----------|------|---------|---------------|---------|
| `book` | `patientId, employerId, appointmentTypeId, slotId, reasonForAppointment?, preAppointmentNotes?` | `Id<appointments>` | **Employer ownership** | Create appointment, mark slot as "booked", audit log |
| `markCompleted` | `appointmentId: Id<appointments>` | `void` | **Doctor access** | Mark appointment completed, set `completedAt: Date.now()`, audit log |
| `cancel` | `appointmentId: Id<appointments>` | `void` | **Employer ownership** | Free slot, mark appointment as "cancelled", set `cancelledAt` |
| `updateStatus` | `appointmentId, status: enum` | `void` | **Employer ownership** | Update appointment status (scheduled, confirmed, completed, cancelled, no_show) |

**Appointment Status Values**: `"scheduled" | "confirmed" | "completed" | "cancelled" | "no_show"`

---

### 1.3 Available Slots Management

**File**: `convex/availableSlots.ts`

#### Queries
| Function | Args | Returns | Auth Required | Details |
|----------|------|---------|---------------|---------|
| `getByDateRange` | `startDate: string, endDate: string` | `AvailableSlot[]` | No | All slots in date range (all statuses) |
| `getAvailable` | `date: string` | `AvailableSlot[]` | No | Only available slots for specific date (status = "available") |
| `getByMonth` | `yearMonth: string` | `AvailableSlot[]` | No | All slots for month (format: "2026-01") |

#### Mutations
| Function | Args | Returns | Auth Required | Details |
|----------|------|---------|---------------|---------|
| `createSlots` | `slots: Array<{ date, startTime, endTime }>` | `Id<availableSlots>[]` | No (doctor) | Create multiple slots with status = "available" |
| `blockSlot` | `slotId: Id<availableSlots>` | `void` | No (doctor) | Mark slot as "blocked" (remove from availability) |
| `unblockSlot` | `slotId: Id<availableSlots>` | `void` | No (doctor) | Change slot from "blocked" back to "available" |

**Slot Status Values**: `"available" | "booked" | "blocked"`

---

### 1.4 Reports Management

**File**: `convex/reports.ts`

#### Queries
| Function | Args | Returns | Auth Required | Details |
|----------|------|---------|---------------|---------|
| `getById` | `reportId: Id<reports>` | `Report` | **Employer ownership** | Fetch report by ID |
| `getByAppointment` | `appointmentId: Id<appointments>` | `Report \| null` | **Doctor OR Employer** | Get report for appointment (doctors see their own, employers see their appointments) |
| `listByEmployer` | `employerId, ...paginationOpts` | `{ page: Report[], ...pagination }` with patient enriched | **Employer ownership** | All reports for employer (filters soft-deleted patients) |

#### Mutations
| Function | Args | Returns | Auth Required | Details |
|----------|------|---------|---------------|---------|
| `create` | `appointmentId, fitForWork: enum, summary: string, restrictions?: string[], followUpRequired: boolean, followUpNotes?: string` | `Id<reports>` | **Doctor access** | Create report, link to appointment, audit log |
| `sendToEmployer` | `reportId: Id<reports>` | `void` | **Doctor access** | Set `sentToEmployerAt: Date.now()`, audit log |
| `markViewed` | `reportId: Id<reports>` | `void` | **Employer ownership** | Set `viewedByEmployerAt: Date.now()`, audit log |

**Report Values** (`fitForWork`):
- `"fit"` - Fully fit for work
- `"fit_with_restrictions"` - Fit but with restrictions  
- `"temporarily_unfit"` - Temporarily unfit
- `"needs_further_assessment"` - Further assessment needed

---

### 1.5 Appointment Types (Catalog)

**File**: `convex/appointmentTypes.ts`

#### Queries
| Function | Args | Returns | Auth Required | Details |
|----------|------|---------|---------------|---------|
| `listActive` | `{}` | `AppointmentType[]` | No | All active appointment types (isActive=true) |
| `listAll` | `{}` | `AppointmentType[]` | Admin only | All appointment types (including inactive) |
| `getById` | `typeId: Id<appointmentTypes>` | `AppointmentType \| null` | No | Get single type by ID |

---

## 2. DATABASE SCHEMA

### 2.1 Doctor-Related Tables

#### `doctorSettings`
Doctor profiles and configuration for video consultations.

| Field | Type | Index | Required | Purpose |
|-------|------|-------|----------|---------|
| `workosUserId` | string | **by_workos_user** | Yes | WorkOS identity (links to auth token) |
| `email` | string | No | Yes | Doctor email |
| `name` | string | No | Yes | Doctor's display name |
| `zoomPersonalLink` | string | No | Yes | Zoom meeting room URL |
| `createdAt` | number | No | Yes | Timestamp (Date.now()) |

**Sample Record**:
```js
{
  _id: "k123...",
  _creationTime: 1234567890,
  workosUserId: "user_123abc",
  email: "dr.smith@hospital.com",
  name: "Dr. John Smith",
  zoomPersonalLink: "https://zoom.us/j/1234567890",
  createdAt: 1704844800000
}
```

---

#### `appointments`
Scheduled health assessments.

| Field | Type | Index | Nullable | Purpose |
|-------|------|-------|----------|---------|
| `patientId` | Id<patients> | **by_patient** | No | Employee being assessed |
| `employerId` | Id<employers> | **by_employer** | No | Employer who booked |
| `appointmentTypeId` | Id<appointmentTypes> | No | No | Assessment type (Initial, Follow-up, etc.) |
| `slotId` | Id<availableSlots> | No | No | Reserved time slot |
| `scheduledDate` | string | **by_date** | No | Date (YYYY-MM-DD format) |
| `scheduledTime` | string | No | No | Start time (HH:MM format) |
| `status` | enum | **by_status** | No | Current state (scheduled, confirmed, completed, cancelled, no_show) |
| `reasonForAppointment` | string | No | Yes | Why assessment is needed |
| `preAppointmentNotes` | string | No | Yes | Pre-consultation notes |
| `reportId` | Id<reports> | No | Yes | Linked fit-for-work report (null until created) |
| `createdAt` | number | No | No | Booking time |
| `completedAt` | number | No | Yes | When appointment finished |
| `cancelledAt` | number | No | Yes | When cancelled |

---

#### `availableSlots`
Doctor's available appointment slots.

| Field | Type | Index | Required | Values |
|-------|------|-------|----------|--------|
| `date` | string | **by_date, by_date_status** | Yes | YYYY-MM-DD format |
| `startTime` | string | No | Yes | HH:MM format |
| `endTime` | string | No | Yes | HH:MM format |
| `status` | enum | **by_status, by_date_status** | Yes | "available", "booked", "blocked" |
| `appointmentId` | Id<appointments> | No | Yes | Ref to appointment if booked (null otherwise) |

---

#### `reports`
Fit-for-work medical assessments.

| Field | Type | Index | Required | Purpose |
|-------|------|-------|----------|---------|
| `appointmentId` | Id<appointments> | **by_appointment** | Yes | Links to completed appointment |
| `patientId` | Id<patients> | **by_patient** | Yes | Employee assessed |
| `employerId` | Id<employers> | **by_employer** | Yes | Employer receiving report |
| `fitForWork` | enum | No | Yes | fit, fit_with_restrictions, temporarily_unfit, needs_further_assessment |
| `summary` | string | No | Yes | Medical assessment summary |
| `restrictions` | string[] | No | Yes | Activity restrictions (if applicable) |
| `followUpRequired` | boolean | No | Yes | Does follow-up appointment needed? |
| `followUpNotes` | string | No | Yes | Details on follow-up timing |
| `signedAt` | number | No | Yes | When doctor signed (Date.now()) |
| `sentToEmployerAt` | number | No | Yes | When transmitted to employer |
| `viewedByEmployerAt` | number | No | Yes | When employer opened report |

---

### 2.2 Supporting Tables (Referenced by Doctor Functions)

#### `patients` (Employee records)
| Field | Type | Index | Purpose |
|-------|------|-------|---------|
| `employerId` | Id<employers> | **by_employer** | Employer who added them |
| `firstName, lastName, email` | string | **by_email** | Identity |
| `dateOfBirth` | string | No | Age verification |
| `consentId` | Id<consents> | No | GDPR consent |
| `deletedAt` | number | **by_deleted** | Soft deletion timestamp (GDPR) |

#### `employers` (Companies/Insurers)
| Field | Type | Index | Purpose |
|-------|------|-------|---------|
| `workosUserId` | string | **by_workos_user** | Links to employer user |
| `companyName` | string | No | Business name |
| `status` | enum | **by_status** | pending, verified, rejected |

#### `appointmentTypes` (Catalog)
| Field | Type | Index | Purpose |
|-------|------|-------|---------|
| `name` | string | No | Type name (e.g., "Initial Assessment") |
| `durationMinutes` | number | No | Session length |
| `price` | number | No | Cost |
| `isActive` | boolean | **by_active** | Available for booking? |

#### `auditLogs` (GDPR compliance)
| Field | Type | Index | Purpose |
|-------|------|-------|---------|
| `action` | string | **by_action** | appointment_booked, report_created, etc. |
| `actorType` | enum | No | doctor, employer, admin, system |
| `resourceType` | string | **by_resource** | appointment, report, patient |
| `timestamp` | number | **by_timestamp** | When action occurred |

---

## 3. DATA FLOW & PAGE-FUNCTION MAPPING

### 3.1 Doctor Dashboard (`/doctor/dashboard`)

**Purpose**: Show today's schedule summary

**Backend Queries Called**:
1. `api.doctorSettings.getByWorkosUserId` (layout, gets doctor context)
2. `api.appointments.getTodaysAppointments` (dashboard query)

**Data Flow**:
```
DoctorLayout
  ├─ useDoctorAuth() → workosUserId
  ├─ getByWorkosUserId(workosUserId) → doctor record
  └─ <Outlet context={{ doctor }} />
      └─ DoctorDashboard
          └─ getTodaysAppointments() → appointments[]
              └─ Display: Count, Completed, Remaining
              └─ Show appointment times + "Join Zoom" button
```

**Mutations Used**: None (read-only)

---

### 3.2 Appointments (`/doctor/appointments`)

**Purpose**: View appointments for selected date, mark as complete

**Backend Calls**:
1. Query: `api.appointments.listByDate` (with date, pagination)
2. Mutation: `api.appointments.markCompleted` (on button click)

**Data Flow**:
```
DoctorAppointments
  ├─ [date] state
  ├─ listByDate(date, defaultPaginationOpts)
  │   └─ Returns: appointments[] with enriched patient, employer, appointmentType
  └─ On "Complete" button:
      └─ markCompleted(appointmentId)
          ├─ Verifies doctor access
          ├─ Sets status="completed", completedAt=Date.now()
          └─ Logs audit trail
```

**Display Fields**:
- Patient: firstName, lastName (from enriched patient)
- Employer: companyName (from enriched employer)
- Time: scheduledTime
- Status: "scheduled" → blue, "completed" → green
- Reason: reasonForAppointment (if present)

---

### 3.3 Schedule (`/doctor/schedule`)

**Purpose**: Create appointment slots, block unavailable times

**Backend Calls**:
1. Query: `api.availableSlots.getByDateRange` (current date to same date)
2. Mutation: `api.availableSlots.createSlots` (add new slots)
3. Mutation: `api.availableSlots.blockSlot` (block availability)

**Data Flow**:
```
DoctorSchedule
  ├─ [date, startTime, endTime] state
  ├─ getByDateRange(date, date) → slots[] for that date
  │   └─ Display as grid: each slot card shows time + status
  ├─ On "Add Slot":
  │   └─ createSlots([{ date, startTime, endTime }])
  │       ├─ Creates availableSlot with status="available"
  │       └─ Re-renders list
  └─ On "Block" button:
      └─ blockSlot(slotId)
          └─ Sets status="blocked"
```

**Slot Cards Color Coding**:
- Green (available): clickable "Block" button
- Blue (booked): read-only, shows appointment
- Gray (blocked): no action

---

### 3.4 Reports (`/doctor/reports`)

**Purpose**: Create fit-for-work assessments, send to employer

**Backend Calls**:
1. Query: `api.appointments.getTodaysAppointments`
2. Filter: appointments where status="completed" && !reportId
3. Mutation: `api.reports.create` (submit report)
4. Mutation: `api.reports.sendToEmployer` (transmit to employer)

**Data Flow**:
```
DoctorReports
  ├─ getTodaysAppointments() → all today's appointments
  ├─ Filter: status="completed" && !reportId → completedWithoutReport[]
  ├─ On appointment click:
  │   └─ Open modal with form:
  │       ├─ Select: fitForWork (fit, fit_with_restrictions, temporarily_unfit, needs_further_assessment)
  │       ├─ Text: summary (required)
  │       ├─ Checkbox: followUpRequired
  │       └─ Text (conditional): followUpNotes
  └─ On "Submit & Send to Employer":
      ├─ create({ appointmentId, fitForWork, summary, restrictions, followUpRequired, followUpNotes })
      │   └─ Creates report, links to appointment (appointmentId → reportId)
      ├─ sendToEmployer(reportId)
      │   └─ Sets sentToEmployerAt=Date.now()
      └─ Clears form, modal closes
```

**Authorization**:
- Only doctors can create and send reports
- Employer receives notification and can view

---

### 3.5 Settings (`/doctor/settings`)

**Purpose**: Manage Zoom link and profile info

**Backend Calls**:
1. Query: `doctor` from layout context (getByWorkosUserId result)
2. Mutation: `api.doctorSettings.update` (save Zoom link)

**Data Flow**:
```
DoctorSettings
  ├─ doctor = useOutletContext() from layout
  ├─ Display (read-only):
  │   ├─ Name: doctor.name
  │   └─ Email: doctor.email
  ├─ Editable:
  │   └─ zoomPersonalLink (input, controlled)
  └─ On "Save Changes":
      └─ update({ doctorId, zoomPersonalLink })
          └─ Patches doctorSettings record
```

---

## 4. AUTHORIZATION PATTERNS

### 4.1 Doctor Access Check

**Function**: `requireDoctorAccess(ctx)` from `convex/authModules/authorization.ts`

```typescript
// Pattern used in all doctor-only mutations:
await requireDoctorAccess(ctx);
  // ├─ Gets identity from auth
  // ├─ Looks up doctorSettings by workosUserId
  // └─ Throws error if not found
```

**Used By**:
- `appointments.listByDate` (query)
- `appointments.getTodaysAppointments` (query)
- `appointments.markCompleted` (mutation)
- `reports.create` (mutation)
- `reports.sendToEmployer` (mutation)
- `availableSlots.createSlots` (mutation) - implicit (no explicit check)
- `availableSlots.blockSlot` (mutation) - implicit
- `availableSlots.unblockSlot` (mutation) - implicit

### 4.2 Employer Access Check

**Function**: `requireEmployerOwnership(ctx, employerId)` from `convex/authModules/authorization.ts`

```typescript
// Pattern used in employer-facing queries/mutations:
await requireEmployerOwnership(ctx, employerId);
  // ├─ Gets identity from auth
  // ├─ Fetches employers record
  // └─ Verifies workosUserId matches
```

**Used By**:
- `appointments.getById` (query)
- `appointments.listByEmployer` (query)
- `appointments.book` (mutation)
- `appointments.cancel` (mutation)
- `appointments.updateStatus` (mutation)
- `reports.getById` (query)
- `reports.markViewed` (mutation)

### 4.3 Report Access Special Case

**Function**: `getByAppointment` in `reports.ts`

```typescript
// Dual access: Doctor OR Employer
const user = await getAuthenticatedUser(ctx);
const doctor = await ctx.db.query("doctorSettings")
  .withIndex("by_workos_user", (q) => q.eq("workosUserId", user.workosUserId))
  .first();

if (!doctor) {
  // Not a doctor, must be employer
  await requireEmployerOwnership(ctx, appointment.employerId);
}
// Either check passed → allowed to view
```

---

## 5. AUDIT LOGGING

All doctor-initiated actions are logged to `auditLogs` table via helper functions:

| Helper | Called By | Log Details |
|--------|-----------|------------|
| `logAppointmentAction` | `appointments.book`, `appointments.markCompleted` | action: "appointment_booked", "appointment_completed" |
| `logReportAction` | `reports.create`, `reports.sendToEmployer`, `reports.markViewed` | action: "report_created", "report_sent_to_employer", "report_viewed" |
| `logPatientAction` | `patients.create`, `patients.update`, `patients.softDelete` | Used by employer, not directly by doctor |

**Audit Fields**:
- `action`: string (e.g., "appointment_completed")
- `actorType`: "doctor" (extracted from identity)
- `actorId`: workosUserId
- `resourceType`: "appointment" or "report"
- `resourceId`: appointment or report ID
- `details`: { patientId, appointmentTypeId, etc. }
- `timestamp`: Date.now()

---

## 6. PAGINATION

All list operations use standardized pagination:

**Helper**: `convex/helpers/pagination.ts`

```typescript
// Standard args: { ...paginatedQueryArgs }
// where paginatedQueryArgs = { paginationOpts: { numPages: 1, cursor: null } }

// Usage in query:
const result = await ctx.db
  .query("appointments")
  .withIndex("by_date", (q) => q.eq("scheduledDate", date))
  .paginate(args.paginationOpts);

// Returns:
{
  page: Appointment[],
  isDone: boolean,
  continueCursor: string | null
}
```

**Used By**:
- `appointments.listByEmployer`
- `appointments.listByDate`
- `reports.listByEmployer`
- `patients.list` (employer portal)

---

## 7. GDPR COMPLIANCE FEATURES

### 7.1 Soft Delete (Data Redaction)

**Pattern**: Patients and reports with soft-deleted patients are filtered out

**Queries Auto-Filter**:
- `appointments.listByEmployer` - filters out appointments where `patient.deletedAt` is set
- `reports.listByEmployer` - filters out reports where `patient.deletedAt` is set

**Mutation**: `patients.softDelete` (called by employer, not doctor directly)
```typescript
// Sets: firstName, lastName, email, phone, dateOfBirth all to "[REDACTED]"
// Sets: deletedAt = Date.now()
// Does NOT delete record (GDPR audit trail requirement)
```

### 7.2 Consent Records

**Schema**: `consents` table links to patients

**Types**: 
- data_processing
- health_data
- employer_sharing

**Doctor Visibility**: Doctors see patient appointments/reports but NOT consent details directly

---

## 8. ERROR HANDLING

### 8.1 ConvexError Codes Used

| Code | Context | Meaning |
|------|---------|---------|
| `UNAUTHENTICATED` | Any auth check fails | User not logged in |
| `UNAUTHORIZED` | Employer check fails | User doesn't own employer |
| `DOCTOR_NOT_FOUND` | `requireDoctorAccess` fails | User is not a registered doctor |
| `SLOT_UNAVAILABLE` | `appointments.book` | Slot status != "available" |
| `NOT_FOUND` | Various queries | Resource doesn't exist |

### 8.2 Error Messages

```typescript
throw new ConvexError({
  code: "DOCTOR_NOT_FOUND" as const,
  message: "Doctor access required"
});
```

**Frontend Handling**: Convex SDK automatically shows errors to UI

---

## 9. PERFORMANCE OPTIMIZATIONS

### 9.1 Batch Fetching

**Pattern**: Prevent N+1 query problem

```typescript
// In listByDate:
const patientIds = extractUniqueIds(paginatedResult.page, (a) => a.patientId);
const patientMap = await batchGet(ctx, patientIds);
// Single query for all patients, then map enrichment
```

### 9.2 Index Usage

**Primary Indexes by Doctor Functions**:
- `doctorSettings.by_workos_user` - Fast doctor lookup
- `appointments.by_date` - Slot availability checks
- `appointments.by_employer` - Employer listings
- `availableSlots.by_date_status` - Available slots for date
- `reports.by_appointment` - Report by appointment
- `reports.by_employer` - Employer report list
- `reports.by_patient` - GDPR audit trail

---

## 10. QUICK REFERENCE: PAGE → FUNCTION MAPPING

| Page | Route | Primary Queries | Mutations | Context |
|------|-------|-----------------|-----------|---------|
| Dashboard | `/doctor/dashboard` | getTodaysAppointments | None | doctor (from layout) |
| Appointments | `/doctor/appointments` | listByDate | markCompleted | doctor (from layout) |
| Schedule | `/doctor/schedule` | getByDateRange | createSlots, blockSlot | doctor (from layout) |
| Reports | `/doctor/reports` | getTodaysAppointments | create, sendToEmployer | doctor (from layout) |
| Settings | `/doctor/settings` | None (use context) | update | doctor (from layout) |

---

## 11. KEY INSIGHTS

1. **Doctor Context Established in Layout**: `DoctorLayout.tsx` calls `getByWorkosUserId` once and passes via context to all child pages
2. **All Appointments Are Doctor-View**: Doctors see appointments by date (natural for schedule), not by employer
3. **Report Creation is Tied to Completion**: Reports only created after appointment marked "completed"
4. **Dual Access on Reports**: Doctors create/send, employers view (enforced in code)
5. **Slot Management is Permissionless**: Doctor can create/block slots without explicit auth check (assumes identity verified)
6. **GDPR Built-In**: All listings auto-filter soft-deleted patients, all actions audit-logged
7. **Real-Time via Convex**: All queries use `useQuery` hook (live subscriptions), mutations auto-refresh

---

## 12. TESTING CREDENTIALS

From `.claude/rules/BROWSER-CLI/NAV-MAP.md`:

| Role | Email | Password | Status |
|------|-------|----------|--------|
| Doctor | `testdoc@occuhealth.com` | `(TestPass1234` | Ready |

Test via WorkOS AuthKit login flow at `/auth/callback`.

