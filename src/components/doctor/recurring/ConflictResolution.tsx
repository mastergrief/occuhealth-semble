import { AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import type { ConflictResolution as ConflictResolutionType } from "@/types/scheduling";

interface SlotConflict {
  date: string;
  startTime: string;
  reason: "booked" | "blocked" | "available";
  existingSlotId: string;
}

interface ConflictResolutionProps {
  conflicts: SlotConflict[];
  resolution: ConflictResolutionType;
  onChange: (resolution: ConflictResolutionType) => void;
  disabled?: boolean;
}

/**
 * ConflictResolution - Component for selecting how to handle slot conflicts
 *
 * Provides radio button options for:
 * - Skip conflicts: Don't create conflicting slots (default)
 * - Overwrite available: Replace available slots, skip booked/blocked
 *
 * Hidden/disabled when no conflicts exist.
 */
export function ConflictResolution({
  conflicts,
  resolution,
  onChange,
  disabled = false,
}: ConflictResolutionProps) {
  // Hide component if no conflicts
  if (conflicts.length === 0) {
    return null;
  }

  // Count conflicts by type
  const bookedCount = conflicts.filter((c) => c.reason === "booked").length;
  const blockedCount = conflicts.filter((c) => c.reason === "blocked").length;
  const availableCount = conflicts.filter(
    (c) => c.reason === "available"
  ).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">Handle Conflicts</Label>
        <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
          {conflicts.length}
        </span>
      </div>

      <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
        {/* Skip conflicts option */}
        <label
          className={`flex items-start gap-3 p-2 rounded-md cursor-pointer transition-colors ${
            resolution === "skip"
              ? "bg-primary/10 border border-primary/30"
              : "hover:bg-muted/50"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <input
            type="radio"
            name="conflict-resolution"
            value="skip"
            checked={resolution === "skip"}
            onChange={() => onChange("skip")}
            disabled={disabled}
            className="mt-1 h-4 w-4 text-primary"
          />
          <div className="flex-1">
            <span className="text-sm font-medium">Skip conflicts</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Don't create slots that conflict with existing ones. The
              conflicting time slots will be skipped.
            </p>
          </div>
        </label>

        {/* Overwrite available option */}
        <label
          className={`flex items-start gap-3 p-2 rounded-md cursor-pointer transition-colors ${
            resolution === "overwrite_available"
              ? "bg-primary/10 border border-primary/30"
              : "hover:bg-muted/50"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <input
            type="radio"
            name="conflict-resolution"
            value="overwrite_available"
            checked={resolution === "overwrite_available"}
            onChange={() => onChange("overwrite_available")}
            disabled={disabled}
            className="mt-1 h-4 w-4 text-primary"
          />
          <div className="flex-1">
            <span className="text-sm font-medium">Overwrite available slots</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Replace existing available slots with new ones. Booked and blocked
              slots will still be skipped.
            </p>
            {availableCount > 0 && (
              <p className="text-xs text-amber-600 mt-1">
                {availableCount} available slot
                {availableCount !== 1 ? "s" : ""} will be replaced
              </p>
            )}
          </div>
        </label>
      </div>

      {/* Conflict type summary */}
      {(bookedCount > 0 || blockedCount > 0) && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>
            {bookedCount > 0 && (
              <>
                {bookedCount} booked slot{bookedCount !== 1 ? "s" : ""} will
                always be skipped
              </>
            )}
            {bookedCount > 0 && blockedCount > 0 && ", "}
            {blockedCount > 0 && (
              <>
                {blockedCount} blocked slot{blockedCount !== 1 ? "s" : ""} will
                always be skipped
              </>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
