import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Id } from "../../../convex/_generated/dataModel";

interface BookingFlowProps {
  employerId: Id<"employers">;
  onClose: () => void;
}

export function BookingFlow({ employerId, onClose }: BookingFlowProps) {
  const [step, setStep] = useState(1);
  const [selectedPatient, setSelectedPatient] = useState<Id<"patients"> | "">("");
  const [selectedType, setSelectedType] = useState<Id<"appointmentTypes"> | "">("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedSlot, setSelectedSlot] = useState<Id<"availableSlots"> | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const patients = useQuery(api.patients.list, { employerId });
  const appointmentTypes = useQuery(api.appointmentTypes.listActive);
  const availableSlots = useQuery(api.availableSlots.getAvailable, { date: selectedDate });
  const bookAppointment = useMutation(api.appointments.book);

  const handleSubmit = async () => {
    if (!selectedPatient || !selectedType || !selectedSlot) return;

    setIsSubmitting(true);
    try {
      await bookAppointment({
        patientId: selectedPatient as Id<"patients">,
        employerId,
        appointmentTypeId: selectedType as Id<"appointmentTypes">,
        slotId: selectedSlot,
        reasonForAppointment: reason || undefined,
      });
      onClose();
    } catch (error) {
      console.error("Booking failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Book Appointment - Step {step} of 3</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Select Employee</Label>
              <select
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value as Id<"patients">)}
                className="w-full border rounded-md p-2 mt-1"
              >
                <option value="">Choose employee...</option>
                {patients?.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.firstName} {p.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Appointment Type</Label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as Id<"appointmentTypes">)}
                className="w-full border rounded-md p-2 mt-1"
              >
                <option value="">Choose type...</option>
                {appointmentTypes?.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name} ({t.durationMinutes} min)
                  </option>
                ))}
              </select>
            </div>
            <Button
              className="w-full"
              disabled={!selectedPatient || !selectedType}
              onClick={() => setStep(2)}
            >
              Next
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <Label>Select Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedSlot(null);
                }}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div>
              <Label>Available Slots</Label>
              {availableSlots && availableSlots.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {availableSlots.map((slot) => (
                    <Button
                      key={slot._id}
                      variant={selectedSlot === slot._id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedSlot(slot._id)}
                    >
                      {slot.startTime}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">
                  No slots available for this date
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button
                disabled={!selectedSlot}
                onClick={() => setStep(3)}
                className="flex-1"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <Label>Reason for Appointment (optional)</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Annual health check"
              />
            </div>
            <div className="p-4 bg-slate-50 rounded-lg text-sm">
              <p><strong>Employee:</strong> {patients?.find(p => p._id === selectedPatient)?.firstName} {patients?.find(p => p._id === selectedPatient)?.lastName}</p>
              <p><strong>Type:</strong> {appointmentTypes?.find(t => t._id === selectedType)?.name}</p>
              <p><strong>Date:</strong> {selectedDate}</p>
              <p><strong>Time:</strong> {availableSlots?.find(s => s._id === selectedSlot)?.startTime}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? "Booking..." : "Confirm Booking"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
