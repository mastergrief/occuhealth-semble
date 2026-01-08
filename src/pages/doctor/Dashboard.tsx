import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, CheckCircle } from "lucide-react";
import { useDoctorContext } from "../DoctorLayout";

/**
 * DoctorDashboard - Today's schedule overview for doctors
 *
 * Displays appointment statistics and today's appointment list
 * with quick access to Zoom meeting links.
 *
 * @component
 * @requires DoctorLayout - Parent component providing context
 *
 * ## Features
 * - Stats cards: Total, Completed, Remaining appointments
 * - Today's appointments list with patient info
 * - Zoom join button for scheduled appointments
 * - Empty state when no appointments
 *
 * @example
 * // Rendered by DoctorLayout when URL is /doctor/dashboard
 * <Route path="dashboard" element={<DoctorDashboard />} />
 */

export function DoctorDashboard() {
  const { doctor } = useDoctorContext();
  const todaysAppointments = useQuery(api.appointments.getTodaysAppointments);

  // Memoize computed stats to prevent unnecessary re-renders
  const { total, completed, remaining } = useMemo(() => ({
    total: todaysAppointments?.length ?? 0,
    completed: todaysAppointments?.filter(a => a.status === "completed").length ?? 0,
    remaining: todaysAppointments?.filter(a => a.status === "scheduled").length ?? 0,
  }), [todaysAppointments]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Today's Schedule</h1>

      <div className="grid md:grid-cols-3 gap-4">
        <Card data-testid="stat-total">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{total}</p>
          </CardContent>
        </Card>
        <Card data-testid="stat-completed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{completed}</p>
          </CardContent>
        </Card>
        <Card data-testid="stat-remaining">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{remaining}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {todaysAppointments && todaysAppointments.length > 0 ? (
            <div className="space-y-3" data-testid="appointment-list">
              {todaysAppointments.map((apt) => (
                <div key={apt._id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{apt.scheduledTime}</p>
                    <p className="text-sm text-muted-foreground">Patient ID: {apt.patientId}</p>
                  </div>
                  <div className="flex gap-2">
                    {apt.status === "scheduled" && doctor?.zoomPersonalLink && (
                      <Button size="sm" asChild data-testid="join-zoom-btn">
                        <a href={doctor.zoomPersonalLink} target="_blank" rel="noopener noreferrer">
                          <Video className="h-4 w-4 mr-1" />
                          Join Zoom
                        </a>
                      </Button>
                    )}
                    {apt.status === "completed" && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No appointments today</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
