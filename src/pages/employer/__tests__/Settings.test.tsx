import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmployerSettings } from "../Settings";
import { Id } from "../../../../convex/_generated/dataModel";

// Mock the EmployerLayout context hook
vi.mock("../../EmployerLayout", () => ({
  useEmployerContext: vi.fn(),
}));

import { useEmployerContext } from "../../EmployerLayout";

// Mock employer data with full required fields
const mockEmployer = {
  _id: "employer_123" as Id<"employers">,
  _creationTime: Date.now(),
  workosUserId: "workos_123",
  email: "test@company.com",
  companyType: "employer" as const,
  companyName: "Test Company Ltd",
  contactName: "John Smith",
  addressLine1: "123 Test Street",
  city: "London",
  postcode: "SW1A 1AA",
  status: "verified" as const,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const mockEmployerPending = {
  ...mockEmployer,
  status: "pending" as const,
};

const mockEmployerRejected = {
  ...mockEmployer,
  status: "rejected" as const,
};

describe("EmployerSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Settings page title", () => {
    vi.mocked(useEmployerContext).mockReturnValue({
      employer: mockEmployer,
      isVerified: true,
    });

    render(<EmployerSettings />);

    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("displays company name from employer data", () => {
    vi.mocked(useEmployerContext).mockReturnValue({
      employer: mockEmployer,
      isVerified: true,
    });

    render(<EmployerSettings />);

    expect(screen.getByText("Company Name")).toBeInTheDocument();
    expect(screen.getByText("Test Company Ltd")).toBeInTheDocument();
  });

  it("shows company type", () => {
    vi.mocked(useEmployerContext).mockReturnValue({
      employer: mockEmployer,
      isVerified: true,
    });

    render(<EmployerSettings />);

    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("employer")).toBeInTheDocument();
  });

  it("shows verification status with correct styling for verified", () => {
    vi.mocked(useEmployerContext).mockReturnValue({
      employer: mockEmployer,
      isVerified: true,
    });

    render(<EmployerSettings />);

    expect(screen.getByText("Status")).toBeInTheDocument();
    const statusElement = screen.getByText("verified");
    expect(statusElement).toBeInTheDocument();
    expect(statusElement).toHaveClass("text-green-600");
  });

  it("shows pending status with amber styling", () => {
    vi.mocked(useEmployerContext).mockReturnValue({
      employer: mockEmployerPending,
      isVerified: false,
    });

    render(<EmployerSettings />);

    const statusElement = screen.getByText("pending");
    expect(statusElement).toBeInTheDocument();
    expect(statusElement).toHaveClass("text-amber-600");
  });

  it("shows rejected status with red styling", () => {
    vi.mocked(useEmployerContext).mockReturnValue({
      employer: mockEmployerRejected,
      isVerified: false,
    });

    render(<EmployerSettings />);

    const statusElement = screen.getByText("rejected");
    expect(statusElement).toBeInTheDocument();
    expect(statusElement).toHaveClass("text-red-600");
  });

  it("handles loading state when employer is undefined", () => {
    vi.mocked(useEmployerContext).mockReturnValue({
      employer: undefined,
      isVerified: false,
    });

    render(<EmployerSettings />);

    // Page title should still render
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Company Information")).toBeInTheDocument();

    // Company name should not be present (undefined renders nothing)
    expect(screen.queryByText("Test Company Ltd")).not.toBeInTheDocument();
  });
});
