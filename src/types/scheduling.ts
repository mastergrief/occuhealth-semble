import { Id } from "../../convex/_generated/dataModel";

// ---------------------------------------------------------------------------
// Recurring Slots Types
// ---------------------------------------------------------------------------

/**
 * A single time slot template (start/end time pair).
 */
export interface TimeSlotTemplate {
  startTime: string; // HH:MM (24-hour)
  endTime: string; // HH:MM (24-hour)
}

/**
 * Configuration for creating recurring slots.
 */
export interface RecurringSlotConfig {
  templateName?: string;
  daysOfWeek: number[]; // ISO weekdays: 1=Mon, 7=Sun
  timeSlots: TimeSlotTemplate[];
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  conflictResolution: ConflictResolution;
}

/**
 * How to handle conflicts when creating recurring slots.
 */
export type ConflictResolution =
  | "skip" // Skip conflicting slots, create the rest
  | "overwrite_available" // Overwrite available slots, skip booked/blocked
  | "fail_on_conflict"; // Fail entire operation if any conflicts

/**
 * Details about a slot conflict.
 */
export interface SlotConflict {
  date: string;
  startTime: string;
  reason: "booked" | "blocked" | "available";
  existingSlotId: Id<"availableSlots">;
}

/**
 * Result from previewRecurringSlots query.
 */
export interface PreviewResult {
  totalSlots: number;
  proposedSlots: Record<string, TimeSlotTemplate[]>;
  conflicts: SlotConflict[];
  summary: {
    daysCount: number;
    slotsPerDay: number;
    conflictsCount: number;
  };
}

/**
 * Result from createRecurringSlots mutation.
 */
export interface CreateRecurringResult {
  templateId: Id<"recurringSlotTemplates">;
  created: number;
  skipped: number;
  conflicts: number;
  conflictDetails: SlotConflict[];
}

/**
 * Result from deleteTemplateSlots mutation.
 */
export interface DeleteTemplateResult {
  deleted: number;
  skippedBooked: number;
}

/**
 * How to delete template slots.
 */
export type DeleteMode =
  | "future_only" // Only delete slots with date >= today
  | "all_available" // Delete all available slots (skip booked)
  | "all"; // Delete everything (warning: loses bookings)

/**
 * Template with slot counts (returned from getTemplates).
 */
export interface TemplateWithCounts {
  _id: Id<"recurringSlotTemplates">;
  _creationTime: number;
  doctorId: Id<"doctorSettings">;
  name?: string;
  daysOfWeek: number[];
  timeSlots: TimeSlotTemplate[];
  startDate: string;
  endDate: string;
  createdAt: number;
  status: "active" | "archived";
  slotCounts: {
    total: number;
    available: number;
    booked: number;
    blocked: number;
  };
}

/**
 * Day of week labels (ISO weekday format).
 */
export const DAY_LABELS: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

/**
 * Short day labels for compact display.
 */
export const DAY_LABELS_SHORT: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
  7: "Sun",
};
