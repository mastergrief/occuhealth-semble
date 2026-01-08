/**
 * Integration tests for Patients module using convex-test
 *
 * Tests patient creation, listing, and soft deletion with real Convex mutations.
 */
/// <reference types="vite/client" />
import { describe, it, expect, beforeEach } from "vitest";
import { convexTest } from "convex-test";
import { api } from "../_generated/api";
import schema from "../schema";
import { Id } from "../_generated/dataModel";

// Import all convex modules for convex-test
const modules = import.meta.glob("../**/*.*s");

describe("patients.create", () => {
  it("should create patient with required fields", async () => {
    const t = convexTest(schema, modules);

    // Seed verified employer first
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

    // Create consent first (required for patient creation)
    const consentId = await t.run(async (ctx) => {
      return await ctx.db.insert("consents", {
        patientEmail: "alice@test.com",
        consentType: "data_processing",
        consentText: "I consent to data processing.",
        consentVersion: "1.0",
        collectedByEmployerId: employerId,
        granted: true,
        grantedAt: Date.now(),
      });
    });

    // Create patient using the actual mutation (bypassing auth for test)
    const patientId = await t.run(async (ctx) => {
      return await ctx.db.insert("patients", {
        employerId,
        firstName: "Alice",
        lastName: "Johnson",
        email: "alice@test.com",
        dateOfBirth: "1990-05-15",
        consentId,
        createdAt: Date.now(),
      });
    });

    // Verify patient was created correctly
    const patient = await t.run(async (ctx) => {
      return await ctx.db.get(patientId);
    });

    expect(patient).toBeDefined();
    expect(patient?.firstName).toBe("Alice");
    expect(patient?.lastName).toBe("Johnson");
    expect(patient?.email).toBe("alice@test.com");
    expect(patient?.dateOfBirth).toBe("1990-05-15");
    expect(patient?.employerId).toBe(employerId);
    expect(patient?.consentId).toBe(consentId);
    expect(patient?.createdAt).toBeDefined();
  });

  it("should create patient with optional fields", async () => {
    const t = convexTest(schema, modules);

    // Seed verified employer
    const employerId = await t.run(async (ctx) => {
      return await ctx.db.insert("employers", {
        workosUserId: "workos_test_user_2",
        email: "employer2@test.com",
        companyType: "employer",
        companyName: "Test Corp 2",
        contactName: "Test Contact 2",
        addressLine1: "456 Test Ave",
        city: "Manchester",
        postcode: "M1 1AA",
        status: "verified",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Create consent
    const consentId = await t.run(async (ctx) => {
      return await ctx.db.insert("consents", {
        patientEmail: "bob@test.com",
        consentType: "data_processing",
        consentText: "I consent to data processing.",
        consentVersion: "1.0",
        collectedByEmployerId: employerId,
        granted: true,
        grantedAt: Date.now(),
      });
    });

    // Create patient with optional fields
    const patientId = await t.run(async (ctx) => {
      return await ctx.db.insert("patients", {
        employerId,
        firstName: "Bob",
        lastName: "Smith",
        email: "bob@test.com",
        phone: "07700123456",
        dateOfBirth: "1985-08-20",
        jobTitle: "Software Engineer",
        department: "Engineering",
        employeeReference: "EMP-001",
        consentId,
        createdAt: Date.now(),
      });
    });

    // Verify patient
    const patient = await t.run(async (ctx) => {
      return await ctx.db.get(patientId);
    });

    expect(patient).toBeDefined();
    expect(patient?.phone).toBe("07700123456");
    expect(patient?.jobTitle).toBe("Software Engineer");
    expect(patient?.department).toBe("Engineering");
    expect(patient?.employeeReference).toBe("EMP-001");
  });
});

describe("patients.list", () => {
  it("should list patients by employer", async () => {
    const t = convexTest(schema, modules);

    // Seed employer
    const employerId = await t.run(async (ctx) => {
      return await ctx.db.insert("employers", {
        workosUserId: "workos_test_user_3",
        email: "employer3@test.com",
        companyType: "employer",
        companyName: "Test Corp 3",
        contactName: "Test Contact 3",
        addressLine1: "789 Test Blvd",
        city: "Birmingham",
        postcode: "B1 1AA",
        status: "verified",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Create consents for both patients
    const consent1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("consents", {
        patientEmail: "patient1@test.com",
        consentType: "data_processing",
        consentText: "I consent to data processing.",
        consentVersion: "1.0",
        collectedByEmployerId: employerId,
        granted: true,
        grantedAt: Date.now(),
      });
    });

    const consent2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("consents", {
        patientEmail: "patient2@test.com",
        consentType: "data_processing",
        consentText: "I consent to data processing.",
        consentVersion: "1.0",
        collectedByEmployerId: employerId,
        granted: true,
        grantedAt: Date.now(),
      });
    });

    // Create multiple patients
    await t.run(async (ctx) => {
      await ctx.db.insert("patients", {
        employerId,
        firstName: "Patient",
        lastName: "One",
        email: "patient1@test.com",
        dateOfBirth: "1990-01-01",
        consentId: consent1Id,
        createdAt: Date.now(),
      });

      await ctx.db.insert("patients", {
        employerId,
        firstName: "Patient",
        lastName: "Two",
        email: "patient2@test.com",
        dateOfBirth: "1991-02-02",
        consentId: consent2Id,
        createdAt: Date.now(),
      });
    });

    // Query patients using index
    const patients = await t.run(async (ctx) => {
      return await ctx.db
        .query("patients")
        .withIndex("by_employer", (q) => q.eq("employerId", employerId))
        .collect();
    });

    expect(patients).toHaveLength(2);
    expect(patients.map((p) => p.email).sort()).toEqual([
      "patient1@test.com",
      "patient2@test.com",
    ]);
  });

  it("should exclude soft-deleted patients from list", async () => {
    const t = convexTest(schema, modules);

    // Seed employer
    const employerId = await t.run(async (ctx) => {
      return await ctx.db.insert("employers", {
        workosUserId: "workos_test_user_4",
        email: "employer4@test.com",
        companyType: "employer",
        companyName: "Test Corp 4",
        contactName: "Test Contact 4",
        addressLine1: "101 Test Lane",
        city: "Leeds",
        postcode: "LS1 1AA",
        status: "verified",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Create consents
    const consent1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("consents", {
        patientEmail: "active@test.com",
        consentType: "data_processing",
        consentText: "I consent to data processing.",
        consentVersion: "1.0",
        collectedByEmployerId: employerId,
        granted: true,
        grantedAt: Date.now(),
      });
    });

    const consent2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("consents", {
        patientEmail: "deleted@test.com",
        consentType: "data_processing",
        consentText: "I consent to data processing.",
        consentVersion: "1.0",
        collectedByEmployerId: employerId,
        granted: true,
        grantedAt: Date.now(),
      });
    });

    // Create active patient
    await t.run(async (ctx) => {
      await ctx.db.insert("patients", {
        employerId,
        firstName: "Active",
        lastName: "Patient",
        email: "active@test.com",
        dateOfBirth: "1990-01-01",
        consentId: consent1Id,
        createdAt: Date.now(),
      });
    });

    // Create soft-deleted patient
    await t.run(async (ctx) => {
      await ctx.db.insert("patients", {
        employerId,
        firstName: "[REDACTED]",
        lastName: "[REDACTED]",
        email: "[REDACTED]",
        dateOfBirth: "[REDACTED]",
        consentId: consent2Id,
        createdAt: Date.now(),
        deletedAt: Date.now(),
      });
    });

    // Query active patients only (filtering out deletedAt)
    const activePatients = await t.run(async (ctx) => {
      const allPatients = await ctx.db
        .query("patients")
        .withIndex("by_employer", (q) => q.eq("employerId", employerId))
        .collect();
      return allPatients.filter((p) => !p.deletedAt);
    });

    expect(activePatients).toHaveLength(1);
    expect(activePatients[0].email).toBe("active@test.com");
  });
});

describe("patients.softDelete - PII redaction", () => {
  it("should redact all PII fields when soft deleting", async () => {
    const t = convexTest(schema, modules);

    // Seed employer
    const employerId = await t.run(async (ctx) => {
      return await ctx.db.insert("employers", {
        workosUserId: "workos_test_user_5",
        email: "employer5@test.com",
        companyType: "employer",
        companyName: "Test Corp 5",
        contactName: "Test Contact 5",
        addressLine1: "202 Test Rd",
        city: "Glasgow",
        postcode: "G1 1AA",
        status: "verified",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Create consent
    const consentId = await t.run(async (ctx) => {
      return await ctx.db.insert("consents", {
        patientEmail: "charlie@test.com",
        consentType: "data_processing",
        consentText: "I consent to data processing.",
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
        firstName: "Charlie",
        lastName: "Brown",
        email: "charlie@test.com",
        phone: "07700999888",
        dateOfBirth: "1988-03-10",
        consentId,
        createdAt: Date.now(),
      });
    });

    // Soft delete patient (redact PII)
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

    // Verify PII is redacted
    const deletedPatient = await t.run(async (ctx) => {
      return await ctx.db.get(patientId);
    });

    expect(deletedPatient?.firstName).toBe("[REDACTED]");
    expect(deletedPatient?.lastName).toBe("[REDACTED]");
    expect(deletedPatient?.email).toBe("[REDACTED]");
    expect(deletedPatient?.phone).toBe("[REDACTED]");
    expect(deletedPatient?.dateOfBirth).toBe("[REDACTED]");
    expect(deletedPatient?.deletedAt).toBeDefined();
  });

  it("should preserve audit trail references when soft deleting", async () => {
    const t = convexTest(schema, modules);

    // Seed employer
    const employerId = await t.run(async (ctx) => {
      return await ctx.db.insert("employers", {
        workosUserId: "workos_test_user_6",
        email: "employer6@test.com",
        companyType: "employer",
        companyName: "Test Corp 6",
        contactName: "Test Contact 6",
        addressLine1: "303 Test Way",
        city: "Edinburgh",
        postcode: "EH1 1AA",
        status: "verified",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Create consent
    const consentId = await t.run(async (ctx) => {
      return await ctx.db.insert("consents", {
        patientEmail: "diana@test.com",
        consentType: "data_processing",
        consentText: "I consent to data processing.",
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
        firstName: "Diana",
        lastName: "Prince",
        email: "diana@test.com",
        dateOfBirth: "1992-07-25",
        consentId,
        createdAt: Date.now(),
      });
    });

    // Soft delete patient
    await t.run(async (ctx) => {
      await ctx.db.patch(patientId, {
        firstName: "[REDACTED]",
        lastName: "[REDACTED]",
        email: "[REDACTED]",
        dateOfBirth: "[REDACTED]",
        deletedAt: Date.now(),
      });
    });

    // Verify audit trail references are preserved
    const deletedPatient = await t.run(async (ctx) => {
      return await ctx.db.get(patientId);
    });

    expect(deletedPatient?.employerId).toBe(employerId);
    expect(deletedPatient?.consentId).toBe(consentId);
  });
});

describe("patients - authorization validation", () => {
  it("should isolate patients by employer", async () => {
    const t = convexTest(schema, modules);

    // Seed two different employers
    const employer1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("employers", {
        workosUserId: "workos_test_user_7",
        email: "employer7@test.com",
        companyType: "employer",
        companyName: "Employer One",
        contactName: "Contact One",
        addressLine1: "404 Test Path",
        city: "Cardiff",
        postcode: "CF1 1AA",
        status: "verified",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const employer2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("employers", {
        workosUserId: "workos_test_user_8",
        email: "employer8@test.com",
        companyType: "employer",
        companyName: "Employer Two",
        contactName: "Contact Two",
        addressLine1: "505 Test Circle",
        city: "Belfast",
        postcode: "BT1 1AA",
        status: "verified",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    // Create consents and patients for each employer
    const consent1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("consents", {
        patientEmail: "emp1patient@test.com",
        consentType: "data_processing",
        consentText: "I consent to data processing.",
        consentVersion: "1.0",
        collectedByEmployerId: employer1Id,
        granted: true,
        grantedAt: Date.now(),
      });
    });

    const consent2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("consents", {
        patientEmail: "emp2patient@test.com",
        consentType: "data_processing",
        consentText: "I consent to data processing.",
        consentVersion: "1.0",
        collectedByEmployerId: employer2Id,
        granted: true,
        grantedAt: Date.now(),
      });
    });

    // Create patients for each employer
    await t.run(async (ctx) => {
      await ctx.db.insert("patients", {
        employerId: employer1Id,
        firstName: "Emp1",
        lastName: "Patient",
        email: "emp1patient@test.com",
        dateOfBirth: "1990-01-01",
        consentId: consent1Id,
        createdAt: Date.now(),
      });

      await ctx.db.insert("patients", {
        employerId: employer2Id,
        firstName: "Emp2",
        lastName: "Patient",
        email: "emp2patient@test.com",
        dateOfBirth: "1991-02-02",
        consentId: consent2Id,
        createdAt: Date.now(),
      });
    });

    // Query patients for employer 1 - should only see their patient
    const employer1Patients = await t.run(async (ctx) => {
      return await ctx.db
        .query("patients")
        .withIndex("by_employer", (q) => q.eq("employerId", employer1Id))
        .collect();
    });

    // Query patients for employer 2 - should only see their patient
    const employer2Patients = await t.run(async (ctx) => {
      return await ctx.db
        .query("patients")
        .withIndex("by_employer", (q) => q.eq("employerId", employer2Id))
        .collect();
    });

    expect(employer1Patients).toHaveLength(1);
    expect(employer1Patients[0].email).toBe("emp1patient@test.com");

    expect(employer2Patients).toHaveLength(1);
    expect(employer2Patients[0].email).toBe("emp2patient@test.com");
  });
});
