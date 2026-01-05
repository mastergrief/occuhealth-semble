# Employer Portal Pages - Feature Catalog & Module Map
**Scope**: Complete frontend module inventory for Employer Portal pages
**Date**: 2026-01-05
**Status**: COMPLETE
**Format**: Feature catalog with exports, dependencies, patterns

---

## Overview

The Employer Portal consists of 5 main pages in `src/pages/employer/` with shared components in `src/components/employer/`. All pages are child routes of the `EmployerLayout` component which provides authentication and context passing.

### Directory Structure
```
src/pages/employer/
├── Dashboard.tsx         (main stats dashboard)
├── Employees.tsx         (employee management)
├── Bookings.tsx          (appointment booking)
├── Reports.tsx           (medical reports view)
└── Settings.tsx          (employer profile settings)

src/components/employer/
├── EmployeeForm.tsx      (modal: add employee)
├── EmployeeList.tsx      (list component: display employees)
├── BookingFlow.tsx       (modal: 3-step appointment booking)
├── ReportsList.tsx       (list component: display reports)
├── EmployerRegistrationForm.tsx (onboarding: 3-step registration)
└── index.ts              (barrel export)

src/pages/EmployerLayout.tsx
├── Context provider for all child pages
├── Sidebar navigation
├── Auth checks + verification banner
└── Uses useOutletContext to pass employer + isVerified
```

---

## Page Components (src/pages/employer/)

### 1. EmployerDashboard
**File**: `src/pages/employer/Dashboard.tsx`  
**Export**: Default export `EmployerDashboard` function  
**Purpose**: Summary dashboard with KPI cards and recent activity

#### Signature
```typescript
export function EmployerDashboard(): JSX.Element
```

#### Convex Queries (Real-time subscriptions)
| Query | Args | Purpose | Returns |
|-------|------|---------|---------|
| `api.patients.list` | `{employerId, ...defaultPaginationOpts()}` | Employee count | `PaginatedResult<Patient>` |
| `api.appointments.listByEmployer` | `{employerId, ...defaultPaginationOpts()}` | Appointment stats | `PaginatedResult<Appointment>` |
| `api.reports.listByEmployer` | `{employerId, ...defaultPaginationOpts()}` | Report count | `PaginatedResult<Report>` |

#### State Management
- Uses `useOutletContext<LayoutContext>()` to get `employer` from `EmployerLayout`
- All queries skip if `employerId` is undefined
- Calculates 4 stat cards:
  1. **Employees**: Total from `patients.length`
  2. **Appointments**: Total from `appointments.length`
  3. **Reports**: Total from `reports.length`
  4. **Pending**: Filtered count of `appointments.status === "scheduled"`

#### Components & Icons (lucide-react)
- Card components from `@/components/ui/card`
- Icons: `Users`, `Calendar`, `FileText`, `Clock`

#### Mutations
None - read-only page

#### Key Dependencies
- `useOutletContext` from react-router-dom
- `useQuery` from convex/react
- `api` from convex/_generated/api
- `defaultPaginationOpts` from convex/helpers/pagination
- `Doc<"employers">` type

#### Verification Status
- Not used on this page (no restriction)

---

### 2. EmployeesPage
**File**: `src/pages/employer/Employees.tsx`  
**Export**: Default export `EmployeesPage` function  
**Purpose**: Employee directory management with add employee form

#### Signature
```typescript
export function EmployeesPage(): JSX.Element
```

#### Convex Queries
| Query | Args | Purpose | Returns |
|-------|------|---------|---------|
| `api.patients.list` | `{employerId, ...defaultPaginationOpts()}` | Paginated employee list | `PaginatedResult<Patient>` |

#### State Management
- `const [showForm, setShowForm] = useState(false)` - Controls `EmployeeForm` modal visibility
- Uses `useOutletContext<LayoutContext>()` to get `employer`
- Renders `EmployeeList` with filtered items or empty state

#### Mutations
None directly - delegated to `EmployeeForm` component
- `EmployeeForm` calls:
  - `api.gdpr.createConsent(...)` - Create data processing consent
  - `api.patients.create(...)` - Add employee

#### Components Used
- `EmployeeList` - Display employees in paginated list
- `EmployeeForm` - Modal for adding new employee
- UI components: `Button` (with Plus icon), Card components

#### Verification Status
- Not restricted - any verified or pending employer can add employees

#### Key Dependencies
- `useState` from react
- `useOutletContext` from react-router-dom
- `useQuery` from convex/react
- `EmployeeList`, `EmployeeForm` from '@/components/employer'

#### Form Trigger
- "Add Employee" button in header (top-right)
- Opens modal: `{showForm && employer && <EmployeeForm />}`
- Props: `employerId`, `onClose` callback

---

### 3. BookingsPage
**File**: `src/pages/employer/Bookings.tsx`  
**Export**: Default export `BookingsPage` function  
**Purpose**: View all appointments and trigger new booking flow

#### Signature
```typescript
export function BookingsPage(): JSX.Element
```

#### Convex Queries
| Query | Args | Purpose | Returns |
|-------|------|---------|---------|
| `api.appointments.listByEmployer` | `{employerId, ...defaultPaginationOpts()}` | Paginated bookings list | `PaginatedResult<Appointment + {patient}>` |

#### State Management
- `const [showBooking, setShowBooking] = useState(false)` - Controls `BookingFlow` modal
- Uses `useOutletContext<LayoutContext>()` to get `employer` and `isVerified`
- Shows warning banner if `!isVerified`
- "New Booking" button disabled if `!isVerified`

#### Mutations
None directly - delegated to `BookingFlow` component
- `BookingFlow` calls:
  - `api.appointmentTypes.listActive()` - Get appointment type options
  - `api.patients.list()` - Get employee options
  - `api.availableSlots.getAvailable(date)` - Get available slots for selected date
  - `api.appointments.book(...)` - Book appointment

#### Components Used
- `BookingFlow` - 3-step modal for appointment booking
- Card components for display

#### Verification Status
- **Booking button is disabled if employer status !== "verified"**
- **Warning message shown**: "Booking is disabled until your account is verified."
- Backend NOT enforced (UX-only restriction - potential security gap per backend discovery)

#### Key Dependencies
- `useState` from react
- `useOutletContext` from react-router-dom
- `useQuery` from convex/react
- `BookingFlow` from '@/components/employer'

#### Flow Trigger
- "New Booking" button (top-right, disabled if not verified)
- Opens modal: `{showBooking && employer && <BookingFlow />}`
- Props: `employerId`, `onClose` callback

#### Appointments Display
- Shows all appointments in paginated list
- Status badges: "completed" (green), "scheduled" (blue), "cancelled" (red), other (gray)
- Employee name, date, time, status shown per appointment

---

### 4. ReportsPage
**File**: `src/pages/employer/Reports.tsx`  
**Export**: Default export `ReportsPage` function  
**Purpose**: View medical reports from doctors

#### Signature
```typescript
export function ReportsPage(): JSX.Element
```

#### Convex Queries
| Query | Args | Purpose | Returns |
|-------|------|---------|---------|
| `api.reports.listByEmployer` | `{employerId, ...defaultPaginationOpts()}` | Paginated reports list (excludes soft-deleted patients) | `PaginatedResult<Report + {patient}>` |

#### State Management
- Uses `useOutletContext<LayoutContext>()` to get `employer`
- Renders `ReportsList` with items or empty state
- Simple read-only page

#### Mutations
Potential future: `api.reports.markViewed()` - Mark report as received (not called from page, could be in component)

#### Components Used
- `ReportsList` - Display reports with fit-for-work status badges
- Card components

#### Verification Status
- Not restricted - any employer can view reports

#### Key Dependencies
- `useOutletContext` from react-router-dom
- `useQuery` from convex/react
- `ReportsList` from '@/components/employer'

#### Empty State
- "No reports available" message when empty

---

### 5. EmployerSettings
**File**: `src/pages/employer/Settings.tsx`  
**Export**: Default export `EmployerSettings` function  
**Purpose**: View company profile and verification status

#### Signature
```typescript
export function EmployerSettings(): JSX.Element
```

#### Convex Queries
None - uses data already loaded in `EmployerLayout`

#### State Management
- Uses `useOutletContext<LayoutContext>()` to get `employer`
- Display-only, no state mutations
- Shows read-only company information cards

#### Mutations
None - read-only view

#### Displayed Fields
1. **Company Name**: `employer?.companyName`
2. **Type**: `employer?.companyType` (capitalized: "employer" or "insurer")
3. **Status**: `employer?.status`
   - Color coded: green (verified), amber (pending), red (rejected)

#### Components Used
- Card components for layout
- Lucide icons for section headers

#### Verification Status
- Status field shows current verification state
- Page visible to all employers (pending, verified, rejected)

#### Key Dependencies
- `useOutletContext` from react-router-dom
- Card components

#### Future Enhancement
- Could add update form for company details (currently read-only)
- Needs `api.employers.update()` mutation

---

## Shared Components (src/components/employer/)

### 1. EmployeeForm
**File**: `src/components/employer/EmployeeForm.tsx`  
**Export**: Named export `EmployeeForm` function  
**Purpose**: Modal form for adding new employee with GDPR consent

#### Signature
```typescript
export function EmployeeForm({ employerId, onClose }: EmployeeFormProps): JSX.Element
```

#### Props Interface
```typescript
interface EmployeeFormProps {
  employerId: Id<"employers">;
  onClose: () => void;
}
```

#### Convex Mutations
| Mutation | Args | Purpose | Returns |
|----------|------|---------|---------|
| `api.gdpr.createConsent` | `{patientEmail, consentType, consentText, consentVersion, collectedByEmployerId}` | Create data_processing consent | `Id<"consents">` |
| `api.patients.create` | `{employerId, firstName, lastName, email, phone?, dateOfBirth, jobTitle?, department?, consentId}` | Create employee record | `Id<"patients">` |

#### Form Fields (Step 1)
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| firstName | text | Yes | Grid col 1/2 |
| lastName | text | Yes | Grid col 2/2 |
| email | email | Yes | Full width |
| phone | tel | No | Optional |
| dateOfBirth | date | Yes | HTML5 date input |
| jobTitle | text | No | Grid col 1/2 |
| department | text | No | Grid col 2/2 |

#### State Management
```typescript
const [isSubmitting, setIsSubmitting] = useState(false)
const [formData, setFormData] = useState({...})
```

#### Submission Flow
1. User fills form and clicks "Add Employee"
2. Set `isSubmitting = true`
3. Call `createConsent()` → get `consentId`
4. Call `createPatient()` with `consentId`
5. Call `onClose()` on success
6. Error handling: `console.error()` only (no toast)

#### Error Handling
- Caught in try/catch block
- Error logged to console only
- No user-facing error message

#### UI Components
- Dialog wrapper (controlled by `open={true}` and `onOpenChange={onClose}`)
- Form fields wrapped in `<Input>` and `<Label>`
- Cancel button (variant="outline") and Submit button
- Submit button shows "Adding..." while submitting

#### Dialog States
- **Idle**: "Add Employee" button
- **Submitting**: "Adding..." button (disabled)
- **Closed**: Parent controls via `onClose()` callback

#### Key Dependencies
- `useState` from react
- `useMutation` from convex/react
- Dialog components from '@/components/ui/dialog'
- Input, Label components from '@/components/ui'

#### Called By
- `EmployeesPage` - when "Add Employee" button clicked

---

### 2. EmployeeList
**File**: `src/components/employer/EmployeeList.tsx`  
**Export**: Named export `EmployeeList` function  
**Purpose**: Display list of employees with contact details

#### Signature
```typescript
export function EmployeeList({ employees }: EmployeeListProps): JSX.Element
```

#### Props Interface
```typescript
interface EmployeeListProps {
  employees: Employee[];
}

interface Employee {
  _id: Id<"patients">;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string;
  department?: string;
}
```

#### Rendering
- Maps over `employees` array
- Each employee shows:
  - **Left**: First name + last name, email (small gray text)
  - **Right**: Job title (if present), department (if present, small gray text)
- Uses `divide-y` for separator lines between employees

#### Empty State
- Shows card with centered text: "No employees added yet"

#### UI Components
- Card wrapper
- No additional mutations or actions (display only)

#### Key Dependencies
- Card components from '@/components/ui/card'

#### Called By
- `EmployeesPage` - to display `patients.list` results

#### Future Enhancement
- Could add edit/delete buttons per employee
- Could add soft-delete action (currently read-only)

---

### 3. BookingFlow
**File**: `src/components/employer/BookingFlow.tsx`  
**Export**: Named export `BookingFlow` function  
**Purpose**: 3-step wizard modal for booking appointments

#### Signature
```typescript
export function BookingFlow({ employerId, onClose }: BookingFlowProps): JSX.Element
```

#### Props Interface
```typescript
interface BookingFlowProps {
  employerId: Id<"employers">;
  onClose: () => void;
}
```

#### Convex Queries & Mutations
| Operation | Type | Args | Purpose | Returns |
|-----------|------|------|---------|---------|
| `api.patients.list` | Query | `{employerId, ...defaultPaginationOpts()}` | Employee options for step 1 | `PaginatedResult<Patient>` |
| `api.appointmentTypes.listActive` | Query | None | Appointment type options | `AppointmentType[]` |
| `api.availableSlots.getAvailable` | Query | `{date: selectedDate}` | Available slots for step 2 | `AvailableSlot[]` |
| `api.appointments.book` | Mutation | `{patientId, employerId, appointmentTypeId, slotId, reasonForAppointment?}` | Create appointment | `Id<"appointments">` |

#### State Management
```typescript
const [step, setStep] = useState(1)                          // 1, 2, or 3
const [selectedPatient, setSelectedPatient] = useState("")   // Id<"patients"> | ""
const [selectedType, setSelectedType] = useState("")         // Id<"appointmentTypes"> | ""
const [selectedDate, setSelectedDate] = useState("YYYY-MM-DD") // Default: today
const [selectedSlot, setSelectedSlot] = useState(null)       // Id<"availableSlots"> | null
const [reason, setReason] = useState("")                     // Optional reason text
const [isSubmitting, setIsSubmitting] = useState(false)      // Submission state
```

#### Step-by-Step Flow

**Step 1: Select Employee & Type**
- Dropdown 1: Select employee from `patients` list
  - Shows: `{firstName} {lastName}`
  - Value: `p._id`
- Dropdown 2: Select appointment type from `appointmentTypes` list
  - Shows: `{name} ({durationMinutes} min)`
  - Value: `t._id`
- "Next" button disabled until both selections made
- Styling: Plain HTML select (not themed component)

**Step 2: Select Date & Slot**
- Date input: HTML date with `min={today}`
  - Auto-resets `selectedSlot` when date changes
- Slots display: Grid of 3 columns
  - Button per slot showing `slot.startTime` (e.g., "09:00")
  - Active variant (blue) when selected
  - Outline variant (gray) when not selected
- Empty state: "No slots available for this date"
- Navigation: Back/Next buttons

**Step 3: Confirm & Review**
- Displays summary:
  - **Employee**: Name lookup from patients
  - **Type**: Name lookup from appointmentTypes
  - **Date**: Selected date (YYYY-MM-DD format)
  - **Time**: Start time lookup from slots
- Reason input: Optional text field
  - Placeholder: "e.g., Annual health check"
- Navigation: Back/Confirm buttons
- Submit button shows "Booking..." while submitting

#### Submission Flow
1. Click "Confirm Booking" on step 3
2. Validate all required fields present
3. Call `bookAppointment()` mutation
4. On success: Call `onClose()`
5. On error: `console.error()` (no user feedback)

#### Dialog States
- Title updates per step: "Book Appointment - Step {step} of 3"
- Dialog wrapper: `max-w-md` width
- Controlled by `open={true}` and `onOpenChange={onClose}`

#### UI Components
- Dialog wrapper
- Form inputs: date input, text input, select dropdowns, buttons
- Button variants: default (primary), outline (secondary)
- Summary card: `bg-slate-50` background

#### Key Dependencies
- `useState` from react
- `useQuery`, `useMutation` from convex/react
- `defaultPaginationOpts` from convex/helpers/pagination
- Dialog components from '@/components/ui/dialog'
- Input, Label, Button from '@/components/ui'

#### Called By
- `BookingsPage` - when "New Booking" button clicked (if verified)

#### Blocking
- Step 1: Can't proceed without both employee and type
- Step 2: Can't proceed without slot selected
- Step 3: Form submission requires all validations
- Date field: Can't select past dates (`min={today}`)

---

### 4. ReportsList
**File**: `src/components/employer/ReportsList.tsx`  
**Export**: Named export `ReportsList` function  
**Purpose**: Display medical reports with fit-for-work status

#### Signature
```typescript
export function ReportsList({ reports }: ReportsListProps): JSX.Element
```

#### Props Interface
```typescript
interface ReportsListProps {
  reports: Report[];
}

interface Report {
  _id: Id<"reports">;
  fitForWork: "fit" | "fit_with_restrictions" | "temporarily_unfit" | "needs_further_assessment";
  summary: string;
  signedAt: number; // timestamp
  sentToEmployerAt?: number;
  patient?: { firstName: string; lastName: string } | null;
}
```

#### Rendering
- Maps over `reports` array
- Each report shows in bordered card with:
  - **Top row**: Patient name, status badge (fit-for-work)
  - **Metadata**: Signed date (localized format)
  - **Body**: Summary text (clinical notes)

#### Status Badge Colors
```typescript
const fitStatusColors: Record<string, string> = {
  fit: "bg-green-100 text-green-800",
  fit_with_restrictions: "bg-amber-100 text-amber-800",
  temporarily_unfit: "bg-red-100 text-red-800",
  needs_further_assessment: "bg-blue-100 text-blue-800",
};
```

#### Empty State
- Shows card with centered text: "No reports available"

#### Timestamp Display
- `new Date(report.signedAt).toLocaleDateString()` - Browser locale format
- Example: "1/5/2026" or "05/01/2026" depending on locale

#### UI Components
- Card wrapper
- Badge component for status (from '@/components/ui/badge')
- No buttons or interactive elements (display only)

#### Key Dependencies
- Card, Badge components from '@/components/ui'
- Id type from convex/_generated/dataModel

#### Called By
- `ReportsPage` - to display `reports.listByEmployer` results

#### Future Enhancement
- Could add "Mark as Viewed" button (requires `api.reports.markViewed()`)
- Could add report detail modal
- Could add sent/viewed timestamp indicators

---

### 5. EmployerRegistrationForm (Onboarding)
**File**: `src/components/employer/EmployerRegistrationForm.tsx`  
**Export**: Named export `EmployerRegistrationForm` function  
**Purpose**: 3-step onboarding form for new employer signup

#### Signature
```typescript
export function EmployerRegistrationForm(): JSX.Element
```

#### Context
- Not a child of `EmployerLayout` (runs during auth callback)
- Route: `/register/employer?userId=...&accessToken=...`
- Receives auth tokens from WorkOS callback via URL params

#### URL Parameters (from WorkOS Auth Callback)
```typescript
const workosUserId = searchParams.get("userId")           // Required
const accessToken = searchParams.get("accessToken")       // Required
const refreshToken = searchParams.get("refreshToken")     // Optional
const sessionId = searchParams.get("sessionId")           // Optional for logout
```

#### Convex Mutations
| Mutation | Args | Purpose | Returns |
|----------|------|---------|---------|
| `api.employers.create` | `{workosUserId, email, companyType, companyName, companyRegistrationNumber?, contactName, contactPhone?, addressLine1, addressLine2?, city, postcode}` | Create employer record | `Id<"employers">` |
| `api.gdpr.createConsent` (x3) | `{patientEmail, consentType, consentText, consentVersion, collectedByEmployerId}` | Create 3 consent records (data_processing, health_data, employer_sharing) | `Id<"consents">` |

#### State Management
```typescript
const [step, setStep] = useState(1)                // 1, 2, or 3
const [isSubmitting, setIsSubmitting] = useState(false)
const [error, setError] = useState("")
const [formData, setFormData] = useState({...})    // Company details
const [consents, setConsents] = useState({...})    // GDPR checkboxes
```

#### Step-by-Step Flow

**Step 1: Company Details**
- Organization Type (select): "employer" or "insurer"
- Company Name *: Text input (required)
- Registration Number: Text input (optional)
- Contact Name *: Text input (required)
- Email *: Email input (required)
- Contact Phone: Tel input (optional)
- "Next" button

**Step 2: Address**
- Address Line 1 *: Text input (required)
- Address Line 2: Text input (optional)
- City *: Text input (required, col 1/2)
- Postcode *: Text input (required, col 2/2)
- Back/Next buttons

**Step 3: GDPR Consent**
- Three checkboxes with descriptions (all required):
  1. **Data Processing Consent**: "I consent to the processing of employee health data..."
  2. **Health Data Consent**: "I understand that sensitive health data will be collected..."
  3. **Employer Sharing Consent**: "I consent to receiving anonymized fitness-for-work reports..."
- Error message display (if validation fails)
- Back/"Complete Registration" buttons

#### Validation
- All 3 consent checkboxes must be checked to submit
- Error on step 3: "All GDPR consents are required to proceed"
- Tokens must be present (userId + accessToken), else show error screen

#### Submission Flow
1. Validate all consents checked
2. Call `createEmployer()` → get `employerId`
3. Call 3x `createConsent()` for:
   - `data_processing`
   - `health_data`
   - `employer_sharing`
4. Call `loginAsEmployer(workosUserId, accessToken, refreshToken, sessionId)` from auth context
5. Navigate to `/employer` (dashboard)

#### Error Handling
- Token validation: Show error card with "Return to Home" button
- Submission: Catch and display error in form

#### UI Components
- Card wrapper (max-w-lg)
- Form inputs, labels, selects, checkboxes
- Button navigation (Back/Next/Complete)

#### Key Dependencies
- `useState` from react
- `useSearchParams`, `useNavigate` from react-router-dom
- `useMutation` from convex/react
- `useEmployerAuth` custom hook
- Card components from '@/components/ui/card'
- Input, Label, Button from '@/components/ui'

#### Called By
- Route: `/register/employer` (during auth callback flow)
- Not called by any page component

#### Auth Integration
- Uses `loginAsEmployer()` from `useEmployerAuth()` hook
- Stores: workosUserId, accessToken, refreshToken, sessionId
- Redirects to `/employer` on success

---

## Context & Routing Structure

### EmployerLayout
**File**: `src/pages/EmployerLayout.tsx`  
**Purpose**: Layout wrapper for all employer-authenticated routes

#### Context Value
```typescript
interface LayoutContext {
  employer: Doc<"employers"> | null | undefined;
  isVerified: boolean;
}
```

#### Convex Queries
| Query | Args | Purpose | Returns |
|-------|------|---------|---------|
| `api.employers.getByWorkosIdPublic` | `{workosUserId}` | Get employer data | `Employer \| null` |

#### State Management
- Auth context: `useEmployerAuth()` provides `isAuthenticated`, `isLoading`, `workosUserId`, `logoutEmployer`, `sessionId`
- Computed: `isVerified = employer?.status === "verified"`

#### Route Guard
- If `!isAuthenticated`: `<Navigate to="/" replace />`
- If `isLoading`: Shows "Loading..." spinner

#### Pending Verification Banner
- Shows if `!isVerified && employer` exists
- Styling: `bg-amber-50` background, alert triangle icon
- Text: "Account Pending Verification" + "Some features are restricted..."

#### Navigation Structure
- Sidebar (w-64, fixed left)
  - NavLink items:
    - `/employer/dashboard` - Dashboard
    - `/employer/employees` - Employees
    - `/employer/bookings` - Bookings
    - `/employer/reports` - Reports
    - `/employer/settings` - Settings
  - Sign Out button (at bottom)
- Main content area
  - `<Outlet context={{ employer, isVerified }} />`

#### Child Routes (passed context)
All child pages receive via `useOutletContext<LayoutContext>()`
```
/employer/dashboard    → EmployerDashboard
/employer/employees    → EmployeesPage
/employer/bookings     → BookingsPage
/employer/reports      → ReportsPage
/employer/settings     → EmployerSettings
```

---

## Index Exports (Barrel Pattern)

### src/components/employer/index.ts
```typescript
export * from "./EmployerRegistrationForm";
export * from "./EmployeeList";
export * from "./EmployeeForm";
export * from "./BookingFlow";
export * from "./ReportsList";
```

**Note**: No index.ts in `src/pages/employer/` - pages imported directly with relative paths.

---

## Import Patterns

### Page Imports (Full Paths)
```typescript
// Pages use absolute imports from convex API
import { api } from "../../../convex/_generated/api";
import { useQuery } from "convex/react";
import { useOutletContext } from "react-router-dom";
```

### Component Imports (Barrel & Absolute)
```typescript
// Pages import components from barrel
import { EmployeeForm } from "@/components/employer";
import { EmployeeList } from "@/components/employer";
import { BookingFlow } from "@/components/employer";

// Components import UI components by absolute path
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
```

### Type Imports
```typescript
// Pages import types directly
import { Doc } from "../../../convex/_generated/dataModel";
import { Id } from "../../../convex/_generated/dataModel";
```

---

## Query & Mutation Patterns

### Pagination Pattern (All List Queries)
```typescript
const defaultPaginationOpts = { numItems: 50, cursor: null };

const patientsResult = useQuery(api.patients.list, 
  employerId ? { employerId, ...defaultPaginationOpts() } : "skip"
);
const patients = patientsResult?.items;  // Use items property
```

### Skip Pattern (Conditional Queries)
```typescript
// Don't execute query until we have required args
const employer = useQuery(
  api.employers.getByWorkosIdPublic,
  workosUserId ? { workosUserId } : "skip"
);
```

### Mutation Pattern (Form Submission)
```typescript
const createPatient = useMutation(api.patients.create);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    setIsSubmitting(true);
    await createPatient({ ...formData });
    onClose();  // Close modal on success
  } catch (error) {
    console.error("Error:", error);
    // No user-facing error UI currently
  } finally {
    setIsSubmitting(false);
  }
};
```

### Real-time Subscription Pattern
- All `useQuery()` calls are automatically subscribed
- UI updates immediately when data changes
- No manual refresh needed
- Backend audit logs changes

---

## Convex Queries Per Page

### Dashboard Page Queries
1. `patients.list(employerId, paginationOpts)` → counts employees
2. `appointments.listByEmployer(employerId, paginationOpts)` → counts + filters scheduled
3. `reports.listByEmployer(employerId, paginationOpts)` → counts reports

### Employees Page Queries
1. `patients.list(employerId, paginationOpts)` → paginated employee list
2. (EmployeeForm) `gdpr.createConsent(...)` → create consent
3. (EmployeeForm) `patients.create(...)` → add employee

### Bookings Page Queries
1. `appointments.listByEmployer(employerId, paginationOpts)` → list bookings
2. (BookingFlow Step 1) `patients.list(employerId, ...)` → employee dropdown
3. (BookingFlow Step 1) `appointmentTypes.listActive()` → type dropdown
4. (BookingFlow Step 2) `availableSlots.getAvailable(date)` → slot options
5. (BookingFlow Step 3) `appointments.book(...)` → submit booking

### Reports Page Queries
1. `reports.listByEmployer(employerId, paginationOpts)` → paginated reports list

### Settings Page Queries
None (uses data from EmployerLayout already loaded)

---

## Verification Status Impact

### Where Checked
- **EmployerLayout**: Calculates `isVerified = employer?.status === "verified"`
- **BookingsPage**: 
  - Disables "New Booking" button if `!isVerified`
  - Shows warning message if `!isVerified`
  - Props passed to `BookingFlow`

### Backend vs Frontend
- **Frontend**: UX restrictions only (button disabled, warning shown)
- **Backend**: NOT enforced on booking mutation (potential security gap)
- Other pages: No verification restrictions

### Status Values
- `"verified"` → Full access
- `"pending"` → Warning banner shown, booking button disabled
- `"rejected"` → Still shows banner + disabled booking

---

## Component Dependency Graph

```
EmployerLayout
├── Dashboard (queries: patients, appointments, reports)
├── EmployeesPage (queries: patients)
│   └── EmployeeList (display)
│   └── EmployeeForm (mutations: consent, patient)
├── BookingsPage (queries: appointments, shows flag)
│   └── BookingFlow (modal)
│       ├── useQuery: patients, appointmentTypes, availableSlots
│       └── useMutation: appointments.book
├── ReportsPage (queries: reports)
│   └── ReportsList (display)
└── Settings (no queries, read-only)

RegistrationFlow (separate from layout)
└── EmployerRegistrationForm (mutations: employers.create, gdpr.createConsent x3)
```

---

## Common UI Patterns

### Empty States
- **EmployeeList**: "No employees added yet"
- **BookingFlow**: "No slots available for this date"
- **ReportsList**: "No reports available"
- **Appointments in Dashboard**: "No appointments yet"

### Loading States
- **EmployerLayout**: Shows "Loading..." spinner during auth check
- **Routes**: Use suspense for lazy loading (default behavior)

### Form Patterns
- Modal dialogs with Dialog/DialogContent/DialogHeader components
- Required field markers: asterisk (*) in labels
- Button states: idle vs submitting (button text changes)
- Error display: console.error (no toast notifications currently)

### Status Colors
- **Appointment Status**:
  - completed: green-100/green-800
  - scheduled: blue-100/blue-800
  - cancelled: red-100/red-800
  - other: gray-100/gray-800
- **Employer Status**:
  - verified: green-600
  - pending: amber-600
  - rejected: red-600
- **Report Status (fit-for-work)**:
  - fit: green-100/green-800
  - fit_with_restrictions: amber-100/amber-800
  - temporarily_unfit: red-100/red-800
  - needs_further_assessment: blue-100/blue-800

---

## Known Issues & Gaps

1. **No Error Toasts**: Forms catch errors but only log to console
2. **No Confirmation Dialogs**: Deletion operations not prevented by confirmations
3. **No Edit Forms**: EmployeeList, ReportsList are read-only
4. **Booking Verification Not Backend-Enforced**: Pending employers can technically book
5. **No Pagination UI**: Results show only first page (no next/prev buttons)
6. **Settings Read-Only**: Cannot update company info (only view)
7. **Report Timestamps**: `sentToEmployerAt` not displayed or tracked in UI
8. **No Search/Filter**: All lists unfiltered (full pagination only)

---

## Code Organization Summary

| File | Type | Lines | Purpose | Export Type |
|------|------|-------|---------|-------------|
| Dashboard.tsx | Page | ~120 | KPI dashboard | Default function |
| Employees.tsx | Page | ~42 | Employee management | Default function |
| Bookings.tsx | Page | ~88 | Booking view & trigger | Default function |
| Reports.tsx | Page | ~28 | Report view | Default function |
| Settings.tsx | Page | ~49 | Profile info | Default function |
| EmployeeForm.tsx | Component | ~143 | Add employee modal | Named function |
| EmployeeList.tsx | Component | ~56 | Employee list display | Named function |
| BookingFlow.tsx | Component | ~189 | 3-step booking wizard | Named function |
| ReportsList.tsx | Component | ~66 | Report list display | Named function |
| EmployerRegistrationForm.tsx | Component | ~357 | 3-step registration | Named function |
| EmployerLayout.tsx | Layout | ~142 | Auth + sidebar + context | Default function |
| index.ts | Barrel | ~6 | Export barrel | Re-exports |

**Total Employer Portal Code**: ~1,330 lines (pages + components)

---

## Integration Checklist

- [x] All pages use `useOutletContext` for employer data
- [x] All queries use `"skip"` pattern when missing employerId
- [x] All mutations use try/catch with error logging
- [x] Forms update state and disable submit while submitting
- [x] Modals accept `onClose` callback for cleanup
- [x] Verification status enforced on BookingsPage (UX only)
- [x] Real-time subscriptions active on all queries
- [x] GDPR consent created with every employee
- [x] All timestamp displays use `toLocaleDateString()`
- [x] Sidebar NavLinks use React Router active styling

---

## End of Employer Portal Feature Map
