# OccuHealth GDPR Pivot - Doctor Portal

**Sprint**: 05 of 06
**Index**: OCCUHEALTH_GDPR_INDEX
**Depends On**: OCCUHEALTH_GDPR_SPRINT_03_AUTH
**Next**: OCCUHEALTH_GDPR_SPRINT_06_ADMIN_GDPR

---

## Doctor Portal Routes

```
/doctor/dashboard       - Today's appointments overview
/doctor/appointments    - Full appointment calendar/list
/doctor/schedule        - Manage availability slots
/doctor/reports         - Create and send reports
/doctor/settings        - Profile, Zoom PMI link
```

---

## Components to Create

### `src/components/doctor/`

| Component | Purpose |
|-----------|---------|
| `DoctorDashboard.tsx` | Today's schedule, stats |
| `AppointmentsList.tsx` | Table/calendar of all appointments |
| `AppointmentDetail.tsx` | View patient info, join Zoom, create report |
| `ScheduleManager.tsx` | Weekly grid to set available slots |
| `ReportForm.tsx` | Fitness-for-work report creation |
| `ClinicalNotesForm.tsx` | Private clinical notes (not shared) |
| `DoctorSettings.tsx` | Profile + Zoom PMI link |

---

## Layout

### `src/pages/DoctorLayout.tsx`

```tsx
function DoctorLayout() {
  const { doctor } = useDoctorAuth();
  
  if (!doctor) return <Navigate to="/login" />;
  
  return (
    <div className="flex">
      <Sidebar>
        <NavItem to="/doctor/dashboard">Dashboard</NavItem>
        <NavItem to="/doctor/appointments">Appointments</NavItem>
        <NavItem to="/doctor/schedule">Schedule</NavItem>
        <NavItem to="/doctor/reports">Reports</NavItem>
        <NavItem to="/doctor/settings">Settings</NavItem>
      </Sidebar>
      
      <main>
        <Outlet />
      </main>
    </div>
  );
}
```

---

## Backend Functions

### `convex/availableSlots.ts` (Schedule Management)

```typescript
export const createSlots = mutation({
  args: {
    slots: v.array(v.object({
      date: v.string(),
      startTime: v.string(),
      endTime: v.string(),
    })),
  },
  handler: async (ctx, { slots }) => {
    await requireDoctor(ctx);
    
    for (const slot of slots) {
      await ctx.db.insert("availableSlots", {
        ...slot,
        status: "available",
      });
    }
  },
});

export const blockSlot = mutation({
  args: { slotId: v.id("availableSlots") },
  handler: async (ctx, { slotId }) => {
    await requireDoctor(ctx);
    await ctx.db.patch(slotId, { status: "blocked" });
  },
});

export const getByDateRange = query({
  args: { startDate: v.string(), endDate: v.string() },
  handler: async (ctx, { startDate, endDate }) => {
    return ctx.db.query("availableSlots")
      .withIndex("by_date")
      .filter(q => 
        q.and(
          q.gte(q.field("date"), startDate),
          q.lte(q.field("date"), endDate)
        )
      )
      .collect();
  },
});
```

### `convex/appointments.ts` (Doctor View)

```typescript
export const getTodaysAppointments = query({
  handler: async (ctx) => {
    await requireDoctor(ctx);
    const today = new Date().toISOString().split("T")[0];
    
    const appointments = await ctx.db.query("appointments")
      .withIndex("by_date", q => q.eq("scheduledDate", today))
      .collect();
    
    // Enrich with patient and employer data
    return Promise.all(appointments.map(async (apt) => ({
      ...apt,
      patient: await ctx.db.get(apt.patientId),
      employer: await ctx.db.get(apt.employerId),
      appointmentType: await ctx.db.get(apt.appointmentTypeId),
    })));
  },
});

export const markCompleted = mutation({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, { appointmentId }) => {
    await requireDoctor(ctx);
    await ctx.db.patch(appointmentId, {
      status: "completed",
      completedAt: Date.now(),
    });
    await logAction(ctx, "appointment_completed", "appointment", appointmentId);
  },
});
```

### `convex/reports.ts` (Report Creation)

```typescript
export const create = mutation({
  args: {
    appointmentId: v.id("appointments"),
    fitForWork: v.union(
      v.literal("fit"), v.literal("fit_with_restrictions"),
      v.literal("temporarily_unfit"), v.literal("needs_further_assessment")
    ),
    summary: v.string(),
    restrictions: v.optional(v.array(v.string())),
    followUpRequired: v.boolean(),
    followUpNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireDoctor(ctx);
    
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) throw new Error("Appointment not found");
    
    const reportId = await ctx.db.insert("reports", {
      appointmentId: args.appointmentId,
      patientId: appointment.patientId,
      employerId: appointment.employerId,
      fitForWork: args.fitForWork,
      summary: args.summary,
      restrictions: args.restrictions,
      followUpRequired: args.followUpRequired,
      followUpNotes: args.followUpNotes,
      signedAt: Date.now(),
    });
    
    // Link report to appointment
    await ctx.db.patch(args.appointmentId, { reportId });
    
    await logAction(ctx, "report_created", "report", reportId);
    
    return reportId;
  },
});

export const sendToEmployer = mutation({
  args: { reportId: v.id("reports") },
  handler: async (ctx, { reportId }) => {
    await requireDoctor(ctx);
    await ctx.db.patch(reportId, { sentToEmployerAt: Date.now() });
    await logAction(ctx, "report_sent", "report", reportId);
  },
});
```

---

## Doctor Dashboard UI

### Today's View
- Count of appointments by status
- Timeline of today's appointments
- Quick actions: "Mark Complete", "Create Report"

### Appointment Detail Modal
- Patient name, DOB, job title
- Employer company name
- Reason for appointment
- Pre-appointment notes
- **Join Zoom** button (uses doctor's PMI)
- **Create Report** button

---

## Clinical Notes (Private)

Stored in `clinicalNotes` table - NOT shared with employer:
- Clinical findings
- Diagnosis
- Internal notes

Only the `reports` table content goes to employer.

---

## Success Criteria

- [ ] Doctor can view today's appointments
- [ ] Doctor can manage schedule (add/block slots)
- [ ] Doctor can mark appointments complete
- [ ] Doctor can create and send reports
- [ ] Clinical notes stay private

→ Next: OCCUHEALTH_GDPR_SPRINT_06_ADMIN_GDPR
