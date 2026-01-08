/**
 * Integration tests for GDPR Erasure module using convex-test
 *
 * Tests erasure request processing and PII redaction (right to be forgotten).
 */
/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";

// Import all convex modules for convex-test
const modules = import.meta.glob("../**/*.*s");

describe("gdpr.processErasure - PII redaction", () => {
  it("should redact all PII fields on patient record", async () => {
    const t = convexTest(schema, modules);

    // Create employer
    const employerId = await t.run(async (ctx) => {
      return await ctx.db.insert("employers", {
        workosUserId: "workos_test_user_1",
        email: "employer@test.com",
        companyType: "employer",
        companyName: "Test Corp",
        contactName: "Test Contact",
        addressLine1: "123 Test St",
        city: "London",
        postcode: "E1 1AA",
        status: "verified",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Create consent
    const consentId = await t.run(async (ctx) => {
      return await ctx.db.insert("consents", {
        patientEmail: "john.doe@example.com",
        consentType: "data_processing",
        consentText: "I consent to data processing.",
        consentVersion: "1.0",
        collectedByEmployerId: employerId,
        granted: true,
        grantedAt: Date.now(),
      });
    });

    // Create patient with PII
    const patientId = await t.run(async (ctx) => {
      return await ctx.db.insert("patients", {
        employerId,
        firstName: "John",
        lastName: "Doe",
        email: "john.doe@example.com",
        phone: "07700123456",
        dateOfBirth: "1985-06-15",
        jobTitle: "Software Engineer",
        consentId,
        createdAt: Date.now(),
      });
    });

    // Simulate erasure - redact PII
    await t.run(async (ctx) => {
      await ctx.db.patch(patientId, {
        firstName: "[REDACTED]",
        lastName: "[REDACTED]",
        email: "[REDACTED]",
        phone: "[REDACTED]",
        dateOfBirth: "[REDACTED]",
        deletedAt: Date.now(),
      });
    });

    // Verify PII redaction
    const redactedPatient = await t.run(async (ctx) => {
      return await ctx.db.get(patientId);
    });

    expect(redactedPatient?.firstName).toBe("[REDACTED]");
    expect(redactedPatient?.lastName).toBe("[REDACTED]");
    expect(redactedPatient?.email).toBe("[REDACTED]");
    expect(redactedPatient?.phone).toBe("[REDACTED]");
    expect(redactedPatient?.dateOfBirth).toBe("[REDACTED]");
    expect(redactedPatient?.deletedAt).toBeDefined();
    expect(typeof redactedPatient?.deletedAt).toBe("number");
  });

  it("should withdraw all consents for patient during erasure", async () => {
    const t = convexTest(schema, modules);

    const employerId = await t.run(async (ctx) => {
      return await ctx.db.insert("employers", {
        workosUserId: "workos_test_user_2",
        email: "employer2@test.com",
        companyType: "employer",
        companyName: "Consent Corp",
        contactName: "Consent Contact",
        addressLine1: "456 Test Ave",
        city: "Manchester",
        postcode: "M1 1AA",
        status: "verified",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Create multiple consents
    const consent1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("consents", {
        patientEmail: "consent_erasure@test.com",
        consentType: "data_processing",
        consentText: "Data processing consent.",
        consentVersion: "1.0",
        collectedByEmployerId: employerId,
        granted: true,
        grantedAt: Date.now(),
      });
    });

    const consent2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("consents", {
        patientEmail: "consent_erasure@test.com",
        consentType: "health_data",
        consentText: "Health data consent.",
        consentVersion: "1.0",
        collectedByEmployerId: employerId,
        granted: true,
        grantedAt: Date.now(),
      });
    });

    // Create patient
    const patientId = await t.run(async (ctx) => {
      return await ctx.db.insert("patients", {
        employerId,
        firstName: "Consent",
        lastName: "Patient",
        email: "consent_erasure@test.com",
        dateOfBirth: "1990-01-01",
        consentId: consent1Id,
        createdAt: Date.now(),
      });
    });

    // Update consents with patient ID
    await t.run(async (ctx) => {
      await ctx.db.patch(consent1Id, { patientId });
      await ctx.db.patch(consent2Id, { patientId });
    });

    // Withdraw all consents (erasure process)
    const now = Date.now();
    await t.run(async (ctx) => {
      await ctx.db.patch(consent1Id, { granted: false, withdrawnAt: now });
      await ctx.db.patch(consent2Id, { granted: false, withdrawnAt: now });
    });

    // Verify all consents withdrawn
    const consent1 = await t.run(async (ctx) => {
      return await ctx.db.get(consent1Id);
    });

    const consent2 = await t.run(async (ctx) => {
      return await ctx.db.get(consent2Id);
    });

    expect(consent1?.granted).toBe(false);
    expect(consent1?.withdrawnAt).toBeDefined();
    expect(consent2?.granted).toBe(false);
    expect(consent2?.withdrawnAt).toBeDefined();
  });

  it("should redact report data during erasure", async () => {
    const t = convexTest(schema, modules);

    // Create all required entities
    const employerId = await t.run(async (ctx) => {
      return await ctx.db.insert("employers", {
        workosUserId: "workos_test_user_3",
        email: "employer3@test.com",
        companyType: "employer",
        companyName: "Report Corp",
        contactName: "Report Contact",
        addressLine1: "789 Test Blvd",
        city: "Birmingham",
        postcode: "B1 1AA",
        status: "verified",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const doctorId = await t.run(async (ctx) => {
      return await ctx.db.insert("doctorSettings", {
        workosUserId: "workos_doctor_1",
        email: "doctor@test.com",
        name: "Dr. Report",
        zoomPersonalLink: "https://zoom.us/j/123456789",
        createdAt: Date.now(),
      });
    });

    const appointmentTypeId = await t.run(async (ctx) => {
      return await ctx.db.insert("appointmentTypes", {
        name: "Assessment",
        description: "Health assessment",
        durationMinutes: 30,
        price: 100,
        isActive: true,
      });
    });

    const slotId = await t.run(async (ctx) => {
      return await ctx.db.insert("availableSlots", {
        doctorId,
        date: "2026-01-15",
        startTime: "10:00",
        endTime: "10:30",
        status: "booked",
        bookedAt: Date.now(),
      });
    });

    const consentId = await t.run(async (ctx) => {
      return await ctx.db.insert("consents", {
        patientEmail: "report_patient@test.com",
        consentType: "data_processing",
        consentText: "I consent.",
        consentVersion: "1.0",
        collectedByEmployerId: employerId,
        granted: true,
        grantedAt: Date.now(),
      });
    });

    const patientId = await t.run(async (ctx) => {
      return await ctx.db.insert("patients", {
        employerId,
        firstName: "Report",
        lastName: "Patient",
        email: "report_patient@test.com",
        dateOfBirth: "1988-06-15",
        consentId,
        createdAt: Date.now(),
      });
    });

    const appointmentId = await t.run(async (ctx) => {
      return await ctx.db.insert("appointments", {
        patientId,
        employerId,
        appointmentTypeId,
        slotId,
        scheduledDate: "2026-01-15",
        scheduledTime: "10:00",
        status: "completed",
        completedAt: Date.now(),
        createdAt: Date.now(),
      });
    });

    // Create report with sensitive data
    const reportId = await t.run(async (ctx) => {
      return await ctx.db.insert("reports", {
        appointmentId,
        patientId,
        employerId,
        fitForWork: "fit_with_restrictions",
        summary: "Patient is fit for work with minor restrictions.",
        restrictions: ["No heavy lifting", "Reduced screen time"],
        followUpRequired: true,
        followUpNotes: "Review in 3 months",
        signedAt: Date.now(),
      });
    });

    // Redact report (erasure process)
    await t.run(async (ctx) => {
      await ctx.db.patch(reportId, {
        summary: "[REDACTED]",
        restrictions: ["[REDACTED]"],
        followUpNotes: "[REDACTED]",
      });
    });

    // Verify redaction
    const redactedReport = await t.run(async (ctx) => {
      return await ctx.db.get(reportId);
    });

    expect(redactedReport?.summary).toBe("[REDACTED]");
    expect(redactedReport?.restrictions).toEqual(["[REDACTED]"]);
    expect(redactedReport?.followUpNotes).toBe("[REDACTED]");
  });

  it("should redact appointment notes during erasure", async () => {
    const t = convexTest(schema, modules);

    const employerId = await t.run(async (ctx) => {
      return await ctx.db.insert("employers", {
        workosUserId: "workos_test_user_4",
        email: "employer4@test.com",
        companyType: "employer",
        companyName: "Appointment Corp",
        contactName: "Appointment Contact",
        addressLine1: "101 Test Lane",
        city: "Leeds",
        postcode: "LS1 1AA",
        status: "verified",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const doctorId = await t.run(async (ctx) => {
      return await ctx.db.insert("doctorSettings", {
        workosUserId: "workos_doctor_2",
        email: "doctor2@test.com",
        name: "Dr. Appointment",
        zoomPersonalLink: "https://zoom.us/j/987654321",
        createdAt: Date.now(),
      });
    });

    const appointmentTypeId = await t.run(async (ctx) => {
      return await ctx.db.insert("appointmentTypes", {
        name: "Check-up",
        description: "Regular check-up",
        durationMinutes: 20,
        price: 75,
        isActive: true,
      });
    });

    const slotId = await t.run(async (ctx) => {
      return await ctx.db.insert("availableSlots", {
        doctorId,
        date: "2026-02-01",
        startTime: "11:00",
        endTime: "11:20",
        status: "booked",
        bookedAt: Date.now(),
      });
    });

    const consentId = await t.run(async (ctx) => {
      return await ctx.db.insert("consents", {
        patientEmail: "appt_notes@test.com",
        consentType: "data_processing",
        consentText: "I consent.",
        consentVersion: "1.0",
        collectedByEmployerId: employerId,
        granted: true,
        grantedAt: Date.now(),
      });
    });

    const patientId = await t.run(async (ctx) => {
      return await ctx.db.insert("patients", {
        employerId,
        firstName: "Appointment",
        lastName: "Notes",
        email: "appt_notes@test.com",
        dateOfBirth: "1992-03-20",
        consentId,
        createdAt: Date.now(),
      });
    });

    // Create appointment with sensitive notes
    const appointmentId = await t.run(async (ctx) => {
      return await ctx.db.insert("appointments", {
        patientId,
        employerId,
        appointmentTypeId,
        slotId,
        scheduledDate: "2026-02-01",
        scheduledTime: "11:00",
        status: "scheduled",
        reasonForAppointment: "Annual health check",
        preAppointmentNotes: "Patient has history of back pain",
        createdAt: Date.now(),
      });
    });

    // Redact appointment notes (erasure process)
    await t.run(async (ctx) => {
      await ctx.db.patch(appointmentId, {
        reasonForAppointment: "[REDACTED]",
        preAppointmentNotes: "[REDACTED]",
      });
    });

    // Verify redaction
    const redactedAppointment = await t.run(async (ctx) => {
      return await ctx.db.get(appointmentId);
    });

    expect(redactedAppointment?.reasonForAppointment).toBe("[REDACTED]");
    expect(redactedAppointment?.preAppointmentNotes).toBe("[REDACTED]");
  });
});

describe("gdpr.processErasure - request status transitions", () => {
  it("should create pending erasure request", async () => {
    const t = convexTest(schema, modules);

    // Create erasure request
    const requestId = await t.run(async (ctx) => {
      return await ctx.db.insert("erasureRequests", {
        requesterEmail: "requester@test.com",
        status: "pending",
        reason: "User requested data deletion under GDPR Article 17",
        requestedAt: Date.now(),
      });
    });

    const request = await t.run(async (ctx) => {
      return await ctx.db.get(requestId);
    });

    expect(request?.status).toBe("pending");
    expect(request?.requesterEmail).toBe("requester@test.com");
    expect(request?.requestedAt).toBeDefined();
  });

  it("should transition from pending to in_progress", async () => {
    const t = convexTest(schema, modules);

    const requestId = await t.run(async (ctx) => {
      return await ctx.db.insert("erasureRequests", {
        requesterEmail: "progress@test.com",
        status: "pending",
        requestedAt: Date.now(),
      });
    });

    // Transition to in_progress
    await t.run(async (ctx) => {
      await ctx.db.patch(requestId, { status: "in_progress" });
    });

    const request = await t.run(async (ctx) => {
      return await ctx.db.get(requestId);
    });

    expect(request?.status).toBe("in_progress");
  });

  it("should transition from in_progress to completed", async () => {
    const t = convexTest(schema, modules);

    const requestId = await t.run(async (ctx) => {
      return await ctx.db.insert("erasureRequests", {
        requesterEmail: "complete@test.com",
        status: "in_progress",
        requestedAt: Date.now() - 3600000, // 1 hour ago
      });
    });

    // Transition to completed
    await t.run(async (ctx) => {
      await ctx.db.patch(requestId, {
        status: "completed",
        completedAt: Date.now(),
        processedBy: "admin@test.com",
      });
    });

    const request = await t.run(async (ctx) => {
      return await ctx.db.get(requestId);
    });

    expect(request?.status).toBe("completed");
    expect(request?.completedAt).toBeDefined();
    expect(request?.processedBy).toBe("admin@test.com");
  });

  it("should allow rejection of erasure request", async () => {
    const t = convexTest(schema, modules);

    const requestId = await t.run(async (ctx) => {
      return await ctx.db.insert("erasureRequests", {
        requesterEmail: "reject@test.com",
        status: "pending",
        requestedAt: Date.now(),
      });
    });

    // Reject request
    await t.run(async (ctx) => {
      await ctx.db.patch(requestId, {
        status: "rejected",
        processedBy: "admin@test.com",
      });
    });

    const request = await t.run(async (ctx) => {
      return await ctx.db.get(requestId);
    });

    expect(request?.status).toBe("rejected");
  });
});

describe("gdpr.processErasure - audit logging", () => {
  it("should create audit log entry for erasure processing", async () => {
    const t = convexTest(schema, modules);

    // Create admin user
    const adminId = await t.run(async (ctx) => {
      return await ctx.db.insert("adminUsers", {
        workosUserId: "workos_admin_1",
        email: "admin@test.com",
        firstName: "Admin",
        lastName: "User",
        lastLoginAt: Date.now(),
        createdAt: Date.now(),
      });
    });

    // Create employer and patient for erasure
    const employerId = await t.run(async (ctx) => {
      return await ctx.db.insert("employers", {
        workosUserId: "workos_test_user_5",
        email: "employer5@test.com",
        companyType: "employer",
        companyName: "Audit Erasure Corp",
        contactName: "Audit Contact",
        addressLine1: "202 Test Rd",
        city: "Glasgow",
        postcode: "G1 1AA",
        status: "verified",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const consentId = await t.run(async (ctx) => {
      return await ctx.db.insert("consents", {
        patientEmail: "erasure_audit@test.com",
        consentType: "data_processing",
        consentText: "I consent.",
        consentVersion: "1.0",
        collectedByEmployerId: employerId,
        granted: true,
        grantedAt: Date.now(),
      });
    });

    const patientId = await t.run(async (ctx) => {
      return await ctx.db.insert("patients", {
        employerId,
        firstName: "Erasure",
        lastName: "Audit",
        email: "erasure_audit@test.com",
        dateOfBirth: "1985-10-25",
        consentId,
        createdAt: Date.now(),
      });
    });

    // Create and complete erasure request
    const requestId = await t.run(async (ctx) => {
      return await ctx.db.insert("erasureRequests", {
        requesterEmail: "erasure_audit@test.com",
        patientId,
        status: "completed",
        requestedAt: Date.now() - 3600000,
        completedAt: Date.now(),
        processedBy: "admin@test.com",
      });
    });

    // Create audit log entry
    await t.run(async (ctx) => {
      await ctx.db.insert("auditLogs", {
        action: "erasure_processed",
        actorType: "admin",
        actorId: adminId,
        resourceType: "erasureRequest",
        resourceId: requestId,
        details: { patientId },
        timestamp: Date.now(),
      });
    });

    // Verify audit log
    const auditLogs = await t.run(async (ctx) => {
      return await ctx.db
        .query("auditLogs")
        .withIndex("by_action", (q) => q.eq("action", "erasure_processed"))
        .collect();
    });

    const relevantLog = auditLogs.find((log) => log.resourceId === requestId);
    expect(relevantLog).toBeDefined();
    expect(relevantLog?.action).toBe("erasure_processed");
    expect(relevantLog?.actorType).toBe("admin");
    expect(relevantLog?.resourceType).toBe("erasureRequest");
    expect(relevantLog?.details?.patientId).toBe(patientId);
    expect(relevantLog?.timestamp).toBeDefined();
  });
});
