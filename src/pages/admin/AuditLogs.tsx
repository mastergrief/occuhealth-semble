import { memo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

/**
 * Admin page for viewing GDPR audit logs.
 *
 * Displays a filterable, paginated list of all GDPR-related audit events
 * including data access, consent changes, and erasure requests. Supports
 * filtering by action type, actor type, resource type, and date range.
 *
 * ## Filter Options
 * - **Action** - consent_created, data_accessed, data_exported, etc.
 * - **Actor Type** - employer, doctor, admin, system
 * - **Resource Type** - patient, consent, report, appointment, employer
 * - **Date Range** - Start and end date filters
 *
 * ## Features
 * - Cursor-based pagination with "Load More"
 * - Color-coded action badges
 * - Expandable details with metadata JSON
 * - Clear filters button
 *
 * @component
 * @example
 * ```tsx
 * // Rendered at /admin/gdpr/audit
 * <AuditLogs />
 * ```
 *
 * @fires api.gdpr.getAuditLogs - Fetches paginated audit log entries
 */

const ACTION_TYPES = [
  "patient_created",
  "appointment_booked",
  "appointment_completed",
  "report_created",
  "report_sent_to_employer",
  "consent_created",
  "consent_withdrawn",
  "employer_verified",
  "employer_rejected",
  "erasure_requested",
  "erasure_processed",
  "appointment_type_created",
  "appointment_type_updated",
  "appointment_type_deleted",
  "appointment_type_soft_deleted",
];

const ACTOR_TYPES = ["employer", "doctor", "admin", "system"] as const;
const RESOURCE_TYPES = ["patient", "appointment", "report", "consent", "employer", "appointmentType", "erasureRequest"];

interface AuditLogRowProps {
  log: {
    _id: Id<"auditLogs">;
    action: string;
    actorType: string;
    resourceType: string;
    resourceId?: string;
    timestamp: number;
  };
}

const AuditLogRow = memo(function AuditLogRow({ log }: AuditLogRowProps) {
  return (
    <div className="p-3 border rounded-lg">
      <div className="flex justify-between">
        <span className="font-medium">{log.action}</span>
        <span className="text-sm text-muted-foreground">
          {new Date(log.timestamp).toLocaleString()}
        </span>
      </div>
      <p className="text-sm">
        {log.actorType} &rarr; {log.resourceType}
        {log.resourceId && ` (${log.resourceId})`}
      </p>
    </div>
  );
});

export function AuditLogs() {
  const [filters, setFilters] = useState({
    action: "",
    actorType: "" as "" | "employer" | "doctor" | "admin" | "system",
    resourceType: "",
    startDate: "",
    endDate: "",
  });
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const result = useQuery(api.gdpr.getAuditLogs, {
    limit: 50,
    cursor,
    action: filters.action || undefined,
    actorType: filters.actorType || undefined,
    resourceType: filters.resourceType || undefined,
    startTime: filters.startDate ? new Date(filters.startDate).getTime() : undefined,
    endTime: filters.endDate ? new Date(filters.endDate + "T23:59:59").getTime() : undefined,
  });

  const logs = result?.logs ?? [];
  const hasMore = result?.hasMore ?? false;
  const nextCursor = result?.nextCursor;

  const clearFilters = () => {
    setFilters({ action: "", actorType: "", resourceType: "", startDate: "", endDate: "" });
    setCursor(undefined);
  };

  const loadMore = () => {
    if (nextCursor) {
      setCursor(nextCursor);
    }
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Logs</h1>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Action</Label>
              <Select
                value={filters.action}
                onValueChange={(v) => {
                  setFilters((f) => ({ ...f, action: v === "all" ? "" : v }));
                  setCursor(undefined);
                }}
              >
                <SelectTrigger><SelectValue placeholder="All actions" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {ACTION_TYPES.map((a) => (
                    <SelectItem key={a} value={a}>{a.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Actor Type</Label>
              <Select
                value={filters.actorType}
                onValueChange={(v) => {
                  setFilters((f) => ({ ...f, actorType: v === "all" ? "" : v as typeof filters.actorType }));
                  setCursor(undefined);
                }}
              >
                <SelectTrigger><SelectValue placeholder="All actors" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {ACTOR_TYPES.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Resource Type</Label>
              <Select
                value={filters.resourceType}
                onValueChange={(v) => {
                  setFilters((f) => ({ ...f, resourceType: v === "all" ? "" : v }));
                  setCursor(undefined);
                }}
              >
                <SelectTrigger><SelectValue placeholder="All resources" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {RESOURCE_TYPES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, startDate: e.target.value }));
                  setCursor(undefined);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, endDate: e.target.value }));
                  setCursor(undefined);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results ({logs.length}{hasMore ? "+" : ""})</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <div className="space-y-2">
              {logs.map((log) => (
                <AuditLogRow key={log._id} log={log} />
              ))}
              {hasMore && (
                <div className="pt-4 flex justify-center">
                  <Button variant="outline" onClick={loadMore}>
                    Load More
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">No audit logs</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
