import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { defaultPaginationOpts } from "../../../convex/helpers/pagination";
import { BookingFlow } from "@/components/employer/BookingFlow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useEmployerContext } from "../EmployerLayout";

export function BookingsPage() {
  const { employer, isVerified } = useEmployerContext();
  const [showBooking, setShowBooking] = useState(false);

  const appointmentsResult = useQuery(
    api.appointments.listByEmployer,
    employer?._id ? { employerId: employer._id, ...defaultPaginationOpts() } : "skip"
  );
  const appointments = appointmentsResult?.items;

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
                <div
                  key={apt._id}
                  className="flex justify-between items-center p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {apt.patient?.firstName} {apt.patient?.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {apt.scheduledDate} at {apt.scheduledTime}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      apt.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : apt.status === "scheduled"
                          ? "bg-blue-100 text-blue-800"
                          : apt.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {apt.status}
                  </span>
                </div>
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
