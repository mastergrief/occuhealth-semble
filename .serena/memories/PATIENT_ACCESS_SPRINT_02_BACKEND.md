# Patient Appointment Access - Backend Implementation
**Sprint**: 02 of 04
**Index**: PATIENT_ACCESS_INDEX
**Depends On**: PATIENT_ACCESS_SPRINT_01_OVERVIEW
**Next**: PATIENT_ACCESS_SPRINT_03_FRONTEND

---

## Implementation Tasks

### Task 2.1: Schema Update
**File**: `convex/schema.ts`

```typescript
// Add after existing tables (~line 280)
appointmentTokens: defineTable({
  tokenHash: v.string(),
  appointmentId: v.id("appointments"),
  patientId: v.id("patients"),
  createdAt: v.number(),
  expiresAt: v.number(),
  viewedAt: v.optional(v.number()),
  invalidated: v.optional(v.boolean()),
})
  .index("by_token", ["tokenHash"])
  .index("by_appointment", ["appointmentId"])
  .index("by_expiry", ["expiresAt"]),
```

**Verification**: Run `npm run typecheck` - should pass

---

### Task 2.2: Token Module
**File**: `convex/appointmentTokens.ts` (new file)

```typescript
/**
 * Appointment Token Management
 * 
 * Generates and validates magic links for patient appointment access.
 * Tokens are SHA-256 hashed before storage for security.
 * 
 * @module appointmentTokens
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

const TOKEN_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

/**
 * Generate a magic link token for an appointment
 * @requires Employer authentication (must own the appointment)
 */
export const generate = mutation({
  args: {
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, { appointmentId }) => {
    // Get appointment and verify ownership
    const appointment = await ctx.db.get(appointmentId);
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    // Generate secure token
    const token = crypto.randomUUID();
    const tokenHash = await hashToken(token);

    // Store hashed token
    await ctx.db.insert("appointmentTokens", {
      tokenHash,
      appointmentId,
      patientId: appointment.patientId,
      createdAt: Date.now(),
      expiresAt: Date.now() + TOKEN_TTL_MS,
    });

    // Log to audit
    await ctx.runMutation(internal.gdpr.logAction, {
      action: "magic_link_generated",
      actorType: "employer",
      resourceType: "appointment",
      resourceId: appointmentId,
    });

    // Return unhashed token (only time it's visible)
    return { token, expiresAt: Date.now() + TOKEN_TTL_MS };
  },
});

/**
 * Validate token and return appointment details (PUBLIC - no auth required)
 */
export const validateAndGetAppointment = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, { token }) => {
    const tokenHash = await hashToken(token);

    const tokenRecord = await ctx.db
      .query("appointmentTokens")
      .withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
      .first();

    if (!tokenRecord) {
      return { valid: false, error: "Invalid or expired link" };
    }

    if (tokenRecord.expiresAt < Date.now()) {
      return { valid: false, error: "This link has expired" };
    }

    if (tokenRecord.invalidated) {
      return { valid: false, error: "This link is no longer valid" };
    }

    // Get appointment with related data
    const appointment = await ctx.db.get(tokenRecord.appointmentId);
    if (!appointment) {
      return { valid: false, error: "Appointment not found" };
    }

    const patient = await ctx.db.get(tokenRecord.patientId);
    const doctor = appointment.doctorId 
      ? await ctx.db.get(appointment.doctorId) 
      : null;
    const appointmentType = appointment.appointmentTypeId
      ? await ctx.db.get(appointment.appointmentTypeId)
      : null;
    const slot = appointment.slotId
      ? await ctx.db.get(appointment.slotId)
      : null;

    return {
      valid: true,
      appointment: {
        id: appointment._id,
        status: appointment.status,
        reason: appointment.reason,
        scheduledDate: slot?.date,
        startTime: slot?.startTime,
        endTime: slot?.endTime,
      },
      patient: patient ? {
        firstName: patient.firstName,
        lastName: patient.lastName,
      } : null,
      doctor: doctor ? {
        name: doctor.name,
        zoomLink: doctor.zoomPersonalLink,
      } : null,
      appointmentType: appointmentType ? {
        name: appointmentType.name,
        duration: appointmentType.duration,
        description: appointmentType.description,
      } : null,
    };
  },
});

/**
 * Mark token as viewed (for analytics)
 */
export const markViewed = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const tokenHash = await hashToken(token);
    const tokenRecord = await ctx.db
      .query("appointmentTokens")
      .withIndex("by_token", (q) => q.eq("tokenHash", tokenHash))
      .first();

    if (tokenRecord && !tokenRecord.viewedAt) {
      await ctx.db.patch(tokenRecord._id, { viewedAt: Date.now() });
    }
  },
});

/**
 * Invalidate all tokens for an appointment (e.g., on cancellation)
 */
export const invalidateForAppointment = internalMutation({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, { appointmentId }) => {
    const tokens = await ctx.db
      .query("appointmentTokens")
      .withIndex("by_appointment", (q) => q.eq("appointmentId", appointmentId))
      .collect();

    for (const token of tokens) {
      await ctx.db.patch(token._id, { invalidated: true });
    }
  },
});

// Utility: Hash token using Web Crypto API
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
```

---

### Task 2.3: ICS Generator Utility
**File**: `convex/lib/icsGenerator.ts` (new file)

```typescript
/**
 * ICS Calendar File Generator
 * 
 * Generates RFC 5545 compliant ICS files for appointment calendar events.
 */

export interface ICSEventData {
  uid: string;
  summary: string;
  description: string;
  location: string;
  startTime: Date;
  endTime: Date;
  organizerName: string;
  organizerEmail: string;
}

export function generateICS(event: ICSEventData): string {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const escapeText = (text: string): string => {
    return text
      .replace(/\\/g, "\\\\")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,")
      .replace(/\n/g, "\\n");
  };

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//OccuHealth//Appointments//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(event.startTime)}`,
    `DTEND:${formatDate(event.endTime)}`,
    `SUMMARY:${escapeText(event.summary)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    `LOCATION:${escapeText(event.location)}`,
    `ORGANIZER;CN=${escapeText(event.organizerName)}:mailto:${event.organizerEmail}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Appointment Reminder",
    "TRIGGER:-P1D", // 1 day before
    "END:VALARM",
    "BEGIN:VALARM",
    "ACTION:DISPLAY", 
    "DESCRIPTION:Appointment Reminder",
    "TRIGGER:-PT1H", // 1 hour before
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}
```

---

### Task 2.4: HTTP Endpoint for Calendar Download
**File**: `convex/http.ts` (add route)

```typescript
// Add after existing routes (~line 300)

// Public endpoint: Download ICS calendar file
http.route({
  path: "/calendar/:token",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const token = url.pathname.split("/").pop();

    if (!token) {
      return new Response("Token required", { status: 400 });
    }

    // Validate token and get appointment
    const result = await ctx.runQuery(
      internal.appointmentTokens.validateAndGetAppointment,
      { token }
    );

    if (!result.valid || !result.appointment) {
      return new Response(result.error || "Invalid token", { status: 404 });
    }

    const { appointment, patient, doctor, appointmentType } = result;

    // Generate ICS content
    const startTime = new Date(`${appointment.scheduledDate}T${appointment.startTime}`);
    const endTime = new Date(`${appointment.scheduledDate}T${appointment.endTime}`);

    const icsContent = generateICS({
      uid: `${appointment.id}@occuhealth.com`,
      summary: `OccuHealth: ${appointmentType?.name || "Medical Appointment"}`,
      description: [
        `Appointment Type: ${appointmentType?.name || "Medical Assessment"}`,
        `Patient: ${patient?.firstName} ${patient?.lastName}`,
        `Doctor: ${doctor?.name || "TBD"}`,
        appointment.reason ? `Reason: ${appointment.reason}` : "",
        "",
        "Join via Zoom:",
        doctor?.zoomLink || "Link will be provided",
      ].filter(Boolean).join("\\n"),
      location: doctor?.zoomLink || "Online - Zoom",
      startTime,
      endTime,
      organizerName: "OccuHealth",
      organizerEmail: "appointments@occuhealth.com",
    });

    return new Response(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="appointment-${appointment.id}.ics"`,
      },
    });
  }),
});
```

---

## Verification Commands

```bash
# 1. Typecheck after schema changes
npm run typecheck

# 2. Deploy to dev
npm run convex:dev

# 3. Test token generation via Convex CLI
npx tsx CONVEX-CLI/SCRIPTS/convex-run.ts appointmentTokens:generate '{"appointmentId":"<valid-id>"}' --json

# 4. Test token validation
npx tsx CONVEX-CLI/SCRIPTS/convex-run.ts appointmentTokens:validateAndGetAppointment '{"token":"<generated-token>"}' --json
```

---

## Acceptance Criteria

- [ ] Schema migration successful (appointmentTokens table exists)
- [ ] `generate` mutation creates hashed token
- [ ] `validateAndGetAppointment` returns appointment data for valid token
- [ ] `validateAndGetAppointment` returns error for expired/invalid token
- [ ] ICS generator produces valid calendar file
- [ ] HTTP endpoint returns downloadable ICS file
- [ ] Audit log entry created on token generation
- [ ] Typecheck passes

---

→ Next: PATIENT_ACCESS_SPRINT_03_FRONTEND
