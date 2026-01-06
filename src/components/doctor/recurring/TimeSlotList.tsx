import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";

interface TimeSlot {
  startTime: string;
  endTime: string;
}

interface TimeSlotListProps {
  slots: TimeSlot[];
  onChange: (slots: TimeSlot[]) => void;
  maxSlots?: number; // Default 50
}

/**
 * Calculate duration between two times in minutes
 */
function calculateDuration(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);
  return (endHour * 60 + endMin) - (startHour * 60 + startMin);
}

/**
 * Format duration for display
 */
function formatDuration(minutes: number): string {
  if (minutes <= 0) return "Invalid";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
}

/**
 * TimeSlotList - Component for managing multiple time slots
 *
 * Allows adding/removing time slots with start/end time inputs.
 * Shows calculated duration and validates end time > start time.
 */
export function TimeSlotList({ slots, onChange, maxSlots = 50 }: TimeSlotListProps) {
  const addSlot = () => {
    if (slots.length >= maxSlots) return;

    // Default to 30 minutes after the last slot, or 09:00-09:30
    const lastSlot = slots[slots.length - 1];
    let newStart = "09:00";
    let newEnd = "09:30";

    if (lastSlot) {
      newStart = lastSlot.endTime;
      // Add 30 minutes to end time
      const [hour, min] = lastSlot.endTime.split(":").map(Number);
      const newMinutes = hour * 60 + min + 30;
      const newHour = Math.floor(newMinutes / 60) % 24;
      const newMin = newMinutes % 60;
      newEnd = `${String(newHour).padStart(2, "0")}:${String(newMin).padStart(2, "0")}`;
    }

    onChange([...slots, { startTime: newStart, endTime: newEnd }]);
  };

  const removeSlot = (index: number) => {
    onChange(slots.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: "startTime" | "endTime", value: string) => {
    const updated = slots.map((slot, i) =>
      i === index ? { ...slot, [field]: value } : slot
    );
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {slots.map((slot, index) => {
        const duration = calculateDuration(slot.startTime, slot.endTime);
        const isInvalid = duration <= 0;

        return (
          <div
            key={index}
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              isInvalid ? "border-red-300 bg-red-50" : "border-gray-200"
            }`}
          >
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Start</Label>
                <Input
                  type="time"
                  value={slot.startTime}
                  onChange={(e) => updateSlot(index, "startTime", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">End</Label>
                <Input
                  type="time"
                  value={slot.endTime}
                  onChange={(e) => updateSlot(index, "endTime", e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="text-sm text-muted-foreground min-w-[70px] text-center">
              {isInvalid ? (
                <span className="text-red-600">Invalid</span>
              ) : (
                formatDuration(duration)
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeSlot(index)}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Remove slot"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addSlot}
        disabled={slots.length >= maxSlots}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-1" />
        Add Slot {slots.length >= maxSlots && `(max ${maxSlots})`}
      </Button>

      {slots.some((s) => calculateDuration(s.startTime, s.endTime) <= 0) && (
        <p className="text-sm text-red-600">
          End time must be after start time for all slots
        </p>
      )}
    </div>
  );
}
