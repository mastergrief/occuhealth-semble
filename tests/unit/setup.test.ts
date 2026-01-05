import { describe, it, expect, vi } from "vitest";
import { useQuery, useMutation } from "convex/react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  createMockQueryResult,
  createMockMutation,
} from "../mocks/convex";
import {
  createMockLocation,
  createMockNavigate,
  createMockDoctorOutletContext,
} from "../mocks/router";

/**
 * Setup verification tests.
 * These tests verify that the test framework is properly configured.
 * They can be removed once actual component tests are added.
 */
describe("Test Framework Setup", () => {
  describe("Vitest Configuration", () => {
    it("should have globals enabled", () => {
      // describe, it, expect are available globally
      expect(true).toBe(true);
    });

    it("should have vi mock utilities available", () => {
      const mockFn = vi.fn();
      mockFn("test");
      expect(mockFn).toHaveBeenCalledWith("test");
    });
  });

  describe("Convex Mocks", () => {
    it("should mock useQuery", () => {
      expect(vi.isMockFunction(useQuery)).toBe(true);
    });

    it("should mock useMutation", () => {
      expect(vi.isMockFunction(useMutation)).toBe(true);
    });

    it("should create mock query results", () => {
      const result = createMockQueryResult({ data: { id: "123" } });
      expect(result).toEqual({ id: "123" });
    });

    it("should create mock mutations", () => {
      const mockMutation = createMockMutation({ returnValue: { success: true } });
      expect(vi.isMockFunction(mockMutation)).toBe(true);
    });
  });

  describe("Router Mocks", () => {
    it("should mock useNavigate", () => {
      expect(vi.isMockFunction(useNavigate)).toBe(true);
    });

    it("should mock useOutletContext", () => {
      expect(vi.isMockFunction(useOutletContext)).toBe(true);
    });

    it("should create mock location", () => {
      const location = createMockLocation({ pathname: "/doctor/dashboard" });
      expect(location.pathname).toBe("/doctor/dashboard");
      expect(location.search).toBe("");
    });

    it("should create mock navigate", () => {
      const navigate = createMockNavigate();
      expect(vi.isMockFunction(navigate)).toBe(true);
    });

    it("should create mock doctor outlet context", () => {
      const context = createMockDoctorOutletContext({
        isAuthenticated: true,
        doctorSettings: {
          _id: "doc123",
          workosUserId: "workos_123",
          name: "Dr. Smith",
        },
      });
      expect(context.isAuthenticated).toBe(true);
      expect(context.doctorSettings?.name).toBe("Dr. Smith");
    });
  });

  describe("Jest-DOM Matchers", () => {
    it("should have jest-dom matchers available", () => {
      const div = document.createElement("div");
      div.textContent = "Hello";
      document.body.appendChild(div);

      expect(div).toBeInTheDocument();
      expect(div).toHaveTextContent("Hello");

      document.body.removeChild(div);
    });
  });
});
