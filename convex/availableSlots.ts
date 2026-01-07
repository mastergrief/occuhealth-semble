/**
 * Available Slots API Facade
 *
 * This file re-exports all slot management functions from modular implementations.
 * API paths are preserved: api.availableSlots.{functionName}
 *
 * @module availableSlots
 */

// Re-export all queries
export {
  getAvailable,
  getByDateRange,
  getByMonth,
  getTemplates,
} from "./availableSlotsModules/queries";

// Re-export all mutations
export {
  createSlots,
  blockSlot,
  unblockSlot,
} from "./availableSlotsModules/mutations";

// Re-export recurring slot operations
export {
  createRecurringSlots,
  previewRecurringSlots,
  deleteTemplateSlots,
} from "./availableSlotsModules/recurring";

// Re-export types for consumers
export type { ProposedSlot, SlotConflict } from "./availableSlotsModules/types";
