import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { defaultPaginationOpts } from "../../../convex/helpers/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DoctorAppointments() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const appointmentsResult = useQuery(api.appointments.listByDate, { date, ...defaultPaginationOpts() });
  const appointments = appointmentsResult?.items;
  const markCompleted = useMutation(api.appointments.markCompleted);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Appointments</h1>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-48"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appointments for {date}</CardTitle>
        </CardHeader>
        <CardContent>
          {appointments && appointments.length > 0 ? (
            <div className="space-y-3">
              {appointments.map((apt) => (
                <div key={apt._id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{apt.patient?.firstName} {apt.patient?.lastName}</p>
                      <p className="text-sm text-muted-foreground">{apt.scheduledTime}</p>
                      <p className="text-sm">{apt.employer?.companyName}</p>
                      {apt.reasonForAppointment && (
                        <p className="text-sm mt-2">Reason: {apt.reasonForAppointment}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {apt.status === "scheduled" && (
                        <Button
                          size="sm"
                          onClick={() => markCompleted({ appointmentId: apt._id })}
                        >
                          Complete
                        </Button>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        apt.status === "completed" ? "bg-green-100 text-green-800" :
                        "bg-blue-100 text-blue-800"
                      }`}>
                        {apt.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No appointments for this date</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
