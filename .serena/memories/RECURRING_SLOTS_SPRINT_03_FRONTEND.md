# Frontend Components
**Sprint**: 03 of 06
**Index**: RECURRING_SLOTS_INDEX
**Depends On**: RECURRING_SLOTS_SPRINT_02_BACKEND
**Next**: RECURRING_SLOTS_SPRINT_04_TESTING

---

## Component Structure

```
src/pages/doctor/Schedule.tsx (enhance)
├── src/components/doctor/recurring/
│   ├── RecurringSlotForm.tsx      - Main form container
│   ├── DaySelector.tsx            - 7 toggleable day buttons
│   ├── TimeSlotList.tsx           - Add/remove time slots
│   ├── QuickFillBar.tsx           - Auto-generate slots
│   ├── WeekRangeSelector.tsx      - Date range picker
│   ├── SlotPreview.tsx            - Preview + conflicts
│   └── ConflictResolution.tsx     - Handle conflict options
│
└── src/components/doctor/WeekCalendarView.tsx - 7-day grid
```

---

## ASCII Wireframe

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  MANAGE SCHEDULE                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│  [Single Slot] | [+ Recurring Slots]                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─ ADD RECURRING AVAILABILITY ─────────────────────────────────────────┐   │
│  │                                                                       │   │
│  │  Template Name (optional): [ Standard Week Schedule          ]       │   │
│  │                                                                       │   │
│  │  SELECT DAYS                                                          │   │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐             │   │
│  │  │ Mon │ │ Tue │ │ Wed │ │ Thu │ │ Fri │ │ Sat │ │ Sun │             │   │
│  │  │ [✓] │ │ [✓] │ │ [✓] │ │ [✓] │ │ [✓] │ │     │ │     │             │   │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘             │   │
│  │  [Weekdays] [All] [Clear]                                             │   │
│  │                                                                       │   │
│  │  TIME SLOTS                                                           │   │
│  │  ┌──────────────────────────────────────────────────────────────────┐│   │
│  │  │ [09:00] - [09:30]  (30 min)  [×]                                 ││   │
│  │  │ [09:30] - [10:00]  (30 min)  [×]                                 ││   │
│  │  │ [10:00] - [10:30]  (30 min)  [×]                                 ││   │
│  │  │ [+ Add Slot]                                                      ││   │
│  │  └──────────────────────────────────────────────────────────────────┘│   │
│  │                                                                       │   │
│  │  QUICK FILL                                                           │   │
│  │  Duration: [30 min ▼]  From: [09:00]  To: [17:00]  [Fill]            │   │
│  │                                                                       │   │
│  │  APPLY TO                                                             │   │
│  │  Week Starting: [2026-01-06 ▼]  Ending: [2026-01-31 ▼]  (4 weeks)   │   │
│  │                                                                       │   │
│  │  ┌─ PREVIEW ────────────────────────────────────────────────────────┐│   │
│  │  │ Creating 80 slots across 20 days                                  ││   │
│  │  │                                                                   ││   │
│  │  │ Mon 06 Jan: 09:00, 09:30, 10:00, 10:30 (4 slots)                 ││   │
│  │  │ Tue 07 Jan: 09:00, 09:30, 10:00, 10:30 (4 slots)                 ││   │
│  │  │ ...                                                               ││   │
│  │  │                                                                   ││   │
│  │  │ ⚠️ 3 CONFLICTS DETECTED                                           ││   │
│  │  │ • Mon 06 Jan 09:00 - Already booked                              ││   │
│  │  │ • Wed 08 Jan 10:00 - Blocked                                     ││   │
│  │  │                                                                   ││   │
│  │  │ [×] Skip conflicts  [ ] Overwrite available                      ││   │
│  │  └──────────────────────────────────────────────────────────────────┘│   │
│  │                                                                       │   │
│  │  [Cancel]                              [Create 77 Slots]             │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Specifications

### 1. DaySelector.tsx

```typescript
interface DaySelectorProps {
  selected: number[];              // ISO weekdays [1-7]
  onChange: (days: number[]) => void;
  disabled?: boolean;
}

// Features:
// - 7 toggleable buttons (Mon-Sun)
// - Quick select: [Weekdays] [All] [Clear]
// - Visual feedback for selected state
// - Accessible: keyboard navigation, aria-pressed
```

**Implementation Notes:**
- Use shadcn `Button` with `variant="outline"` / `variant="default"` for toggle
- ISO weekdays: Mon=1, Tue=2, ..., Sun=7
- Quick select buttons: `[1,2,3,4,5]` for weekdays

### 2. TimeSlotList.tsx

```typescript
interface TimeSlotListProps {
  slots: Array<{ startTime: string; endTime: string }>;
  onChange: (slots: Array<{ startTime: string; endTime: string }>) => void;
  maxSlots?: number;               // Default 50
}

// Features:
// - Add/remove time slots
// - Start/end time inputs (type="time")
// - Duration display (calculated)
// - Validation: end > start
// - Max slots enforcement
```

**Implementation Notes:**
- Use native `<Input type="time" />` for time pickers
- Calculate duration: `(endTime - startTime)` display as "30 min", "1 hour"
- Remove button: `lucide-react` X icon

### 3. QuickFillBar.tsx

```typescript
interface QuickFillBarProps {
  onFill: (slots: Array<{ startTime: string; endTime: string }>) => void;
}

// State:
// - duration: 15 | 30 | 45 | 60 minutes
// - rangeStart: string (HH:MM)
// - rangeEnd: string (HH:MM)

// Features:
// - Duration dropdown (15, 30, 45, 60 min)
// - Start/end time inputs
// - Fill button generates slot array
```

**Generation Logic:**
```typescript
function generateSlots(duration: number, start: string, end: string) {
  const slots = [];
  let current = parseTime(start);
  const endTime = parseTime(end);
  
  while (current + duration <= endTime) {
    slots.push({
      startTime: formatTime(current),
      endTime: formatTime(current + duration),
    });
    current += duration;
  }
  return slots;
}
```

### 4. WeekRangeSelector.tsx

```typescript
interface WeekRangeSelectorProps {
  startDate: string;               // YYYY-MM-DD
  endDate: string;
  onChange: (start: string, end: string) => void;
}

// Features:
// - Two date inputs (start, end)
// - Week count display ("4 weeks")
// - Quick select: "This Week", "Next 2 Weeks", "This Month"
// - Validation: start <= end
```

### 5. SlotPreview.tsx

```typescript
interface SlotPreviewProps {
  preview: PreviewResult | undefined;
  isLoading: boolean;
}

// Features:
// - Total slot count
// - Grouped by date display (collapsible)
// - Conflict highlighting (⚠️ icon)
// - Conflict details with reason
```

### 6. ConflictResolution.tsx

```typescript
interface ConflictResolutionProps {
  conflicts: SlotConflict[];
  resolution: ConflictResolution;
  onChange: (resolution: ConflictResolution) => void;
}

// Features:
// - Radio buttons for resolution options
// - "Skip conflicts" (default)
// - "Overwrite available slots"
// - Disabled if no conflicts
```

### 7. RecurringSlotForm.tsx (Container)

```typescript
// State:
const [templateName, setTemplateName] = useState("");
const [selectedDays, setSelectedDays] = useState<number[]>([1,2,3,4,5]);
const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
  { startTime: "09:00", endTime: "09:30" }
]);
const [startDate, setStartDate] = useState(getMonday(new Date()));
const [endDate, setEndDate] = useState(addWeeks(getMonday(new Date()), 4));
const [conflictResolution, setConflictResolution] = useState<ConflictResolution>("skip");
const [isSubmitting, setIsSubmitting] = useState(false);

// Queries/Mutations:
const preview = useQuery(api.availableSlots.previewRecurringSlots, {
  daysOfWeek: selectedDays,
  timeSlots,
  startDate,
  endDate,
});

const createRecurring = useMutation(api.availableSlots.createRecurringSlots);

// Submission:
const handleSubmit = async () => {
  setIsSubmitting(true);
  try {
    const result = await createRecurring({
      templateName: templateName || undefined,
      daysOfWeek: selectedDays,
      timeSlots,
      startDate,
      endDate,
      conflictResolution,
    });
    toast.success(`Created ${result.created} slots`);
    onClose();
  } catch (err) {
    toast.error(err.message);
  } finally {
    setIsSubmitting(false);
  }
};
```

---

## Week Calendar View

### WeekCalendarView.tsx

```typescript
interface WeekCalendarViewProps {
  weekStart: string;               // Monday date YYYY-MM-DD
  onWeekChange: (weekStart: string) => void;
}

// Features:
// - 7 columns (Mon-Sun)
// - Slot cards with status color
// - Navigation: prev/next week
// - Click slot to block/unblock
// - Click day header to add slot
```

**ASCII Layout:**
```
┌─────────┬─────────┬─────────┬─────────┬─────────┬─────────┬─────────┐
│   MON   │   TUE   │   WED   │   THU   │   FRI   │   SAT   │   SUN   │
│  Jan 6  │  Jan 7  │  Jan 8  │  Jan 9  │  Jan 10 │  Jan 11 │  Jan 12 │
├─────────┼─────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
│ 09:00🟢 │ 09:00🔵 │ 09:00🟢 │ 09:00🟢 │ 09:00⬜ │         │         │
│ 09:30🟢 │ 09:30🟢 │ 09:30🔵 │ 09:30🟢 │ 09:30🟢 │   No    │   No    │
│ 10:00🟢 │ 10:00🟢 │ 10:00🟢 │ 10:00🔵 │ 10:00🟢 │  slots  │  slots  │
└─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┘
  🟢 bg-green-100  🔵 bg-blue-100  ⬜ bg-gray-100
```

---

## State Management

### Schedule.tsx Integration

```typescript
// Add to existing Schedule.tsx

const [viewMode, setViewMode] = useState<"single" | "recurring" | "week">("single");
const [showRecurringForm, setShowRecurringForm] = useState(false);
const [weekStart, setWeekStart] = useState(getMonday(new Date()));

// View toggle
<div className="flex gap-2 mb-4">
  <Button 
    variant={viewMode === "single" ? "default" : "outline"}
    onClick={() => setViewMode("single")}
  >
    Single Slot
  </Button>
  <Button 
    variant={viewMode === "recurring" ? "default" : "outline"}
    onClick={() => setShowRecurringForm(true)}
  >
    + Recurring Slots
  </Button>
</div>

// Recurring form dialog
<Dialog open={showRecurringForm} onOpenChange={setShowRecurringForm}>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
    <RecurringSlotForm onClose={() => setShowRecurringForm(false)} />
  </DialogContent>
</Dialog>
```

---

## Styling Guidelines

### Color Coding
| Status | Background | Border | Text |
|--------|------------|--------|------|
| Available | `bg-green-50` | `border-green-200` | `text-green-700` |
| Booked | `bg-blue-50` | `border-blue-200` | `text-blue-700` |
| Blocked | `bg-gray-50` | `border-gray-200` | `text-gray-500` |
| Conflict | `bg-amber-50` | `border-amber-300` | `text-amber-700` |

### Component Classes
```css
/* Day selector button */
.day-btn-selected: bg-primary text-primary-foreground
.day-btn-unselected: bg-background border hover:bg-accent

/* Time slot row */
.time-slot-row: flex items-center gap-2 p-2 rounded border

/* Preview card */
.preview-card: p-4 bg-muted/50 rounded-lg border

/* Conflict warning */
.conflict-badge: inline-flex items-center gap-1 text-amber-600
```

---

## Acceptance Criteria

- [ ] DaySelector allows toggling Mon-Sun with quick select buttons
- [ ] TimeSlotList supports add/remove with validation
- [ ] QuickFillBar generates correct slot array
- [ ] WeekRangeSelector validates date range
- [ ] SlotPreview shows real-time preview from query
- [ ] ConflictResolution options work correctly
- [ ] Form submission calls mutation and handles response
- [ ] Success toast shows created count
- [ ] Error toast shows meaningful error message
- [ ] Dialog closes on success
- [ ] Week calendar view shows 7-day grid (if implementing)

---

→ Next: **RECURRING_SLOTS_SPRINT_04_TESTING** (Testing & Quality)
