import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useQuery, useMutation } from "convex/react";
import { EmployerVerification } from "../EmployerVerification";
import { Id } from "../../../../convex/_generated/dataModel";
import { createMockMutation } from "../../../../tests/mocks/convex";

// Mock pending employers data
const mockPendingEmployers = [
  {
    _id: "employer_1" as Id<"employers">,
    _creationTime: Date.now(),
    companyName: "Acme Corp",
    email: "admin@acmecorp.com",
    contactName: "John Smith",
    companyType: "Private Limited" as const,
    companyRegistrationNumber: "12345678",
    status: "pending" as const,
    workosUserId: "workos_1",
  },
  {
    _id: "employer_2" as Id<"employers">,
    _creationTime: Date.now(),
    companyName: "Tech Solutions Ltd",
    email: "contact@techsolutions.com",
    contactName: "Jane Doe",
    companyType: "Limited Liability Partnership" as const,
    status: "pending" as const,
    workosUserId: "workos_2",
  },
];

describe("EmployerVerification", () => {
  let mockVerifyEmployer: ReturnType<typeof createMockMutation>;
  let mockRejectEmployer: ReturnType<typeof createMockMutation>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyEmployer = createMockMutation();
    mockRejectEmployer = createMockMutation();

    // Use mockImplementation to handle multiple useMutation calls dynamically
    let callCount = 0;
    vi.mocked(useMutation).mockImplementation(() => {
      callCount++;
      // First call is for verify, second is for reject
      if (callCount % 2 === 1) {
        return mockVerifyEmployer;
      }
      return mockRejectEmployer;
    });
  });

  it("renders 'Employer Verification' page title", () => {
    vi.mocked(useQuery).mockReturnValue(mockPendingEmployers);

    render(<EmployerVerification />);

    expect(screen.getByText("Employer Verification")).toBeInTheDocument();
  });

  it("displays pending employer cards with company info", () => {
    vi.mocked(useQuery).mockReturnValue(mockPendingEmployers);

    render(<EmployerVerification />);

    // Check first employer details
    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("admin@acmecorp.com")).toBeInTheDocument();
    expect(screen.getByText("Contact: John Smith")).toBeInTheDocument();
    expect(screen.getByText("Type: Private Limited")).toBeInTheDocument();
    expect(screen.getByText("Reg: 12345678")).toBeInTheDocument();

    // Check second employer details
    expect(screen.getByText("Tech Solutions Ltd")).toBeInTheDocument();
    expect(screen.getByText("contact@techsolutions.com")).toBeInTheDocument();
    expect(screen.getByText("Contact: Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Type: Limited Liability Partnership")).toBeInTheDocument();
  });

  it("displays pending count in card title", () => {
    vi.mocked(useQuery).mockReturnValue(mockPendingEmployers);

    render(<EmployerVerification />);

    expect(screen.getByText("Pending Verification (2)")).toBeInTheDocument();
  });

  it("shows 'Verify' and 'Reject' buttons for each pending employer", () => {
    vi.mocked(useQuery).mockReturnValue(mockPendingEmployers);

    render(<EmployerVerification />);

    const verifyButtons = screen.getAllByRole("button", { name: /verify/i });
    const rejectButtons = screen.getAllByRole("button", { name: /reject/i });

    expect(verifyButtons).toHaveLength(2);
    expect(rejectButtons).toHaveLength(2);
  });

  it("shows empty state when no pending employers", () => {
    vi.mocked(useQuery).mockReturnValue([]);

    render(<EmployerVerification />);

    expect(screen.getByText("No employers pending verification")).toBeInTheDocument();
    expect(screen.getByText("Pending Verification (0)")).toBeInTheDocument();
  });

  it("shows loading state when query is undefined", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);

    render(<EmployerVerification />);

    // When loading, count shows 0
    expect(screen.getByText("Pending Verification (0)")).toBeInTheDocument();
  });

  it("handles verify mutation call", async () => {
    vi.mocked(useQuery).mockReturnValue(mockPendingEmployers);

    render(<EmployerVerification />);

    // Click first Verify button
    const verifyButtons = screen.getAllByRole("button", { name: /verify/i });
    fireEvent.click(verifyButtons[0]);

    await waitFor(() => {
      expect(mockVerifyEmployer).toHaveBeenCalledWith({
        employerId: "employer_1",
      });
    });
  });

  it("opens reject dialog when clicking Reject button", async () => {
    vi.mocked(useQuery).mockReturnValue(mockPendingEmployers);

    render(<EmployerVerification />);

    // Click first Reject button
    const rejectButtons = screen.getAllByRole("button", { name: /reject/i });
    fireEvent.click(rejectButtons[0]);

    // Dialog should open
    await waitFor(() => {
      expect(screen.getByText("Reject Employer")).toBeInTheDocument();
      expect(screen.getByText(/Provide a reason for rejecting Acme Corp/)).toBeInTheDocument();
      expect(screen.getByLabelText(/rejection reason/i)).toBeInTheDocument();
    });
  });

  it("handles reject mutation call with rejection reason", async () => {
    vi.mocked(useQuery).mockReturnValue(mockPendingEmployers);

    render(<EmployerVerification />);

    // Click first Reject button
    const rejectButtons = screen.getAllByRole("button", { name: /reject/i });
    await act(async () => {
      fireEvent.click(rejectButtons[0]);
    });

    // Wait for dialog
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Type rejection reason (minimum 10 characters)
    const textarea = screen.getByPlaceholderText(/enter reason for rejection/i);
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "Invalid documentation provided" } });
    });

    // Verify button is enabled with valid reason length
    const confirmButton = screen.getByRole("button", { name: /confirm rejection/i });
    expect(confirmButton).not.toBeDisabled();

    // Click confirm rejection button and wait for async operation
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    // The mutation should be called
    await waitFor(() => {
      expect(mockRejectEmployer).toHaveBeenCalledWith({
        employerId: "employer_1",
        reason: "Invalid documentation provided",
      });
    });
  });

  it("disables confirm rejection button when reason is too short", async () => {
    vi.mocked(useQuery).mockReturnValue(mockPendingEmployers);

    render(<EmployerVerification />);

    // Click first Reject button
    const rejectButtons = screen.getAllByRole("button", { name: /reject/i });
    fireEvent.click(rejectButtons[0]);

    // Wait for dialog
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Type short rejection reason (less than 10 characters)
    const textarea = screen.getByLabelText(/rejection reason/i);
    fireEvent.change(textarea, { target: { value: "Short" } });

    // Confirm button should be disabled
    const confirmButton = screen.getByRole("button", { name: /confirm rejection/i });
    expect(confirmButton).toBeDisabled();
  });

  it("enables confirm rejection button when reason has 10+ characters", async () => {
    vi.mocked(useQuery).mockReturnValue(mockPendingEmployers);

    render(<EmployerVerification />);

    // Click first Reject button
    const rejectButtons = screen.getAllByRole("button", { name: /reject/i });
    fireEvent.click(rejectButtons[0]);

    // Wait for dialog
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Type valid rejection reason (10+ characters)
    const textarea = screen.getByLabelText(/rejection reason/i);
    fireEvent.change(textarea, { target: { value: "This is a valid reason for rejection" } });

    // Confirm button should be enabled
    const confirmButton = screen.getByRole("button", { name: /confirm rejection/i });
    expect(confirmButton).not.toBeDisabled();
  });

  it("closes reject dialog when Cancel is clicked", async () => {
    vi.mocked(useQuery).mockReturnValue(mockPendingEmployers);

    render(<EmployerVerification />);

    // Click first Reject button
    const rejectButtons = screen.getAllByRole("button", { name: /reject/i });
    fireEvent.click(rejectButtons[0]);

    // Wait for dialog
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Click Cancel
    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("shows character count in reject dialog", async () => {
    vi.mocked(useQuery).mockReturnValue(mockPendingEmployers);

    render(<EmployerVerification />);

    // Click first Reject button
    const rejectButtons = screen.getAllByRole("button", { name: /reject/i });
    fireEvent.click(rejectButtons[0]);

    // Wait for dialog
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Initially shows 0 characters
    expect(screen.getByText("0/500 characters (minimum 10)")).toBeInTheDocument();

    // Type some text
    const textarea = screen.getByLabelText(/rejection reason/i);
    fireEvent.change(textarea, { target: { value: "Test reason text" } });

    // Shows updated character count
    expect(screen.getByText("16/500 characters (minimum 10)")).toBeInTheDocument();
  });
});
