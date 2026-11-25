import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EquationsPage from "./page";

const { replace, searchParamsState, confirmSpy } = vi.hoisted(() => ({
  replace: vi.fn(),
  searchParamsState: { current: new URLSearchParams("page=1&limit=10") },
  confirmSpy: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/admin/equations",
  useSearchParams: () => ({
    get: (key: string) => searchParamsState.current.get(key),
    toString: () => searchParamsState.current.toString(),
  }),
}));

vi.mock("@/components/ConfirmModal", () => ({
  showConfirmModal: (options: { onConfirm: () => Promise<void> }) => {
    confirmSpy(options);
    return options.onConfirm();
  },
}));

vi.mock("@/app/services/ezprep-api", async () => {
  const actual = await vi.importActual<typeof import("@/app/services/ezprep-api")>(
    "@/app/services/ezprep-api"
  );
  return {
    ...actual,
    equationsApi: { list: vi.fn(), delete: vi.fn() },
    catalogApi: {
      ...actual.catalogApi,
      listSubjects: vi.fn(),
      listAllExams: vi.fn(),
      getSubject: vi.fn(),
    },
  };
});

import { catalogApi, equationsApi } from "@/app/services/ezprep-api";

const listEquations = vi.mocked(equationsApi.list);
const deleteEquation = vi.mocked(equationsApi.delete);

const equation = {
  id: "eq-1",
  title: "Ohm's law",
  shortDescription: "Voltage equals current times resistance",
  equation: "V = IR",
  bulletPoints: [],
  subject: { id: "s1", name: "Physics" },
  topic: { id: "t1", name: "Current Electricity and Electromagnetic Induction" },
  exams: [
    { id: "e1", name: "NEET UG" },
    { id: "e2", name: "JEE Main" },
    { id: "e3", name: "KEAM" },
  ],
  sortOrder: 5,
  isActive: true,
};

describe("EquationsPage", () => {
  beforeEach(() => {
    replace.mockReset();
    confirmSpy.mockReset();
    searchParamsState.current = new URLSearchParams("page=1&limit=10");
    listEquations.mockReset();
    deleteEquation.mockReset();
    vi.mocked(catalogApi.listSubjects).mockResolvedValue({ message: "ok", data: [] });
    vi.mocked(catalogApi.listAllExams).mockResolvedValue([]);
    listEquations.mockResolvedValue({
      message: "ok",
      data: [equation],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1, hasNextPage: false, hasPrevPage: false },
    } as unknown as Awaited<ReturnType<typeof equationsApi.list>>);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists equations with chips and an edit link that keeps the list query", async () => {
    searchParamsState.current = new URLSearchParams("page=1&limit=10&examId=e1");
    render(<EquationsPage />);

    expect(await screen.findByText("Ohm's law")).toBeInTheDocument();
    expect(listEquations).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 10, examId: "e1" })
    );
    expect(screen.getByRole("heading", { name: "Equations" })).toBeInTheDocument();
    expect(screen.getByText("Physics")).toBeInTheDocument();
    expect(
      screen.getByText("Current Electricity and Electromagnetic Induction")
    ).toBeInTheDocument();
    expect(screen.getByText("NEET UG")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "2 more exams: JEE Main, KEAM" })
    ).toHaveTextContent("+2");
    expect(screen.getByRole("link", { name: "Edit equation" })).toHaveAttribute(
      "href",
      expect.stringContaining("/admin/equations/eq-1")
    );
    expect(screen.getByRole("link", { name: "Add Equation" })).toHaveAttribute(
      "href",
      "/admin/equations/new"
    );
    expect(screen.getByText("Showing 1–1 of 1 equations")).toBeInTheDocument();
  });

  it("debounces search into the URL", async () => {
    render(<EquationsPage />);
    await screen.findByText("Ohm's law");

    fireEvent.change(screen.getByPlaceholderText("Search by title"), {
      target: { value: "ohm" },
    });
    expect(replace).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(replace).toHaveBeenCalledWith("/admin/equations?page=1&limit=10&search=ohm", {
      scroll: false,
    });
  });

  it("deletes after confirming and reloads the list", async () => {
    deleteEquation.mockResolvedValue({ message: "ok" } as never);
    render(<EquationsPage />);
    await screen.findByText("Ohm's law");

    fireEvent.click(screen.getByRole("button", { name: "Delete equation" }));

    await waitFor(() => expect(deleteEquation).toHaveBeenCalledWith("eq-1"));
    await waitFor(() => expect(listEquations).toHaveBeenCalledTimes(2));
  });

  it("shows a filter-aware empty state", async () => {
    searchParamsState.current = new URLSearchParams("page=1&limit=10&search=zzz");
    listEquations.mockResolvedValue({
      message: "ok",
      data: [],
      pagination: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPrevPage: false },
    } as unknown as Awaited<ReturnType<typeof equationsApi.list>>);

    render(<EquationsPage />);

    expect(await screen.findByText("No equations match these filters.")).toBeInTheDocument();
  });
});
