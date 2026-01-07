import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useQuery, useMutation } from "convex/react";
import { EmployeesPage } from "../Employees";
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
  status: "verified" as const,
  contactEmail: "contact@testcorp.com",
};

// Mock employee/patient data
const mockEmployees = [
  {
    _id: "patient_1" as Id<"patients">,
    _creationTime: Date.now(),
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@testcorp.com",
    jobTitle: "Software Engineer",
    department: "Engineering",
    employerId: "employer_123" as Id<"employers">,
    dateOfBirth: "1990-01-15",
  },
  {
    _id: "patient_2" as Id<"patients">,
    _creationTime: Date.now(),
    firstName: "Jane",
    lastName: "Smith",
    email: "jane.smith@testcorp.com",
    jobTitle: "Product Manager",
    department: "Product",
    employerId: "employer_123" as Id<"employers">,
    dateOfBirth: "1985-06-20",
  },
];

describe("EmployeesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useEmployerContext).mockReturnValue({
      employer: mockEmployer,
      isVerified: true,
    });
    // Default mock for useMutation
    vi.mocked(useMutation).mockReturnValue(vi.fn());
  });

  it("renders 'Employees' page title", () => {
    vi.mocked(useQuery).mockReturnValue({ items: [], continueCursor: null, isDone: true });

    render(<EmployeesPage />);

    expect(screen.getByRole("heading", { name: "Employees" })).toBeInTheDocument();
  });

  it("shows 'Add Employee' button", () => {
    vi.mocked(useQuery).mockReturnValue({ items: [], continueCursor: null, isDone: true });

    render(<EmployeesPage />);

    expect(screen.getByRole("button", { name: /add employee/i })).toBeInTheDocument();
  });

  it("displays employee list when data exists", () => {
    vi.mocked(useQuery).mockReturnValue({ items: mockEmployees, continueCursor: null, isDone: true });

    render(<EmployeesPage />);

    // Check employee names are displayed
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();

    // Check employee emails are displayed
    expect(screen.getByText("john.doe@testcorp.com")).toBeInTheDocument();
    expect(screen.getByText("jane.smith@testcorp.com")).toBeInTheDocument();

    // Check job titles are displayed
    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
    expect(screen.getByText("Product Manager")).toBeInTheDocument();

    // Check Employee Directory header is shown
    expect(screen.getByText("Employee Directory")).toBeInTheDocument();
  });

  it("shows empty state 'No employees added yet' when list is empty", () => {
    vi.mocked(useQuery).mockReturnValue({ items: [], continueCursor: null, isDone: true });

    render(<EmployeesPage />);

    expect(screen.getByText("No employees added yet")).toBeInTheDocument();
  });

  it("opens EmployeeForm dialog on button click", async () => {
    const user = userEvent.setup();
    vi.mocked(useQuery).mockReturnValue({ items: [], continueCursor: null, isDone: true });

    render(<EmployeesPage />);

    // Click the Add Employee button
    await user.click(screen.getByRole("button", { name: /add employee/i }));

    // Check that the dialog with "Add Employee" title is now visible
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Add Employee" })).toBeInTheDocument();

    // Check form labels are present (labels aren't associated with inputs via for attribute)
    expect(screen.getByText("First Name *")).toBeInTheDocument();
    expect(screen.getByText("Last Name *")).toBeInTheDocument();
    expect(screen.getByText("Email *")).toBeInTheDocument();

    // Check form has input fields
    const inputs = screen.getAllByRole("textbox");
    expect(inputs.length).toBeGreaterThanOrEqual(3);
  });

  it("renders loading state when query returns undefined", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);

    render(<EmployeesPage />);

    // Page title should still be visible
    expect(screen.getByRole("heading", { name: "Employees" })).toBeInTheDocument();
    // Empty state should be shown when patients is undefined (coalesced to [])
    expect(screen.getByText("No employees added yet")).toBeInTheDocument();
  });
});
