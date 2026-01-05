import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useQuery, useMutation } from "convex/react";
import { DoctorAppointments } from "../Appointments";
import { Id } from "../../../../convex/_generated/dataModel";
import { createMockMutation } from "../../../../tests/mocks/convex";

// Mock the pagination helper
vi.mock("../../../../convex/helpers/pagination", () => ({
  defaultPaginationOpts: () => ({ paginationOpts: { numItems: 50, cursor: null } }),
}));

// Mock appointments data with pagination result structure
const mockAppointmentsResult = {
  items: [
    {
      _id: "apt_1" as Id<"appointments">,
      _creationTime: Date.now(),
      status: "scheduled" as const,
      scheduledDate: "2026-01-05",
      scheduledTime: "09:00",
      patientId: "patient_1" as Id<"patients">,
      employerId: "employer_1" as Id<"employers">,
      doctorId: "doctor_123" as Id<"doctorSettings">,
      appointmentType: "initial_assessment",
      patient: { firstName: "John", lastName: "Doe" },
      employer: { companyName: "Test Corp" },
      reasonForAppointment: "Annual checkup",
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
      patient: { firstName: "Jane", lastName: "Smith" },
      employer: { companyName: "Test Corp" },
    },
  ],
  cursor: null,
  hasMore: false,
};

describe("DoctorAppointments", () => {
  let mockMarkCompleted: ReturnType<typeof createMockMutation>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMarkCompleted = createMockMutation();
    vi.mocked(useMutation).mockReturnValue(mockMarkCompleted);
  });

  it("renders date picker with current date", () => {
    vi.mocked(useQuery).mockReturnValue(mockAppointmentsResult);

    render(<DoctorAppointments />);

    // Date input with type="date" - use querySelector since date inputs don't have textbox role
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput).toBeInTheDocument();
    // Today's date should be set as default
    expect(dateInput.value).toBeTruthy();
  });

  it("displays appointments for the selected date", () => {
    vi.mocked(useQuery).mockReturnValue(mockAppointmentsResult);

    render(<DoctorAppointments />);

    // Check patient names are displayed
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();

    // Check times are displayed
    expect(screen.getByText("09:00")).toBeInTheDocument();
    expect(screen.getByText("10:00")).toBeInTheDocument();

    // Check company name is displayed
    expect(screen.getAllByText("Test Corp").length).toBeGreaterThan(0);

    // Check reason is displayed
    expect(screen.getByText("Reason: Annual checkup")).toBeInTheDocument();
  });

  it("shows empty state when no appointments exist", () => {
    vi.mocked(useQuery).mockReturnValue({ items: [], cursor: null, hasMore: false });

    render(<DoctorAppointments />);

    expect(screen.getByText("No appointments for this date")).toBeInTheDocument();
  });

  it("calls markCompleted mutation on Complete button click", async () => {
    vi.mocked(useQuery).mockReturnValue(mockAppointmentsResult);

    render(<DoctorAppointments />);

    // Find the Complete button (only for scheduled appointments)
    const completeButton = screen.getByRole("button", { name: /complete/i });
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(mockMarkCompleted).toHaveBeenCalledWith({
        appointmentId: "apt_1",
      });
    });
  });

  it("disables button and shows loading text during mutation", async () => {
    vi.mocked(useQuery).mockReturnValue(mockAppointmentsResult);

    // Make mutation never resolve to keep loading state
    const slowMutation = vi.fn(() => new Promise(() => {}));
    vi.mocked(useMutation).mockReturnValue(slowMutation);

    render(<DoctorAppointments />);

    const completeButton = screen.getByRole("button", { name: /complete/i });
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /completing/i })).toBeDisabled();
    });
  });
});
