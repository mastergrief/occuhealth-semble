import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useQuery } from "convex/react";
import { GDPRDashboard } from "../GDPRDashboard";
import { Id } from "../../../../convex/_generated/dataModel";

// Mock GDPR stats data
const mockGDPRStats = {
  totalPatients: 100,
  activeConsents: 250,
  patientsWithAllConsents: 75,
  pendingErasureCount: 3,
  erasureApproachingDeadline: 1,
  erasureOverdue: 0,
  recentAuditLogs: [
    {
      _id: "log_1" as Id<"gdprAuditLogs">,
      _creationTime: Date.now(),
      action: "consent_granted",
      resourceType: "consent",
      resourceId: "consent_1" as Id<"gdprConsents">,
      actorType: "patient" as const,
      actorId: "patient_1",
      timestamp: Date.now(),
    },
    {
      _id: "log_2" as Id<"gdprAuditLogs">,
      _creationTime: Date.now() - 1000,
      action: "data_access",
      resourceType: "patient",
      resourceId: "patient_2" as Id<"patients">,
      actorType: "employer" as const,
      actorId: "employer_1",
      timestamp: Date.now() - 1000,
    },
  ],
  auditLogsByAction: [
    { action: "consent_granted", count: 15 },
    { action: "data_access", count: 8 },
    { action: "report_created", count: 5 },
  ],
};

describe("GDPRDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders GDPR Compliance Dashboard title", () => {
    vi.mocked(useQuery).mockReturnValue(mockGDPRStats);

    render(<GDPRDashboard />);

    expect(screen.getByText("GDPR Compliance Dashboard")).toBeInTheDocument();
  });

  it("displays 4 stats cards with correct labels", () => {
    vi.mocked(useQuery).mockReturnValue(mockGDPRStats);

    render(<GDPRDashboard />);

    expect(screen.getByText("Total Patients")).toBeInTheDocument();
    expect(screen.getByText("Active Consents")).toBeInTheDocument();
    expect(screen.getByText("Pending Erasures")).toBeInTheDocument();
    expect(screen.getByText("Recent Activity")).toBeInTheDocument();
  });

  it("displays stats cards with correct values", () => {
    vi.mocked(useQuery).mockReturnValue(mockGDPRStats);

    render(<GDPRDashboard />);

    // Total Patients: 100
    expect(screen.getByText("100")).toBeInTheDocument();
    // Active Consents: 250
    expect(screen.getByText("250")).toBeInTheDocument();
    // Pending Erasures: 3 (appears twice - in stats card and SLA tracking)
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1);
    // Recent Activity: 2 (length of recentAuditLogs)
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("calculates and displays consent coverage percentage correctly", () => {
    vi.mocked(useQuery).mockReturnValue(mockGDPRStats);

    render(<GDPRDashboard />);

    // Consent Coverage section
    expect(screen.getByText("Consent Coverage")).toBeInTheDocument();

    // 75 / 100 = 75% - text contains line break, use regex
    expect(screen.getByText(/75% of patients have granted all three consent types/)).toBeInTheDocument();
    expect(screen.getByText("75 / 100")).toBeInTheDocument();
  });

  it("shows 0% consent coverage when no patients exist", () => {
    const emptyStats = {
      ...mockGDPRStats,
      totalPatients: 0,
      patientsWithAllConsents: 0,
    };
    vi.mocked(useQuery).mockReturnValue(emptyStats);

    render(<GDPRDashboard />);

    // Text contains line break, use regex
    expect(
      screen.getByText(/0% of patients have granted all three consent types/)
    ).toBeInTheDocument();
    expect(screen.getByText("0 / 0")).toBeInTheDocument();
  });

  it("displays recent audit activity section with logs", () => {
    vi.mocked(useQuery).mockReturnValue(mockGDPRStats);

    render(<GDPRDashboard />);

    expect(
      screen.getByText("Audit Log Activity (Last 7 Days)")
    ).toBeInTheDocument();

    // Check audit log actions are displayed with their counts
    // consent_granted appears multiple times (in activity list and recent logs)
    expect(screen.getAllByText("consent_granted").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getAllByText("data_access").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("report_created")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("handles empty audit logs gracefully", () => {
    const statsWithNoActivity = {
      ...mockGDPRStats,
      recentAuditLogs: [],
      auditLogsByAction: [],
    };
    vi.mocked(useQuery).mockReturnValue(statsWithNoActivity);

    render(<GDPRDashboard />);

    expect(
      screen.getByText("No audit activity in the last 7 days")
    ).toBeInTheDocument();
    expect(screen.getByText("No recent activity")).toBeInTheDocument();
  });

  it("displays Recent Audit Logs section with log entries", () => {
    vi.mocked(useQuery).mockReturnValue(mockGDPRStats);

    render(<GDPRDashboard />);

    expect(screen.getByText("Recent Audit Logs")).toBeInTheDocument();

    // Check log entries show action and resourceType
    // Note: consent_granted appears in both auditLogsByAction and recentAuditLogs
    const consentGrantedElements = screen.getAllByText("consent_granted");
    expect(consentGrantedElements.length).toBeGreaterThanOrEqual(1);

    // Check resourceType is shown
    expect(screen.getByText(/- consent/)).toBeInTheDocument();
    expect(screen.getByText(/- patient/)).toBeInTheDocument();
  });

  it("renders links to sub-pages", () => {
    vi.mocked(useQuery).mockReturnValue(mockGDPRStats);

    render(<GDPRDashboard />);

    // Quick Actions section with links
    expect(screen.getByText("Quick Actions")).toBeInTheDocument();

    // Check links exist
    const erasureLink = screen.getByRole("link", {
      name: /Process Erasure Requests/,
    });
    expect(erasureLink).toHaveAttribute("href", "/admin/gdpr/erasure");

    const auditLink = screen.getByRole("link", { name: /View Audit Logs/ });
    expect(auditLink).toHaveAttribute("href", "/admin/gdpr/audit");

    const employerLink = screen.getByRole("link", {
      name: /Employer Verification/,
    });
    expect(employerLink).toHaveAttribute("href", "/admin/employers");
  });

  it("displays erasure SLA tracking section", () => {
    vi.mocked(useQuery).mockReturnValue(mockGDPRStats);

    render(<GDPRDashboard />);

    expect(
      screen.getByText("Erasure Request SLA Tracking")
    ).toBeInTheDocument();
    expect(screen.getByText("Pending Requests")).toBeInTheDocument();
    expect(screen.getByText("Approaching Deadline")).toBeInTheDocument();
    expect(screen.getByText("Overdue")).toBeInTheDocument();
  });

  it("shows warning badge when erasures are approaching deadline", () => {
    const statsWithApproaching = {
      ...mockGDPRStats,
      erasureApproachingDeadline: 2,
    };
    vi.mocked(useQuery).mockReturnValue(statsWithApproaching);

    render(<GDPRDashboard />);

    expect(screen.getByText("Warning")).toBeInTheDocument();
    // Value "2" appears multiple times (recentAuditLogs.length, approachingDeadline)
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
  });

  it("shows critical badge when erasures are overdue", () => {
    const statsWithOverdue = {
      ...mockGDPRStats,
      erasureOverdue: 1,
    };
    vi.mocked(useQuery).mockReturnValue(statsWithOverdue);

    render(<GDPRDashboard />);

    expect(screen.getByText("Critical")).toBeInTheDocument();
    expect(screen.getByText("1 overdue")).toBeInTheDocument();
  });

  it("handles loading state when query returns undefined", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);

    render(<GDPRDashboard />);

    // Dashboard should still render with 0 values during loading
    expect(screen.getByText("GDPR Compliance Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Total Patients")).toBeInTheDocument();
    expect(screen.getByText("Active Consents")).toBeInTheDocument();
    expect(screen.getByText("Pending Erasures")).toBeInTheDocument();
    expect(screen.getByText("Recent Activity")).toBeInTheDocument();

    // Stats should show 0 during loading
    const zeroValues = screen.getAllByText("0");
    expect(zeroValues.length).toBeGreaterThanOrEqual(4);
  });
});
