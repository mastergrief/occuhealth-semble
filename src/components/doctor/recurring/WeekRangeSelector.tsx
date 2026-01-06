import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface WeekRangeSelectorProps {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  onChange: (start: string, end: string) => void;
}

/**
 * Calculate the number of weeks between two dates
 */
function calculateWeeks(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.ceil(diffDays / 7);
}

/**
 * WeekRangeSelector - Component for selecting a date range
 *
 * Two date inputs with validation and week count display.
 * Validates that start date is before or equal to end date.
 */
export function WeekRangeSelector({ startDate, endDate, onChange }: WeekRangeSelectorProps) {
  const isInvalid = startDate > endDate;
  const weeks = isInvalid ? 0 : calculateWeeks(startDate, endDate);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start-date" className="text-sm font-medium">
            Start Date
          </Label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => onChange(e.target.value, endDate)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="end-date" className="text-sm font-medium">
            End Date
          </Label>
          <Input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => onChange(startDate, e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      {isInvalid ? (
        <p className="text-sm text-red-600">
          End date must be on or after start date
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {weeks === 1 ? "1 week" : `${weeks} weeks`}
        </p>
      )}
    </div>
  );
}
