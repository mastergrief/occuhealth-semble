import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDoctorContext } from "../DoctorLayout";

/**
 * DoctorSettings - Profile and configuration management
 *
 * Update doctor profile information and Zoom meeting link.
 *
 * @component
 * @requires DoctorLayout - Parent component providing context
 *
 * ## Features
 * - Profile information display
 * - Zoom Personal Meeting Link configuration
 * - Save settings with success feedback
 * - URL validation for Zoom links
 *
 * @example
 * // Rendered by DoctorLayout when URL is /doctor/settings
 * <Route path="settings" element={<DoctorSettings />} />
 */

export function DoctorSettings() {
  const { doctor } = useDoctorContext();
  const [zoomLink, setZoomLink] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const updateDoctor = useMutation(api.doctorSettings.update);

  useEffect(() => {
    if (doctor?.zoomPersonalLink) {
      setZoomLink(doctor.zoomPersonalLink);
    }
  }, [doctor?.zoomPersonalLink]);

  const handleSave = async () => {
    if (!doctor?._id) return;

    // Validation
    if (zoomLink && !zoomLink.includes("zoom.us")) {
      setSaveError("Please enter a valid Zoom URL");
      setSaveStatus("error");
      return;
    }

    setIsSaving(true);
    setSaveStatus("idle");
    setSaveError(null);

    try {
      await updateDoctor({ doctorId: doctor._id, zoomPersonalLink: zoomLink });
      setSaveStatus("success");
      // Auto-clear success after 3s
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      setSaveStatus("error");
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card data-testid="profile-section">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Name</Label>
            <p className="font-medium">{doctor?.name ?? "Loading..."}</p>
          </div>
          <div>
            <Label>Email</Label>
            <p className="font-medium">{doctor?.email ?? "Loading..."}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zoom Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Personal Meeting Link</Label>
            <Input
              value={zoomLink}
              onChange={(e) => setZoomLink(e.target.value)}
              placeholder="https://zoom.us/j/..."
              data-testid="zoom-link-input"
            />
          </div>
          <Button onClick={handleSave} disabled={isSaving} data-testid="save-btn">
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
          {saveStatus === "success" && (
            <p className="text-green-600 text-sm mt-2" data-testid="save-status">Settings saved successfully!</p>
          )}
          {saveStatus === "error" && (
            <p className="text-red-500 text-sm mt-2" data-testid="save-status">{saveError}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
