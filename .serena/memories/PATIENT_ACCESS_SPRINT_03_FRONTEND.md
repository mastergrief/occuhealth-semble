# Patient Appointment Access - Frontend Implementation
**Sprint**: 03 of 04
**Index**: PATIENT_ACCESS_INDEX
**Depends On**: PATIENT_ACCESS_SPRINT_02_BACKEND
**Next**: PATIENT_ACCESS_SPRINT_04_BROWSER_TESTING

---

## Implementation Tasks

### Task 3.1: Add Route to App.tsx
**File**: `src/App.tsx`

```typescript
// Add import at top
const ViewAppointment = lazy(() => import("./pages/patient/ViewAppointment"));

// Add route (outside protected routes, this is public)
<Route
  path="/view-appointment/:token"
  element={
    <Suspense fallback={<PageLoader />}>
      <ViewAppointment />
    </Suspense>
  }
/>
```

---

### Task 3.2: Patient View Page
**File**: `src/pages/patient/ViewAppointment.tsx` (new file)

```tsx
/**
 * Public appointment view page for patients
 * Accessed via magic link - no authentication required
 */

import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect } from "react";
import { Calendar, Clock, Video, User, FileText, Download, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ViewAppointment() {
  const { token } = useParams<{ token: string }>();
  
  const result = useQuery(
    api.appointmentTokens.validateAndGetAppointment,
    token ? { token } : "skip"
  );

  const markViewed = useMutation(api.appointmentTokens.markViewed);

  // Mark as viewed on first load
  useEffect(() => {
    if (token && result?.valid) {
      markViewed({ token });
    }
  }, [token, result?.valid, markViewed]);

  // Loading state
  if (result === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Invalid/expired token
  if (!result.valid) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Link Invalid or Expired</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Please contact your employer to request a new appointment link.
            </p>
            <Link to="/">
              <Button variant="outline">Return to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { appointment, patient, doctor, appointmentType } = result;

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Format time for display
  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Status badge color
  const statusColor = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  }[appointment.status] || "bg-gray-100 text-gray-800";

  // Calendar download URL
  const calendarUrl = `${import.meta.env.VITE_CONVEX_SITE_URL || ""}/calendar/${token}`;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Your Appointment</h1>
          <p className="text-slate-600 mt-2">
            {patient?.firstName} {patient?.lastName}
          </p>
        </div>

        {/* Main Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {appointmentType?.name || "Medical Appointment"}
              </CardTitle>
              <Badge className={statusColor}>
                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
              </Badge>
            </div>
            {appointmentType?.description && (
              <CardDescription>{appointmentType.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {appointment.scheduledDate 
                      ? formatDate(appointment.scheduledDate) 
                      : "To be confirmed"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium">
                    {appointment.startTime && appointment.endTime
                      ? `${formatTime(appointment.startTime)} - ${formatTime(appointment.endTime)}`
                      : "To be confirmed"}
                  </p>
                </div>
              </div>
            </div>

            {/* Doctor */}
            {doctor && (
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Doctor</p>
                  <p className="font-medium">{doctor.name}</p>
                </div>
              </div>
            )}

            {/* Reason */}
            {appointment.reason && (
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Reason for Visit</p>
                <p className="text-slate-700">{appointment.reason}</p>
              </div>
            )}

            {/* Zoom Link */}
            {doctor?.zoomLink && appointment.status !== "cancelled" && (
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Video className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">Video Call</span>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  Your appointment will be conducted via Zoom video call.
                </p>
                <a
                  href={doctor.zoomLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex"
                >
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Video className="h-4 w-4 mr-2" />
                    Join Zoom Meeting
                  </Button>
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <a href={calendarUrl} className="flex-1">
            <Button variant="outline" className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Add to Calendar
            </Button>
          </a>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => window.print()}
          >
            Print Details
          </Button>
        </div>

        {/* Footer Notice */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Need to reschedule? Contact your employer's HR department.
          </p>
          <p className="mt-2">
            © {new Date().getFullYear()} OccuHealth - Occupational Health Platform
          </p>
        </div>
      </div>
    </div>
  );
}
```

---

### Task 3.3: Employer Portal - Share Link Button
**File**: `src/pages/employer/Bookings.tsx` (modify)

Add "Share with Employee" button to booking list:

```tsx
// Add to appointment card actions
import { Share2, Copy, Check } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import { useState } from "react";

// Inside component
const [copiedId, setCopiedId] = useState<string | null>(null);
const generateLink = useMutation(api.appointmentTokens.generate);

const handleShareLink = async (appointmentId: Id<"appointments">) => {
  try {
    const result = await generateLink({ appointmentId });
    const link = `${window.location.origin}/view-appointment/${result.token}`;
    
    await navigator.clipboard.writeText(link);
    setCopiedId(appointmentId);
    setTimeout(() => setCopiedId(null), 2000);
    
    toast.success("Link copied!", {
      description: "Share this link with the employee. Valid for 48 hours.",
    });
  } catch (error) {
    toast.error("Failed to generate link");
  }
};

// Add button to appointment card
<Button
  variant="ghost"
  size="sm"
  onClick={() => handleShareLink(appointment._id)}
>
  {copiedId === appointment._id ? (
    <Check className="h-4 w-4 text-green-600" />
  ) : (
    <Share2 className="h-4 w-4" />
  )}
  Share
</Button>
```

---

### Task 3.4: Create Patient Directory
```bash
mkdir -p src/pages/patient
mkdir -p src/components/patient
```

---

## Verification Commands

```bash
# 1. Typecheck frontend changes
npm run typecheck

# 2. Start dev server
npm run dev

# 3. Navigate to test (need valid token)
# http://localhost:5175/view-appointment/{token}

# 4. Test invalid token handling
# http://localhost:5175/view-appointment/invalid-token-123
```

---

## Acceptance Criteria

- [ ] `/view-appointment/:token` route exists and loads
- [ ] Valid token shows appointment details
- [ ] Invalid token shows error message with helpful text
- [ ] Expired token shows expiration message
- [ ] "Add to Calendar" downloads ICS file
- [ ] "Join Zoom Meeting" opens Zoom link in new tab
- [ ] Status badge displays correct color for each status
- [ ] Page is responsive (mobile-friendly)
- [ ] Employer can generate share link from Bookings page
- [ ] Copy to clipboard works and shows success feedback
- [ ] Typecheck passes

---

## UI States Checklist

| State | Display |
|-------|---------|
| Loading | Spinner centered |
| Invalid token | Red X icon + error message + home link |
| Expired token | Error message + "contact employer" text |
| Pending appointment | Yellow badge, full details |
| Confirmed appointment | Blue badge, Zoom link visible |
| Completed appointment | Green badge |
| Cancelled appointment | Red badge, Zoom hidden |

---

→ Next: PATIENT_ACCESS_SPRINT_04_BROWSER_TESTING
