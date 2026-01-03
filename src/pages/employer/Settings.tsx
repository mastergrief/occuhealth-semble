import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Doc } from "../../../convex/_generated/dataModel";

interface LayoutContext {
  employer: Doc<"employers"> | null | undefined;
  isVerified: boolean;
}

export function EmployerSettings() {
  const { employer } = useOutletContext<LayoutContext>();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">Company Name</label>
            <p className="font-medium">{employer?.companyName}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Type</label>
            <p className="font-medium capitalize">{employer?.companyType}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Status</label>
            <p
              className={`font-medium capitalize ${
                employer?.status === "verified"
                  ? "text-green-600"
                  : employer?.status === "pending"
                    ? "text-amber-600"
                    : "text-red-600"
              }`}
            >
              {employer?.status}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
