import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useDoctorAuth } from "@/lib/workos-auth";
import { getErrorMessage } from "@/lib/errorHandler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function DoctorRegistrationForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginAsDoctor } = useDoctorAuth();
  const createDoctorSettings = useMutation(api.doctorSettings.create);

  const workosUserId = searchParams.get("userId") || "";
  const accessToken = searchParams.get("accessToken") || "";
  const refreshToken = searchParams.get("refreshToken") || "";
  const sessionId = searchParams.get("sessionId") || "";

  // Validate required tokens are present
  const tokensValid = workosUserId && accessToken;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    zoomPersonalLink: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const isFormValid =
    formData.name.trim() !== "" &&
    formData.email.trim() !== "" &&
    formData.zoomPersonalLink.trim() !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      setError("All fields are required");
      return;
    }
    setIsSubmitting(true);
    setError("");

    try {
      await createDoctorSettings({
        workosUserId,
        email: formData.email.trim(),
        name: formData.name.trim(),
        zoomPersonalLink: formData.zoomPersonalLink.trim(),
      });

      // Store auth tokens (including sessionId for proper logout)
      loginAsDoctor(
        workosUserId,
        accessToken,
        refreshToken,
        sessionId || undefined
      );

      // Redirect to doctor dashboard
      navigate("/doctor");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show error if required tokens are missing
  if (!tokensValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">
              Registration Error
            </CardTitle>
            <CardDescription>
              Missing authentication tokens. Please try signing in again.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate("/")}>Return to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Doctor Registration</CardTitle>
          <CardDescription>
            Complete your profile to start using OccuHealth
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                name="name"
                placeholder="Dr. Jane Smith"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="jane.smith@clinic.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zoomPersonalLink">Zoom Personal Meeting Link *</Label>
              <Input
                id="zoomPersonalLink"
                name="zoomPersonalLink"
                type="url"
                placeholder="https://zoom.us/j/1234567890"
                value={formData.zoomPersonalLink}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-muted-foreground">
                Your personal Zoom meeting link for video consultations
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !isFormValid}
            >
              {isSubmitting ? "Registering..." : "Complete Registration"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
