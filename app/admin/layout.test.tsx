import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { usePathname, useRouter } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAdminSession } from "@/lib/fetch-admin-session";
import { commerceHealthApi } from "@/app/services/ezprep-api/commerce-health";
import { instanceConfigApi } from "@/app/services/ezprep-api/instance-config";
import { adminDashboardApi } from "@/app/services/ezprep-api/admin-dashboard";
import { EzPrepApiError } from "@/app/services/ezprep-api/types";
import AdminLayout from "./layout";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

vi.mock("@/lib/fetch-admin-session", () => ({
  fetchAdminSession: vi.fn(),
}));

vi.mock("@/app/services/ezprep-api/instance-config", () => ({
  instanceConfigApi: {
    get: vi.fn(),
  },
}));

vi.mock("@/app/services/ezprep-api/commerce-health", () => ({
  commerceHealthApi: {
    get: vi.fn(),
  },
}));

vi.mock("@/app/services/ezprep-api/admin-dashboard", () => ({
  adminDashboardApi: {
    getSummary: vi.fn(),
  },
}));

const replace = vi.fn();
const refresh = vi.fn();
const fetchMock = vi.fn();
const getConfig = vi.mocked(instanceConfigApi.get);
const getHealth = vi.mocked(commerceHealthApi.get);
const getSummary = vi.mocked(adminDashboardApi.getSummary);

function summaryWithFailed(failedQuestions: number) {
  return {
    message: "ok",
    data: { failedQuestions } as Awaited<
      ReturnType<typeof adminDashboardApi.getSummary>
    >["data"],
  };
}

const savedConfig = {
  id: "singleton",
  schemaVersion: 1,
  name: "ExamFlex",
  logoUrl: "https://cdn.example.com/logo.png",
  faviconUrl: "https://cdn.example.com/favicon.ico",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function mockSession(status: number) {
  vi.mocked(fetchAdminSession).mockResolvedValue({
    status,
  } as Response);
}

async function renderReadyLayout(children = "Secret page") {
  mockSession(200);
  render(<AdminLayout>{children}</AdminLayout>);
  expect(await screen.findByText(children)).toBeInTheDocument();
}

describe("AdminLayout", () => {
  beforeEach(() => {
    replace.mockReset();
    refresh.mockReset();
    fetchMock.mockReset();
    vi.mocked(fetchAdminSession).mockReset();
    getConfig.mockReset();
    getConfig.mockResolvedValue({
      message: "Instance configuration has not been set",
      data: null,
    });
    getHealth.mockReset();
    getHealth.mockResolvedValue({
      message: "ok",
      data: { status: "ok" } as Awaited<ReturnType<typeof commerceHealthApi.get>>["data"],
    });
    getSummary.mockReset();
    getSummary.mockResolvedValue(summaryWithFailed(0));
    document.title = "Mock Test Admin";
    vi.mocked(useRouter).mockReturnValue({
      replace,
      refresh,
    } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(usePathname).mockReturnValue("/admin");
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("shows a loader until the session is ready", async () => {
    let resolveSession: ((value: Response) => void) | undefined;
    vi.mocked(fetchAdminSession).mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveSession = resolve;
      })
    );

    const { container } = render(<AdminLayout>Secret page</AdminLayout>);

    expect(screen.queryByText("Secret page")).not.toBeInTheDocument();
    expect(container.querySelector(".ant-spin")).toBeTruthy();

    await act(async () => {
      resolveSession?.(new Response(null, { status: 200 }));
    });

    expect(await screen.findByText("Secret page")).toBeInTheDocument();
  });

  it("redirects to login on 401", async () => {
    mockSession(401);

    render(<AdminLayout>Secret page</AdminLayout>);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("Secret page")).not.toBeInTheDocument();
  });

  it("redirects to login on 403", async () => {
    mockSession(403);

    render(<AdminLayout>Secret page</AdminLayout>);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("Secret page")).not.toBeInTheDocument();
  });

  it("renders children when the session is ok", async () => {
    await renderReadyLayout();

    expect(replace).not.toHaveBeenCalled();
    expect(document.querySelector("img")).toBeNull();
    expect(
      screen.getByRole("link", { name: "Go to admin dashboard" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(getConfig).toHaveBeenCalledTimes(1);
  });

  it("does not load configuration before the session is accepted", async () => {
    mockSession(401);
    render(<AdminLayout>Secret page</AdminLayout>);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(getConfig).not.toHaveBeenCalled();
  });

  it("keeps the ExamFlex mark and applies the saved title", async () => {
    mockSession(200);
    getConfig.mockResolvedValue({
      message: "ok",
      data: { ...savedConfig, name: "Acme Prep" },
    });

    render(<AdminLayout>Secret page</AdminLayout>);

    expect(await screen.findByText("Secret page")).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe("Acme Prep"));
    const home = screen.getByRole("link", { name: "Go to admin dashboard" });
    expect(home).toHaveTextContent("examflex");
    expect(home).not.toHaveTextContent("Acme Prep");
    expect(document.querySelector("img")).toBeNull();
  });

  it("returns to login when loading configuration is unauthorized", async () => {
    mockSession(200);
    getConfig.mockRejectedValue(
      new EzPrepApiError("unauthorized", 401, "/v1/instance-config", null)
    );

    render(<AdminLayout>Secret page</AdminLayout>);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("Secret page")).not.toBeInTheDocument();
  });

  it("opens the admin without branding when configuration cannot be loaded", async () => {
    mockSession(200);
    getConfig.mockRejectedValue(new Error("offline"));

    render(<AdminLayout>Secret page</AdminLayout>);

    expect(await screen.findByText("Secret page")).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
    expect(document.title).toBe("Mock Test Admin");
  });

  it("signs out and returns to login when logout succeeds", async () => {
    fetchMock.mockResolvedValue({ ok: true });
    await renderReadyLayout();

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(refresh).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
  });

  it("stays on the page when logout fails", async () => {
    fetchMock.mockResolvedValue({ ok: false });
    await renderReadyLayout();

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByText("Secret page")).toBeInTheDocument();
  });

  it("stays on the page when logout throws", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    await renderReadyLayout();

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(replace).not.toHaveBeenCalled();
  });

  it("opens and closes the sidebar from the header button", async () => {
    await renderReadyLayout();

    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(
      screen.getByRole("button", { name: "Close navigation" })
    ).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("button", { name: "Close navigation" }));
    expect(
      screen.getByRole("button", { name: "Open navigation" })
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("closes the sidebar when Escape is pressed", async () => {
    await renderReadyLayout();

    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.getByRole("button", { name: "Close navigation" })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(
      await screen.findByRole("button", { name: "Open navigation" })
    ).toBeInTheDocument();
  });

  it("shows a red dot on Commerce health when status is degraded", async () => {
    getHealth.mockResolvedValue({
      message: "ok",
      data: { status: "degraded" } as Awaited<ReturnType<typeof commerceHealthApi.get>>["data"],
    });
    await renderReadyLayout();

    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));

    expect(await screen.findByLabelText("Commerce degraded")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Commerce health/ })).toHaveAttribute(
      "href",
      "/admin/commerce-health"
    );
  });

  it("leaves the Commerce health dot off when status is ok", async () => {
    await renderReadyLayout();

    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));

    expect(await screen.findByRole("link", { name: "Commerce health" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Commerce degraded")).not.toBeInTheDocument();
  });

  it("closes the sidebar when the overlay is clicked", async () => {
    mockSession(200);
    const { container } = render(<AdminLayout>Secret page</AdminLayout>);
    expect(await screen.findByText("Secret page")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    const overlay = container.querySelector(".bg-black\\/50");
    expect(overlay).toBeTruthy();

    fireEvent.click(overlay!);

    expect(
      screen.getByRole("button", { name: "Open navigation" })
    ).toBeInTheDocument();
  });

  it("groups every admin route under a labelled sidebar section", async () => {
    await renderReadyLayout();

    const nav = screen.getByRole("navigation", { name: "Admin navigation" });
    for (const label of [
      "Overview",
      "Learners",
      "Question bank",
      "Papers",
      "Content",
      "Commerce",
      "Catalog",
    ]) {
      expect(within(nav).getByText(label)).toBeInTheDocument();
    }
    expect(within(nav).getAllByRole("link")).toHaveLength(22);
    expect(within(nav).queryByRole("link", { name: "Current affairs" })).not.toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Chapters" })).toHaveAttribute(
      "href",
      "/admin/topics"
    );
  });

  it("marks the matching nav item as the current page and shows it in the breadcrumb", async () => {
    vi.mocked(usePathname).mockReturnValue("/admin/full-mock-tests/drafts/abc");
    await renderReadyLayout();

    const nav = screen.getByRole("navigation", { name: "Admin navigation" });
    expect(within(nav).getByRole("link", { name: "Full mock tests" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(
      within(nav).getByRole("link", { name: "Chapter Wise Tests" })
    ).not.toHaveAttribute("aria-current");
    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(breadcrumb).getByText("Full mock tests")).toBeInTheDocument();
  });

  it("shows the failed question count next to Failed questions", async () => {
    getSummary.mockResolvedValue(summaryWithFailed(3));
    await renderReadyLayout();

    expect(
      await screen.findByRole("link", { name: /Failed questions.*3 need a fix/ })
    ).toHaveAttribute("href", "/admin/failed-questions");
  });

  it("hides the failed question badge when nothing needs a fix", async () => {
    await renderReadyLayout();

    await waitFor(() => expect(getSummary).toHaveBeenCalled());
    expect(screen.getByRole("link", { name: "Failed questions" })).toBeInTheDocument();
  });

  it("collapses the desktop sidebar to an icon rail and remembers the choice", async () => {
    await renderReadyLayout();

    const toggle = screen.getByRole("button", { name: "Collapse sidebar" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(toggle);

    expect(
      screen.getByRole("button", { name: "Expand sidebar" })
    ).toHaveAttribute("aria-expanded", "false");
    expect(window.localStorage.getItem("examflex-admin.sidebar-collapsed")).toBe("1");
    expect(document.getElementById("admin-sidebar")).toHaveClass("lg:w-[76px]");

    // Labels stay available to assistive tech while visually hidden in the rail.
    const nav = screen.getByRole("navigation", { name: "Admin navigation" });
    expect(within(nav).getByText("Full mock tests")).toHaveClass("lg:sr-only");
    expect(within(nav).getByRole("link", { name: "Full mock tests" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
    expect(window.localStorage.getItem("examflex-admin.sidebar-collapsed")).toBe("0");
    expect(document.getElementById("admin-sidebar")).toHaveClass("lg:w-[248px]");
  });

  it("starts collapsed when the rail was collapsed on a previous visit", async () => {
    window.localStorage.setItem("examflex-admin.sidebar-collapsed", "1");
    await renderReadyLayout();

    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
  });

  it("shows the link name in a tooltip when a rail icon is focused", async () => {
    window.localStorage.setItem("examflex-admin.sidebar-collapsed", "1");
    await renderReadyLayout();

    const nav = screen.getByRole("navigation", { name: "Admin navigation" });
    act(() => {
      within(nav).getByRole("link", { name: "Sprint tests" }).focus();
    });

    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip).toHaveTextContent("Sprint tests");
    // Rendered outside the sidebar: the aside's transform + overflow clipping would hide it.
    expect(document.getElementById("admin-sidebar")).not.toContainElement(tooltip);
  });

  it("keeps hidden pages reachable by URL with a correct breadcrumb", async () => {
    vi.mocked(usePathname).mockReturnValue("/admin/current-affairs/abc");
    await renderReadyLayout();

    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(breadcrumb).getByText("Current affairs")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Admin navigation" });
    expect(within(nav).queryByText("Current affairs")).not.toBeInTheDocument();
  });
});
