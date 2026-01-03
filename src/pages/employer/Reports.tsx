import { useOutletContext } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { defaultPaginationOpts } from "../../../convex/helpers/pagination";
import { ReportsList } from "@/components/employer/ReportsList";
import { Doc } from "../../../convex/_generated/dataModel";

interface LayoutContext {
  employer: Doc<"employers"> | null | undefined;
  isVerified: boolean;
}

export function ReportsPage() {
  const { employer } = useOutletContext<LayoutContext>();

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
