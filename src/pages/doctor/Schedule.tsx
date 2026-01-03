import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";

export function DoctorSchedule() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("09:30");

  const slots = useQuery(api.availableSlots.getByDateRange, { startDate: date, endDate: date });
  const createSlots = useMutation(api.availableSlots.createSlots);
  const blockSlot = useMutation(api.availableSlots.blockSlot);

  const handleAddSlot = async () => {
    await createSlots({
      slots: [{ date, startTime, endTime }]
    });
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
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm">Start</label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <label className="text-sm">End</label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
            <Button onClick={handleAddSlot}>
              <Plus className="h-4 w-4 mr-1" />
              Add Slot
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Slots for {date}</CardTitle>
        </CardHeader>
        <CardContent>
          {slots && slots.length > 0 ? (
            <div className="grid md:grid-cols-4 gap-2">
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
                      onClick={() => blockSlot({ slotId: slot._id })}
                    >
                      Block
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
