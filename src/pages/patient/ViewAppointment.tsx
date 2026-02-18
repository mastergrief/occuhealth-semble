import { useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Video,
  User,
  FileText,
  Download,
  CheckCircle,
  XCircle,
} from "lucide-react";

export default function ViewAppointment() {
  const { token } = useParams<{ token: string }>();
  const hasMarkedViewed = useRef(false);

  const result = useQuery(
    api.appointmentTokens.validateAndGetAppointment,
    token ? { token } : "skip"
  );

  const markViewed = useMutation(api.appointmentTokens.markViewed);

  // Mark as viewed on first successful load
  useEffect(() => {
    if (result?.valid && token && !hasMarkedViewed.current) {
      hasMarkedViewed.current = true;
      void markViewed({ token });
    }
  }, [result?.valid, token, markViewed]);

  // Loading state
  if (result === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Invalid/Expired state
  if (!result.valid) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl">Link Invalid or Expired</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link to="/">
              <Button variant="outline">Return to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid state - extract data
  const { appointment, patient, doctor, appointmentType } = result;

  // Format date
  const formattedDate = appointment.scheduledDate
    ? new Date(appointment.scheduledDate).toLocaleDateString("en-GB", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Date not set";

  // Format time
  const formattedTime =
    appointment.startTime && appointment.endTime
      ? `${appointment.startTime} - ${appointment.endTime}`
      : appointment.startTime || "Time not set";

  // Status badge color
  const statusColor =
    {
      scheduled: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      no_show: "bg-gray-100 text-gray-800",
    }[appointment.status] || "bg-gray-100 text-gray-800";

  const patientName = patient
    ? `${patient.firstName} ${patient.lastName}`
    : "Patient";

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
            <Calendar className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Your Appointment</h1>
          <p className="text-gray-600 mt-1">{patientName}</p>
        </div>

        {/* Main appointment card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {appointmentType?.name || "Appointment"}
              </CardTitle>
              <Badge className={statusColor}>{appointment.status}</Badge>
            </div>
            {appointmentType?.description && (
              <CardDescription>{appointmentType.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">{formattedDate}</p>
              </div>
            </div>

            {/* Time */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Time</p>
                <p className="font-medium">{formattedTime}</p>
              </div>
            </div>

            {/* Doctor */}
            {doctor && (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Doctor</p>
                  <p className="font-medium">{doctor.name}</p>
                </div>
              </div>
            )}

            {/* Reason */}
            {appointment.reason && (
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Reason for Visit</p>
                  <p className="font-medium">{appointment.reason}</p>
                </div>
              </div>
            )}

            {/* Zoom link */}
            {doctor?.zoomLink && appointment.status !== "cancelled" && (
              <div className="pt-4 border-t">
                <a
                  href={doctor.zoomLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="w-full" variant="default">
                    <Video className="h-4 w-4 mr-2" />
                    Join Video Consultation
                  </Button>
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex gap-3">
          <a
            href={`${(import.meta.env.VITE_CONVEX_URL as string).replace('.convex.cloud', '.convex.site')}/calendar/${token}`}
            className="flex-1"
            download="appointment.ics"
          >
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Add to Calendar
            </Button>
          </a>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => window.print()}
          >
            <FileText className="h-4 w-4 mr-2" />
            Print Details
          </Button>
        </div>

        {/* Footer */}
        <Card className="bg-slate-100 border-slate-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>
                Questions? Contact us at{" "}
                <a
                  href="mailto:support@occuflow.co.uk"
                  className="text-blue-600 hover:underline"
                >
                  support@occuflow.co.uk
                </a>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
