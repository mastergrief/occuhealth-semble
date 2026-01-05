import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useMutation } from "convex/react";
import { DoctorSettings } from "../Settings";
import { Id } from "../../../../convex/_generated/dataModel";
import { createMockMutation } from "../../../../tests/mocks/convex";

// Mock the DoctorLayout context hook
vi.mock("../../DoctorLayout", () => ({
  useDoctorContext: vi.fn(),
}));

import { useDoctorContext } from "../../DoctorLayout";

// Mock doctor data
const mockDoctor = {
  _id: "doctor_123" as Id<"doctorSettings">,
  _creationTime: Date.now(),
  workosUserId: "workos_123",
  name: "Dr. Test Smith",
  email: "test@doctor.com",
  zoomPersonalLink: "https://zoom.us/j/123456789",
};

const mockDoctorNoZoom = {
  _id: "doctor_123" as Id<"doctorSettings">,
  _creationTime: Date.now(),
  workosUserId: "workos_123",
  name: "Dr. Test Smith",
  email: "test@doctor.com",
  zoomPersonalLink: "",
};

describe("DoctorSettings", () => {
  let mockUpdateDoctor: ReturnType<typeof createMockMutation>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateDoctor = createMockMutation();
    vi.mocked(useMutation).mockReturnValue(mockUpdateDoctor);
  });

  it("renders profile section with doctor information", () => {
    vi.mocked(useDoctorContext).mockReturnValue({ doctor: mockDoctor });

    render(<DoctorSettings />);

    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Dr. Test Smith")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("test@doctor.com")).toBeInTheDocument();
  });

  it("displays Zoom link input with existing value", () => {
    vi.mocked(useDoctorContext).mockReturnValue({ doctor: mockDoctor });

    render(<DoctorSettings />);

    expect(screen.getByText("Zoom Settings")).toBeInTheDocument();
    expect(screen.getByText("Personal Meeting Link")).toBeInTheDocument();

    // Check the input has the existing zoom link
    const zoomInput = screen.getByPlaceholderText("https://zoom.us/j/...") as HTMLInputElement;
    expect(zoomInput.value).toBe("https://zoom.us/j/123456789");
  });

  it("calls update mutation on save with valid zoom link", async () => {
    vi.mocked(useDoctorContext).mockReturnValue({ doctor: mockDoctorNoZoom });

    render(<DoctorSettings />);

    // Enter a zoom link
    const zoomInput = screen.getByPlaceholderText("https://zoom.us/j/...");
    fireEvent.change(zoomInput, { target: { value: "https://zoom.us/j/987654321" } });

    // Click save
    const saveButton = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateDoctor).toHaveBeenCalledWith({
        doctorId: "doctor_123",
        zoomPersonalLink: "https://zoom.us/j/987654321",
      });
    });
  });

  it("shows success message after save", async () => {
    vi.mocked(useDoctorContext).mockReturnValue({ doctor: mockDoctor });

    render(<DoctorSettings />);

    // Click save
    const saveButton = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("Settings saved successfully!")).toBeInTheDocument();
    });
  });
});
