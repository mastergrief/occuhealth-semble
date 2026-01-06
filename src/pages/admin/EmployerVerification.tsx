import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle } from "lucide-react";
import type { Id } from "../../../convex/_generated/dataModel";

export function EmployerVerification() {
  // Admin authorization is enforced server-side via requireAdmin
  const pendingEmployers = useQuery(api.employers.listPending);
  const verifyEmployer = useMutation(api.employers.verify);
  const rejectEmployer = useMutation(api.employers.reject);

  // Rejection dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedEmployer, setSelectedEmployer] = useState<{
    id: Id<"employers">;
    companyName: string;
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVerify = async (employerId: string) => {
    // Admin verification is now done server-side via requireAdmin
    await verifyEmployer({
      employerId: employerId as Parameters<typeof verifyEmployer>[0]["employerId"],
    });
  };

  const handleReject = async () => {
    if (!selectedEmployer || rejectionReason.trim().length < 10) return;

    setIsSubmitting(true);
    try {
      await rejectEmployer({
        employerId: selectedEmployer.id,
        reason: rejectionReason.trim(),
      });
      setRejectDialogOpen(false);
      setSelectedEmployer(null);
      setRejectionReason("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRejectDialog = (employerId: Id<"employers">, companyName: string) => {
    setSelectedEmployer({ id: employerId, companyName });
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Employer Verification</h1>

      <Card>
        <CardHeader>
          <CardTitle>Pending Verification ({pendingEmployers?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingEmployers && pendingEmployers.length > 0 ? (
            <div className="space-y-4">
              {pendingEmployers.map((employer) => (
                <div key={employer._id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{employer.companyName}</p>
                      <p className="text-sm text-muted-foreground">{employer.email}</p>
                      <p className="text-sm">Contact: {employer.contactName}</p>
                      <p className="text-sm">Type: {employer.companyType}</p>
                      {employer.companyRegistrationNumber && (
                        <p className="text-sm">Reg: {employer.companyRegistrationNumber}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleVerify(employer._id)}>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openRejectDialog(employer._id, employer.companyName)}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No employers pending verification</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Employer</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {selectedEmployer?.companyName}.
              This will be stored for compliance records.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason *</Label>
              <Textarea
                id="reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection (minimum 10 characters)"
                rows={4}
              />
              <p className="text-sm text-muted-foreground">
                {rejectionReason.length}/500 characters (minimum 10)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectionReason.trim().length < 10 || isSubmitting}
            >
              {isSubmitting ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
