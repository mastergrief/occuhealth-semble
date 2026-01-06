import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { DaySelector } from "./DaySelector";
import { TimeSlotList } from "./TimeSlotList";
import { WeekRangeSelector } from "./WeekRangeSelector";
import { SlotPreview } from "./SlotPreview";
import { ConflictResolution } from "./ConflictResolution";
import { QuickFillBar } from "./QuickFillBar";

import type { ConflictResolution as ConflictResolutionType, TimeSlotTemplate } from "@/types/scheduling";

interface RecurringSlotFormProps {
  onClose: () => void;
}

/**
 * Get the Monday of the current week
 */
function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

/**
 * Add weeks to a date string
 */
function addWeeks(dateStr: string, weeks: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().split("T")[0];
}

/**
 * RecurringSlotForm - Main form container for creating recurring slots
 *
 * Integrates all sub-components:
 * - DaySelector for day selection
 * - TimeSlotList for time slots
 * - QuickFillBar for auto-generating time slots
 * - WeekRangeSelector for date range
 * - SlotPreview for real-time preview with conflict highlighting
 * - ConflictResolution for handling conflicts
 */
export function RecurringSlotForm({ onClose }: RecurringSlotFormProps) {
  // Form state
  const [templateName, setTemplateName] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default
  const [timeSlots, setTimeSlots] = useState<TimeSlotTemplate[]>([
    { startTime: "09:00", endTime: "09:30" },
  ]);
  const [startDate, setStartDate] = useState(getMonday(new Date()));
  const [endDate, setEndDate] = useState(addWeeks(getMonday(new Date()), 4));
  const [conflictResolution, setConflictResolution] =
    useState<ConflictResolutionType>("skip");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation
  const hasValidTimeSlots =
    timeSlots.length > 0 &&
    timeSlots.every((s) => s.startTime < s.endTime);
  const hasValidDays = selectedDays.length > 0;
  const hasValidDateRange = startDate <= endDate;
  const canSubmit =
    hasValidTimeSlots && hasValidDays && hasValidDateRange && !isSubmitting;

  // Real-time preview query
  const preview = useQuery(
    api.availableSlots.previewRecurringSlots,
    hasValidTimeSlots && hasValidDays && hasValidDateRange
      ? {
          daysOfWeek: selectedDays,
          timeSlots,
          startDate,
          endDate,
        }
      : "skip"
  );

  // Create mutation
  const createRecurring = useMutation(api.availableSlots.createRecurringSlots);

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      const result = await createRecurring({
        templateName: templateName || undefined,
        daysOfWeek: selectedDays,
        timeSlots,
        startDate,
        endDate,
        conflictResolution,
      });

      toast.success(`Created ${result.created} slots`, {
        description:
          result.skipped > 0
            ? `${result.skipped} slot(s) skipped due to conflicts`
            : undefined,
      });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create slots";
      toast.error("Failed to create recurring slots", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateRangeChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  const handleQuickFill = (slots: Array<{ startTime: string; endTime: string }>) => {
    setTimeSlots(slots);
  };

  // Prepare conflicts for ConflictResolution component
  const conflicts = preview?.conflicts ?? [];

  return (
    <div className="space-y-6">
      <DialogHeader>
        <DialogTitle>Add Recurring Availability</DialogTitle>
        <DialogDescription>
          Create multiple time slots across selected days and weeks.
        </DialogDescription>
      </DialogHeader>

      {/* Template Name (Optional) */}
      <div>
        <Label htmlFor="template-name" className="text-sm font-medium">
          Template Name (Optional)
        </Label>
        <Input
          id="template-name"
          placeholder="e.g., Standard Week Schedule"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          className="mt-1"
        />
      </div>

      {/* Day Selection */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Select Days</Label>
        <DaySelector
          selected={selectedDays}
          onChange={setSelectedDays}
          disabled={isSubmitting}
        />
      </div>

      {/* Time Slots */}
      <div className="space-y-3">
        <Label className="text-sm font-medium block">Time Slots</Label>
        <QuickFillBar onFill={handleQuickFill} />
        <TimeSlotList slots={timeSlots} onChange={setTimeSlots} />
      </div>

      {/* Date Range */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Apply to Date Range</Label>
        <WeekRangeSelector
          startDate={startDate}
          endDate={endDate}
          onChange={handleDateRangeChange}
        />
      </div>

      {/* Preview */}
      <div>
        <Label className="text-sm font-medium mb-2 block">Preview</Label>
        <SlotPreview preview={preview ?? undefined} isLoading={preview === undefined && canSubmit} />
      </div>

      {/* Conflict Resolution */}
      <ConflictResolution
        conflicts={conflicts}
        resolution={conflictResolution}
        onChange={setConflictResolution}
        disabled={isSubmitting}
      />

      {/* Actions */}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
          {isSubmitting
            ? "Creating..."
            : `Create ${preview?.totalSlots ?? 0} Slots`}
        </Button>
      </DialogFooter>
    </div>
  );
}
