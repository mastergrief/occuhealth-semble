import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Id } from "../../../convex/_generated/dataModel";

type FitForWork = "fit" | "fit_with_restrictions" | "temporarily_unfit" | "needs_further_assessment";

export function DoctorReports() {
  const [selectedAppointment, setSelectedAppointment] = useState<Id<"appointments"> | null>(null);
  const [formData, setFormData] = useState({
    fitForWork: "fit" as FitForWork,
    summary: "",
    followUpRequired: false,
    followUpNotes: "",
  });

  const todaysAppointments = useQuery(api.appointments.getTodaysAppointments);
  const completedWithoutReport = todaysAppointments?.filter(
    apt => apt.status === "completed" && !apt.reportId
  );

  const createReport = useMutation(api.reports.create);
  const sendToEmployer = useMutation(api.reports.sendToEmployer);

  const handleSubmit = async () => {
    if (!selectedAppointment) return;

    const reportId = await createReport({
      appointmentId: selectedAppointment,
      fitForWork: formData.fitForWork,
      summary: formData.summary,
      followUpRequired: formData.followUpRequired,
      followUpNotes: formData.followUpNotes || undefined,
    });

    await sendToEmployer({ reportId });
    setSelectedAppointment(null);
    setFormData({ fitForWork: "fit", summary: "", followUpRequired: false, followUpNotes: "" });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Create Reports</h1>

      <Card>
        <CardHeader>
          <CardTitle>Completed Appointments Awaiting Report</CardTitle>
        </CardHeader>
        <CardContent>
          {completedWithoutReport && completedWithoutReport.length > 0 ? (
            <div className="space-y-2">
              {completedWithoutReport.map((apt) => (
                <div key={apt._id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{apt.scheduledTime}</p>
                    <p className="text-sm text-muted-foreground">Patient: {apt.patientId}</p>
                  </div>
                  <Button onClick={() => setSelectedAppointment(apt._id)}>
                    Create Report
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No appointments awaiting reports</p>
          )}
        </CardContent>
      </Card>

      {selectedAppointment && (
        <Dialog open onOpenChange={() => setSelectedAppointment(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Fitness Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Fitness Assessment</Label>
                <select
                  value={formData.fitForWork}
                  onChange={(e) => setFormData({ ...formData, fitForWork: e.target.value as FitForWork })}
                  className="w-full border rounded-md p-2"
                >
                  <option value="fit">Fit for work</option>
                  <option value="fit_with_restrictions">Fit with restrictions</option>
                  <option value="temporarily_unfit">Temporarily unfit</option>
                  <option value="needs_further_assessment">Needs further assessment</option>
                </select>
              </div>
              <div>
                <Label>Summary</Label>
                <Textarea
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Provide a summary of the assessment..."
                  rows={4}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.followUpRequired}
                  onChange={(e) => setFormData({ ...formData, followUpRequired: e.target.checked })}
                />
                <Label>Follow-up required</Label>
              </div>
              {formData.followUpRequired && (
                <div>
                  <Label>Follow-up Notes</Label>
                  <Textarea
                    value={formData.followUpNotes}
                    onChange={(e) => setFormData({ ...formData, followUpNotes: e.target.value })}
                    rows={2}
                  />
                </div>
              )}
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setSelectedAppointment(null)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleSubmit} className="flex-1">
                  Submit & Send to Employer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
