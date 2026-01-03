import { useQuery } from "convex/react";
import { useOutletContext } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, CheckCircle } from "lucide-react";
import { Doc } from "../../../convex/_generated/dataModel";

interface DoctorContextType {
  doctor: Doc<"doctorSettings"> | null | undefined;
}

export function DoctorDashboard() {
  const { doctor } = useOutletContext<DoctorContextType>();
  const todaysAppointments = useQuery(api.appointments.getTodaysAppointments);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Today's Schedule</h1>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Today</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{todaysAppointments?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {todaysAppointments?.filter(a => a.status === "completed").length ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {todaysAppointments?.filter(a => a.status === "scheduled").length ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {todaysAppointments && todaysAppointments.length > 0 ? (
            <div className="space-y-3">
              {todaysAppointments.map((apt) => (
                <div key={apt._id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{apt.scheduledTime}</p>
                    <p className="text-sm text-muted-foreground">Patient ID: {apt.patientId}</p>
                  </div>
                  <div className="flex gap-2">
                    {apt.status === "scheduled" && doctor?.zoomPersonalLink && (
                      <Button size="sm" asChild>
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
