import { memo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { defaultPaginationOpts } from "../../../convex/helpers/pagination";
import { BookingFlow } from "@/components/employer/BookingFlow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Share2, Check } from "lucide-react";
import { useEmployerContext } from "../EmployerLayout";
import { toast } from "sonner";
import { Id } from "../../../convex/_generated/dataModel";

interface AppointmentCardProps {
  appointment: {
    _id: Id<"appointments">;
    patient?: {
      firstName: string;
      lastName: string;
    } | null;
    scheduledDate: string;
    scheduledTime: string;
    status: string;
  };
  copiedId: Id<"appointments"> | null;
  onShareLink: (appointmentId: Id<"appointments">) => void;
}

const AppointmentCard = memo(function AppointmentCard({
  appointment,
  copiedId,
  onShareLink,
}: AppointmentCardProps) {
  return (
    <div className="flex justify-between items-center p-4 border rounded-lg">
      <div>
        <p className="font-medium">
          {appointment.patient?.firstName} {appointment.patient?.lastName}
        </p>
        <p className="text-sm text-muted-foreground">
          {appointment.scheduledDate} at {appointment.scheduledTime}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onShareLink(appointment._id)}
        >
          {copiedId === appointment._id ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Share2 className="h-4 w-4" />
          )}
          <span className="ml-1">Share</span>
        </Button>
        <span
          className={`px-3 py-1 rounded-full text-sm ${
            appointment.status === "completed"
              ? "bg-green-100 text-green-800"
              : appointment.status === "scheduled"
                ? "bg-blue-100 text-blue-800"
                : appointment.status === "cancelled"
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-800"
          }`}
        >
          {appointment.status}
        </span>
      </div>
    </div>
  );
});

export function BookingsPage() {
  const { employer, isVerified } = useEmployerContext();
  const [showBooking, setShowBooking] = useState(false);
  const [copiedId, setCopiedId] = useState<Id<"appointments"> | null>(null);

  const appointmentsResult = useQuery(
    api.appointments.listByEmployer,
    employer?._id ? { employerId: employer._id, ...defaultPaginationOpts() } : "skip"
  );
  const appointments = appointmentsResult?.items;

  const generateLink = useMutation(api.appointmentTokens.generate);

  const handleShareLink = async (appointmentId: Id<"appointments">) => {
    try {
      const result = await generateLink({ appointmentId });
      const link = `${window.location.origin}/view-appointment/${result.token}`;

      await navigator.clipboard.writeText(link);
      setCopiedId(appointmentId);
      setTimeout(() => setCopiedId(null), 2000);

      toast.success("Link copied!", {
        description: "Share this link with the employee. Valid for 48 hours.",
      });
    } catch (error) {
      toast.error("Failed to generate link", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Bookings</h1>
        <Button onClick={() => setShowBooking(true)} disabled={!isVerified}>
          <Plus className="h-4 w-4 mr-2" />
          New Booking
        </Button>
      </div>

      {!isVerified && (
        <p className="text-amber-600">Booking is disabled until your account is verified.</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {appointments && appointments.length > 0 ? (
            <div className="space-y-2">
              {appointments.map((apt) => (
                <AppointmentCard
                  key={apt._id}
                  appointment={apt}
                  copiedId={copiedId}
                  onShareLink={handleShareLink}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No bookings yet</p>
          )}
        </CardContent>
      </Card>

      {showBooking && employer && (
        <BookingFlow employerId={employer._id} onClose={() => setShowBooking(false)} />
      )}
    </div>
  );
}
