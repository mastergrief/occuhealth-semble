import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Id } from "../../../convex/_generated/dataModel";

import { handleMutationError } from "@/lib/errorHandler";

/**
 * Form dialog for adding new employees to an employer's organization.
 *
 * Creates both GDPR consent record and patient/employee record in a single flow.
 * Requires explicit data processing consent before employee creation.
 *
 * @component
 * @example
 * ```tsx
 * <EmployeeForm
 *   employerId={employer._id}
 *   onClose={() => setShowForm(false)}
 * />
 * ```
 *
 * @param props.employerId - The employer's Convex ID to associate the employee with
 * @param props.onClose - Callback when dialog is closed (on success or cancel)
 *
 * @fires api.gdpr.createConsent - Creates GDPR data processing consent
 * @fires api.patients.create - Creates the employee/patient record
 */

interface EmployeeFormProps {
  employerId: Id<"employers">;
  onClose: () => void;
}

export function EmployeeForm({ employerId, onClose }: EmployeeFormProps) {
  const createConsent = useMutation(api.gdpr.createConsent);
  const createPatient = useMutation(api.patients.create);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    jobTitle: "",
    department: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    try {
      // Create consent first
      const consentId = await createConsent({
        patientEmail: formData.email,
        consentType: "data_processing",
        consentText:
          "I consent to the processing of my personal data for occupational health purposes.",
        consentVersion: "1.0",
        collectedByEmployerId: employerId,
      });

      // Create patient with consent
      await createPatient({
        employerId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        dateOfBirth: formData.dateOfBirth,
        jobTitle: formData.jobTitle || undefined,
        department: formData.department || undefined,
        consentId,
      });

      onClose();
    } catch (error) {
      handleMutationError(error, "Add employee");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Employee</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>First Name *</Label>
              <Input
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <Label>Email *</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div>
            <Label>Date of Birth *</Label>
            <Input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Job Title</Label>
              <Input
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
              />
            </div>
            <div>
              <Label>Department</Label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Adding..." : "Add Employee"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
