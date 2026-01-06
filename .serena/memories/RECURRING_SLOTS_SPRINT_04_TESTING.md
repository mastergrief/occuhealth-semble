# Testing & Quality
**Sprint**: 04 of 06
**Index**: RECURRING_SLOTS_INDEX
**Depends On**: RECURRING_SLOTS_SPRINT_02_BACKEND, RECURRING_SLOTS_SPRINT_03_FRONTEND
**Next**: RECURRING_SLOTS_SPRINT_05_SECURITY

---

## Test Strategy Overview

| Test Type | Framework | Coverage Target | Files |
|-----------|-----------|-----------------|-------|
| Unit Tests | Vitest | 80%+ | `*.test.tsx`, `*.test.ts` |
| Integration | Vitest | Core flows | Backend mutations |
| E2E/Manual | Browser-CLI | Critical paths | See Sprint 06 |

---

## Unit Tests - Backend

### File: `convex/__tests__/dateUtils.test.ts` (NEW)

```typescript
import { describe, it, expect } from "vitest";
import {
  calculateDatesForDays,
  doTimeSlotsOverlap,
  isValidDateFormat,
  isValidTimeFormat,
  validateDaysOfWeek,
  validateDateRange,
  validateTimeSlots,
} from "../lib/dateUtils";

describe("calculateDatesForDays", () => {
  it("returns correct dates for Mon-Fri in one week", () => {
    const dates = calculateDatesForDays("2026-01-05", "2026-01-11", [1,2,3,4,5]);
    expect(dates).toEqual([
      "2026-01-05", // Mon
      "2026-01-06", // Tue
      "2026-01-07", // Wed
      "2026-01-08", // Thu
      "2026-01-09", // Fri
    ]);
  });

  it("handles month boundary correctly", () => {
    const dates = calculateDatesForDays("2026-01-29", "2026-02-04", [1,2,3,4,5]);
    expect(dates).toContain("2026-01-29"); // Thu
    expect(dates).toContain("2026-01-30"); // Fri
    expect(dates).toContain("2026-02-02"); // Mon
    expect(dates).toContain("2026-02-03"); // Tue
    expect(dates).toContain("2026-02-04"); // Wed
  });

  it("handles weekend-only selection", () => {
    const dates = calculateDatesForDays("2026-01-05", "2026-01-18", [6,7]);
    expect(dates).toHaveLength(4); // 2 weekends
    expect(dates).toContain("2026-01-10"); // Sat
    expect(dates).toContain("2026-01-11"); // Sun
  });

  it("returns empty array for no matching days", () => {
    const dates = calculateDatesForDays("2026-01-05", "2026-01-09", [6,7]);
    expect(dates).toEqual([]);
  });
});

describe("doTimeSlotsOverlap", () => {
  it("detects overlapping slots", () => {
    expect(doTimeSlotsOverlap(
      { startTime: "09:00", endTime: "10:00" },
      { startTime: "09:30", endTime: "10:30" }
    )).toBe(true);
  });

  it("detects adjacent non-overlapping slots", () => {
    expect(doTimeSlotsOverlap(
      { startTime: "09:00", endTime: "09:30" },
      { startTime: "09:30", endTime: "10:00" }
    )).toBe(false);
  });

  it("detects contained slots", () => {
    expect(doTimeSlotsOverlap(
      { startTime: "09:00", endTime: "12:00" },
      { startTime: "10:00", endTime: "11:00" }
    )).toBe(true);
  });
});

describe("isValidDateFormat", () => {
  it("accepts valid YYYY-MM-DD", () => {
    expect(isValidDateFormat("2026-01-15")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(isValidDateFormat("01-15-2026")).toBe(false);
    expect(isValidDateFormat("2026/01/15")).toBe(false);
    expect(isValidDateFormat("2026-1-15")).toBe(false);
  });
});

describe("isValidTimeFormat", () => {
  it("accepts valid HH:MM", () => {
    expect(isValidTimeFormat("09:00")).toBe(true);
    expect(isValidTimeFormat("23:59")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(isValidTimeFormat("9:00")).toBe(false);
    expect(isValidTimeFormat("09:0")).toBe(false);
    expect(isValidTimeFormat("9:0")).toBe(false);
  });
});

describe("validateDaysOfWeek", () => {
  it("throws on empty array", () => {
    expect(() => validateDaysOfWeek([])).toThrow("At least one day must be selected");
  });

  it("throws on invalid day number", () => {
    expect(() => validateDaysOfWeek([0])).toThrow("Invalid day of week");
    expect(() => validateDaysOfWeek([8])).toThrow("Invalid day of week");
  });

  it("accepts valid days", () => {
    expect(() => validateDaysOfWeek([1,2,3,4,5])).not.toThrow();
    expect(() => validateDaysOfWeek([6,7])).not.toThrow();
  });
});

describe("validateTimeSlots", () => {
  it("throws on empty array", () => {
    expect(() => validateTimeSlots([])).toThrow("At least one time slot required");
  });

  it("throws on > 50 slots", () => {
    const slots = Array(51).fill({ startTime: "09:00", endTime: "09:30" });
    expect(() => validateTimeSlots(slots)).toThrow("Maximum 50 time slots");
  });

  it("throws on invalid time format", () => {
    expect(() => validateTimeSlots([{ startTime: "9:00", endTime: "09:30" }]))
      .toThrow("Invalid time format");
  });

  it("throws on start >= end", () => {
    expect(() => validateTimeSlots([{ startTime: "10:00", endTime: "09:30" }]))
      .toThrow("End time must be after start time");
  });
});
```

---

## Unit Tests - Frontend

### File: `src/components/doctor/recurring/__tests__/DaySelector.test.tsx` (NEW)

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DaySelector } from "../DaySelector";

describe("DaySelector", () => {
  it("renders all 7 days", () => {
    render(<DaySelector selected={[]} onChange={vi.fn()} />);
    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("Tue")).toBeInTheDocument();
    expect(screen.getByText("Sun")).toBeInTheDocument();
  });

  it("shows selected state for active days", () => {
    render(<DaySelector selected={[1,2,3]} onChange={vi.fn()} />);
    const monBtn = screen.getByRole("button", { name: /mon/i });
    expect(monBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onChange when day clicked", () => {
    const onChange = vi.fn();
    render(<DaySelector selected={[1]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /tue/i }));
    expect(onChange).toHaveBeenCalledWith([1, 2]);
  });

  it("removes day when already selected", () => {
    const onChange = vi.fn();
    render(<DaySelector selected={[1,2]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /mon/i }));
    expect(onChange).toHaveBeenCalledWith([2]);
  });

  it("Weekdays button selects Mon-Fri", () => {
    const onChange = vi.fn();
    render(<DaySelector selected={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /weekdays/i }));
    expect(onChange).toHaveBeenCalledWith([1,2,3,4,5]);
  });

  it("Clear button removes all", () => {
    const onChange = vi.fn();
    render(<DaySelector selected={[1,2,3,4,5]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
```

### File: `src/components/doctor/recurring/__tests__/TimeSlotList.test.tsx` (NEW)

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TimeSlotList } from "../TimeSlotList";

describe("TimeSlotList", () => {
  const defaultSlots = [
    { startTime: "09:00", endTime: "09:30" },
    { startTime: "10:00", endTime: "10:30" },
  ];

  it("renders all time slots", () => {
    render(<TimeSlotList slots={defaultSlots} onChange={vi.fn()} />);
    expect(screen.getAllByRole("textbox")).toHaveLength(4); // 2 start + 2 end
  });

  it("Add Slot button adds empty slot", () => {
    const onChange = vi.fn();
    render(<TimeSlotList slots={defaultSlots} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /add slot/i }));
    expect(onChange).toHaveBeenCalledWith([
      ...defaultSlots,
      { startTime: "09:00", endTime: "09:30" },
    ]);
  });

  it("Remove button removes slot", () => {
    const onChange = vi.fn();
    render(<TimeSlotList slots={defaultSlots} onChange={onChange} />);
    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    fireEvent.click(removeButtons[0]);
    expect(onChange).toHaveBeenCalledWith([defaultSlots[1]]);
  });

  it("shows validation error for invalid time range", () => {
    const invalidSlots = [{ startTime: "10:00", endTime: "09:00" }];
    render(<TimeSlotList slots={invalidSlots} onChange={vi.fn()} />);
    expect(screen.getByText(/end time must be after/i)).toBeInTheDocument();
  });

  it("prevents adding beyond max slots", () => {
    const manySlots = Array(50).fill({ startTime: "09:00", endTime: "09:30" });
    render(<TimeSlotList slots={manySlots} onChange={vi.fn()} maxSlots={50} />);
    expect(screen.getByRole("button", { name: /add slot/i })).toBeDisabled();
  });
});
```

### File: `src/components/doctor/recurring/__tests__/QuickFillBar.test.tsx` (NEW)

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QuickFillBar } from "../QuickFillBar";

describe("QuickFillBar", () => {
  it("generates correct slots for 30-min duration", () => {
    const onFill = vi.fn();
    render(<QuickFillBar onFill={onFill} />);
    
    // Set values (default: 30 min, 09:00-17:00)
    fireEvent.click(screen.getByRole("button", { name: /fill/i }));
    
    expect(onFill).toHaveBeenCalled();
    const slots = onFill.mock.calls[0][0];
    expect(slots.length).toBe(16); // (17-9) * 2 = 16 slots
    expect(slots[0]).toEqual({ startTime: "09:00", endTime: "09:30" });
    expect(slots[15]).toEqual({ startTime: "16:30", endTime: "17:00" });
  });

  it("generates correct slots for 1-hour duration", async () => {
    const onFill = vi.fn();
    render(<QuickFillBar onFill={onFill} />);
    
    // Change duration to 60 minutes
    fireEvent.change(screen.getByLabelText(/duration/i), { target: { value: "60" } });
    fireEvent.click(screen.getByRole("button", { name: /fill/i }));
    
    const slots = onFill.mock.calls[0][0];
    expect(slots.length).toBe(8); // (17-9) = 8 slots
  });
});
```

---

## Integration Tests

### File: `src/pages/doctor/__tests__/RecurringSlotForm.test.tsx` (NEW)

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RecurringSlotForm } from "../recurring/RecurringSlotForm";
import { useQuery, useMutation } from "convex/react";

vi.mock("convex/react");

describe("RecurringSlotForm Integration", () => {
  const mockPreview = {
    totalSlots: 20,
    proposedSlots: {
      "2026-01-05": [{ startTime: "09:00", endTime: "09:30" }],
    },
    conflicts: [],
    summary: { daysCount: 5, slotsPerDay: 4, conflictsCount: 0 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows preview when form is filled", async () => {
    vi.mocked(useQuery).mockReturnValue(mockPreview);
    vi.mocked(useMutation).mockReturnValue(vi.fn());

    render(<RecurringSlotForm onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/creating 20 slots/i)).toBeInTheDocument();
    });
  });

  it("shows conflict warning when conflicts exist", async () => {
    const previewWithConflicts = {
      ...mockPreview,
      conflicts: [{ date: "2026-01-05", startTime: "09:00", reason: "booked" }],
      summary: { ...mockPreview.summary, conflictsCount: 1 },
    };
    vi.mocked(useQuery).mockReturnValue(previewWithConflicts);

    render(<RecurringSlotForm onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/1 conflict/i)).toBeInTheDocument();
    });
  });

  it("calls mutation and closes on success", async () => {
    const mockMutation = vi.fn().mockResolvedValue({ created: 20 });
    vi.mocked(useQuery).mockReturnValue(mockPreview);
    vi.mocked(useMutation).mockReturnValue(mockMutation);
    const onClose = vi.fn();

    render(<RecurringSlotForm onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: /create.*slots/i }));

    await waitFor(() => {
      expect(mockMutation).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("shows error toast on mutation failure", async () => {
    const mockMutation = vi.fn().mockRejectedValue(new Error("Validation failed"));
    vi.mocked(useQuery).mockReturnValue(mockPreview);
    vi.mocked(useMutation).mockReturnValue(mockMutation);

    render(<RecurringSlotForm onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: /create.*slots/i }));

    await waitFor(() => {
      expect(screen.getByText(/validation failed/i)).toBeInTheDocument();
    });
  });
});
```

---

## Test Coverage Requirements

### Minimum Coverage Thresholds

| Category | Target | Critical? |
|----------|--------|-----------|
| Date calculation functions | 100% | Yes |
| Validation functions | 100% | Yes |
| DaySelector component | 90% | Yes |
| TimeSlotList component | 85% | Yes |
| RecurringSlotForm | 80% | Yes |
| QuickFillBar | 75% | No |
| SlotPreview | 75% | No |

### Critical Test Cases (Must Pass)

1. ✅ Date calculation crosses month boundary correctly
2. ✅ Date calculation handles year boundary (Dec→Jan)
3. ✅ Time slot overlap detection is accurate
4. ✅ Validation rejects empty day selection
5. ✅ Validation rejects invalid time formats
6. ✅ Mutation error is caught and displayed
7. ✅ Success closes dialog and shows toast
8. ✅ Conflicts are shown in preview

---

## Running Tests

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- dateUtils.test.ts

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

---

## Test Data Factories

### File: `src/__tests__/factories/slotFactory.ts` (NEW)

```typescript
import { Id } from "../../convex/_generated/dataModel";

let slotCounter = 0;

export function createMockSlot(overrides: Partial<Slot> = {}): Slot {
  slotCounter++;
  return {
    _id: `slot_${slotCounter}` as Id<"availableSlots">,
    _creationTime: Date.now(),
    doctorId: "doctor_123" as Id<"doctorSettings">,
    date: "2026-01-05",
    startTime: "09:00",
    endTime: "09:30",
    status: "available",
    ...overrides,
  };
}

export function createMockSlots(count: number, date?: string): Slot[] {
  return Array(count).fill(null).map((_, i) => 
    createMockSlot({
      date: date || "2026-01-05",
      startTime: `${9 + Math.floor(i / 2)}:${(i % 2) * 30}`.padStart(5, "0"),
      endTime: `${9 + Math.floor((i + 1) / 2)}:${((i + 1) % 2) * 30}`.padStart(5, "0"),
    })
  );
}

export function createMockPreview(overrides: Partial<PreviewResult> = {}): PreviewResult {
  return {
    totalSlots: 20,
    proposedSlots: { "2026-01-05": [{ startTime: "09:00", endTime: "09:30" }] },
    conflicts: [],
    summary: { daysCount: 5, slotsPerDay: 4, conflictsCount: 0 },
    ...overrides,
  };
}
```

---

## Acceptance Criteria

- [ ] All unit tests pass (`npm run test`)
- [ ] Coverage meets thresholds (`npm run test:coverage`)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] Critical test cases all green
- [ ] Test factories created and documented
- [ ] CI pipeline configured to run tests

---

→ Next: **RECURRING_SLOTS_SPRINT_05_SECURITY** (Security & Pre-Flight Fixes)
