# OccuHealth GDPR Pivot - Employer Portal

**Sprint**: 04 of 06
**Index**: OCCUHEALTH_GDPR_INDEX
**Depends On**: OCCUHEALTH_GDPR_SPRINT_03_AUTH
**Next**: OCCUHEALTH_GDPR_SPRINT_05_DOCTOR

---

## Employer Portal Routes

```
/employer/register      - Complete registration (after WorkOS)
/employer/dashboard     - Overview: stats, recent activity
/employer/employees     - List/add/edit employees
/employer/bookings      - Book appointments, view status
/employer/reports       - View received medical reports
/employer/settings      - Company profile settings
```

---

## Components to Create

### `src/components/employer/`

| Component | Purpose |
|-----------|---------|
| `EmployerRegistrationForm.tsx` | Multi-step company registration |
| `EmployerDashboard.tsx` | Stats cards, recent appointments, pending reports |
| `EmployeeList.tsx` | Table of employees with actions |
| `EmployeeForm.tsx` | Add/edit employee modal |
| `BookingFlow.tsx` | Multi-step booking wizard |
| `SlotPicker.tsx` | Calendar-based slot selection |
| `PatientDetailsForm.tsx` | Employee details + consent checkboxes |
| `ReportsList.tsx` | Table of received reports |
| `ReportViewer.tsx` | Full report display |

---

## Layout

### `src/pages/EmployerLayout.tsx`

```tsx
function EmployerLayout() {
  const { employer, isVerified } = useEmployerAuth();
  
  if (!employer) return <Navigate to="/login" />;
  
  return (
    <div className="flex">
      <Sidebar>
        <NavItem to="/employer/dashboard">Dashboard</NavItem>
        <NavItem to="/employer/employees">Employees</NavItem>
        <NavItem to="/employer/bookings">Bookings</NavItem>
        <NavItem to="/employer/reports">Reports</NavItem>
      </Sidebar>
      
      <main>
        {!isVerified && <PendingVerificationBanner />}
        <Outlet />
      </main>
    </div>
  );
}
```

---

## Backend Functions

### `convex/patients.ts` (Employee Management)

```typescript
export const create = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    dateOfBirth: v.string(),
    // ...other fields
  },
  handler: async (ctx, args) => {
    const employer = await getAuthenticatedEmployer(ctx);
    
    // Create consent records first
    const consentId = await ctx.db.insert("consents", {
      patientEmail: args.email,
      consentType: "data_processing",
      granted: true,
      grantedAt: Date.now(),
      consentText: CONSENT_TEXT_V1,
      consentVersion: "1.0",
      collectedByEmployerId: employer._id,
    });
    
    // Create patient record
    return ctx.db.insert("patients", {
      ...args,
      employerId: employer._id,
      consentId,
      createdAt: Date.now(),
    });
  },
});

export const list = query({
  handler: async (ctx) => {
    const employer = await getAuthenticatedEmployer(ctx);
    return ctx.db.query("patients")
      .withIndex("by_employer", q => q.eq("employerId", employer._id))
      .filter(q => q.eq(q.field("deletedAt"), undefined))
      .collect();
  },
});
```

### `convex/appointments.ts` (Booking)

```typescript
export const book = mutation({
  args: {
    patientId: v.id("patients"),
    slotId: v.id("availableSlots"),
    appointmentTypeId: v.id("appointmentTypes"),
    reasonForAppointment: v.optional(v.string()),
    preAppointmentNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const employer = await getAuthenticatedEmployer(ctx);
    
    // Verify employer owns this patient
    const patient = await ctx.db.get(args.patientId);
    if (patient?.employerId !== employer._id) {
      throw new Error("Unauthorized");
    }
    
    // Verify slot is available
    const slot = await ctx.db.get(args.slotId);
    if (slot?.status !== "available") {
      throw new Error("Slot not available");
    }
    
    // Create appointment
    const appointmentId = await ctx.db.insert("appointments", {
      patientId: args.patientId,
      employerId: employer._id,
      appointmentTypeId: args.appointmentTypeId,
      slotId: args.slotId,
      scheduledDate: slot.date,
      scheduledTime: slot.startTime,
      status: "scheduled",
      reasonForAppointment: args.reasonForAppointment,
      preAppointmentNotes: args.preAppointmentNotes,
      createdAt: Date.now(),
    });
    
    // Mark slot as booked
    await ctx.db.patch(args.slotId, {
      status: "booked",
      appointmentId,
    });
    
    // Audit log
    await logAction(ctx, "appointment_booked", "appointment", appointmentId);
    
    return appointmentId;
  },
});
```

---

## Booking Flow UI

### Step 1: Select Employee
- Dropdown of employees OR add new inline

### Step 2: Consent Collection
Three checkboxes (all required):
- [ ] Data processing consent
- [ ] Health data consent  
- [ ] Employer sharing consent

### Step 3: Select Appointment Type
- Card selection for appointment types

### Step 4: Select Date/Time
- Calendar view showing available slots
- Time slot buttons

### Step 5: Confirmation
- Summary of booking
- Doctor's Zoom PMI link displayed

---

## Pending Verification State

When `employer.status !== "verified"`:
- Show banner: "Your account is pending verification"
- Allow viewing employees (read-only)
- Block booking new appointments
- Block viewing reports

---

## Success Criteria

- [ ] Employer can add employees
- [ ] Consent checkboxes shown and recorded
- [ ] Employer can browse available slots
- [ ] Employer can complete booking
- [ ] Pending employers cannot book

→ Next: OCCUHEALTH_GDPR_SPRINT_05_DOCTOR
