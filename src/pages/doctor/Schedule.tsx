import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

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
 * - Visual slot grid display
 * - Time validation (end after start)
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
  const [addError, setAddError] = useState<string | null>(null);

  const slots = useQuery(api.availableSlots.getByDateRange, { startDate: date, endDate: date });
  const createSlots = useMutation(api.availableSlots.createSlots);
  const blockSlot = useMutation(api.availableSlots.blockSlot);

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Manage Schedule</h1>

      <Card>
        <CardHeader>
          <CardTitle>Add Time Slot</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
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
          </div>
          {addError && <p className="text-red-500 text-sm mt-2">{addError}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Slots for {date}</CardTitle>
        </CardHeader>
        <CardContent>
          {slots && slots.length > 0 ? (
            <div className="grid md:grid-cols-4 gap-2" data-testid="slot-grid">
              {slots.map((slot) => (
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
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No slots for this date</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
