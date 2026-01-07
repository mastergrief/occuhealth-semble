// convex/availableSlotsModules/types.ts

/**
 * Proposed time slot for batch creation
 */
export interface ProposedSlot {
  date: string;
  startTime: string;
  endTime: string;
}

/**
 * Conflict information when slots overlap
 */
export interface SlotConflict {
  date: string;
  startTime: string;
  reason: "booked" | "blocked" | "available";
  existingSlotId: string;
}
