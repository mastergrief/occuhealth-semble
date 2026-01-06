import { Id } from "../../../convex/_generated/dataModel";

interface SlotData {
  _id: Id<"availableSlots">;
  date: string;
  startTime: string;
  endTime: string;
  status: "available" | "booked" | "blocked";
}

interface WeekCalendarViewProps {
  weekStart: string; // Monday date YYYY-MM-DD
  slots: SlotData[];
  onBlockSlot: (slotId: Id<"availableSlots">) => Promise<void>;
  onUnblockSlot: (slotId: Id<"availableSlots">) => Promise<void>;
  isLoading?: boolean;
  blockingId?: Id<"availableSlots"> | null;
  unblockingId?: Id<"availableSlots"> | null;
}

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatDayHeader(dateStr: string): { day: string; date: string } {
  const d = new Date(dateStr);
  const dayIndex = (d.getDay() + 6) % 7; // Convert to Mon=0, Sun=6
  return {
    day: DAYS_OF_WEEK[dayIndex],
    date: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
  };
}

function getStatusStyles(status: "available" | "booked" | "blocked"): string {
  switch (status) {
    case "available":
      return "bg-green-50 border-green-200 hover:bg-green-100";
    case "booked":
      return "bg-blue-50 border-blue-200";
    case "blocked":
      return "bg-gray-50 border-gray-200 hover:bg-gray-100";
    default:
      return "bg-gray-50 border-gray-200";
  }
}

export function WeekCalendarView({
  weekStart,
  slots,
  onBlockSlot,
  onUnblockSlot,
  isLoading,
  blockingId,
  unblockingId,
}: WeekCalendarViewProps) {
  // Generate dates for the week (Mon-Sun)
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Group slots by date
  const slotsByDate: Record<string, SlotData[]> = {};
  for (const date of weekDates) {
    slotsByDate[date] = [];
  }
  for (const slot of slots) {
    if (slotsByDate[slot.date]) {
      slotsByDate[slot.date].push(slot);
    }
  }

  // Sort slots within each day by start time
  for (const date of weekDates) {
    slotsByDate[date].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  const handleSlotClick = async (slot: SlotData) => {
    if (slot.status === "available") {
      await onBlockSlot(slot._id);
    } else if (slot.status === "blocked") {
      await onUnblockSlot(slot._id);
    }
    // Booked slots are not clickable
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" data-testid="week-calendar-view">
      <div className="grid grid-cols-7 min-w-[700px] gap-1">
        {/* Header row with day names and dates */}
        {weekDates.map((date) => {
          const { day, date: formattedDate } = formatDayHeader(date);
          return (
            <div
              key={date}
              className="p-2 text-center bg-muted rounded-t-lg border-b-2 border-primary/20"
            >
              <p className="font-semibold text-sm">{day}</p>
              <p className="text-xs text-muted-foreground">{formattedDate}</p>
            </div>
          );
        })}

        {/* Slot columns */}
        {weekDates.map((date) => {
          const daySlots = slotsByDate[date];
          return (
            <div
              key={`slots-${date}`}
              className="min-h-[200px] border border-muted rounded-b-lg p-1 space-y-1"
            >
              {daySlots.length > 0 ? (
                daySlots.map((slot) => {
                  const isBlocking = blockingId === slot._id;
                  const isUnblocking = unblockingId === slot._id;
                  const isProcessing = isBlocking || isUnblocking;
                  const isClickable = slot.status !== "booked" && !isProcessing;

                  return (
                    <button
                      key={slot._id}
                      onClick={() => isClickable && handleSlotClick(slot)}
                      disabled={!isClickable}
                      className={`w-full p-2 border rounded text-xs transition-colors ${getStatusStyles(slot.status)} ${
                        isClickable ? "cursor-pointer" : "cursor-default"
                      } ${isProcessing ? "opacity-50" : ""}`}
                      data-testid={`slot-${slot.date}-${slot.startTime}`}
                    >
                      <p className="font-medium">
                        {slot.startTime}
                      </p>
                      <p className="text-[10px] text-muted-foreground capitalize">
                        {isProcessing ? "..." : slot.status}
                      </p>
                    </button>
                  );
                })
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                  No slots
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
