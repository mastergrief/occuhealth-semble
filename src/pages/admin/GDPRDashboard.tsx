import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield, AlertTriangle, Activity } from "lucide-react";
import { Link } from "react-router-dom";

export function GDPRDashboard() {
  const stats = useQuery(api.gdpr.getGDPRStats);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">GDPR Compliance Dashboard</h1>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Patients</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <p className="text-2xl font-bold">{stats?.totalPatients ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Active Consents</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            <p className="text-2xl font-bold">{stats?.activeConsents ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pending Erasures</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <p className="text-2xl font-bold">{stats?.pendingErasureCount ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-600" />
            <p className="text-2xl font-bold">{stats?.recentAuditLogs?.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/admin/gdpr/erasure" className="block p-3 border rounded-lg hover:bg-slate-50">
              Process Erasure Requests
            </Link>
            <Link to="/admin/gdpr/audit" className="block p-3 border rounded-lg hover:bg-slate-50">
              View Audit Logs
            </Link>
            <Link to="/admin/employers" className="block p-3 border rounded-lg hover:bg-slate-50">
              Employer Verification
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Audit Logs</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentAuditLogs && stats.recentAuditLogs.length > 0 ? (
              <div className="space-y-2">
                {stats.recentAuditLogs.slice(0, 5).map((log) => (
                  <div key={log._id} className="text-sm p-2 bg-slate-50 rounded">
                    <span className="font-medium">{log.action}</span>
                    <span className="text-muted-foreground"> - {log.resourceType}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No recent activity</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
