import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Id } from "../../../convex/_generated/dataModel";

/**
 * DoctorReports - Fitness-for-work report creation
 *
 * Create and submit occupational health reports for completed appointments.
 *
 * @component
 * @requires DoctorLayout - Parent component providing context
 *
 * ## Features
 * - List of completed appointments awaiting reports
 * - Report creation dialog with fitness status
 * - Summary and restrictions input
 * - Follow-up scheduling
 * - Send report to employer
 *
 * @example
 * // Rendered by DoctorLayout when URL is /doctor/reports
 * <Route path="reports" element={<DoctorReports />} />
 */
type FitForWork = "fit" | "fit_with_restrictions" | "temporarily_unfit" | "needs_further_assessment";

export function DoctorReports() {
  const [selectedAppointment, setSelectedAppointment] = useState<Id<"appointments"> | null>(null);
  const [formData, setFormData] = useState({
    fitForWork: "fit" as FitForWork,
    summary: "",
    followUpRequired: false,
    followUpNotes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const todaysAppointments = useQuery(api.appointments.getTodaysAppointments);
  const completedWithoutReport = todaysAppointments?.filter(
    apt => apt.status === "completed" && !apt.reportId
  );

  const createReport = useMutation(api.reports.create);
  const sendToEmployer = useMutation(api.reports.sendToEmployer);

  const handleSubmit = async () => {
    if (!selectedAppointment) return;

    // Validation
    if (!formData.summary.trim()) {
      setSubmitError("Summary is required");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    let reportId: Id<"reports"> | null = null;

    try {
      // Step 1: Create report
      reportId = await createReport({
        appointmentId: selectedAppointment,
        fitForWork: formData.fitForWork,
        summary: formData.summary,
        followUpRequired: formData.followUpRequired,
        followUpNotes: formData.followUpNotes || undefined,
      });

      // Step 2: Send to employer
      await sendToEmployer({ reportId });

      // Success - close dialog and reset
      setSelectedAppointment(null);
      setFormData({ fitForWork: "fit", summary: "", followUpRequired: false, followUpNotes: "" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Operation failed";

      // Provide context about partial failure
      if (reportId) {
        setSubmitError(`Report created but failed to send: ${message}. Please try sending again.`);
      } else {
        setSubmitError(`Failed to create report: ${message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
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
            <div className="space-y-2" data-testid="reports-list">
              {completedWithoutReport.map((apt) => (
                <div key={apt._id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{apt.scheduledTime}</p>
                    <p className="text-sm text-muted-foreground">Patient: {apt.patientId}</p>
                  </div>
                  <Button onClick={() => setSelectedAppointment(apt._id)} data-testid="create-report-btn">
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
          <DialogContent data-testid="report-dialog">
            <DialogHeader>
              <DialogTitle>Create Fitness Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {submitError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded">
                  {submitError}
                </div>
              )}
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
                <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1" data-testid="submit-report-btn">
                  {isSubmitting ? "Submitting..." : "Submit & Send to Employer"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
