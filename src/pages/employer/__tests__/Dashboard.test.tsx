import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useQuery } from "convex/react";
import { EmployerDashboard } from "../Dashboard";
import { Id } from "../../../../convex/_generated/dataModel";

// Mock the EmployerLayout context hook
vi.mock("../../EmployerLayout", () => ({
  useEmployerContext: vi.fn(),
}));

// Import mocked function for type safety
import { useEmployerContext } from "../../EmployerLayout";

// Mock employer data
const mockEmployer = {
  _id: "employer_123" as Id<"employers">,
  _creationTime: Date.now(),
  workosUserId: "workos_123",
  companyName: "Test Company Ltd",
  contactName: "John Doe",
  email: "contact@testcompany.com",
  status: "verified" as const,
};

// Mock dashboard stats data (new single query format)
const mockDashboardStats = {
  employeeCount: 2,
  appointmentCount: 3,
  reportCount: 1,
  pendingCount: 2,
  recentAppointments: [
    {
      _id: "apt_1" as Id<"appointments">,
      status: "scheduled" as const,
      scheduledDate: "2026-01-05",
      scheduledTime: "09:00",
      patient: { firstName: "Alice", lastName: "Smith" },
    },
    {
      _id: "apt_2" as Id<"appointments">,
      status: "completed" as const,
      scheduledDate: "2026-01-04",
      scheduledTime: "10:00",
      patient: { firstName: "Bob", lastName: "Johnson" },
    },
    {
      _id: "apt_3" as Id<"appointments">,
      status: "scheduled" as const,
      scheduledDate: "2026-01-06",
      scheduledTime: "14:00",
      patient: { firstName: "Alice", lastName: "Smith" },
    },
  ],
};

describe("EmployerDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useEmployerContext).mockReturnValue({ employer: mockEmployer });
  });

  it("renders dashboard title", () => {
    vi.mocked(useQuery).mockReturnValue(mockDashboardStats);

    render(<EmployerDashboard />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("displays stats cards with correct values", () => {
    vi.mocked(useQuery).mockReturnValue(mockDashboardStats);

    render(<EmployerDashboard />);

    // Check stats card titles
    expect(screen.getByText("Employees")).toBeInTheDocument();
    expect(screen.getByText("Appointments")).toBeInTheDocument();
    expect(screen.getByText("Reports")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();

    // Check stats values - employees=2, appointments=3, reports=1, pending=2
    // "2" appears twice (employees and pending)
    expect(screen.getAllByText("2").length).toBe(2);
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows empty state when no appointments exist", () => {
    const statsWithNoAppointments = {
      ...mockDashboardStats,
      appointmentCount: 0,
      pendingCount: 0,
      recentAppointments: [],
    };

    vi.mocked(useQuery).mockReturnValue(statsWithNoAppointments);

    render(<EmployerDashboard />);

    expect(screen.getByText("No appointments yet")).toBeInTheDocument();
  });

  it("handles loading state when query returns undefined", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);

    render(<EmployerDashboard />);

    // Dashboard should still render with 0 values during loading
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Employees")).toBeInTheDocument();
    expect(screen.getByText("Appointments")).toBeInTheDocument();
    expect(screen.getByText("Reports")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();

    // All stats should show 0 during loading
    const zeroValues = screen.getAllByText("0");
    expect(zeroValues.length).toBe(4);
  });

  it("calculates pending appointments correctly", () => {
    const statsWithMixedStatuses = {
      employeeCount: 0,
      appointmentCount: 4,
      reportCount: 0,
      pendingCount: 2,
      recentAppointments: [
        {
          _id: "apt_1" as Id<"appointments">,
          status: "scheduled" as const,
          scheduledDate: "2026-01-05",
          scheduledTime: "09:00",
          patient: { firstName: "Alice", lastName: "Smith" },
        },
        {
          _id: "apt_2" as Id<"appointments">,
          status: "completed" as const,
          scheduledDate: "2026-01-04",
          scheduledTime: "10:00",
          patient: { firstName: "Bob", lastName: "Johnson" },
        },
        {
          _id: "apt_3" as Id<"appointments">,
          status: "cancelled" as const,
          scheduledDate: "2026-01-06",
          scheduledTime: "14:00",
          patient: { firstName: "Alice", lastName: "Smith" },
        },
        {
          _id: "apt_4" as Id<"appointments">,
          status: "scheduled" as const,
          scheduledDate: "2026-01-07",
          scheduledTime: "11:00",
          patient: { firstName: "Bob", lastName: "Johnson" },
        },
      ],
    };

    vi.mocked(useQuery).mockReturnValue(statsWithMixedStatuses);

    render(<EmployerDashboard />);

    // 4 total appointments, but only 2 are "scheduled" (pending)
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("displays recent appointments list with patient information", () => {
    vi.mocked(useQuery).mockReturnValue(mockDashboardStats);

    render(<EmployerDashboard />);

    // Check Recent Appointments section header
    expect(screen.getByText("Recent Appointments")).toBeInTheDocument();

    // Check patient names are displayed (text split across multiple nodes)
    // Alice Smith appears twice (2 appointments), Bob Johnson once
    const aliceElements = screen.getAllByText((content, element) => {
      return element?.textContent === "Alice Smith" && element.tagName === "P";
    });
    expect(aliceElements.length).toBe(2);

    const bobElements = screen.getAllByText((content, element) => {
      return element?.textContent === "Bob Johnson" && element.tagName === "P";
    });
    expect(bobElements.length).toBe(1);

    // Check appointment dates are displayed
    expect(screen.getByText(/2026-01-05/)).toBeInTheDocument();
    expect(screen.getByText(/2026-01-04/)).toBeInTheDocument();

    // Check status badges are displayed
    expect(screen.getAllByText("scheduled").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("completed")).toBeInTheDocument();
  });
});
