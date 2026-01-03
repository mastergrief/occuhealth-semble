import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";

export function EmployerVerification() {
  // Admin authorization is enforced server-side via requireAdmin
  const pendingEmployers = useQuery(api.employers.listPending);
  const verifyEmployer = useMutation(api.employers.verify);
  const rejectEmployer = useMutation(api.employers.reject);

  const handleVerify = async (employerId: string) => {
    // Admin verification is now done server-side via requireAdmin
    await verifyEmployer({
      employerId: employerId as Parameters<typeof verifyEmployer>[0]["employerId"],
    });
  };

  const handleReject = async (employerId: string) => {
    await rejectEmployer({
      employerId: employerId as Parameters<typeof rejectEmployer>[0]["employerId"],
      reason: "Did not meet verification requirements",
    });
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
                      <Button size="sm" variant="destructive" onClick={() => handleReject(employer._id)}>
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
    </div>
  );
}
