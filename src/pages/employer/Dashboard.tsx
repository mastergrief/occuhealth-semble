import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { defaultPaginationOpts } from "../../../convex/helpers/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, FileText, Clock } from "lucide-react";
import { useEmployerContext } from "../EmployerLayout";

export function EmployerDashboard() {
  const { employer } = useEmployerContext();
  const employerId = employer?._id;

  const patientsResult = useQuery(api.patients.list, employerId ? { employerId, ...defaultPaginationOpts() } : "skip");
  const patients = patientsResult?.items;
  const appointmentsResult = useQuery(
    api.appointments.listByEmployer,
    employerId ? { employerId, ...defaultPaginationOpts() } : "skip"
  );
  const appointments = appointmentsResult?.items;
  const reportsResult = useQuery(api.reports.listByEmployer, employerId ? { employerId, ...defaultPaginationOpts() } : "skip");
  const reports = reportsResult?.items;

  const stats = [
    {
      title: "Employees",
      value: patients?.length ?? 0,
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Appointments",
      value: appointments?.length ?? 0,
      icon: Calendar,
      color: "text-green-600",
    },
    {
      title: "Reports",
      value: reports?.length ?? 0,
      icon: FileText,
      color: "text-purple-600",
    },
    {
      title: "Pending",
      value: appointments?.filter((a) => a.status === "scheduled").length ?? 0,
      icon: Clock,
      color: "text-amber-600",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent appointments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {appointments && appointments.length > 0 ? (
            <div className="space-y-2">
              {appointments.slice(0, 5).map((apt) => (
                <div
                  key={apt._id}
                  className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
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
                    className={`px-2 py-1 rounded-full text-xs ${
                      apt.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : apt.status === "scheduled"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {apt.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No appointments yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
