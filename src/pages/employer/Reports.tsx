import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { defaultPaginationOpts } from "../../../convex/helpers/pagination";
import { ReportsList } from "@/components/employer/ReportsList";
import { useEmployerContext } from "../EmployerLayout";

export function ReportsPage() {
  const { employer } = useEmployerContext();

  const reportsResult = useQuery(
    api.reports.listByEmployer,
    employer?._id ? { employerId: employer._id, ...defaultPaginationOpts() } : "skip"
  );
  const reports = reportsResult?.items ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reports</h1>
      <ReportsList reports={reports} />
    </div>
  );
}
