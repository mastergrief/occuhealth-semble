import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { defaultPaginationOpts } from "../../../convex/helpers/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/lib/workos-auth";

export function ErasureRequests() {
  const { adminUser } = useAdminAuth();
  const requests = useQuery(api.gdpr.listErasureRequests, {
    status: "pending",
    ...defaultPaginationOpts(),
  });
  const processErasure = useMutation(api.gdpr.processErasure);

  const handleProcess = async (requestId: string) => {
    if (adminUser?.userId) {
      await processErasure({
        requestId: requestId as Parameters<typeof processErasure>[0]["requestId"],
        processedBy: adminUser.userId,
      });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Erasure Requests</h1>

      <Card>
        <CardHeader>
          <CardTitle>Pending Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {requests?.items && requests.items.length > 0 ? (
            <div className="space-y-4">
              {requests.items.map((request) => (
                <div key={request._id} className="p-4 border rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-medium">{request.requesterEmail}</p>
                    <p className="text-sm text-muted-foreground">
                      Requested: {new Date(request.requestedAt).toLocaleDateString()}
                    </p>
                    {request.reason && <p className="text-sm">Reason: {request.reason}</p>}
                  </div>
                  <Button onClick={() => handleProcess(request._id)}>
                    Process Erasure
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No pending erasure requests</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
