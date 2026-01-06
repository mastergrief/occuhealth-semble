# Error Handling & UX Improvements
**Sprint**: 05 of 06
**Index**: BOOKING_FLOW_FIX_INDEX
**Depends On**: BOOKING_FLOW_FIX_SPRINT_04_IMPLEMENTATION
**Next**: BOOKING_FLOW_FIX_SPRINT_06_BROWSER_TESTING

---

## Current Error Handling Gaps

### Gap 1: No Loading States

**File**: `src/components/employer/BookingFlow.tsx`
**Lines**: 30-33

```typescript
// CURRENT: No loading indicators
const patientsResult = useQuery(api.patients.list, { ... });
const appointmentTypes = useQuery(api.appointmentTypes.listActive);
const availableSlots = useQuery(api.availableSlots.getAvailable, { ... });

// Both undefined (loading) and [] (empty) render the same way!
```

**User Experience**:
- User sees empty dropdown during loading
- No visual feedback that data is being fetched
- Confusing UX when queries complete with no data

---

### Gap 2: No Empty State Feedback

**File**: `src/components/employer/BookingFlow.tsx`
**Lines**: 88-92

```typescript
// CURRENT: No empty state message
{appointmentTypes?.map((t) => (
  <option key={t._id} value={t._id}>
    {t.name} ({t.durationMinutes} min)
  </option>
))}
// If appointmentTypes = [], user sees nothing - no explanation
```

**User Experience**:
- Dropdown shows only "Choose type..." with no other options
- User has no idea why there are no options
- No guidance on what to do

---

### Gap 3: Console-Only Error Handling

**File**: `src/components/employer/BookingFlow.tsx`
**Lines**: 47-50

```typescript
// CURRENT: Error only logged to console
} catch (error) {
  console.error("Booking failed:", error);
  // No toast, no alert, no UI feedback!
}
```

**User Experience**:
- User clicks "Confirm Booking"
- Button re-enables after failure
- No indication that booking failed
- User may click again or assume it worked

---

## Recommended Fixes

### Fix 1: Add Loading Skeleton

```typescript
// src/components/employer/BookingFlow.tsx

// Before Step 1 form fields
const isLoading = patients === undefined || appointmentTypes === undefined;

{isLoading ? (
  <div className="space-y-4">
    <div>
      <Label>Select Employee</Label>
      <div className="h-10 bg-slate-200 animate-pulse rounded-md" />
    </div>
    <div>
      <Label>Appointment Type</Label>
      <div className="h-10 bg-slate-200 animate-pulse rounded-md" />
    </div>
  </div>
) : (
  // Existing form fields
)}
```

---

### Fix 2: Add Empty State Feedback

```typescript
// src/components/employer/BookingFlow.tsx

{appointmentTypes === undefined ? (
  <div className="h-10 bg-slate-200 animate-pulse rounded-md" />
) : appointmentTypes.length === 0 ? (
  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
    <div className="flex items-center gap-2">
      <AlertTriangle className="h-5 w-5 text-amber-600" />
      <p className="text-amber-800 font-medium">
        No appointment types available
      </p>
    </div>
    <p className="text-sm text-amber-600 mt-1">
      Contact your administrator to configure appointment types.
    </p>
  </div>
) : (
  <select
    value={selectedType}
    onChange={(e) => setSelectedType(e.target.value)}
    className="..."
  >
    <option value="">Choose type...</option>
    {appointmentTypes.map((t) => (
      <option key={t._id} value={t._id}>
        {t.name} ({t.durationMinutes} min)
      </option>
    ))}
  </select>
)}
```

---

### Fix 3: Add Toast Notifications

**Step 1**: Install sonner

```bash
npm install sonner
```

**Step 2**: Add Toaster to App.tsx

```typescript
// src/App.tsx
import { Toaster } from "sonner";

function App() {
  return (
    <ConvexProvider client={convex}>
      <Toaster position="top-right" />
      {/* ... existing routes */}
    </ConvexProvider>
  );
}
```

**Step 3**: Update BookingFlow error handling

```typescript
// src/components/employer/BookingFlow.tsx
import { toast } from "sonner";
import { ConvexError } from "convex/values";

const handleSubmit = async () => {
  if (!selectedPatient || !selectedType || !selectedSlot) return;

  setIsSubmitting(true);
  try {
    await bookAppointment({
      patientId: selectedPatient,
      employerId,
      appointmentTypeId: selectedType,
      slotId: selectedSlot,
      reasonForAppointment: reason || undefined,
    });
    toast.success("Booking confirmed", {
      description: "Your appointment has been scheduled.",
    });
    onClose();
  } catch (error) {
    console.error("Booking failed:", error);
    if (error instanceof ConvexError) {
      const { code, message } = error.data as { code: string; message: string };
      toast.error(`Booking failed: ${code}`, {
        description: message,
      });
    } else {
      toast.error("Booking failed", {
        description: "An unexpected error occurred. Please try again.",
      });
    }
  } finally {
    setIsSubmitting(false);
  }
};
```

---

### Fix 4: Defer Slot Query Until Step 2

```typescript
// src/components/employer/BookingFlow.tsx

// CURRENT (wasteful): Fetches on mount
const availableSlots = useQuery(api.availableSlots.getAvailable, {
  date: selectedDate
});

// RECOMMENDED: Only fetch when in Step 2+
const availableSlots = useQuery(
  api.availableSlots.getAvailable,
  step >= 2 ? { date: selectedDate } : "skip"
);
```

**Benefits**:
- Reduces initial WebSocket messages by 33%
- Defers slot query until user reaches Step 2
- Prevents unnecessary subscription during Step 1

---

## Backend Validation Enhancement

**File**: `convex/appointments.ts`
**Lines**: ~170 (inside book mutation)

```typescript
// ADD: Validate appointment type exists and is active
const appointmentType = await ctx.db.get(args.appointmentTypeId);
if (!appointmentType) {
  throw new ConvexError({
    code: "APPOINTMENT_TYPE_NOT_FOUND" as const,
    message: "Appointment type not found",
  });
}
if (!appointmentType.isActive) {
  throw new ConvexError({
    code: "APPOINTMENT_TYPE_INACTIVE" as const,
    message: "This appointment type is no longer available",
  });
}
```

---

## UX Improvement Summary

| Improvement | File | Effort | Impact |
|-------------|------|--------|--------|
| Loading skeleton | BookingFlow.tsx | 30 min | HIGH |
| Empty state message | BookingFlow.tsx | 30 min | HIGH |
| Toast notifications | App.tsx, BookingFlow.tsx | 1 hour | HIGH |
| Deferred slot query | BookingFlow.tsx | 15 min | MEDIUM |
| Backend type validation | appointments.ts | 15 min | MEDIUM |

---

## Testing Checklist

| Scenario | Expected Behavior |
|----------|-------------------|
| Queries loading | Skeleton placeholders shown |
| appointmentTypes empty | Warning banner displayed |
| Booking success | Success toast appears |
| Booking fails (slot taken) | Error toast with "SLOT_UNAVAILABLE" |
| Booking fails (unknown) | Generic error toast |
| Network error | Error toast with retry suggestion |

---

→ Next: BOOKING_FLOW_FIX_SPRINT_06_BROWSER_TESTING
