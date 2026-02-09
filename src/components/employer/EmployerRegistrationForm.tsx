import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEmployerAuth } from "@/lib/workos-auth";
import { getErrorMessage } from "@/lib/errorHandler";

/**
 * Multi-step registration form for new employer accounts.
 *
 * A 3-step wizard that collects company details, address, and GDPR consents.
 * Reads authentication tokens from URL parameters after WorkOS OAuth redirect.
 *
 * ## Steps
 * 1. **Company Details** - Type, name, registration number, contact info
 * 2. **Address** - Business address fields
 * 3. **GDPR Consent** - Required consents for data processing, health data, employer sharing
 *
 * ## URL Parameters
 * - `userId` - WorkOS user ID (required)
 * - `accessToken` - OAuth access token (required)
 * - `refreshToken` - OAuth refresh token
 * - `sessionId` - WorkOS session ID
 *
 * @component
 * @example
 * ```tsx
 * // Rendered at /register/employer with URL params
 * <EmployerRegistrationForm />
 * ```
 *
 * @fires api.employers.create - Creates the employer record
 * @fires api.gdpr.createConsent - Creates GDPR consent records (3 calls)
 */

export function EmployerRegistrationForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginAsEmployer } = useEmployerAuth();
  const registerEmployer = useAction(api.actions.employerRegistration.registerEmployer);

  const workosUserId = searchParams.get("userId") || "";
  const accessToken = searchParams.get("accessToken") || "";
  const refreshToken = searchParams.get("refreshToken") || "";
  const sessionId = searchParams.get("sessionId") || "";

  // Validate required tokens are present
  const tokensValid = workosUserId && accessToken;

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    companyType: "employer" as "employer" | "insurer",
    companyName: "",
    companyRegistrationNumber: "",
    contactName: "",
    contactPhone: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    postcode: "",
  });

  const [consents, setConsents] = useState({
    dataProcessing: false,
    healthData: false,
    employerSharing: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleConsentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConsents({ ...consents, [e.target.name]: e.target.checked });
  };

  const allConsentsGranted = consents.dataProcessing && consents.healthData && consents.employerSharing;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allConsentsGranted) {
      setError("All GDPR consents are required to proceed");
      return;
    }
    setIsSubmitting(true);
    setError("");

    try {
      // Server-side action atomically creates employer + GDPR consents
      // (eliminates race condition with JWT propagation)
      await registerEmployer({
        workosUserId,
        email: formData.email,
        companyType: formData.companyType,
        companyName: formData.companyName,
        companyRegistrationNumber: formData.companyRegistrationNumber || undefined,
        contactName: formData.contactName,
        contactPhone: formData.contactPhone || undefined,
        addressLine1: formData.addressLine1,
        addressLine2: formData.addressLine2 || undefined,
        city: formData.city,
        postcode: formData.postcode,
        consents: {
          dataProcessing: consents.dataProcessing,
          healthData: consents.healthData,
          employerSharing: consents.employerSharing,
        },
      });

      // Store auth tokens for subsequent navigation (employer portal auth)
      loginAsEmployer(workosUserId, accessToken, refreshToken, sessionId || undefined);

      // Redirect to employer dashboard
      navigate("/employer");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };;

  // Show error if required tokens are missing
  if (!tokensValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-destructive">Registration Error</CardTitle>
            <CardDescription>
              Missing authentication tokens. Please try signing in again.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate("/")}>
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Employer Registration</CardTitle>
          <CardDescription>
            Step {step} of 3 - {step === 1 ? "Company Details" : step === 2 ? "Address" : "GDPR Consent"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="companyType">Organization Type</Label>
                  <select
                    id="companyType"
                    name="companyType"
                    value={formData.companyType}
                    onChange={handleChange}
                    className="w-full border rounded-md p-2 bg-background"
                  >
                    <option value="employer">Employer</option>
                    <option value="insurer">Insurer</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyRegistrationNumber">Registration Number</Label>
                  <Input
                    id="companyRegistrationNumber"
                    name="companyRegistrationNumber"
                    value={formData.companyRegistrationNumber}
                    onChange={handleChange}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact Name *</Label>
                  <Input
                    id="contactName"
                    name="contactName"
                    value={formData.contactName}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleChange}
                  />
                </div>
                <Button type="button" onClick={() => setStep(2)} className="w-full">
                  Next
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="addressLine1">Address Line 1 *</Label>
                  <Input
                    id="addressLine1"
                    name="addressLine1"
                    value={formData.addressLine1}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressLine2">Address Line 2</Label>
                  <Input
                    id="addressLine2"
                    name="addressLine2"
                    value={formData.addressLine2}
                    onChange={handleChange}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postcode">Postcode *</Label>
                    <Input
                      id="postcode"
                      name="postcode"
                      value={formData.postcode}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                    Back
                  </Button>
                  <Button type="button" onClick={() => setStep(3)} className="flex-1">
                    Next
                  </Button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Please review and accept the following GDPR consent requirements to complete your registration.
                  </p>

                  <div className="space-y-3">
                    <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                      <input
                        type="checkbox"
                        name="dataProcessing"
                        checked={consents.dataProcessing}
                        onChange={handleConsentChange}
                        className="mt-1 h-4 w-4 rounded border-gray-300"
                      />
                      <div>
                        <p className="font-medium text-sm">Data Processing Consent *</p>
                        <p className="text-sm text-muted-foreground">
                          I consent to the processing of employee health data for occupational health assessments
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                      <input
                        type="checkbox"
                        name="healthData"
                        checked={consents.healthData}
                        onChange={handleConsentChange}
                        className="mt-1 h-4 w-4 rounded border-gray-300"
                      />
                      <div>
                        <p className="font-medium text-sm">Health Data Consent *</p>
                        <p className="text-sm text-muted-foreground">
                          I understand that sensitive health data will be collected and processed in accordance with GDPR Article 9
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                      <input
                        type="checkbox"
                        name="employerSharing"
                        checked={consents.employerSharing}
                        onChange={handleConsentChange}
                        className="mt-1 h-4 w-4 rounded border-gray-300"
                      />
                      <div>
                        <p className="font-medium text-sm">Employer Sharing Consent *</p>
                        <p className="text-sm text-muted-foreground">
                          I consent to receiving anonymized fitness-for-work reports for my employees
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}

                <div className="flex gap-4">
                  <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">
                    Back
                  </Button>
                  <Button type="submit" disabled={isSubmitting || !allConsentsGranted} className="flex-1">
                    {isSubmitting ? "Registering..." : "Complete Registration"}
                  </Button>
                </div>
              </>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
