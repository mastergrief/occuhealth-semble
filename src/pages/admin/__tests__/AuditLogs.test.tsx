import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useQuery } from "convex/react";
import { AuditLogs } from "../AuditLogs";
import { Id } from "../../../../convex/_generated/dataModel";

// Mock audit log data with various actions
const mockAuditLogs = [
  {
    _id: "log_1" as Id<"auditLogs">,
    _creationTime: Date.now(),
    action: "patient_created",
    actorType: "employer" as const,
    actorId: "employer_1",
    resourceType: "patient",
    resourceId: "patient_1",
    timestamp: Date.now() - 3600000, // 1 hour ago
    details: {},
  },
  {
    _id: "log_2" as Id<"auditLogs">,
    _creationTime: Date.now(),
    action: "appointment_booked",
    actorType: "doctor" as const,
    actorId: "doctor_1",
    resourceType: "appointment",
    resourceId: "apt_1",
    timestamp: Date.now() - 7200000, // 2 hours ago
    details: {},
  },
  {
    _id: "log_3" as Id<"auditLogs">,
    _creationTime: Date.now(),
    action: "consent_created",
    actorType: "system" as const,
    actorId: "system",
    resourceType: "consent",
    resourceId: "consent_1",
    timestamp: Date.now() - 86400000, // 1 day ago
    details: {},
  },
  {
    _id: "log_4" as Id<"auditLogs">,
    _creationTime: Date.now(),
    action: "employer_verified",
    actorType: "admin" as const,
    actorId: "admin_1",
    resourceType: "employer",
    resourceId: "employer_1",
    timestamp: Date.now() - 172800000, // 2 days ago
    details: {},
  },
];

describe("AuditLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 'Audit Logs' page title", () => {
    vi.mocked(useQuery).mockReturnValue([]);

    render(<AuditLogs />);

    expect(screen.getByRole("heading", { name: "Audit Logs" })).toBeInTheDocument();
  });

  it("displays audit log entries in a list format", () => {
    vi.mocked(useQuery).mockReturnValue(mockAuditLogs);

    render(<AuditLogs />);

    // Check that results count is shown
    expect(screen.getByText("Results (4)")).toBeInTheDocument();

    // Check that each log entry is displayed
    expect(screen.getByText("patient_created")).toBeInTheDocument();
    expect(screen.getByText("appointment_booked")).toBeInTheDocument();
    expect(screen.getByText("consent_created")).toBeInTheDocument();
    expect(screen.getByText("employer_verified")).toBeInTheDocument();
  });

  it("shows action, actor type, resource type, timestamp for each log", () => {
    vi.mocked(useQuery).mockReturnValue(mockAuditLogs);

    render(<AuditLogs />);

    // Check action is displayed
    expect(screen.getByText("patient_created")).toBeInTheDocument();

    // Check actor type and resource type are displayed in combined format
    // The component displays: "{actorType} -> {resourceType}"
    expect(screen.getByText(/employer → patient/)).toBeInTheDocument();
    expect(screen.getByText(/doctor → appointment/)).toBeInTheDocument();
    expect(screen.getByText(/system → consent/)).toBeInTheDocument();
    expect(screen.getByText(/admin → employer/)).toBeInTheDocument();

    // Check that timestamps are displayed (formatted as locale strings)
    // We can't check exact format due to locale differences, but we can verify elements exist
    const logEntries = screen.getAllByText(/\//); // Date separators
    expect(logEntries.length).toBeGreaterThan(0);
  });

  it("shows empty state when no logs exist", () => {
    vi.mocked(useQuery).mockReturnValue([]);

    render(<AuditLogs />);

    expect(screen.getByText("No audit logs")).toBeInTheDocument();
    expect(screen.getByText("Results (0)")).toBeInTheDocument();
  });

  it("shows loading state when data is undefined", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);

    render(<AuditLogs />);

    // When loading, results count shows 0
    expect(screen.getByText("Results (0)")).toBeInTheDocument();
    expect(screen.getByText("No audit logs")).toBeInTheDocument();
  });

  it("renders filter section with all filter options", () => {
    vi.mocked(useQuery).mockReturnValue([]);

    render(<AuditLogs />);

    // Check filter labels exist
    expect(screen.getByText("Filters")).toBeInTheDocument();
    expect(screen.getByText("Action")).toBeInTheDocument();
    expect(screen.getByText("Actor Type")).toBeInTheDocument();
    expect(screen.getByText("Resource Type")).toBeInTheDocument();
    expect(screen.getByText("Start Date")).toBeInTheDocument();
    expect(screen.getByText("End Date")).toBeInTheDocument();
  });

  it("renders filter dropdowns with placeholder text", () => {
    vi.mocked(useQuery).mockReturnValue([]);

    render(<AuditLogs />);

    // Check placeholder text in select triggers
    expect(screen.getByText("All actions")).toBeInTheDocument();
    expect(screen.getByText("All actors")).toBeInTheDocument();
    expect(screen.getByText("All resources")).toBeInTheDocument();
  });

  it("displays Clear button when filters are active", () => {
    vi.mocked(useQuery).mockReturnValue([]);

    render(<AuditLogs />);

    // Initially, Clear button should not be visible
    expect(screen.queryByText("Clear")).not.toBeInTheDocument();

    // Find date inputs by their type and simulate setting a filter
    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBe(2); // Start Date and End Date

    const startDateInput = dateInputs[0] as HTMLInputElement;
    fireEvent.change(startDateInput, { target: { value: "2026-01-01" } });

    // After setting a filter, Clear button should appear
    expect(screen.getByText("Clear")).toBeInTheDocument();
  });

  it("passes correct filter parameters to useQuery", () => {
    vi.mocked(useQuery).mockReturnValue([]);

    render(<AuditLogs />);

    // Verify useQuery was called with expected default parameters
    expect(useQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        limit: 100,
        action: undefined,
        actorType: undefined,
        resourceType: undefined,
        startTime: undefined,
        endTime: undefined,
      })
    );
  });

  it("displays resource ID when present in log entry", () => {
    const logsWithResourceId = [
      {
        _id: "log_1" as Id<"auditLogs">,
        _creationTime: Date.now(),
        action: "patient_created",
        actorType: "employer" as const,
        actorId: "employer_1",
        resourceType: "patient",
        resourceId: "patient_123",
        timestamp: Date.now(),
        details: {},
      },
    ];

    vi.mocked(useQuery).mockReturnValue(logsWithResourceId);

    render(<AuditLogs />);

    // Check that resource ID is displayed in parentheses
    expect(screen.getByText(/\(patient_123\)/)).toBeInTheDocument();
  });
});
