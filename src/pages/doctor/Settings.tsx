import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { useOutletContext } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Doc } from "../../../convex/_generated/dataModel";

interface DoctorContextType {
  doctor: Doc<"doctorSettings"> | null | undefined;
}

export function DoctorSettings() {
  const { doctor } = useOutletContext<DoctorContextType>();
  const [zoomLink, setZoomLink] = useState("");
  const updateDoctor = useMutation(api.doctorSettings.update);

  useEffect(() => {
    if (doctor?.zoomPersonalLink) {
      setZoomLink(doctor.zoomPersonalLink);
    }
  }, [doctor?.zoomPersonalLink]);

  const handleSave = async () => {
    if (doctor?._id) {
      await updateDoctor({ doctorId: doctor._id, zoomPersonalLink: zoomLink });
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Name</Label>
            <p className="font-medium">{doctor?.name ?? "Loading..."}</p>
          </div>
          <div>
            <Label>Email</Label>
            <p className="font-medium">{doctor?.email ?? "Loading..."}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zoom Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Personal Meeting Link</Label>
            <Input
              value={zoomLink}
              onChange={(e) => setZoomLink(e.target.value)}
              placeholder="https://zoom.us/j/..."
            />
          </div>
          <Button onClick={handleSave}>Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  );
}
