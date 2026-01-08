# AI Report Generation - Convex Action Implementation

**Sprint**: 03 of 06
**Index**: AI_REPORT_GEN_INDEX
**Depends On**: AI_REPORT_GEN_SPRINT_02_BACKEND
**Next**: AI_REPORT_GEN_SPRINT_04_FRONTEND

---

## Objective

Create the Convex action that calls OpenAI and the extended report mutation that stores AI-generated content with proper audit logging.

## Implementation Tasks

### Task 3.1: Create AI Helper Queries

**File**: `convex/aiHelpers.ts`

```typescript
import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Load all context needed for AI generation
export const getReportContext = internalQuery({
  args: {
    appointmentId: v.id("appointments"),
    clinicalNotesId: v.optional(v.id("clinicalNotes")),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) return null;
    
    const patient = await ctx.db.get(appointment.patientId);
    if (!patient) return null;
    
    const appointmentType = await ctx.db.get(appointment.appointmentTypeId);
    
    let clinicalNotes = null;
    if (args.clinicalNotesId) {
      clinicalNotes = await ctx.db.get(args.clinicalNotesId);
    }
    
    // Calculate age from DOB
    const dob = new Date(patient.dateOfBirth);
    const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    
    return {
      patientId: patient._id,
      employerId: appointment.employerId,
      appointmentType: appointmentType?.name || "General Assessment",
      reasonForAppointment: appointment.reasonForAppointment,
      preAppointmentNotes: appointment.preAppointmentNotes,
      patientJobTitle: patient.jobTitle,
      patientDepartment: patient.department,
      patientAge: age,
      clinicalFindings: clinicalNotes?.findings || appointment.preAppointmentNotes || "",
      diagnosis: clinicalNotes?.diagnosis,
    };
  },
});

// Store AI suggestion for tracking
export const storeSuggestion = internalMutation({
  args: {
    appointmentId: v.id("appointments"),
    patientId: v.id("patients"),
    suggestion: v.object({
      fitForWork: v.string(),
      summary: v.string(),
      restrictions: v.array(v.object({
        code: v.string(),
        category: v.string(),
        description: v.string(),
        duration: v.optional(v.string()),
      })),
      followUpRequired: v.boolean(),
      followUpNotes: v.optional(v.string()),
      confidence: v.number(),
    }),
    modelUsed: v.string(),
    latencyMs: v.number(),
  },
  handler: async (ctx, args) => {
    // Log AI generation for audit trail
    await ctx.db.insert("auditLogs", {
      action: "ai_report_suggestion_generated",
      actorType: "system",
      resourceType: "appointment",
      resourceId: args.appointmentId,
      details: {
        patientId: args.patientId,
        modelUsed: args.modelUsed,
        latencyMs: args.latencyMs,
        confidence: args.suggestion.confidence,
      },
      timestamp: Date.now(),
    });
    
    return args.suggestion;
  },
});
```

### Task 3.2: Create AI Report Action

**File**: `convex/actions/aiReportSuggestion.ts`

```typescript
"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { getAIProvider } from "../lib/ai/providers";
import { ConvexError } from "convex/values";

export const generateSuggestion = action({
  args: {
    appointmentId: v.id("appointments"),
    clinicalNotesId: v.optional(v.id("clinicalNotes")),
  },
  handler: async (ctx, args) => {
    // 1. Load context via internal query
    const context = await ctx.runQuery(internal.aiHelpers.getReportContext, {
      appointmentId: args.appointmentId,
      clinicalNotesId: args.clinicalNotesId,
    });
    
    if (!context) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Appointment or patient not found",
      });
    }
    
    // 2. Get AI provider
    const provider = getAIProvider("openai");
    
    // 3. Call AI with timing
    const startTime = Date.now();
    
    const suggestion = await provider.generateReportSuggestion({
      clinicalFindings: context.clinicalFindings,
      diagnosis: context.diagnosis,
      appointmentType: context.appointmentType,
      reasonForAppointment: context.reasonForAppointment,
      patientJobTitle: context.patientJobTitle,
      patientDepartment: context.patientDepartment,
      patientAge: context.patientAge,
    });
    
    const latencyMs = Date.now() - startTime;
    
    // 4. Store suggestion and audit log via internal mutation
    await ctx.runMutation(internal.aiHelpers.storeSuggestion, {
      appointmentId: args.appointmentId,
      patientId: context.patientId,
      suggestion,
      modelUsed: provider.model,
      latencyMs,
    });
    
    return suggestion;
  },
});
```

### Task 3.3: Extend Reports Mutation

**File**: `convex/reports.ts` - Add to existing file

```typescript
// Add new mutation alongside existing create()
export const createWithAI = mutation({
  args: {
    appointmentId: v.id("appointments"),
    fitForWork: v.union(
      v.literal("fit"),
      v.literal("fit_with_restrictions"),
      v.literal("temporarily_unfit"),
      v.literal("needs_further_assessment")
    ),
    summary: v.string(),
    restrictions: v.optional(v.array(v.string())),
    followUpRequired: v.boolean(),
    followUpNotes: v.optional(v.string()),
    // AI metadata
    aiAssisted: v.boolean(),
    aiAccepted: v.optional(v.boolean()),  // true = accepted as-is
    aiModified: v.optional(v.boolean()),  // true = doctor edited
  },
  handler: async (ctx, args) => {
    await requireDoctorAccess(ctx);
    
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) {
      throw new ConvexError({
        code: ErrorCodes.NOT_FOUND,
        message: "Appointment not found",
      });
    }
    
    const reportId = await ctx.db.insert("reports", {
      appointmentId: args.appointmentId,
      patientId: appointment.patientId,
      employerId: appointment.employerId,
      fitForWork: args.fitForWork,
      summary: args.summary,
      restrictions: args.restrictions,
      followUpRequired: args.followUpRequired,
      followUpNotes: args.followUpNotes,
      signedAt: Date.now(),
    });
    
    // Link report to appointment
    await ctx.db.patch(args.appointmentId, { reportId });
    
    // Enhanced audit logging for AI-assisted reports
    await logReportAction(ctx, "report_created", reportId, appointment.patientId, {
      appointmentId: args.appointmentId,
      fitForWork: args.fitForWork,
      aiAssisted: args.aiAssisted,
      aiAccepted: args.aiAccepted,
      aiModified: args.aiModified,
    });
    
    return reportId;
  },
});
```

### Task 3.4: Add clinicalNotes Mutations

**File**: `convex/clinicalNotes.ts` (NEW)

```typescript
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireDoctorAccess } from "./authModules/roleChecks";
import { ConvexError } from "convex/values";
import { ErrorCodes } from "./lib/errorCodes";

export const create = mutation({
  args: {
    appointmentId: v.id("appointments"),
    findings: v.string(),
    diagnosis: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireDoctorAccess(ctx);
    
    const appointment = await ctx.db.get(args.appointmentId);
    if (!appointment) {
      throw new ConvexError({
        code: ErrorCodes.NOT_FOUND,
        message: "Appointment not found",
      });
    }
    
    return await ctx.db.insert("clinicalNotes", {
      appointmentId: args.appointmentId,
      patientId: appointment.patientId,
      findings: args.findings,
      diagnosis: args.diagnosis,
      createdAt: Date.now(),
    });
  },
});

export const getByAppointment = query({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    await requireDoctorAccess(ctx);
    
    return await ctx.db
      .query("clinicalNotes")
      .withIndex("by_appointment", (q) => q.eq("appointmentId", args.appointmentId))
      .first();
  },
});
```

### Task 3.5: Error Recovery Pattern

**Important**: Handle the case where audit logging succeeds but report creation fails.

Add this wrapper to `convex/aiHelpers.ts`:

```typescript
// Add to aiHelpers.ts - safe AI generation with rollback
export const generateWithRecovery = internalMutation({
  args: {
    appointmentId: v.id("appointments"),
    error: v.string(),
    stage: v.string(),
  },
  handler: async (ctx, args) => {
    // Log failed AI generation for debugging
    await ctx.db.insert("auditLogs", {
      action: "ai_report_suggestion_failed",
      actorType: "system",
      resourceType: "appointment",
      resourceId: args.appointmentId,
      details: {
        error: args.error,
        failedAtStage: args.stage,
      },
      timestamp: Date.now(),
    });
  },
});
```

Update the action in `convex/actions/aiReportSuggestion.ts` to use try-catch:

```typescript
// Wrap the handler with error recovery
handler: async (ctx, args) => {
  try {
    // ... existing implementation ...
  } catch (error) {
    // Log the failure for debugging
    await ctx.runMutation(internal.aiHelpers.generateWithRecovery, {
      appointmentId: args.appointmentId,
      error: error instanceof Error ? error.message : String(error),
      stage: "ai_generation",
    });
    throw error; // Re-throw to surface to frontend
  }
}
```

## Required Imports Reference

For `convex/reports.ts` additions:
```typescript
// Ensure these imports exist at top of file
import { mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireDoctorAccess } from "./authModules/roleChecks";
import { ErrorCodes } from "./lib/errorCodes";
import { logReportAction } from "./lib/auditHelpers"; // May need to create
```

## Acceptance Criteria

- [ ] `convex/aiHelpers.ts` created with getReportContext and storeSuggestion
- [ ] `convex/aiHelpers.ts` includes generateWithRecovery for error logging
- [ ] `convex/actions/aiReportSuggestion.ts` created with generateSuggestion
- [ ] Action includes try-catch with error recovery logging
- [ ] `convex/reports.ts` extended with createWithAI mutation
- [ ] `convex/clinicalNotes.ts` created with create and getByAppointment
- [ ] Audit logging includes AI metadata (aiAssisted, aiAccepted, aiModified)
- [ ] All mutations have proper auth guards
- [ ] Typecheck passes

## Verification

```bash
npm run typecheck

# Test action locally (requires running Convex dev)
npx convex run actions/aiReportSuggestion:generateSuggestion '{"appointmentId": "..."}'

# Verify audit logs capture AI events
npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts auditLogs --limit=5 --json | jq '.data[] | select(.action | contains("ai"))'
```

---

→ Next: AI_REPORT_GEN_SPRINT_04_FRONTEND
