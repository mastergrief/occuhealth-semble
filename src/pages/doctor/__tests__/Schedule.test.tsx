import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useQuery, useMutation } from "convex/react";
import { DoctorSchedule } from "../Schedule";
import { Id } from "../../../../convex/_generated/dataModel";
import { createMockMutation } from "../../../../tests/mocks/convex";

// Mock slot data
const mockSlots = [
  {
    _id: "slot_1" as Id<"availableSlots">,
    _creationTime: Date.now(),
    doctorId: "doctor_123" as Id<"doctorSettings">,
    date: "2026-01-05",
    startTime: "09:00",
    endTime: "09:30",
    status: "available" as const,
  },
  {
    _id: "slot_2" as Id<"availableSlots">,
    _creationTime: Date.now(),
    doctorId: "doctor_123" as Id<"doctorSettings">,
    date: "2026-01-05",
    startTime: "10:00",
    endTime: "10:30",
    status: "booked" as const,
  },
  {
    _id: "slot_3" as Id<"availableSlots">,
    _creationTime: Date.now(),
    doctorId: "doctor_123" as Id<"doctorSettings">,
    date: "2026-01-05",
    startTime: "11:00",
    endTime: "11:30",
    status: "blocked" as const,
  },
];

describe("DoctorSchedule", () => {
  let mockCreateSlots: ReturnType<typeof createMockMutation>;
  let mockBlockSlot: ReturnType<typeof createMockMutation>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateSlots = createMockMutation();
    mockBlockSlot = createMockMutation();

    // Return different mutations based on call order
    vi.mocked(useMutation)
      .mockReturnValueOnce(mockCreateSlots)
      .mockReturnValueOnce(mockBlockSlot);
  });

  it("renders slot grid with available slots", () => {
    vi.mocked(useQuery).mockReturnValue(mockSlots);

    render(<DoctorSchedule />);

    // Check heading
    expect(screen.getByText("Manage Schedule")).toBeInTheDocument();

    // Check slot times are displayed
    expect(screen.getByText("09:00 - 09:30")).toBeInTheDocument();
    expect(screen.getByText("10:00 - 10:30")).toBeInTheDocument();
    expect(screen.getByText("11:00 - 11:30")).toBeInTheDocument();

    // Check status labels
    expect(screen.getByText("available")).toBeInTheDocument();
    expect(screen.getByText("booked")).toBeInTheDocument();
    expect(screen.getByText("blocked")).toBeInTheDocument();
  });

  it("renders add slot form with date and time inputs", () => {
    vi.mocked(useQuery).mockReturnValue([]);

    render(<DoctorSchedule />);

    expect(screen.getByText("Add Time Slot")).toBeInTheDocument();
    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("Start")).toBeInTheDocument();
    expect(screen.getByText("End")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add slot/i })).toBeInTheDocument();
  });

  it("shows validation error when end time is not after start time", async () => {
    vi.mocked(useQuery).mockReturnValue([]);

    render(<DoctorSchedule />);

    // Get the time inputs
    const timeInputs = document.querySelectorAll('input[type="time"]');
    const startTimeInput = timeInputs[0] as HTMLInputElement;
    const endTimeInput = timeInputs[1] as HTMLInputElement;

    // Set invalid times (end time same as start time)
    fireEvent.change(startTimeInput, { target: { value: "10:00" } });
    fireEvent.change(endTimeInput, { target: { value: "10:00" } });

    // Click add button
    const addButton = screen.getByRole("button", { name: /add slot/i });
    fireEvent.click(addButton);

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText("End time must be after start time")).toBeInTheDocument();
    });

    // Mutation should NOT have been called
    expect(mockCreateSlots).not.toHaveBeenCalled();
  });

  it("calls createSlots mutation on valid form submit", async () => {
    vi.mocked(useQuery).mockReturnValue([]);

    render(<DoctorSchedule />);

    // The default values are already valid (09:00 to 09:30)
    // Just click the add button with defaults
    const addButton = screen.getByRole("button", { name: /add slot/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockCreateSlots).toHaveBeenCalledWith({
        slots: [expect.objectContaining({
          startTime: "09:00",
          endTime: "09:30",
        })],
      });
    });
  });

  it("calls blockSlot mutation on Block button click", async () => {
    vi.mocked(useQuery).mockReturnValue(mockSlots);

    render(<DoctorSchedule />);

    // Find the Block button (only for available slots)
    const blockButton = screen.getByRole("button", { name: /block/i });
    fireEvent.click(blockButton);

    await waitFor(() => {
      expect(mockBlockSlot).toHaveBeenCalledWith({
        slotId: "slot_1",
      });
    });
  });
});
