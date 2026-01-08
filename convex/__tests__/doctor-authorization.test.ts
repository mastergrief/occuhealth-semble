/**
 * Integration tests for Doctor Authorization using convex-test
 *
 * Tests doctor settings, authorization, and Zoom URL validation.
 */
/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { isValidZoomUrl } from "../doctorSettings";

// Import all convex modules for convex-test
const modules = import.meta.glob("../**/*.*s");

// ---------------------------------------------------------------------------
// Zoom URL Validation Tests (Pure Function)
// ---------------------------------------------------------------------------

describe("isValidZoomUrl", () => {
  describe("valid Zoom URLs", () => {
    it("returns true for standard zoom.us URL", () => {
      expect(isValidZoomUrl("https://zoom.us/j/123456789")).toBe(true);
    });

    it("returns true for zoom.us URL with subdomain", () => {
      expect(isValidZoomUrl("https://us02web.zoom.us/j/123456789")).toBe(true);
    });

    it("returns true for zoom.com URL", () => {
      expect(isValidZoomUrl("https://zoom.com/j/123")).toBe(true);
    });

    it("returns true for zoom.us personal meeting room URL", () => {
      expect(isValidZoomUrl("https://zoom.us/my/drsmith")).toBe(true);
    });

    it("returns true for zoom.us URL with query parameters", () => {
      expect(isValidZoomUrl("https://zoom.us/j/123456789?pwd=abc123")).toBe(
        true
      );
    });

    it("returns true for different zoom.us regional subdomains", () => {
      expect(isValidZoomUrl("https://eu01web.zoom.us/j/123456789")).toBe(true);
      expect(isValidZoomUrl("https://ap01web.zoom.us/j/123456789")).toBe(true);
    });
  });

  describe("invalid URLs - wrong domain", () => {
    it("returns false for google.com URL", () => {
      expect(isValidZoomUrl("https://google.com")).toBe(false);
    });

    it("returns false for URL containing zoom but wrong domain", () => {
      expect(isValidZoomUrl("https://zoom.google.com")).toBe(false);
    });

    it("returns false for URL with zoom in path", () => {
      expect(isValidZoomUrl("https://example.com/zoom/meeting")).toBe(false);
    });

    it("returns false for similar but fake domain (zoom-us.com)", () => {
      expect(isValidZoomUrl("https://zoom-us.com/j/123")).toBe(false);
    });

    it("returns false for subdomain spoofing (zoom.us.malicious.com)", () => {
      expect(isValidZoomUrl("https://zoom.us.malicious.com/j/123")).toBe(false);
    });
  });

  describe("invalid URLs - malformed or dangerous", () => {
    it("returns false for javascript: protocol (XSS attempt)", () => {
      expect(isValidZoomUrl("javascript:alert(1)")).toBe(false);
    });

    it("returns false for data: protocol", () => {
      expect(isValidZoomUrl("data:text/html,<script>alert(1)</script>")).toBe(
        false
      );
    });

    it("returns false for empty string", () => {
      expect(isValidZoomUrl("")).toBe(false);
    });

    it("returns false for malformed URL (no protocol)", () => {
      expect(isValidZoomUrl("zoom.us/j/123456789")).toBe(false);
    });

    it("returns false for random text", () => {
      expect(isValidZoomUrl("not-a-url")).toBe(false);
    });

    it("returns false for whitespace only", () => {
      expect(isValidZoomUrl("   ")).toBe(false);
    });

    it("accepts URL with angle brackets in path (URL constructor allows this)", () => {
      // Note: URL constructor accepts angle brackets in path
      // If stricter validation is needed, enhance isValidZoomUrl
      expect(isValidZoomUrl("https://zoom.us/j/<script>")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("returns true for http:// protocol (valid but less secure)", () => {
      // URL constructor accepts http, hostname check still works
      expect(isValidZoomUrl("http://zoom.us/j/123456789")).toBe(true);
    });

    it("handles URL with port number", () => {
      // Note: Zoom doesn't use custom ports, but URL is still valid
      expect(isValidZoomUrl("https://zoom.us:443/j/123456789")).toBe(true);
    });

    it("returns false for file:// protocol", () => {
      expect(isValidZoomUrl("file:///etc/passwd")).toBe(false);
    });

    it("accepts ftp:// protocol (hostname check only, not protocol)", () => {
      // Note: Current implementation only checks hostname, not protocol
      // If protocol validation is needed, enhance isValidZoomUrl
      expect(isValidZoomUrl("ftp://zoom.us/j/123")).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Doctor Settings Integration Tests
// ---------------------------------------------------------------------------

describe("doctorSettings - creation", () => {
  it("should create doctor settings with valid Zoom URL", async () => {
    const t = convexTest(schema, modules);

    const doctorId = await t.run(async (ctx) => {
      return await ctx.db.insert("doctorSettings", {
        workosUserId: "workos_doctor_1",
        email: "doctor@test.com",
        name: "Dr. Alice Smith",
        zoomPersonalLink: "https://zoom.us/j/123456789",
        createdAt: Date.now(),
      });
    });

    const doctor = await t.run(async (ctx) => {
      return await ctx.db.get(doctorId);
    });

    expect(doctor).toBeDefined();
    expect(doctor?.email).toBe("doctor@test.com");
    expect(doctor?.name).toBe("Dr. Alice Smith");
    expect(doctor?.zoomPersonalLink).toBe("https://zoom.us/j/123456789");
    expect(isValidZoomUrl(doctor?.zoomPersonalLink ?? "")).toBe(true);
  });

  it("should create doctor settings with personal meeting room URL", async () => {
    const t = convexTest(schema, modules);

    const doctorId = await t.run(async (ctx) => {
      return await ctx.db.insert("doctorSettings", {
        workosUserId: "workos_doctor_2",
        email: "doctor2@test.com",
        name: "Dr. Bob Johnson",
        zoomPersonalLink: "https://zoom.us/my/drbobjohnson",
        createdAt: Date.now(),
      });
    });

    const doctor = await t.run(async (ctx) => {
      return await ctx.db.get(doctorId);
    });

    expect(doctor?.zoomPersonalLink).toBe("https://zoom.us/my/drbobjohnson");
    expect(isValidZoomUrl(doctor?.zoomPersonalLink ?? "")).toBe(true);
  });
});

describe("doctorSettings - queries", () => {
  it("should query doctor by WorkOS user ID", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx) => {
      await ctx.db.insert("doctorSettings", {
        workosUserId: "workos_doctor_unique",
        email: "unique_doctor@test.com",
        name: "Dr. Unique",
        zoomPersonalLink: "https://zoom.us/j/111111111",
        createdAt: Date.now(),
      });
    });

    const doctor = await t.run(async (ctx) => {
      return await ctx.db
        .query("doctorSettings")
        .withIndex("by_workos_user", (q) =>
          q.eq("workosUserId", "workos_doctor_unique")
        )
        .unique();
    });

    expect(doctor).toBeDefined();
    expect(doctor?.email).toBe("unique_doctor@test.com");
    expect(doctor?.workosUserId).toBe("workos_doctor_unique");
  });

  it("should return null for non-existent doctor", async () => {
    const t = convexTest(schema, modules);

    const doctor = await t.run(async (ctx) => {
      return await ctx.db
        .query("doctorSettings")
        .withIndex("by_workos_user", (q) =>
          q.eq("workosUserId", "non_existent_workos_id")
        )
        .unique();
    });

    expect(doctor).toBeNull();
  });
});

describe("doctorSettings - authorization scenarios", () => {
  it("should allow doctor to access their own appointments", async () => {
    const t = convexTest(schema, modules);

    // Create doctor
    const doctorId = await t.run(async (ctx) => {
      return await ctx.db.insert("doctorSettings", {
        workosUserId: "workos_doctor_auth_1",
        email: "auth_doctor@test.com",
        name: "Dr. Auth Test",
        zoomPersonalLink: "https://zoom.us/j/999999999",
        createdAt: Date.now(),
      });
    });

    // Create slot for doctor
    const slotId = await t.run(async (ctx) => {
      return await ctx.db.insert("availableSlots", {
        doctorId,
        date: "2026-03-01",
        startTime: "09:00",
        endTime: "09:30",
        status: "available",
      });
    });

    // Verify doctor can see their slot
    const slots = await t.run(async (ctx) => {
      return await ctx.db
        .query("availableSlots")
        .withIndex("by_doctor", (q) => q.eq("doctorId", doctorId))
        .collect();
    });

    expect(slots).toHaveLength(1);
    expect(slots[0]._id).toBe(slotId);
  });

  it("should isolate doctors from each other's slots", async () => {
    const t = convexTest(schema, modules);

    // Create two doctors
    const doctor1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("doctorSettings", {
        workosUserId: "workos_doctor_iso_1",
        email: "doctor_iso_1@test.com",
        name: "Dr. Isolation One",
        zoomPersonalLink: "https://zoom.us/j/111111111",
        createdAt: Date.now(),
      });
    });

    const doctor2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("doctorSettings", {
        workosUserId: "workos_doctor_iso_2",
        email: "doctor_iso_2@test.com",
        name: "Dr. Isolation Two",
        zoomPersonalLink: "https://zoom.us/j/222222222",
        createdAt: Date.now(),
      });
    });

    // Create slots for each doctor
    await t.run(async (ctx) => {
      await ctx.db.insert("availableSlots", {
        doctorId: doctor1Id,
        date: "2026-03-01",
        startTime: "10:00",
        endTime: "10:30",
        status: "available",
      });

      await ctx.db.insert("availableSlots", {
        doctorId: doctor2Id,
        date: "2026-03-01",
        startTime: "10:00",
        endTime: "10:30",
        status: "available",
      });
    });

    // Query doctor1's slots
    const doctor1Slots = await t.run(async (ctx) => {
      return await ctx.db
        .query("availableSlots")
        .withIndex("by_doctor", (q) => q.eq("doctorId", doctor1Id))
        .collect();
    });

    // Query doctor2's slots
    const doctor2Slots = await t.run(async (ctx) => {
      return await ctx.db
        .query("availableSlots")
        .withIndex("by_doctor", (q) => q.eq("doctorId", doctor2Id))
        .collect();
    });

    // Each doctor should only see their own slot
    expect(doctor1Slots).toHaveLength(1);
    expect(doctor1Slots[0].doctorId).toBe(doctor1Id);

    expect(doctor2Slots).toHaveLength(1);
    expect(doctor2Slots[0].doctorId).toBe(doctor2Id);
  });
});

describe("doctorSettings - slot management", () => {
  it("should allow doctor to create multiple slots", async () => {
    const t = convexTest(schema, modules);

    const doctorId = await t.run(async (ctx) => {
      return await ctx.db.insert("doctorSettings", {
        workosUserId: "workos_doctor_slots",
        email: "slots_doctor@test.com",
        name: "Dr. Multi Slots",
        zoomPersonalLink: "https://zoom.us/j/333333333",
        createdAt: Date.now(),
      });
    });

    // Create multiple slots for different times
    await t.run(async (ctx) => {
      await ctx.db.insert("availableSlots", {
        doctorId,
        date: "2026-04-01",
        startTime: "09:00",
        endTime: "09:30",
        status: "available",
      });

      await ctx.db.insert("availableSlots", {
        doctorId,
        date: "2026-04-01",
        startTime: "10:00",
        endTime: "10:30",
        status: "available",
      });

      await ctx.db.insert("availableSlots", {
        doctorId,
        date: "2026-04-01",
        startTime: "11:00",
        endTime: "11:30",
        status: "available",
      });
    });

    // Query all slots for doctor
    const slots = await t.run(async (ctx) => {
      return await ctx.db
        .query("availableSlots")
        .withIndex("by_doctor", (q) => q.eq("doctorId", doctorId))
        .collect();
    });

    expect(slots).toHaveLength(3);
    expect(slots.every((s) => s.doctorId === doctorId)).toBe(true);
  });

  it("should allow doctor to block slots", async () => {
    const t = convexTest(schema, modules);

    const doctorId = await t.run(async (ctx) => {
      return await ctx.db.insert("doctorSettings", {
        workosUserId: "workos_doctor_block",
        email: "block_doctor@test.com",
        name: "Dr. Block Test",
        zoomPersonalLink: "https://zoom.us/j/444444444",
        createdAt: Date.now(),
      });
    });

    // Create slot
    const slotId = await t.run(async (ctx) => {
      return await ctx.db.insert("availableSlots", {
        doctorId,
        date: "2026-05-01",
        startTime: "14:00",
        endTime: "14:30",
        status: "available",
      });
    });

    // Block the slot
    await t.run(async (ctx) => {
      await ctx.db.patch(slotId, { status: "blocked" });
    });

    // Verify slot is blocked
    const slot = await t.run(async (ctx) => {
      return await ctx.db.get(slotId);
    });

    expect(slot?.status).toBe("blocked");
  });
});
