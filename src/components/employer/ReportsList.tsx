import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Id } from "../../../convex/_generated/dataModel";

interface Report {
  _id: Id<"reports">;
  fitForWork: "fit" | "fit_with_restrictions" | "temporarily_unfit" | "needs_further_assessment";
  summary: string;
  signedAt: number;
  sentToEmployerAt?: number;
  patient?: { firstName: string; lastName: string } | null;
}

interface ReportsListProps {
  reports: Report[];
}

const fitStatusColors: Record<string, string> = {
  fit: "bg-green-100 text-green-800",
  fit_with_restrictions: "bg-amber-100 text-amber-800",
  temporarily_unfit: "bg-red-100 text-red-800",
  needs_further_assessment: "bg-blue-100 text-blue-800",
};

export function ReportsList({ reports }: ReportsListProps) {
  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">No reports available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Medical Reports</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report._id} className="p-4 border rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium">
                    {report.patient?.firstName} {report.patient?.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(report.signedAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge className={fitStatusColors[report.fitForWork]}>
                  {report.fitForWork.replace(/_/g, " ")}
                </Badge>
              </div>
              <p className="text-sm">{report.summary}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
