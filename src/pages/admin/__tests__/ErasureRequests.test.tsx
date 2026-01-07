import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useQuery, useMutation } from "convex/react";
import { ErasureRequests } from "../ErasureRequests";
import { Id } from "../../../../convex/_generated/dataModel";
import { createMockMutation } from "../../../../tests/mocks/convex";

// Mock useAdminAuth to bypass authentication check
vi.mock("@/lib/workos-auth", () => ({
  useAdminAuth: vi.fn(),
}));

// Mock erasure request data
const mockErasureRequests = {
  items: [
    {
      _id: "req_1" as Id<"gdprErasureRequests">,
      _creationTime: Date.now(),
      requesterEmail: "john.doe@example.com",
      requestedAt: Date.now() - 86400000, // 1 day ago
      reason: "User requested account deletion",
      status: "pending" as const,
    },
    {
      _id: "req_2" as Id<"gdprErasureRequests">,
      _creationTime: Date.now(),
      requesterEmail: "jane.smith@example.com",
      requestedAt: Date.now() - 172800000, // 2 days ago
      reason: null,
      status: "pending" as const,
    },
  ],
  continueCursor: null,
  isDone: true,
};

describe("ErasureRequests", () => {
  let mockProcessErasure: ReturnType<typeof createMockMutation>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProcessErasure = createMockMutation();
    vi.mocked(useMutation).mockReturnValue(mockProcessErasure);
  });

  it("renders 'Erasure Requests' page title", () => {
    vi.mocked(useQuery).mockReturnValue(mockErasureRequests);

    render(<ErasureRequests />);

    expect(screen.getByText("Erasure Requests")).toBeInTheDocument();
    expect(screen.getByText("Pending Requests")).toBeInTheDocument();
  });

  it("displays pending erasure request cards", () => {
    vi.mocked(useQuery).mockReturnValue(mockErasureRequests);

    render(<ErasureRequests />);

    // Check that requester emails are displayed
    expect(screen.getByText("john.doe@example.com")).toBeInTheDocument();
    expect(screen.getByText("jane.smith@example.com")).toBeInTheDocument();

    // Check that reason is displayed for first request
    expect(screen.getByText("Reason: User requested account deletion")).toBeInTheDocument();

    // Check that "Requested:" date labels are present
    const requestedLabels = screen.getAllByText(/Requested:/);
    expect(requestedLabels).toHaveLength(2);
  });

  it("shows 'Process Erasure' button for each request", () => {
    vi.mocked(useQuery).mockReturnValue(mockErasureRequests);

    render(<ErasureRequests />);

    const processButtons = screen.getAllByRole("button", { name: /process erasure/i });
    expect(processButtons).toHaveLength(2);
  });

  it("shows empty state when no pending requests", () => {
    vi.mocked(useQuery).mockReturnValue({ items: [], continueCursor: null, isDone: true });

    render(<ErasureRequests />);

    expect(screen.getByText("No pending erasure requests")).toBeInTheDocument();
  });

  it("calls processErasure mutation when 'Process Erasure' button is clicked", async () => {
    vi.mocked(useQuery).mockReturnValue(mockErasureRequests);

    render(<ErasureRequests />);

    // Click the first "Process Erasure" button
    const processButtons = screen.getAllByRole("button", { name: /process erasure/i });
    fireEvent.click(processButtons[0]);

    await waitFor(() => {
      expect(mockProcessErasure).toHaveBeenCalledWith({
        requestId: "req_1",
      });
    });
  });

  it("handles loading state when requests are undefined", () => {
    vi.mocked(useQuery).mockReturnValue(undefined);

    render(<ErasureRequests />);

    // Should show page title even when loading
    expect(screen.getByText("Erasure Requests")).toBeInTheDocument();
    expect(screen.getByText("Pending Requests")).toBeInTheDocument();
    // Empty state should be shown when items are undefined
    expect(screen.getByText("No pending erasure requests")).toBeInTheDocument();
  });
});
