import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RecommendationsPage from "./page";

const { push, replace, router, searchParams } = vi.hoisted(() => {
  const push = vi.fn();
  const replace = vi.fn();
  return {
    push,
    replace,
    router: { push, replace },
    searchParams: { current: new URLSearchParams() },
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/admin/recommendations",
  useSearchParams: () => searchParams.current,
}));

vi.mock("@/components/ConfirmModal", () => ({
  showConfirmModal: ({ onConfirm }: { onConfirm: () => void | Promise<void> }) => {
    void onConfirm();
  },
}));

vi.mock("@/app/services/ezprep-api", async () => {
  const actual = await vi.importActual<typeof import("@/app/services/ezprep-api")>(
    "@/app/services/ezprep-api"
  );
  return {
    ...actual,
    catalogApi: { listAllExams: vi.fn() },
    recommendationsApi: { list: vi.fn(), delete: vi.fn() },
  };
});

import { catalogApi, recommendationsApi } from "@/app/services/ezprep-api";

const list = vi.mocked(recommendationsApi.list);

const rows = [
  {
    id: "o1",
    exam: { id: "e1", name: "NEET UG" },
    kind: "COURSE",
    title: "MBBS",
    // legacy values may still exist on old rows; the list must not show them
    minPercent: 75,
    comfortPercent: 85,
    sortOrder: 0,
    isActive: true,
  },
  {
    id: "o2",
    exam: { id: "e1", name: "NEET UG" },
    kind: "COURSE",
    title: "BDS",
    sortOrder: 1,
    isActive: false,
  },
];

describe("RecommendationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams.current = new URLSearchParams();
    vi.spyOn(message, "success").mockImplementation(
      (() => undefined) as unknown as typeof message.success
    );
    vi.spyOn(message, "error").mockImplementation(
      (() => undefined) as unknown as typeof message.error
    );
    vi.mocked(catalogApi.listAllExams).mockResolvedValue([
      { id: "e1", name: "NEET UG" },
    ] as never);
    list.mockResolvedValue({ data: rows, pagination: { total: 2 } } as never);
  });

  it("lists courses without the retired Min % / Comfort % columns", async () => {
    render(<RecommendationsPage />);
    expect(await screen.findByText("MBBS")).toBeInTheDocument();
    expect(screen.getByText("BDS")).toBeInTheDocument();
    for (const header of ["Title", "Exam", "Status", "Actions"]) {
      expect(screen.getByRole("columnheader", { name: header })).toBeInTheDocument();
    }
    expect(screen.queryByText("Min %")).not.toBeInTheDocument();
    expect(screen.queryByText("Comfort %")).not.toBeInTheDocument();
    expect(screen.queryByText("75")).not.toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(
      screen.getByText(/Cut-off marks for each course are entered on every full mock/)
    ).toBeInTheDocument();
  });

  it("only requests COURSE offerings, filtered by the exam in the URL", async () => {
    searchParams.current = new URLSearchParams("examId=e1&page=2&limit=10");
    render(<RecommendationsPage />);
    await screen.findByText("MBBS");
    expect(list).toHaveBeenCalledWith({
      page: 2,
      limit: 10,
      examId: "e1",
      kind: "COURSE",
    });
  });

  it("links each row to its edit page", async () => {
    render(<RecommendationsPage />);
    await screen.findByText("MBBS");
    expect(screen.getAllByRole("link", { name: "Edit course" })[0]).toHaveAttribute(
      "href",
      "/admin/recommendations/o1"
    );
  });

  it("deletes a course after confirming and reloads", async () => {
    vi.mocked(recommendationsApi.delete).mockResolvedValue({ data: {} } as never);
    render(<RecommendationsPage />);
    await screen.findByText("MBBS");
    fireEvent.click(screen.getAllByRole("button", { name: "Delete course" })[0]);
    await waitFor(() => expect(recommendationsApi.delete).toHaveBeenCalledWith("o1"));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    expect(message.success).toHaveBeenCalledWith("Recommendation deleted");
  });

  it("shows an error when deleting fails", async () => {
    vi.mocked(recommendationsApi.delete).mockRejectedValue(new Error("no"));
    render(<RecommendationsPage />);
    await screen.findByText("MBBS");
    fireEvent.click(screen.getAllByRole("button", { name: "Delete course" })[0]);
    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });

  it("shows an error when the list or the exams fail to load", async () => {
    list.mockRejectedValue(new Error("down"));
    vi.mocked(catalogApi.listAllExams).mockRejectedValue(new Error("down"));
    render(<RecommendationsPage />);
    await waitFor(() => expect(message.error).toHaveBeenCalledTimes(2));
  });

  it("links to creating a course", async () => {
    render(<RecommendationsPage />);
    await screen.findByText("MBBS");
    expect(screen.getByRole("link", { name: "Add course" })).toHaveAttribute(
      "href",
      "/admin/recommendations/new"
    );
  });
});
