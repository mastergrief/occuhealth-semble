import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AuditLogs() {
  const logs = useQuery(api.gdpr.getAuditLogs, { limit: 100 });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Logs</h1>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {logs && logs.length > 0 ? (
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log._id} className="p-3 border rounded-lg">
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
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No audit logs</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
