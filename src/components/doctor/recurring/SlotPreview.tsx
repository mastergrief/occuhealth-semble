import { AlertTriangle, Calendar, CheckCircle, Loader2 } from "lucide-react";

/**
 * Preview data shape from Convex previewRecurringSlots query.
 * Defined locally to match the actual query return type.
 */
interface PreviewData {
  totalSlots: number;
  proposedSlots: Record<string, Array<{ startTime: string; endTime: string }>>;
  conflicts: Array<{
    date: string;
    startTime: string;
    reason: "booked" | "blocked" | "available";
    existingSlotId: string;
  }>;
  summary: {
    daysCount: number;
    slotsPerDay: number;
    conflictsCount: number;
  };
}

interface SlotPreviewProps {
  preview: PreviewData | undefined;
  isLoading: boolean;
}

/**
 * Get display label for conflict reason
 */
function getReasonLabel(reason: "booked" | "blocked" | "available"): string {
  switch (reason) {
    case "booked":
      return "Already booked";
    case "blocked":
      return "Blocked";
    case "available":
      return "Available slot exists";
    default:
      return "Conflict";
  }
}

/**
 * Get styling for conflict reason badge
 */
function getReasonStyles(reason: "booked" | "blocked" | "available"): string {
  switch (reason) {
    case "booked":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "blocked":
      return "bg-gray-100 text-gray-600 border-gray-200";
    case "available":
      return "bg-green-100 text-green-700 border-green-200";
    default:
      return "bg-amber-100 text-amber-700 border-amber-200";
  }
}

/**
 * SlotPreview - Component for previewing slots to be created
 *
 * Shows a summary of the slots that will be created, including:
 * - Total slot count
 * - Days count
 * - Conflict count with warning styling
 * - Grouped conflict details with reason (booked/blocked/available)
 */
export function SlotPreview({ preview, isLoading }: SlotPreviewProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6 bg-muted/50 rounded-lg border">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
        <span className="text-muted-foreground">Calculating preview...</span>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="p-6 bg-muted/50 rounded-lg border text-center text-muted-foreground">
        Select days and time slots to see preview
      </div>
    );
  }

  const { totalSlots, summary, conflicts, proposedSlots } = preview;
  const hasConflicts = conflicts.length > 0;
  const nonConflictingSlots = totalSlots - conflicts.length;

  // Group conflicts by date for better display
  const conflictsByDate = conflicts.reduce(
    (acc, conflict) => {
      if (!acc[conflict.date]) {
        acc[conflict.date] = [];
      }
      acc[conflict.date].push(conflict);
      return acc;
    },
    {} as Record<string, typeof conflicts>
  );

  return (
    <div className="p-4 bg-muted/50 rounded-lg border space-y-4">
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>
            Creating <strong>{totalSlots}</strong> slots across{" "}
            <strong>{summary.daysCount}</strong> days
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {summary.slotsPerDay} slot{summary.slotsPerDay !== 1 ? "s" : ""} per
          day
        </span>
      </div>

      {/* Non-conflicting slots count */}
      {hasConflicts && (
        <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
          <span className="text-sm text-green-700">
            <strong>{nonConflictingSlots}</strong> slots will be created without
            conflicts
          </span>
        </div>
      )}

      {/* Conflict warning - prominent display */}
      {hasConflicts && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-md space-y-3">
          {/* Conflict count header */}
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-amber-800">
              {conflicts.length} conflict{conflicts.length !== 1 ? "s" : ""}{" "}
              detected
            </span>
          </div>

          {/* Conflict details grouped by date */}
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {Object.entries(conflictsByDate)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, dateConflicts]) => (
                <div
                  key={date}
                  className="p-2 bg-white/50 rounded border border-amber-200"
                >
                  <div className="text-xs font-medium text-amber-800 mb-1">
                    {formatDate(date)}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {dateConflicts.map((conflict, idx) => (
                      <span
                        key={`${conflict.startTime}-${idx}`}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border ${getReasonStyles(conflict.reason)}`}
                      >
                        {conflict.startTime}
                        <span className="opacity-70">
                          ({getReasonLabel(conflict.reason)})
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
          </div>

          <p className="text-xs text-amber-700">
            Choose how to handle conflicts using the options below.
          </p>
        </div>
      )}

      {/* Non-conflicting slot details (collapsed) */}
      {Object.keys(proposedSlots).length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            View slot details ({Object.keys(proposedSlots).length} dates)
          </summary>
          <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
            {Object.entries(proposedSlots)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, slots]) => {
                // Check if this date has any conflicts
                const dateHasConflicts = conflictsByDate[date]?.length > 0;
                return (
                  <div
                    key={date}
                    className={`p-2 rounded border ${
                      dateHasConflicts
                        ? "bg-amber-50/50 border-amber-200"
                        : "bg-background border-border"
                    }`}
                  >
                    <span className="font-medium">{formatDate(date)}</span>
                    {dateHasConflicts && (
                      <AlertTriangle className="inline h-3 w-3 text-amber-500 ml-1" />
                    )}
                    <span className="text-muted-foreground ml-2">
                      {slots.map((s) => s.startTime).join(", ")}
                    </span>
                  </div>
                );
              })}
          </div>
        </details>
      )}
    </div>
  );
}

/**
 * Format date for display (e.g., "Mon 6 Jan")
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
