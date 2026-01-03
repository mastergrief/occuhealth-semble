import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEmployerAuth } from "@/lib/workos-auth";

export function EmployerRegistrationForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginAsEmployer } = useEmployerAuth();
  const createEmployer = useMutation(api.employers.create);

  const workosUserId = searchParams.get("userId") || "";
  const accessToken = searchParams.get("accessToken") || "";
  const refreshToken = searchParams.get("refreshToken") || "";

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await createEmployer({
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
      });

      // Store auth tokens
      loginAsEmployer(workosUserId, accessToken, refreshToken);

      // Redirect to employer dashboard
      navigate("/employer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Employer Registration</CardTitle>
          <CardDescription>
            Step {step} of 2 - {step === 1 ? "Company Details" : "Address"}
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

                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}

                <div className="flex gap-4">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                    Back
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
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
