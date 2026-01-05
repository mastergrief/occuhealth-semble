import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useQuery, useMutation } from "convex/react";
import { DoctorReports } from "../Reports";
import { Id } from "../../../../convex/_generated/dataModel";
import { createMockMutation } from "../../../../tests/mocks/convex";

// Mock appointments data (with reportId to simulate different states)
const mockAppointmentsWithPendingReports = [
  {
    _id: "apt_1" as Id<"appointments">,
    _creationTime: Date.now(),
    status: "completed" as const,
    scheduledDate: "2026-01-05",
    scheduledTime: "09:00",
    patientId: "patient_1" as Id<"patients">,
    employerId: "employer_1" as Id<"employers">,
    doctorId: "doctor_123" as Id<"doctorSettings">,
    appointmentType: "initial_assessment",
    // No reportId - needs report
  },
  {
    _id: "apt_2" as Id<"appointments">,
    _creationTime: Date.now(),
    status: "completed" as const,
    scheduledDate: "2026-01-05",
    scheduledTime: "10:00",
    patientId: "patient_2" as Id<"patients">,
    employerId: "employer_1" as Id<"employers">,
    doctorId: "doctor_123" as Id<"doctorSettings">,
    appointmentType: "follow_up",
    reportId: "report_123" as Id<"reports">, // Already has report
  },
];

const mockAppointmentsAllWithReports = [
  {
    _id: "apt_1" as Id<"appointments">,
    _creationTime: Date.now(),
    status: "completed" as const,
    scheduledDate: "2026-01-05",
    scheduledTime: "09:00",
    patientId: "patient_1" as Id<"patients">,
    employerId: "employer_1" as Id<"employers">,
    doctorId: "doctor_123" as Id<"doctorSettings">,
    appointmentType: "initial_assessment",
    reportId: "report_1" as Id<"reports">,
  },
];

describe("DoctorReports", () => {
  let mockCreateReport: ReturnType<typeof createMockMutation>;
  let mockSendToEmployer: ReturnType<typeof createMockMutation>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateReport = createMockMutation({ returnValue: "report_new" as Id<"reports"> });
    mockSendToEmployer = createMockMutation();

    vi.mocked(useMutation)
      .mockReturnValueOnce(mockCreateReport)
      .mockReturnValueOnce(mockSendToEmployer);
  });

  it("renders page with appointments list awaiting reports", () => {
    vi.mocked(useQuery).mockReturnValue(mockAppointmentsWithPendingReports);

    render(<DoctorReports />);

    expect(screen.getByText("Create Reports")).toBeInTheDocument();
    expect(screen.getByText("Completed Appointments Awaiting Report")).toBeInTheDocument();
    // Should show the appointment without a report
    expect(screen.getByText("09:00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create report/i })).toBeInTheDocument();
  });

  it("shows empty state when no pending reports", () => {
    vi.mocked(useQuery).mockReturnValue(mockAppointmentsAllWithReports);

    render(<DoctorReports />);

    expect(screen.getByText("No appointments awaiting reports")).toBeInTheDocument();
  });

  it("opens report dialog on Create Report button click", async () => {
    vi.mocked(useQuery).mockReturnValue(mockAppointmentsWithPendingReports);

    render(<DoctorReports />);

    // Click Create Report button
    const createButton = screen.getByRole("button", { name: /create report/i });
    fireEvent.click(createButton);

    // Dialog should open
    await waitFor(() => {
      expect(screen.getByText("Create Fitness Report")).toBeInTheDocument();
      expect(screen.getByText("Fitness Assessment")).toBeInTheDocument();
      expect(screen.getByText("Summary")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /submit & send to employer/i })).toBeInTheDocument();
    });
  });

  it("shows fitness status options in the dialog", async () => {
    vi.mocked(useQuery).mockReturnValue(mockAppointmentsWithPendingReports);

    render(<DoctorReports />);

    // Open dialog
    const createButton = screen.getByRole("button", { name: /create report/i });
    fireEvent.click(createButton);

    // Wait for dialog to open
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Verify fitness status options are available
    expect(screen.getByText("Fit for work")).toBeInTheDocument();
    expect(screen.getByText("Fit with restrictions")).toBeInTheDocument();
    expect(screen.getByText("Temporarily unfit")).toBeInTheDocument();
    expect(screen.getByText("Needs further assessment")).toBeInTheDocument();

    // Verify form fields are present
    expect(screen.getByText("Summary")).toBeInTheDocument();
    expect(screen.getByText("Follow-up required")).toBeInTheDocument();
  });
});
