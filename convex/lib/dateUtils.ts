import { ConvexError } from "convex/values";

// ---------------------------------------------------------------------------
// Date/Time Validation Utilities
// ---------------------------------------------------------------------------
// Validation functions for slot date and time formats
// ---------------------------------------------------------------------------

/**
 * Validates that a string is in YYYY-MM-DD format.
 * @param date - The date string to validate
 * @returns true if valid format, false otherwise
 */
export function isValidDateFormat(date: string): boolean {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return false;
  }
  // Check if date is actually valid (e.g., not 2024-02-30)
  const parsed = new Date(date);
  return !isNaN(parsed.getTime()) && parsed.toISOString().startsWith(date);
}

/**
 * Validates that a string is in HH:MM format (24-hour).
 * @param time - The time string to validate
 * @returns true if valid format, false otherwise
 */
export function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
}

/**
 * Validates that end time is after start time.
 * @param startTime - Start time in HH:MM format
 * @param endTime - End time in HH:MM format
 * @throws {ConvexError} VALIDATION_ERROR if end time is not after start time
 */
export function validateTimeRange(startTime: string, endTime: string): void {
  if (!isValidTimeFormat(startTime)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: `Invalid start time format: ${startTime}. Expected HH:MM (24-hour).`,
    });
  }
  if (!isValidTimeFormat(endTime)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: `Invalid end time format: ${endTime}. Expected HH:MM (24-hour).`,
    });
  }
  if (startTime >= endTime) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: `End time (${endTime}) must be after start time (${startTime}).`,
    });
  }
}

/**
 * Validates that end date is not before start date.
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @throws {ConvexError} VALIDATION_ERROR if end date is before start date
 */
export function validateDateRange(startDate: string, endDate: string): void {
  if (!isValidDateFormat(startDate)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: `Invalid start date format: ${startDate}. Expected YYYY-MM-DD.`,
    });
  }
  if (!isValidDateFormat(endDate)) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: `Invalid end date format: ${endDate}. Expected YYYY-MM-DD.`,
    });
  }
  if (startDate > endDate) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: `End date (${endDate}) cannot be before start date (${startDate}).`,
    });
  }
}

// ---------------------------------------------------------------------------
// Recurring Slots Helpers
// ---------------------------------------------------------------------------

/**
 * Calculate dates for specified weekdays within a range.
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @param daysOfWeek - Array of ISO weekdays (Mon=1, Sun=7)
 * @returns Array of date strings in YYYY-MM-DD format
 */
export function calculateDatesForDays(
  startDate: string,
  endDate: string,
  daysOfWeek: number[]
): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    // Convert JS Sunday=0 to ISO Sunday=7
    const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
    if (daysOfWeek.includes(dayOfWeek)) {
      dates.push(d.toISOString().split("T")[0]);
    }
  }

  return dates;
}

/**
 * Check if two time slots overlap.
 * @param a - First time slot
 * @param b - Second time slot
 * @returns true if slots overlap
 */
export function doTimeSlotsOverlap(
  a: { startTime: string; endTime: string },
  b: { startTime: string; endTime: string }
): boolean {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

/**
 * Validate days of week array.
 * @param days - Array of ISO weekdays (1-7)
 * @throws {ConvexError} VALIDATION_ERROR if invalid
 */
export function validateDaysOfWeek(days: number[]): void {
  if (days.length === 0) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "At least one day must be selected.",
    });
  }
  if (days.length > 7) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Cannot select more than 7 days.",
    });
  }
  const uniqueDays = new Set(days);
  if (uniqueDays.size !== days.length) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Duplicate days are not allowed.",
    });
  }
  for (const day of days) {
    if (day < 1 || day > 7 || !Number.isInteger(day)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: `Invalid day of week: ${day}. Must be 1-7 (Mon=1, Sun=7).`,
      });
    }
  }
}

/**
 * Validate time slots array.
 * @param slots - Array of time slot objects
 * @throws {ConvexError} VALIDATION_ERROR if invalid
 */
export function validateTimeSlots(
  slots: Array<{ startTime: string; endTime: string }>
): void {
  if (slots.length === 0) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "At least one time slot is required.",
    });
  }
  if (slots.length > 50) {
    throw new ConvexError({
      code: "VALIDATION_ERROR" as const,
      message: "Maximum 50 time slots per template.",
    });
  }
  for (const slot of slots) {
    if (!isValidTimeFormat(slot.startTime)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: `Invalid start time format: ${slot.startTime}. Expected HH:MM (24-hour).`,
      });
    }
    if (!isValidTimeFormat(slot.endTime)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: `Invalid end time format: ${slot.endTime}. Expected HH:MM (24-hour).`,
      });
    }
    if (slot.startTime >= slot.endTime) {
      throw new ConvexError({
        code: "VALIDATION_ERROR" as const,
        message: `End time (${slot.endTime}) must be after start time (${slot.startTime}).`,
      });
    }
  }
}
