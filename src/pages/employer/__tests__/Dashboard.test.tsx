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

// Mock patients data
const mockPatients = {
  items: [
    {
      _id: "patient_1" as Id<"patients">,
      _creationTime: Date.now(),
      firstName: "Alice",
      lastName: "Smith",
      email: "alice@test.com",
      dateOfBirth: "1990-01-15",
      employerId: "employer_123" as Id<"employers">,
    },
    {
      _id: "patient_2" as Id<"patients">,
      _creationTime: Date.now(),
      firstName: "Bob",
      lastName: "Johnson",
      email: "bob@test.com",
      dateOfBirth: "1985-06-20",
      employerId: "employer_123" as Id<"employers">,
    },
  ],
  continueCursor: null,
  isDone: true,
};

// Mock appointments data
const mockAppointments = {
  items: [
    {
      _id: "apt_1" as Id<"appointments">,
      _creationTime: Date.now(),
      status: "scheduled" as const,
      scheduledDate: "2026-01-05",
      scheduledTime: "09:00",
      patientId: "patient_1" as Id<"patients">,
      employerId: "employer_123" as Id<"employers">,
      doctorId: "doctor_123" as Id<"doctorSettings">,
      appointmentType: "initial_assessment",
      patient: { firstName: "Alice", lastName: "Smith" },
    },
    {
      _id: "apt_2" as Id<"appointments">,
      _creationTime: Date.now(),
      status: "completed" as const,
      scheduledDate: "2026-01-04",
      scheduledTime: "10:00",
      patientId: "patient_2" as Id<"patients">,
      employerId: "employer_123" as Id<"employers">,
      doctorId: "doctor_123" as Id<"doctorSettings">,
      appointmentType: "follow_up",
      patient: { firstName: "Bob", lastName: "Johnson" },
    },
    {
      _id: "apt_3" as Id<"appointments">,
      _creationTime: Date.now(),
      status: "scheduled" as const,
      scheduledDate: "2026-01-06",
      scheduledTime: "14:00",
      patientId: "patient_1" as Id<"patients">,
      employerId: "employer_123" as Id<"employers">,
      doctorId: "doctor_123" as Id<"doctorSettings">,
      appointmentType: "routine_checkup",
      patient: { firstName: "Alice", lastName: "Smith" },
    },
  ],
  continueCursor: null,
  isDone: true,
};

// Mock reports data
const mockReports = {
  items: [
    {
      _id: "report_1" as Id<"reports">,
      _creationTime: Date.now(),
      appointmentId: "apt_2" as Id<"appointments">,
      patientId: "patient_2" as Id<"patients">,
      employerId: "employer_123" as Id<"employers">,
      doctorId: "doctor_123" as Id<"doctorSettings">,
      fitnessForWork: "fit",
      notes: "Patient is fit for work.",
      createdAt: Date.now(),
    },
  ],
  continueCursor: null,
  isDone: true,
};

describe("EmployerDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useEmployerContext).mockReturnValue({ employer: mockEmployer });
  });

  it("renders dashboard title", () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce(mockPatients)
      .mockReturnValueOnce(mockAppointments)
      .mockReturnValueOnce(mockReports);

    render(<EmployerDashboard />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("displays stats cards with correct values", () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce(mockPatients)
      .mockReturnValueOnce(mockAppointments)
      .mockReturnValueOnce(mockReports);

    render(<EmployerDashboard />);

    // Check stats card titles
    expect(screen.getByText("Employees")).toBeInTheDocument();
    expect(screen.getByText("Appointments")).toBeInTheDocument();
    expect(screen.getByText("Reports")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();

    // Check stats values exist (multiple "2" values: employees=2, pending=2)
    // Use getAllByText for values that appear multiple times
    expect(screen.getAllByText("2").length).toBe(2); // 2 patients, 2 pending
    expect(screen.getByText("3")).toBeInTheDocument(); // 3 appointments
    expect(screen.getByText("1")).toBeInTheDocument(); // 1 report
  });

  it("shows empty state when no appointments exist", () => {
    const emptyAppointments = {
      items: [],
      continueCursor: null,
      isDone: true,
    };

    vi.mocked(useQuery)
      .mockReturnValueOnce(mockPatients)
      .mockReturnValueOnce(emptyAppointments)
      .mockReturnValueOnce(mockReports);

    render(<EmployerDashboard />);

    expect(screen.getByText("No appointments yet")).toBeInTheDocument();
  });

  it("handles loading state when queries return undefined", () => {
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
    // Create appointments with varying statuses
    const mixedAppointments = {
      items: [
        {
          _id: "apt_1" as Id<"appointments">,
          _creationTime: Date.now(),
          status: "scheduled" as const,
          scheduledDate: "2026-01-05",
          scheduledTime: "09:00",
          patientId: "patient_1" as Id<"patients">,
          employerId: "employer_123" as Id<"employers">,
          doctorId: "doctor_123" as Id<"doctorSettings">,
          appointmentType: "initial_assessment",
          patient: { firstName: "Alice", lastName: "Smith" },
        },
        {
          _id: "apt_2" as Id<"appointments">,
          _creationTime: Date.now(),
          status: "completed" as const,
          scheduledDate: "2026-01-04",
          scheduledTime: "10:00",
          patientId: "patient_2" as Id<"patients">,
          employerId: "employer_123" as Id<"employers">,
          doctorId: "doctor_123" as Id<"doctorSettings">,
          appointmentType: "follow_up",
          patient: { firstName: "Bob", lastName: "Johnson" },
        },
        {
          _id: "apt_3" as Id<"appointments">,
          _creationTime: Date.now(),
          status: "cancelled" as const,
          scheduledDate: "2026-01-06",
          scheduledTime: "14:00",
          patientId: "patient_1" as Id<"patients">,
          employerId: "employer_123" as Id<"employers">,
          doctorId: "doctor_123" as Id<"doctorSettings">,
          appointmentType: "routine_checkup",
          patient: { firstName: "Alice", lastName: "Smith" },
        },
        {
          _id: "apt_4" as Id<"appointments">,
          _creationTime: Date.now(),
          status: "scheduled" as const,
          scheduledDate: "2026-01-07",
          scheduledTime: "11:00",
          patientId: "patient_2" as Id<"patients">,
          employerId: "employer_123" as Id<"employers">,
          doctorId: "doctor_123" as Id<"doctorSettings">,
          appointmentType: "follow_up",
          patient: { firstName: "Bob", lastName: "Johnson" },
        },
      ],
      continueCursor: null,
      isDone: true,
    };

    const emptyPatients = { items: [], continueCursor: null, isDone: true };
    const emptyReports = { items: [], continueCursor: null, isDone: true };

    vi.mocked(useQuery)
      .mockReturnValueOnce(emptyPatients)
      .mockReturnValueOnce(mixedAppointments)
      .mockReturnValueOnce(emptyReports);

    render(<EmployerDashboard />);

    // 4 total appointments, but only 2 are "scheduled" (pending)
    // Stats should show: 0 employees, 4 appointments, 0 reports, 2 pending
    expect(screen.getByText("4")).toBeInTheDocument(); // Total appointments
    expect(screen.getByText("2")).toBeInTheDocument(); // Pending (scheduled only)
  });

  it("displays recent appointments list with patient information", () => {
    vi.mocked(useQuery)
      .mockReturnValueOnce(mockPatients)
      .mockReturnValueOnce(mockAppointments)
      .mockReturnValueOnce(mockReports);

    render(<EmployerDashboard />);

    // Check Recent Appointments section header
    expect(screen.getByText("Recent Appointments")).toBeInTheDocument();

    // Check patient names are displayed (text split across multiple nodes)
    // Alice Smith appears twice (2 appointments), Bob Johnson once
    const aliceElements = screen.getAllByText((content, element) => {
      return element?.textContent === "Alice Smith" && element.tagName === "P";
    });
    expect(aliceElements.length).toBe(2); // Alice has 2 appointments

    const bobElements = screen.getAllByText((content, element) => {
      return element?.textContent === "Bob Johnson" && element.tagName === "P";
    });
    expect(bobElements.length).toBe(1); // Bob has 1 appointment

    // Check appointment dates are displayed
    expect(screen.getByText(/2026-01-05/)).toBeInTheDocument();
    expect(screen.getByText(/2026-01-04/)).toBeInTheDocument();

    // Check status badges are displayed
    expect(screen.getAllByText("scheduled").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("completed")).toBeInTheDocument();
  });
});
