/**
 * Doctor Portal Type Definitions
 *
 * Shared types for all doctor portal components.
 * Single source of truth - do not duplicate elsewhere.
 *
 * @module types/doctor
 */

import { Doc, Id } from "../../convex/_generated/dataModel";

// =============================================================================
// Context Types
// =============================================================================

/**
 * Context passed from DoctorLayout to child pages.
 * Access using useDoctorContext() hook.
 *
 * @property doctor - The doctor's settings record, null if not found, undefined if loading
 *
 * @example
 * ```tsx
 * const { doctor } = useDoctorContext();
 * if (!doctor) return <Loading />;
 * return <div>Welcome, Dr. {doctor.name}</div>;
 * ```
 */
export interface DoctorContextType {
  doctor: Doc<"doctorSettings"> | null | undefined;
}

// =============================================================================
// Report Types
// =============================================================================

/**
 * Fitness assessment status for occupational health reports.
 * Maps directly to the Convex schema `reports.fitForWork` union.
 *
 * - `fit` - Employee is fit for work without restrictions
 * - `fit_with_restrictions` - Fit with specific workplace adjustments needed
 * - `temporarily_unfit` - Currently unfit, expected to recover
 * - `needs_further_assessment` - Additional evaluation required before determination
 */
export type FitForWorkStatus =
  | "fit"
  | "fit_with_restrictions"
  | "temporarily_unfit"
  | "needs_further_assessment";

/**
 * Report form data shape for Reports page.
 * Used when creating or editing fit-for-work reports.
 *
 * @property fitForWork - The fitness assessment determination
 * @property summary - Clinical summary shared with employer (no sensitive details)
 * @property restrictions - Optional list of workplace restrictions/accommodations
 * @property followUpRequired - Whether a follow-up appointment is needed
 * @property followUpNotes - Optional notes about follow-up timing/requirements
 */
export interface ReportFormData {
  fitForWork: FitForWorkStatus;
  summary: string;
  restrictions?: string[];
  followUpRequired: boolean;
  followUpNotes?: string;
}

// =============================================================================
// Appointment Types
// =============================================================================

/**
 * Appointment status for filtering and display.
 * Maps directly to the Convex schema `appointments.status` union.
 *
 * - `scheduled` - Appointment booked but not yet confirmed
 * - `confirmed` - Appointment confirmed by patient/employer
 * - `completed` - Appointment finished, report may be pending
 * - `cancelled` - Appointment cancelled before occurrence
 * - `no_show` - Patient did not attend scheduled appointment
 */
export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

// =============================================================================
// Schedule Types
// =============================================================================

/**
 * Available slot status for schedule management.
 * Maps directly to the Convex schema `availableSlots.status` union.
 *
 * - `available` - Slot is open for booking
 * - `booked` - Slot has been booked for an appointment
 * - `blocked` - Slot manually blocked by doctor (e.g., vacation, admin time)
 */
export type SlotStatus = "available" | "booked" | "blocked";

/**
 * Time slot for schedule grid display.
 * Represents a single bookable time period on the doctor's calendar.
 *
 * @property date - Date in YYYY-MM-DD format
 * @property startTime - Start time in HH:MM (24-hour) format
 * @property endTime - End time in HH:MM (24-hour) format
 * @property status - Current booking status of the slot
 * @property appointmentId - If booked, the associated appointment ID
 *
 * @example
 * ```tsx
 * const slot: TimeSlot = {
 *   date: "2026-01-15",
 *   startTime: "09:00",
 *   endTime: "09:30",
 *   status: "available"
 * };
 * ```
 */
export interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  status: SlotStatus;
  appointmentId?: Id<"appointments">;
}

// =============================================================================
// Dashboard Types
// =============================================================================

/**
 * Stats displayed on Dashboard page.
 * Shows appointment overview for the current day.
 *
 * @property totalToday - Total number of appointments scheduled today
 * @property completed - Number of appointments already completed
 * @property remaining - Number of appointments still pending
 *
 * @example
 * ```tsx
 * const stats: DashboardStats = {
 *   totalToday: 8,
 *   completed: 3,
 *   remaining: 5
 * };
 * ```
 */
export interface DashboardStats {
  totalToday: number;
  completed: number;
  remaining: number;
}
