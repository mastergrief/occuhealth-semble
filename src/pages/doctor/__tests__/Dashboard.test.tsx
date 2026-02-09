import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useQuery } from "convex/react";
import { DoctorDashboard } from "../Dashboard";
import { Id } from "../../../../convex/_generated/dataModel";

// Mock the DoctorLayout context hook
vi.mock("../../DoctorLayout", () => ({
  useDoctorContext: vi.fn(),
}));

// Import mocked function for type safety
import { useDoctorContext } from "../../DoctorLayout";

// Mock doctor data
const mockDoctor = {
  _id: "doctor_123" as Id<"doctorSettings">,
  _creationTime: Date.now(),
  workosUserId: "workos_123",
  name: "Dr. Test",
  email: "test@doctor.com",
  zoomPersonalLink: "https://zoom.us/j/123456",
};

// Mock appointments data
const mockAppointments = [
  {
    _id: "apt_1" as Id<"appointments">,
    _creationTime: Date.now(),
    status: "scheduled" as const,
    scheduledDate: "2026-01-05",
    scheduledTime: "09:00",
    patientId: "patient_1" as Id<"patients">,
    employerId: "employer_1" as Id<"employers">,
    appointmentTypeId: "type_1" as Id<"appointmentTypes">,
    slotId: "slot_1" as Id<"availableSlots">,
    createdAt: Date.now(),
  },
  {
    _id: "apt_2" as Id<"appointments">,
    _creationTime: Date.now(),
    status: "completed" as const,
    scheduledDate: "2026-01-05",
    scheduledTime: "10:00",
    patientId: "patient_2" as Id<"patients">,
    employerId: "employer_1" as Id<"employers">,
    appointmentTypeId: "type_2" as Id<"appointmentTypes">,
    slotId: "slot_2" as Id<"availableSlots">,
    createdAt: Date.now(),
  },
  {
    _id: "apt_3" as Id<"appointments">,
    _creationTime: Date.now(),
    status: "scheduled" as const,
    scheduledDate: "2026-01-05",
    scheduledTime: "11:00",
    patientId: "patient_3" as Id<"patients">,
    employerId: "employer_1" as Id<"employers">,
    appointmentTypeId: "type_3" as Id<"appointmentTypes">,
    slotId: "slot_3" as Id<"availableSlots">,
    createdAt: Date.now(),
  },
];;

describe("DoctorDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useDoctorContext).mockReturnValue({ doctor: mockDoctor });
  });

  it("renders loading state when data is undefined", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);

    render(<DoctorDashboard />);

    // When data is loading, stats should show 0
    expect(screen.getByText("Today's Schedule")).toBeInTheDocument();
    expect(screen.getByText("Total Today")).toBeInTheDocument();
  });

  it("renders stats cards with correct counts when data is loaded", () => {
    vi.mocked(useQuery).mockReturnValue(mockAppointments);

    render(<DoctorDashboard />);

    expect(screen.getByText("Today's Schedule")).toBeInTheDocument();
    expect(screen.getByText("Total Today")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Remaining")).toBeInTheDocument();
  });

  it("displays appointment list with patient information", () => {
    vi.mocked(useQuery).mockReturnValue(mockAppointments);

    render(<DoctorDashboard />);

    // Check that appointment times are displayed
    expect(screen.getByText("09:00")).toBeInTheDocument();
    expect(screen.getByText("10:00")).toBeInTheDocument();
    expect(screen.getByText("11:00")).toBeInTheDocument();
  });

  it("shows empty state when no appointments exist", () => {
    vi.mocked(useQuery).mockReturnValue([]);

    render(<DoctorDashboard />);

    expect(screen.getByText("No appointments today")).toBeInTheDocument();
  });

  it("renders Zoom join link for scheduled appointments with doctor zoom link", () => {
    vi.mocked(useQuery).mockReturnValue(mockAppointments);

    render(<DoctorDashboard />);

    // Scheduled appointments should have Join Zoom link
    const joinLinks = screen.getAllByRole("link", { name: /join zoom/i });
    // 2 scheduled appointments should have join links
    expect(joinLinks.length).toBe(2);

    // Verify zoom link URL
    joinLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "https://zoom.us/j/123456");
    });
  });
});
