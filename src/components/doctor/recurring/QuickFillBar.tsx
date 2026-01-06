import { useState } from "react";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface QuickFillBarProps {
  onFill: (slots: Array<{ startTime: string; endTime: string }>) => void;
}

type Duration = 15 | 30 | 45 | 60;

const DURATION_OPTIONS: { value: Duration; label: string }[] = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "60 minutes" },
];

/**
 * Parse time string "HH:MM" to minutes since midnight
 */
function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Format minutes since midnight to "HH:MM" string
 */
function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

/**
 * Generate consecutive slots of specified duration within the given range
 */
function generateSlots(
  duration: Duration,
  rangeStart: string,
  rangeEnd: string
): Array<{ startTime: string; endTime: string }> {
  const slots: Array<{ startTime: string; endTime: string }> = [];
  const startMinutes = parseTime(rangeStart);
  const endMinutes = parseTime(rangeEnd);

  let current = startMinutes;
  while (current + duration <= endMinutes) {
    slots.push({
      startTime: formatTime(current),
      endTime: formatTime(current + duration),
    });
    current += duration;
  }

  return slots;
}

/**
 * QuickFillBar - Component for auto-generating time slots
 *
 * Allows users to quickly create consecutive slots by specifying:
 * - Duration (15, 30, 45, or 60 minutes)
 * - Start time of the range (default 09:00)
 * - End time of the range (default 17:00)
 *
 * Example: Duration=30, 09:00-12:00 generates:
 * 09:00-09:30, 09:30-10:00, 10:00-10:30, 10:30-11:00, 11:00-11:30, 11:30-12:00
 */
export function QuickFillBar({ onFill }: QuickFillBarProps) {
  const [duration, setDuration] = useState<Duration>(30);
  const [rangeStart, setRangeStart] = useState("09:00");
  const [rangeEnd, setRangeEnd] = useState("17:00");

  const handleFill = () => {
    const slots = generateSlots(duration, rangeStart, rangeEnd);
    if (slots.length > 0) {
      onFill(slots);
    }
  };

  // Calculate preview of how many slots will be generated
  const previewCount = generateSlots(duration, rangeStart, rangeEnd).length;
  const isValid = parseTime(rangeStart) < parseTime(rangeEnd) && previewCount > 0;

  return (
    <div className="p-3 bg-muted/30 rounded-lg border space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Wand2 className="h-4 w-4 text-muted-foreground" />
        <span>Quick Fill</span>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {/* Duration Select */}
        <div className="space-y-1">
          <Label htmlFor="quick-fill-duration" className="text-xs">
            Duration
          </Label>
          <Select
            value={duration.toString()}
            onValueChange={(value) => setDuration(parseInt(value) as Duration)}
          >
            <SelectTrigger id="quick-fill-duration" className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Range Start Time */}
        <div className="space-y-1">
          <Label htmlFor="quick-fill-start" className="text-xs">
            From
          </Label>
          <Input
            id="quick-fill-start"
            type="time"
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
            className="w-[110px]"
          />
        </div>

        {/* Range End Time */}
        <div className="space-y-1">
          <Label htmlFor="quick-fill-end" className="text-xs">
            To
          </Label>
          <Input
            id="quick-fill-end"
            type="time"
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
            className="w-[110px]"
          />
        </div>

        {/* Fill Button */}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleFill}
          disabled={!isValid}
          className="whitespace-nowrap"
        >
          <Wand2 className="h-3.5 w-3.5 mr-1.5" />
          Fill {previewCount > 0 ? `(${previewCount} slots)` : ""}
        </Button>
      </div>

      {/* Validation message */}
      {!isValid && rangeStart && rangeEnd && (
        <p className="text-xs text-destructive">
          End time must be after start time and allow at least one slot
        </p>
      )}
    </div>
  );
}
