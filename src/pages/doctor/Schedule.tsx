import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, CalendarRange, List, Calendar, ChevronLeft, ChevronRight, Trash2, FileStack } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";
import { RecurringSlotForm } from "@/components/doctor/recurring";
import { WeekCalendarView } from "@/components/doctor/WeekCalendarView";
import type { DeleteMode } from "@/types/scheduling";
import { toast } from "sonner";

/**
 * Helper function to get Monday of the week for a given date
 */
function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

/**
 * Helper function to add days to a date string
 */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/**
 * Helper function to format week range display
 */
function formatWeekRange(startDate: string): string {
  const start = new Date(startDate);
  const end = new Date(startDate);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} - ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
}

/**
 * Helper function to format days of week array nicely
 */
function formatDaysOfWeek(days: number[]): string {
  const dayNames = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const sorted = [...days].sort((a, b) => a - b);

  // Check for common patterns
  if (sorted.length === 5 && sorted.every((d, i) => d === i + 1)) {
    return "Mon-Fri";
  }
  if (sorted.length === 7) {
    return "Every day";
  }
  if (sorted.length === 2 && sorted[0] === 6 && sorted[1] === 7) {
    return "Weekends";
  }

  return sorted.map((d) => dayNames[d]).join(", ");
}

/**
 * Helper function to format date range for display
 */
function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return `${start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} - ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
}

/**
 * DoctorSchedule - Time slot availability management
 *
 * Create and manage available time slots for appointments.
 *
 * @component
 * @requires DoctorLayout - Parent component providing context
 *
 * ## Features
 * - Add new time slots with date/time selection
 * - Block/unblock existing slots
 * - Visual slot grid display (list and week views)
 * - Time validation (end after start)
 * - Week calendar view with navigation
 * - Template management with delete functionality
 *
 * @example
 * // Rendered by DoctorLayout when URL is /doctor/schedule
 * <Route path="schedule" element={<DoctorSchedule />} />
 */

export function DoctorSchedule() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:30");
  const [isAdding, setIsAdding] = useState(false);
  const [blockingId, setBlockingId] = useState<Id<"availableSlots"> | null>(null);
  const [unblockingId, setUnblockingId] = useState<Id<"availableSlots"> | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "week">("list");
  const [weekStart, setWeekStart] = useState<string>(() => getMonday(new Date()));

  // Template delete state
  const [deleteConfirmTemplate, setDeleteConfirmTemplate] = useState<Id<"recurringSlotTemplates"> | null>(null);
  const [deleteMode, setDeleteMode] = useState<DeleteMode>("future_only");
  const [isDeleting, setIsDeleting] = useState(false);

  // Query for list view (single day)
  const singleDaySlots = useQuery(api.availableSlots.getByDateRange, { startDate: date, endDate: date });

  // Query for week view (7 days)
  const weekEndDate = addDays(weekStart, 6);
  const weekSlots = useQuery(
    api.availableSlots.getByDateRange,
    viewMode === "week" ? { startDate: weekStart, endDate: weekEndDate } : "skip"
  );

  // Query for templates
  const templates = useQuery(api.availableSlots.getTemplates, { status: "active" });

  const createSlots = useMutation(api.availableSlots.createSlots);
  const blockSlot = useMutation(api.availableSlots.blockSlot);
  const unblockSlot = useMutation(api.availableSlots.unblockSlot);
  const deleteTemplateSlots = useMutation(api.availableSlots.deleteTemplateSlots);

  const handleAddSlot = async () => {
    // Validation
    if (startTime >= endTime) {
      setAddError("End time must be after start time");
      return;
    }

    setIsAdding(true);
    setAddError(null);
    try {
      await createSlots({
        slots: [{ date, startTime, endTime }]
      });
      // Clear form on success
      setStartTime("09:00");
      setEndTime("09:30");
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add slot");
    } finally {
      setIsAdding(false);
    }
  };

  const handleBlockSlot = async (slotId: Id<"availableSlots">) => {
    setBlockingId(slotId);
    try {
      await blockSlot({ slotId });
    } catch (err) {
      console.error("Failed to block slot:", err);
    } finally {
      setBlockingId(null);
    }
  };

  const handleUnblockSlot = async (slotId: Id<"availableSlots">) => {
    setUnblockingId(slotId);
    try {
      await unblockSlot({ slotId });
    } catch (err) {
      console.error("Failed to unblock slot:", err);
    } finally {
      setUnblockingId(null);
    }
  };

  const navigateWeek = (direction: "prev" | "next") => {
    const days = direction === "prev" ? -7 : 7;
    setWeekStart(addDays(weekStart, days));
  };

  const goToCurrentWeek = () => {
    setWeekStart(getMonday(new Date()));
  };

  const handleDeleteTemplate = async () => {
    if (!deleteConfirmTemplate) return;

    setIsDeleting(true);
    try {
      const result = await deleteTemplateSlots({
        templateId: deleteConfirmTemplate,
        deleteMode,
      });
      toast.success(`Deleted ${result.deleted} slots${result.skippedBooked > 0 ? ` (${result.skippedBooked} booked slots preserved)` : ""}`);
      setDeleteConfirmTemplate(null);
      setDeleteMode("future_only");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete template");
    } finally {
      setIsDeleting(false);
    }
  };

  const templateToDelete = templates?.find((t) => t._id === deleteConfirmTemplate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold">Manage Schedule</h1>

        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            data-testid="list-view-btn"
          >
            <List className="h-4 w-4 mr-1" />
            List View
          </Button>
          <Button
            variant={viewMode === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("week")}
            data-testid="week-view-btn"
          >
            <Calendar className="h-4 w-4 mr-1" />
            Week View
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Time Slot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end flex-wrap">
            <div>
              <label className="text-sm">Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="slot-date" />
            </div>
            <div>
              <label className="text-sm">Start</label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} data-testid="slot-start" />
            </div>
            <div>
              <label className="text-sm">End</label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} data-testid="slot-end" />
            </div>
            <Button onClick={handleAddSlot} disabled={isAdding} data-testid="add-slot-btn">
              <Plus className="h-4 w-4 mr-1" />
              {isAdding ? "Adding..." : "Add Slot"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowRecurringForm(true)}
              data-testid="recurring-slots-btn"
            >
              <CalendarRange className="h-4 w-4 mr-1" />
              Recurring Slots
            </Button>
          </div>
          {addError && <p className="text-red-500 text-sm mt-2">{addError}</p>}
        </CardContent>
      </Card>

      {/* Recurring Slots Dialog */}
      <Dialog open={showRecurringForm} onOpenChange={setShowRecurringForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <RecurringSlotForm onClose={() => setShowRecurringForm(false)} />
        </DialogContent>
      </Dialog>

      {/* Saved Templates Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileStack className="h-5 w-5" />
            Saved Templates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {templates === undefined ? (
            <p className="text-muted-foreground">Loading templates...</p>
          ) : templates.length === 0 ? (
            <p className="text-muted-foreground">No saved templates. Create recurring slots to generate a template.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="templates-grid">
              {templates.map((template) => (
                <div
                  key={template._id}
                  className="p-4 border rounded-lg bg-card hover:shadow-sm transition-shadow"
                  data-testid="template-card"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-sm">
                      {template.name || "Unnamed Template"}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteConfirmTemplate(template._id)}
                      data-testid="delete-template-btn"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium text-foreground">Days:</span>{" "}
                      {formatDaysOfWeek(template.daysOfWeek)}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Times:</span>{" "}
                      {template.timeSlots.length} slot{template.timeSlots.length !== 1 ? "s" : ""}/day
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Range:</span>{" "}
                      {formatDateRange(template.startDate, template.endDate)}
                    </p>
                    <div className="pt-2 flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded bg-muted">
                        {template.slotCounts.total} total
                      </span>
                      <span className="px-2 py-0.5 rounded bg-green-100 text-green-700">
                        {template.slotCounts.available} available
                      </span>
                      {template.slotCounts.booked > 0 && (
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                          {template.slotCounts.booked} booked
                        </span>
                      )}
                      {template.slotCounts.blocked > 0 && (
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                          {template.slotCounts.blocked} blocked
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Template Confirmation Dialog */}
      <AlertDialog
        open={deleteConfirmTemplate !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirmTemplate(null);
            setDeleteMode("future_only");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete slots created from &quot;{templateToDelete?.name || "Unnamed Template"}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4 space-y-3">
            <Label htmlFor="delete-mode">Delete Mode</Label>
            <Select
              value={deleteMode}
              onValueChange={(value: DeleteMode) => setDeleteMode(value)}
            >
              <SelectTrigger id="delete-mode" data-testid="delete-mode-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="future_only">
                  Future only - Keep past slots, delete future
                </SelectItem>
                <SelectItem value="all_available">
                  All available - Keep booked slots, delete available
                </SelectItem>
                <SelectItem value="all">
                  All slots - Delete everything (cancels bookings)
                </SelectItem>
              </SelectContent>
            </Select>
            {deleteMode === "all" && (
              <p className="text-sm text-destructive">
                Warning: This will cancel all bookings associated with these slots.
              </p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-delete-btn"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* List View */}
      {viewMode === "list" && (
        <Card>
          <CardHeader>
            <CardTitle>Slots for {date}</CardTitle>
          </CardHeader>
          <CardContent>
            {singleDaySlots && singleDaySlots.length > 0 ? (
              <div className="grid md:grid-cols-4 gap-2" data-testid="slot-grid">
                {singleDaySlots.map((slot) => (
                  <div key={slot._id} className={`p-3 border rounded-lg text-center ${
                    slot.status === "available" ? "bg-green-50 border-green-200" :
                    slot.status === "booked" ? "bg-blue-50 border-blue-200" :
                    "bg-gray-50 border-gray-200"
                  }`}>
                    <p className="font-medium">{slot.startTime} - {slot.endTime}</p>
                    <p className="text-xs text-muted-foreground capitalize">{slot.status}</p>
                    {slot.status === "available" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => handleBlockSlot(slot._id)}
                        disabled={blockingId === slot._id}
                        data-testid="block-btn"
                      >
                        {blockingId === slot._id ? "..." : "Block"}
                      </Button>
                    )}
                    {slot.status === "blocked" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => handleUnblockSlot(slot._id)}
                        disabled={unblockingId === slot._id}
                        data-testid="unblock-btn"
                      >
                        {unblockingId === slot._id ? "..." : "Unblock"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No slots for this date</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Week View */}
      {viewMode === "week" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle>Week Schedule</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateWeek("prev")}
                  data-testid="prev-week-btn"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <button
                  onClick={goToCurrentWeek}
                  className="text-sm font-medium px-3 py-1 rounded hover:bg-muted transition-colors"
                  data-testid="week-range-display"
                >
                  {formatWeekRange(weekStart)}
                </button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateWeek("next")}
                  data-testid="next-week-btn"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <WeekCalendarView
              weekStart={weekStart}
              slots={weekSlots ?? []}
              onBlockSlot={handleBlockSlot}
              onUnblockSlot={handleUnblockSlot}
              isLoading={weekSlots === undefined}
              blockingId={blockingId}
              unblockingId={unblockingId}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
