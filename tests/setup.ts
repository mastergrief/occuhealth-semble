import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock Convex hooks
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
  useAction: vi.fn(() => vi.fn()),
  useConvex: vi.fn(),
  ConvexProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock react-router-dom
vi.mock("react-router-dom", () => ({
  useOutletContext: vi.fn(),
  useNavigate: vi.fn(() => vi.fn()),
  useLocation: vi.fn(() => ({ pathname: "/", search: "", hash: "", state: null })),
  useParams: vi.fn(() => ({})),
  NavLink: ({ children, to }: { children: React.ReactNode; to: string }) => {
    const { createElement } = require("react");
    return createElement("a", { href: to, "data-testid": "nav-link" }, children);
  },
  Navigate: ({ to }: { to: string }) => {
    const { createElement } = require("react");
    return createElement("div", { "data-testid": "navigate", "data-to": to });
  },
  Routes: ({ children }: { children: React.ReactNode }) => children,
  Route: () => null,
  Outlet: ({ children }: { children: React.ReactNode }) => children,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => {
    const { createElement } = require("react");
    return createElement("a", { href: to, "data-testid": "link" }, children);
  },
}));
