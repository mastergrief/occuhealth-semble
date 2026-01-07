import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useQuery } from "convex/react";
import { ReportsPage } from "../Reports";
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
  workosUserId: "workos_456",
  companyName: "Test Corp",
  contactEmail: "test@testcorp.com",
  status: "verified" as const,
};

// Mock reports data
const mockReports = [
  {
    _id: "report_1" as Id<"reports">,
    _creationTime: Date.now(),
    fitForWork: "fit" as const,
    summary: "Patient is fit for all duties",
    signedAt: new Date("2026-01-05T10:00:00").getTime(),
    patient: { firstName: "John", lastName: "Doe" },
  },
  {
    _id: "report_2" as Id<"reports">,
    _creationTime: Date.now(),
    fitForWork: "fit_with_restrictions" as const,
    summary: "Avoid heavy lifting for 2 weeks",
    signedAt: new Date("2026-01-04T14:00:00").getTime(),
    patient: { firstName: "Jane", lastName: "Smith" },
  },
  {
    _id: "report_3" as Id<"reports">,
    _creationTime: Date.now(),
    fitForWork: "temporarily_unfit" as const,
    summary: "Rest required for 1 week",
    signedAt: new Date("2026-01-03T09:00:00").getTime(),
    patient: { firstName: "Bob", lastName: "Wilson" },
  },
  {
    _id: "report_4" as Id<"reports">,
    _creationTime: Date.now(),
    fitForWork: "needs_further_assessment" as const,
    summary: "Specialist consultation required",
    signedAt: new Date("2026-01-02T16:00:00").getTime(),
    patient: { firstName: "Alice", lastName: "Brown" },
  },
];

describe("ReportsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useEmployerContext).mockReturnValue({
      employer: mockEmployer,
      isVerified: true,
    });
  });

  it("renders 'Reports' page title", () => {
    vi.mocked(useQuery).mockReturnValue({ items: [], page: [] });

    render(<ReportsPage />);

    expect(screen.getByRole("heading", { name: "Reports" })).toBeInTheDocument();
  });

  it("displays reports list when data exists", () => {
    vi.mocked(useQuery).mockReturnValue({ items: mockReports, page: mockReports });

    render(<ReportsPage />);

    // Check that Medical Reports card title is shown
    expect(screen.getByText("Medical Reports")).toBeInTheDocument();

    // Check patient names are displayed
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Bob Wilson")).toBeInTheDocument();
    expect(screen.getByText("Alice Brown")).toBeInTheDocument();

    // Check summaries are displayed
    expect(screen.getByText("Patient is fit for all duties")).toBeInTheDocument();
    expect(screen.getByText("Avoid heavy lifting for 2 weeks")).toBeInTheDocument();
  });

  it("shows empty state 'No reports available' when no reports", () => {
    vi.mocked(useQuery).mockReturnValue({ items: [], page: [] });

    render(<ReportsPage />);

    expect(screen.getByText("No reports available")).toBeInTheDocument();
  });

  it("formats report dates correctly", () => {
    const singleReport = [
      {
        _id: "report_1" as Id<"reports">,
        _creationTime: Date.now(),
        fitForWork: "fit" as const,
        summary: "Test summary",
        signedAt: new Date("2026-01-15T10:00:00").getTime(),
        patient: { firstName: "Test", lastName: "User" },
      },
    ];
    vi.mocked(useQuery).mockReturnValue({ items: singleReport, page: singleReport });

    render(<ReportsPage />);

    // Date should be formatted via toLocaleDateString()
    // The exact format depends on locale, but we check it's rendered
    const dateElement = screen.getByText(/1\/15\/2026|15\/01\/2026|2026-01-15/);
    expect(dateElement).toBeInTheDocument();
  });

  it("shows fitness assessment status badges with correct colors", () => {
    vi.mocked(useQuery).mockReturnValue({ items: mockReports, page: mockReports });

    render(<ReportsPage />);

    // Check all status badge texts are displayed (underscores replaced with spaces)
    expect(screen.getByText("fit")).toBeInTheDocument();
    expect(screen.getByText("fit with restrictions")).toBeInTheDocument();
    expect(screen.getByText("temporarily unfit")).toBeInTheDocument();
    expect(screen.getByText("needs further assessment")).toBeInTheDocument();

    // Check badge colors via class names
    const fitBadge = screen.getByText("fit");
    expect(fitBadge).toHaveClass("bg-green-100", "text-green-800");

    const fitWithRestrictionsBadge = screen.getByText("fit with restrictions");
    expect(fitWithRestrictionsBadge).toHaveClass("bg-amber-100", "text-amber-800");

    const temporarilyUnfitBadge = screen.getByText("temporarily unfit");
    expect(temporarilyUnfitBadge).toHaveClass("bg-red-100", "text-red-800");

    const needsAssessmentBadge = screen.getByText("needs further assessment");
    expect(needsAssessmentBadge).toHaveClass("bg-blue-100", "text-blue-800");
  });

  it("handles loading state when employer is undefined", () => {
    vi.mocked(useEmployerContext).mockReturnValue({
      employer: undefined,
      isVerified: false,
    });
    vi.mocked(useQuery).mockReturnValue(undefined);

    render(<ReportsPage />);

    // Page title should still render
    expect(screen.getByRole("heading", { name: "Reports" })).toBeInTheDocument();
    // Empty state shown when no data
    expect(screen.getByText("No reports available")).toBeInTheDocument();
  });
});
