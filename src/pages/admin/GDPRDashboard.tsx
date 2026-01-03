import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield, AlertTriangle, Activity, CheckCircle, Clock, FileText } from "lucide-react";
import { Link } from "react-router-dom";

export function GDPRDashboard() {
  const stats = useQuery(api.gdpr.getGDPRStats);

  const consentCoverage = stats?.totalPatients
    ? Math.round((stats.patientsWithAllConsents / stats.totalPatients) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">GDPR Compliance Dashboard</h1>

      {/* Main Stats Grid */}
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

      {/* Consent Coverage Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Consent Coverage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Patients with all required consents</span>
              <span className="font-medium">
                {stats?.patientsWithAllConsents ?? 0} / {stats?.totalPatients ?? 0}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div
                className="bg-green-600 h-3 rounded-full transition-all"
                style={{ width: `${consentCoverage}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {consentCoverage}% of patients have granted all three consent types
              (data processing, health data, employer sharing)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Erasure SLA Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600" />
            Erasure Request SLA Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-sm text-muted-foreground">Pending Requests</p>
              <p className="text-2xl font-bold">{stats?.pendingErasureCount ?? 0}</p>
            </div>
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2">
                <p className="text-sm text-amber-700 dark:text-amber-400">Approaching Deadline</p>
                {(stats?.erasureApproachingDeadline ?? 0) > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded-full">
                    Warning
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                {stats?.erasureApproachingDeadline ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Within 7 days of 30-day limit</p>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2">
                <p className="text-sm text-red-700 dark:text-red-400">Overdue</p>
                {(stats?.erasureOverdue ?? 0) > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 rounded-full">
                    Critical
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                {stats?.erasureOverdue ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Past 30-day GDPR deadline</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Audit Log Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Audit Log Activity (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.auditLogsByAction && stats.auditLogsByAction.length > 0 ? (
              <div className="space-y-2">
                {stats.auditLogsByAction.map((item) => (
                  <div key={item.action} className="flex justify-between items-center p-2 bg-slate-50 dark:bg-slate-800 rounded">
                    <span className="text-sm font-medium">{item.action}</span>
                    <span className="text-sm text-muted-foreground px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No audit activity in the last 7 days</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link to="/admin/gdpr/erasure" className="block p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
              Process Erasure Requests
              {(stats?.erasureOverdue ?? 0) > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                  {stats?.erasureOverdue} overdue
                </span>
              )}
            </Link>
            <Link to="/admin/gdpr/audit" className="block p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
              View Audit Logs
            </Link>
            <Link to="/admin/employers" className="block p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
              Employer Verification
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Audit Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recentAuditLogs && stats.recentAuditLogs.length > 0 ? (
            <div className="space-y-2">
              {stats.recentAuditLogs.slice(0, 5).map((log) => (
                <div key={log._id} className="text-sm p-2 bg-slate-50 dark:bg-slate-800 rounded">
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
  );
}
