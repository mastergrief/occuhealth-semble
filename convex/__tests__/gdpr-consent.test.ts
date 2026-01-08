/**
 * Integration tests for GDPR Consent module using convex-test
 *
 * Tests consent creation, withdrawal, and GDPR compliance requirements.
 */
/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";

// Import all convex modules for convex-test
const modules = import.meta.glob("../**/*.*s");

describe("gdpr.createConsent", () => {
  it("should create data_processing consent with proper timestamps", async () => {
    const t = convexTest(schema, modules);

    // Create employer first
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

    const beforeCreate = Date.now();

    // Create consent
    const consentId = await t.run(async (ctx) => {
      return await ctx.db.insert("consents", {
        patientEmail: "patient@test.com",
        consentType: "data_processing",
        consentText: "I consent to data processing for occupational health purposes.",
        consentVersion: "1.0",
        collectedByEmployerId: employerId,
        granted: true,
        grantedAt: Date.now(),
      });
    });

    const afterCreate = Date.now();

    // Verify consent
    const consent = await t.run(async (ctx) => {
      return await ctx.db.get(consentId);
    });

    expect(consent).toBeDefined();
    expect(consent?.granted).toBe(true);
    expect(consent?.grantedAt).toBeGreaterThanOrEqual(beforeCreate);
    expect(consent?.grantedAt).toBeLessThanOrEqual(afterCreate);
    expect(consent?.patientEmail).toBe("patient@test.com");
    expect(consent?.consentType).toBe("data_processing");
    expect(consent?.consentVersion).toBe("1.0");
    expect(consent?.collectedByEmployerId).toBe(employerId);
  });

  it("should create health_data consent", async () => {
    const t = convexTest(schema, modules);

    const employerId = await t.run(async (ctx) => {
      return await ctx.db.insert("employers", {
        workosUserId: "workos_test_user_2",
        email: "employer2@test.com",
        companyType: "employer",
        companyName: "Health Corp",
        contactName: "Health Contact",
        addressLine1: "456 Test Ave",
        city: "Manchester",
        postcode: "M1 1AA",
        status: "verified",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const consentId = await t.run(async (ctx) => {
      return await ctx.db.insert("consents", {
        patientEmail: "health_patient@test.com",
        consentType: "health_data",
        consentText: "I consent to the processing of my health data.",
        consentVersion: "1.0",
        collectedByEmployerId: employerId,
        granted: true,
        grantedAt: Date.now(),
      });
    });

    const consent = await t.run(async (ctx) => {
      return await ctx.db.get(consentId);
    });

    expect(consent?.consentType).toBe("health_data");
    expect(consent?.granted).toBe(true);
  });

  it("should create employer_sharing consent", async () => {
    const t = convexTest(schema, modules);

    const employerId = await t.run(async (ctx) => {
      return await ctx.db.insert("employers", {
        workosUserId: "workos_test_user_3",
        email: "employer3@test.com",
        companyType: "employer",
        companyName: "Sharing Corp",
        contactName: "Sharing Contact",
        addressLine1: "789 Test Blvd",
        city: "Birmingham",
        postcode: "B1 1AA",
        status: "verified",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const consentId = await t.run(async (ctx) => {
      return await ctx.db.insert("consents", {
        patientEmail: "sharing_patient@test.com",
        consentType: "employer_sharing",
        consentText: "I consent to sharing my health reports with my employer.",
        consentVersion: "1.0",
        collectedByEmployerId: employerId,
        granted: true,
        grantedAt: Date.now(),
      });
    });

    const consent = await t.run(async (ctx) => {
      return await ctx.db.get(consentId);
    });

    expect(consent?.consentType).toBe("employer_sharing");
    expect(consent?.granted).toBe(true);
  });

  it("should store all mandatory fields", async () => {
    const t = convexTest(schema, modules);

    const employerId = await t.run(async (ctx) => {
      return await ctx.db.insert("employers", {
        workosUserId: "workos_test_user_4",
        email: "employer4@test.com",
        companyType: "employer",
        companyName: "Mandatory Corp",
        contactName: "Mandatory Contact",
        addressLine1: "101 Test Lane",
        city: "Leeds",
        postcode: "LS1 1AA",
        status: "verified",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const consentId = await t.run(async (ctx) => {
      return await ctx.db.insert("consents", {
        patientEmail: "mandatory_patient@test.com",
        consentType: "health_data",
        consentText: "Full consent text with all legal requirements.",
        consentVersion: "2.0",
        collectedByEmployerId: employerId,
        granted: true,
        grantedAt: Date.now(),
      });
    });

    const consent = await t.run(async (ctx) => {
      return await ctx.db.get(consentId);
    });

    // Verify all required fields are present
    expect(consent?.patientEmail).toBeDefined();
    expect(consent?.consentType).toBeDefined();
    expect(consent?.consentText).toBeDefined();
    expect(consent?.consentVersion).toBeDefined();
    expect(consent?.collectedByEmployerId).toBeDefined();
    expect(consent?.granted).toBeDefined();
    expect(consent?.grantedAt).toBeDefined();
  });
});

describe("gdpr.withdrawConsent", () => {
  it("should withdraw active consent and set timestamp", async () => {
    const t = convexTest(schema, modules);

    const employerId = await t.run(async (ctx) => {
      return await ctx.db.insert("employers", {
        workosUserId: "workos_test_user_5",
        email: "employer5@test.com",
        companyType: "employer",
        companyName: "Withdraw Corp",
        contactName: "Withdraw Contact",
        addressLine1: "202 Test Rd",
        city: "Glasgow",
        postcode: "G1 1AA",
        status: "verified",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Create active consent
    const consentId = await t.run(async (ctx) => {
      return await ctx.db.insert("consents", {
        patientEmail: "withdraw_patient@test.com",
        consentType: "data_processing",
        consentText: "I consent to data processing.",
        consentVersion: "1.0",
        collectedByEmployerId: employerId,
        granted: true,
        grantedAt: Date.now(),
      });
    });

    const beforeWithdraw = Date.now();

    // Withdraw consent
    await t.run(async (ctx) => {
      await ctx.db.patch(consentId, {
        granted: false,
        withdrawnAt: Date.now(),
      });
    });

    const afterWithdraw = Date.now();

    // Verify withdrawal
    const consent = await t.run(async (ctx) => {
      return await ctx.db.get(consentId);
    });

    expect(consent?.granted).toBe(false);
    expect(consent?.withdrawnAt).toBeDefined();
    expect(consent?.withdrawnAt).toBeGreaterThanOrEqual(beforeWithdraw);
    expect(consent?.withdrawnAt).toBeLessThanOrEqual(afterWithdraw);
  });

  it("should handle already withdrawn consent", async () => {
    const t = convexTest(schema, modules);

    const employerId = await t.run(async (ctx) => {
      return await ctx.db.insert("employers", {
        workosUserId: "workos_test_user_6",
        email: "employer6@test.com",
        companyType: "employer",
        companyName: "AlreadyWithdrawn Corp",
        contactName: "AlreadyWithdrawn Contact",
        addressLine1: "303 Test Way",
        city: "Edinburgh",
        postcode: "EH1 1AA",
        status: "verified",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const originalWithdrawTime = Date.now() - 86400000; // 1 day ago

    // Create already withdrawn consent
    const consentId = await t.run(async (ctx) => {
      return await ctx.db.insert("consents", {
        patientEmail: "already_withdrawn@test.com",
        consentType: "data_processing",
        consentText: "I consent to data processing.",
        consentVersion: "1.0",
        collectedByEmployerId: employerId,
        granted: false,
        grantedAt: Date.now() - 172800000, // 2 days ago
        withdrawnAt: originalWithdrawTime,
      });
    });

    // Re-withdraw (update timestamp)
    const newWithdrawTime = Date.now();
    await t.run(async (ctx) => {
      await ctx.db.patch(consentId, {
        withdrawnAt: newWithdrawTime,
      });
    });

    const consent = await t.run(async (ctx) => {
      return await ctx.db.get(consentId);
    });

    expect(consent?.granted).toBe(false);
    expect(consent?.withdrawnAt).toBe(newWithdrawTime);
  });
});

describe("gdpr consent - by patient queries", () => {
  it("should query consents by patient email", async () => {
    const t = convexTest(schema, modules);

    const employerId = await t.run(async (ctx) => {
      return await ctx.db.insert("employers", {
        workosUserId: "workos_test_user_7",
        email: "employer7@test.com",
        companyType: "employer",
        companyName: "Query Corp",
        contactName: "Query Contact",
        addressLine1: "404 Test Path",
        city: "Cardiff",
        postcode: "CF1 1AA",
        status: "verified",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Create multiple consents for same patient
    await t.run(async (ctx) => {
      await ctx.db.insert("consents", {
        patientEmail: "multi_consent@test.com",
        consentType: "data_processing",
        consentText: "Data processing consent.",
        consentVersion: "1.0",
        collectedByEmployerId: employerId,
        granted: true,
        grantedAt: Date.now(),
      });

      await ctx.db.insert("consents", {
        patientEmail: "multi_consent@test.com",
        consentType: "health_data",
        consentText: "Health data consent.",
        consentVersion: "1.0",
        collectedByEmployerId: employerId,
        granted: true,
        grantedAt: Date.now(),
      });

      await ctx.db.insert("consents", {
        patientEmail: "multi_consent@test.com",
        consentType: "employer_sharing",
        consentText: "Employer sharing consent.",
        consentVersion: "1.0",
        collectedByEmployerId: employerId,
        granted: true,
        grantedAt: Date.now(),
      });
    });

    // Query by email
    const consents = await t.run(async (ctx) => {
      return await ctx.db
        .query("consents")
        .withIndex("by_email", (q) => q.eq("patientEmail", "multi_consent@test.com"))
        .collect();
    });

    expect(consents).toHaveLength(3);
    expect(consents.map((c) => c.consentType).sort()).toEqual([
      "data_processing",
      "employer_sharing",
      "health_data",
    ]);
  });

  it("should query consents by patient ID", async () => {
    const t = convexTest(schema, modules);

    const employerId = await t.run(async (ctx) => {
      return await ctx.db.insert("employers", {
        workosUserId: "workos_test_user_8",
        email: "employer8@test.com",
        companyType: "employer",
        companyName: "Patient ID Corp",
        contactName: "Patient ID Contact",
        addressLine1: "505 Test Circle",
        city: "Belfast",
        postcode: "BT1 1AA",
        status: "verified",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Create consent first
    const consentId = await t.run(async (ctx) => {
      return await ctx.db.insert("consents", {
        patientEmail: "patient_id_test@test.com",
        consentType: "data_processing",
        consentText: "Data processing consent.",
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
        firstName: "Patient",
        lastName: "ID Test",
        email: "patient_id_test@test.com",
        dateOfBirth: "1990-01-01",
        consentId,
        createdAt: Date.now(),
      });
    });

    // Update consent with patientId
    await t.run(async (ctx) => {
      await ctx.db.patch(consentId, {
        patientId,
      });
    });

    // Query by patient ID
    const consents = await t.run(async (ctx) => {
      return await ctx.db
        .query("consents")
        .withIndex("by_patient", (q) => q.eq("patientId", patientId))
        .collect();
    });

    expect(consents).toHaveLength(1);
    expect(consents[0].patientId).toBe(patientId);
  });
});

describe("gdpr consent - audit requirements", () => {
  it("should create audit log entry for consent_granted", async () => {
    const t = convexTest(schema, modules);

    const employerId = await t.run(async (ctx) => {
      return await ctx.db.insert("employers", {
        workosUserId: "workos_test_user_9",
        email: "employer9@test.com",
        companyType: "employer",
        companyName: "Audit Corp",
        contactName: "Audit Contact",
        addressLine1: "606 Test Drive",
        city: "Bristol",
        postcode: "BS1 1AA",
        status: "verified",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Create consent
    const consentId = await t.run(async (ctx) => {
      return await ctx.db.insert("consents", {
        patientEmail: "audit_patient@test.com",
        consentType: "data_processing",
        consentText: "I consent to data processing.",
        consentVersion: "1.0",
        collectedByEmployerId: employerId,
        granted: true,
        grantedAt: Date.now(),
      });
    });

    // Create audit log entry
    await t.run(async (ctx) => {
      await ctx.db.insert("auditLogs", {
        action: "consent_granted",
        actorType: "employer",
        resourceType: "consent",
        resourceId: consentId,
        details: {
          patientEmail: "audit_patient@test.com",
          consentType: "data_processing",
          consentVersion: "1.0",
        },
        timestamp: Date.now(),
      });
    });

    // Verify audit log
    const auditLogs = await t.run(async (ctx) => {
      return await ctx.db
        .query("auditLogs")
        .withIndex("by_action", (q) => q.eq("action", "consent_granted"))
        .collect();
    });

    const relevantLog = auditLogs.find((log) => log.resourceId === consentId);
    expect(relevantLog).toBeDefined();
    expect(relevantLog?.action).toBe("consent_granted");
    expect(relevantLog?.actorType).toBe("employer");
    expect(relevantLog?.resourceType).toBe("consent");
  });

  it("should create audit log entry for consent_withdrawn", async () => {
    const t = convexTest(schema, modules);

    const employerId = await t.run(async (ctx) => {
      return await ctx.db.insert("employers", {
        workosUserId: "workos_test_user_10",
        email: "employer10@test.com",
        companyType: "employer",
        companyName: "Withdraw Audit Corp",
        contactName: "Withdraw Audit Contact",
        addressLine1: "707 Test Lane",
        city: "Liverpool",
        postcode: "L1 1AA",
        status: "verified",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Create and withdraw consent
    const consentId = await t.run(async (ctx) => {
      return await ctx.db.insert("consents", {
        patientEmail: "withdraw_audit@test.com",
        consentType: "health_data",
        consentText: "I consent to health data processing.",
        consentVersion: "1.0",
        collectedByEmployerId: employerId,
        granted: false,
        grantedAt: Date.now() - 86400000,
        withdrawnAt: Date.now(),
      });
    });

    // Create audit log for withdrawal
    await t.run(async (ctx) => {
      await ctx.db.insert("auditLogs", {
        action: "consent_withdrawn",
        actorType: "employer",
        resourceType: "consent",
        resourceId: consentId,
        details: {
          patientEmail: "withdraw_audit@test.com",
          consentType: "health_data",
        },
        timestamp: Date.now(),
      });
    });

    // Verify audit log
    const auditLogs = await t.run(async (ctx) => {
      return await ctx.db
        .query("auditLogs")
        .withIndex("by_action", (q) => q.eq("action", "consent_withdrawn"))
        .collect();
    });

    const relevantLog = auditLogs.find((log) => log.resourceId === consentId);
    expect(relevantLog).toBeDefined();
    expect(relevantLog?.action).toBe("consent_withdrawn");
    expect(relevantLog?.actorType).toBe("employer");
    expect(relevantLog?.resourceType).toBe("consent");
  });
});
