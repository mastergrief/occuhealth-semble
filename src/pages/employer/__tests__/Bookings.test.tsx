import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useQuery } from "convex/react";
import { BookingsPage } from "../Bookings";
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
  workosUserId: "workos_emp_123",
  companyName: "Test Healthcare Inc",
  contactEmail: "hr@testhealthcare.com",
  status: "verified" as const,
};

const mockUnverifiedEmployer = {
  ...mockEmployer,
  status: "pending" as const,
};

// Mock appointments data with patient info
const mockAppointments = {
  items: [
    {
      _id: "apt_1" as Id<"appointments">,
      _creationTime: Date.now(),
      status: "scheduled" as const,
      scheduledDate: "2026-01-10",
      scheduledTime: "09:00",
      patientId: "patient_1" as Id<"patients">,
      employerId: "employer_123" as Id<"employers">,
      doctorId: "doctor_1" as Id<"doctorSettings">,
      appointmentType: "initial_assessment",
      patient: {
        firstName: "John",
        lastName: "Doe",
      },
    },
    {
      _id: "apt_2" as Id<"appointments">,
      _creationTime: Date.now(),
      status: "completed" as const,
      scheduledDate: "2026-01-08",
      scheduledTime: "14:30",
      patientId: "patient_2" as Id<"patients">,
      employerId: "employer_123" as Id<"employers">,
      doctorId: "doctor_1" as Id<"doctorSettings">,
      appointmentType: "follow_up",
      patient: {
        firstName: "Jane",
        lastName: "Smith",
      },
    },
    {
      _id: "apt_3" as Id<"appointments">,
      _creationTime: Date.now(),
      status: "cancelled" as const,
      scheduledDate: "2026-01-05",
      scheduledTime: "11:00",
      patientId: "patient_3" as Id<"patients">,
      employerId: "employer_123" as Id<"employers">,
      doctorId: "doctor_1" as Id<"doctorSettings">,
      appointmentType: "routine_checkup",
      patient: {
        firstName: "Bob",
        lastName: "Wilson",
      },
    },
  ],
};

describe("BookingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 'Bookings' page title", () => {
    vi.mocked(useEmployerContext).mockReturnValue({
      employer: mockEmployer,
      isVerified: true,
    });
    vi.mocked(useQuery).mockReturnValue(undefined);

    render(<BookingsPage />);

    expect(screen.getByText("Bookings")).toBeInTheDocument();
  });

  it("shows 'New Booking' button enabled when verified", () => {
    vi.mocked(useEmployerContext).mockReturnValue({
      employer: mockEmployer,
      isVerified: true,
    });
    vi.mocked(useQuery).mockReturnValue(undefined);

    render(<BookingsPage />);

    const newBookingButton = screen.getByRole("button", { name: /new booking/i });
    expect(newBookingButton).toBeInTheDocument();
    expect(newBookingButton).not.toBeDisabled();
  });

  it("disables booking button when employer not verified (isVerified: false)", () => {
    vi.mocked(useEmployerContext).mockReturnValue({
      employer: mockUnverifiedEmployer,
      isVerified: false,
    });
    vi.mocked(useQuery).mockReturnValue(undefined);

    render(<BookingsPage />);

    const newBookingButton = screen.getByRole("button", { name: /new booking/i });
    expect(newBookingButton).toBeDisabled();
  });

  it("shows pending verification warning banner when not verified", () => {
    vi.mocked(useEmployerContext).mockReturnValue({
      employer: mockUnverifiedEmployer,
      isVerified: false,
    });
    vi.mocked(useQuery).mockReturnValue(undefined);

    render(<BookingsPage />);

    expect(
      screen.getByText("Booking is disabled until your account is verified.")
    ).toBeInTheDocument();
  });

  it("displays booking list with appointment cards", () => {
    vi.mocked(useEmployerContext).mockReturnValue({
      employer: mockEmployer,
      isVerified: true,
    });
    vi.mocked(useQuery).mockReturnValue(mockAppointments);

    render(<BookingsPage />);

    // Check patient names are displayed
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Wilson")).toBeInTheDocument();

    // Check date/time info is displayed
    expect(screen.getByText("2026-01-10 at 09:00")).toBeInTheDocument();
    expect(screen.getByText("2026-01-08 at 14:30")).toBeInTheDocument();
    expect(screen.getByText("2026-01-05 at 11:00")).toBeInTheDocument();

    // Check status badges are displayed
    expect(screen.getByText("scheduled")).toBeInTheDocument();
    expect(screen.getByText("completed")).toBeInTheDocument();
    expect(screen.getByText("cancelled")).toBeInTheDocument();
  });

  it("shows empty state when no bookings", () => {
    vi.mocked(useEmployerContext).mockReturnValue({
      employer: mockEmployer,
      isVerified: true,
    });
    vi.mocked(useQuery).mockReturnValue({ items: [] });

    render(<BookingsPage />);

    expect(screen.getByText("No bookings yet")).toBeInTheDocument();
  });
});
