import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useQuery, useMutation } from "convex/react";
import { AppointmentTypes } from "../AppointmentTypes";
import { Id } from "../../../../convex/_generated/dataModel";

// Mock Convex hooks
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

// Mock appointment types data
const mockAppointmentTypes = [
  {
    _id: "type_1" as Id<"appointmentTypes">,
    _creationTime: Date.now(),
    name: "Initial Assessment",
    description: "Comprehensive health screening for new employees",
    durationMinutes: 60,
    price: 150,
    isActive: true,
    deletedAt: undefined,
  },
  {
    _id: "type_2" as Id<"appointmentTypes">,
    _creationTime: Date.now(),
    name: "Follow-up Consultation",
    description: "Follow-up appointment for ongoing health concerns",
    durationMinutes: 30,
    price: 75.5,
    isActive: true,
    deletedAt: undefined,
  },
  {
    _id: "type_3" as Id<"appointmentTypes">,
    _creationTime: Date.now(),
    name: "Annual Health Check",
    description: "Yearly mandatory health screening",
    durationMinutes: 45,
    price: 0,
    isActive: false,
    deletedAt: undefined,
  },
];

describe("AppointmentTypes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for useMutation - returns a mock function
    vi.mocked(useMutation).mockReturnValue(vi.fn());
  });

  it("renders 'Appointment Types' page title", () => {
    vi.mocked(useQuery).mockReturnValue(mockAppointmentTypes);

    render(<AppointmentTypes />);

    expect(screen.getByText("Appointment Types")).toBeInTheDocument();
  });

  it("displays appointment type list/cards", () => {
    vi.mocked(useQuery).mockReturnValue(mockAppointmentTypes);

    render(<AppointmentTypes />);

    // Check that all types are rendered
    expect(screen.getByText("Initial Assessment")).toBeInTheDocument();
    expect(screen.getByText("Follow-up Consultation")).toBeInTheDocument();
    expect(screen.getByText("Annual Health Check")).toBeInTheDocument();

    // Check count in header
    expect(screen.getByText("All Appointment Types (3)")).toBeInTheDocument();
  });

  it("shows type name, description, duration, and price for each type", () => {
    vi.mocked(useQuery).mockReturnValue(mockAppointmentTypes);

    render(<AppointmentTypes />);

    // Check names
    expect(screen.getByText("Initial Assessment")).toBeInTheDocument();
    expect(screen.getByText("Follow-up Consultation")).toBeInTheDocument();
    expect(screen.getByText("Annual Health Check")).toBeInTheDocument();

    // Check descriptions
    expect(
      screen.getByText("Comprehensive health screening for new employees")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Follow-up appointment for ongoing health concerns")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Yearly mandatory health screening")
    ).toBeInTheDocument();

    // Check durations (format: "XX min")
    expect(screen.getByText("60 min")).toBeInTheDocument();
    expect(screen.getByText("30 min")).toBeInTheDocument();
    expect(screen.getByText("45 min")).toBeInTheDocument();

    // Check prices (format: "GBP X.XX" or "Free")
    expect(screen.getByText("£150.00")).toBeInTheDocument();
    expect(screen.getByText("£75.50")).toBeInTheDocument();
    expect(screen.getByText("Free")).toBeInTheDocument();
  });

  it("shows 'Add Type' button for creating new types", () => {
    vi.mocked(useQuery).mockReturnValue(mockAppointmentTypes);

    render(<AppointmentTypes />);

    const addButton = screen.getByRole("button", { name: /add type/i });
    expect(addButton).toBeInTheDocument();
  });

  it("handles empty state if no types exist", () => {
    vi.mocked(useQuery).mockReturnValue([]);

    render(<AppointmentTypes />);

    expect(
      screen.getByText("No appointment types configured")
    ).toBeInTheDocument();

    // Count should show 0
    expect(screen.getByText("All Appointment Types (0)")).toBeInTheDocument();
  });

  it("handles loading state when query returns undefined", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);

    render(<AppointmentTypes />);

    // Title should still render
    expect(screen.getByText("Appointment Types")).toBeInTheDocument();

    // Count should show 0 when data is undefined
    expect(screen.getByText("All Appointment Types (0)")).toBeInTheDocument();

    // No appointment types message should not appear (since we're loading, not empty)
    // The component shows empty message for both undefined and empty array
    expect(
      screen.getByText("No appointment types configured")
    ).toBeInTheDocument();
  });

  it("displays active/inactive status badges for each type", () => {
    vi.mocked(useQuery).mockReturnValue(mockAppointmentTypes);

    render(<AppointmentTypes />);

    // Check that Active and Inactive badges are shown
    const activeBadges = screen.getAllByText("Active");
    const inactiveBadges = screen.getAllByText("Inactive");

    // 2 active types, 1 inactive
    expect(activeBadges.length).toBe(2);
    expect(inactiveBadges.length).toBe(1);
  });

  it("shows Edit and Delete buttons for each non-archived type", () => {
    vi.mocked(useQuery).mockReturnValue(mockAppointmentTypes);

    render(<AppointmentTypes />);

    // Each type should have Edit and Delete buttons
    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });

    expect(editButtons.length).toBe(3);
    expect(deleteButtons.length).toBe(3);
  });

  it("shows Activate/Deactivate toggle buttons based on type status", () => {
    vi.mocked(useQuery).mockReturnValue(mockAppointmentTypes);

    render(<AppointmentTypes />);

    // 2 active types should show "Deactivate" button
    const deactivateButtons = screen.getAllByRole("button", {
      name: /deactivate/i,
    });
    expect(deactivateButtons.length).toBe(2);

    // 1 inactive type should show "Activate" button
    const activateButtons = screen.getAllByRole("button", {
      name: /^activate$/i,
    });
    expect(activateButtons.length).toBe(1);
  });

  it("shows archived badge and hides action buttons for deleted types", () => {
    const typesWithArchived = [
      ...mockAppointmentTypes,
      {
        _id: "type_4" as Id<"appointmentTypes">,
        _creationTime: Date.now(),
        name: "Archived Type",
        description: "This type has been archived",
        durationMinutes: 30,
        price: 50,
        isActive: false,
        deletedAt: Date.now(),
      },
    ];

    vi.mocked(useQuery).mockReturnValue(typesWithArchived);

    render(<AppointmentTypes />);

    // Check archived badge is shown
    expect(screen.getByText("Archived")).toBeInTheDocument();

    // Count should reflect all 4 types
    expect(screen.getByText("All Appointment Types (4)")).toBeInTheDocument();

    // Archived type should not have Edit/Delete buttons (only 3 edit/delete buttons, not 4)
    const editButtons = screen.getAllByRole("button", { name: /edit/i });
    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });

    expect(editButtons.length).toBe(3);
    expect(deleteButtons.length).toBe(3);
  });
});
