import { Button } from "@/components/ui/button";
import { DAY_LABELS_SHORT } from "@/types/scheduling";

interface DaySelectorProps {
  selected: number[]; // ISO weekdays [1-7]
  onChange: (days: number[]) => void;
  disabled?: boolean;
}

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];
const WEEKDAYS = [1, 2, 3, 4, 5];

/**
 * DaySelector - Component for selecting days of the week
 *
 * Allows toggling individual days (Mon-Sun) with quick select options.
 * Uses ISO weekdays: Mon=1, Sun=7.
 */
export function DaySelector({ selected, onChange, disabled }: DaySelectorProps) {
  const toggleDay = (day: number) => {
    if (selected.includes(day)) {
      onChange(selected.filter((d) => d !== day));
    } else {
      onChange([...selected, day].sort((a, b) => a - b));
    }
  };

  const selectWeekdays = () => onChange(WEEKDAYS);
  const selectAll = () => onChange(ALL_DAYS);
  const clearAll = () => onChange([]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {ALL_DAYS.map((day) => (
          <Button
            key={day}
            type="button"
            variant={selected.includes(day) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleDay(day)}
            disabled={disabled}
            aria-pressed={selected.includes(day)}
            className="min-w-[60px]"
          >
            {DAY_LABELS_SHORT[day]}
          </Button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={selectWeekdays}
          disabled={disabled}
        >
          Weekdays
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={selectAll}
          disabled={disabled}
        >
          All
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearAll}
          disabled={disabled}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
