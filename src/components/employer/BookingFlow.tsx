import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { defaultPaginationOpts } from "../../../convex/helpers/pagination";
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
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { ConvexError } from "convex/values";

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

  const patientsResult = useQuery(api.patients.list, { employerId, ...defaultPaginationOpts() });
  const patients = patientsResult?.items;
  const appointmentTypes = useQuery(api.appointmentTypes.listActive);
  const availableSlots = useQuery(
    api.availableSlots.getAvailable,
    step >= 2 ? { date: selectedDate } : "skip"
  );
  const bookAppointment = useMutation(api.appointments.book);

  const isLoading = patients === undefined || appointmentTypes === undefined;

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
      toast.success("Booking confirmed", {
        description: "Your appointment has been scheduled.",
      });
      onClose();
    } catch (error) {
      const message = error instanceof ConvexError
        ? (error.data as string)
        : error instanceof Error
          ? error.message
          : "An unexpected error occurred";
      toast.error("Booking failed", { description: message });
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
            {isLoading ? (
              <div className="space-y-4">
                <div>
                  <div className="h-4 w-28 bg-slate-200 rounded animate-pulse mb-2" />
                  <div className="h-10 w-full bg-slate-200 rounded animate-pulse" />
                </div>
                <div>
                  <div className="h-4 w-32 bg-slate-200 rounded animate-pulse mb-2" />
                  <div className="h-10 w-full bg-slate-200 rounded animate-pulse" />
                </div>
                <div className="h-10 w-full bg-slate-200 rounded animate-pulse" />
              </div>
            ) : appointmentTypes.length === 0 ? (
              <>
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
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <p className="text-amber-800 font-medium">No appointment types available</p>
                  </div>
                  <p className="text-sm text-amber-600 mt-1">
                    Contact your administrator to configure appointment types.
                  </p>
                </div>
                <Button className="w-full" disabled>
                  Next
                </Button>
              </>
            ) : (
              <>
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
                    {appointmentTypes.map((t) => (
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
              </>
            )}
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
