import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FullMockTestsPage from "./page";
import type {
  DraftListItem,
  FullMockExamListItem,
  FullMockTestListItem,
} from "./types";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/components/ConfirmModal", () => ({
  showConfirmModal: ({ onConfirm }: { onConfirm: () => void | Promise<void> }) => {
    void onConfirm();
  },
}));

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");
  return {
    ...actual,
    fullMockApi: {
      listExams: vi.fn(),
      listDrafts: vi.fn(),
      listPublished: vi.fn(),
      createDraft: vi.fn(),
      getDraft: vi.fn(),
      getPublished: vi.fn(),
      searchQuestions: vi.fn(),
      replaceQuestion: vi.fn(),
      publishDraft: vi.fn(),
      discardDraft: vi.fn(),
    },
  };
});

import { fullMockApi } from "./api";

const listExams = vi.mocked(fullMockApi.listExams);
const listDrafts = vi.mocked(fullMockApi.listDrafts);
const listPublished = vi.mocked(fullMockApi.listPublished);
const createDraft = vi.mocked(fullMockApi.createDraft);
const discardDraft = vi.mocked(fullMockApi.discardDraft);

const exam: FullMockExamListItem = {
  id: "ex-1",
  examName: "UPSC Prelims",
  duration: "120 mins",
  questions: 100,
  totalMarks: 200,
  category: "Civil service",
  examGroup: "UPSC",
  subjects: ["Polity", "History"],
  subjectDetails: [
    { subjectId: "s-pol", name: "Polity", numberOfQuestions: 60 },
    { subjectId: "s-his", name: "History", numberOfQuestions: 40 },
  ],
  mode: "Mixed",
};

const secondExam: FullMockExamListItem = {
  id: "ex-2",
  examName: "NEET UG",
  duration: "180 mins",
  questions: 30,
  totalMarks: 120,
  subjects: ["Physics"],
  subjectDetails: [{ subjectId: "s-phy", name: "Physics", numberOfQuestions: 30 }],
  mode: "Mixed",
};

const draft: DraftListItem = {
  id: "draft-1",
  examId: "ex-1",
  examName: "UPSC Prelims",
  status: "REVIEW",
  totalQuestions: 100,
  totalMarks: 200,
  duration: 120,
  isSessionWise: false,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-02T00:00:00.000Z",
};

const published: FullMockTestListItem = {
  id: "fm-1",
  title: "UPSC Full Mock 1",
  totalQuestions: 100,
  durationInMinutes: 120,
  totalMarks: 200,
  isSessionWise: false,
  exam: { id: "ex-1", name: "UPSC Prelims" },
  subjectConfig: [],
  marksPerQuestion: 2,
  negativeMarking: 0.66,
  allowRetake: true,
  shuffleOptions: false,
  showResultsImmediately: true,
  isActive: true,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

const pagination = { total: 1, page: 1, limit: 10, totalPages: 1 };

async function renderReady() {
  listExams.mockResolvedValue({ message: "ok", data: [exam], pagination });
  listDrafts.mockResolvedValue({ message: "ok", data: [draft], pagination });
  listPublished.mockResolvedValue({
    message: "ok",
    data: [published],
    pagination,
  });
  render(<FullMockTestsPage />);
  expect(await screen.findAllByText("UPSC Prelims")).not.toHaveLength(0);
  expect(await screen.findByText("UPSC Full Mock 1")).toBeInTheDocument();
  expect(await screen.findByText("REVIEW")).toBeInTheDocument();
}

describe("FullMockTestsPage", () => {
  beforeEach(() => {
    listExams.mockReset();
    listDrafts.mockReset();
    listPublished.mockReset();
    createDraft.mockReset();
    discardDraft.mockReset();
    push.mockReset();
    vi.spyOn(message, "error").mockImplementation(
      (() => undefined) as unknown as typeof message.error
    );
    vi.spyOn(message, "success").mockImplementation(
      (() => undefined) as unknown as typeof message.success
    );
    vi.mocked(message.error).mockClear();
    vi.mocked(message.success).mockClear();
  });

  it("lists exams, drafts, and published full mocks", async () => {
    await renderReady();
    expect(screen.getByRole("heading", { name: "Full mock tests" })).toBeInTheDocument();
    expect(screen.getByText("Polity, History")).toBeInTheDocument();
    expect(screen.getByText("UPSC Full Mock 1")).toBeInTheDocument();
    expect(screen.getByText("Drafts")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discard" })).toBeInTheDocument();
  });

  it("searches exams", async () => {
    await renderReady();
    const search = screen.getByPlaceholderText("Search exams");
    fireEvent.change(search, { target: { value: "upsc" } });
    fireEvent.keyDown(search, { key: "Enter", code: "Enter" });

    await waitFor(() =>
      expect(listExams).toHaveBeenCalledWith(
        expect.objectContaining({ search: "upsc", page: 1 })
      )
    );
  });

  /** antd animates collapse and may keep the node mounted but hidden. */
  const expectPanelClosed = (examId: string) => {
    const panel = screen.queryByTestId(`generate-panel-${examId}`);
    if (!panel) return;
    const row = panel.closest("tr") as HTMLElement | null;
    expect(row).not.toBeNull();
    expect(row!.style.display).toBe("none");
  };

  const openPanel = async (name = "UPSC Prelims") => {
    const row = (await screen.findAllByText(name)).find((el) =>
      el.closest(".ant-table-row")
    ) as HTMLElement;
    fireEvent.click(row);
  };

  const draftResponse = {
    message: "Draft generated",
    data: {
      id: "draft-1",
      examId: "ex-1",
      status: "REVIEW" as const,
      examSnapshot: { name: "UPSC Prelims", totalQuestions: 100, isSessionWise: false },
      subjects: [],
      createdAt: "",
      updatedAt: "",
    },
  };

  it("does not generate until the row is expanded and Generate draft is clicked", async () => {
    await renderReady();
    expect(screen.queryByTestId("generate-panel-ex-1")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /configure/i }));
    expect(screen.getByTestId("generate-panel-ex-1")).toBeInTheDocument();
    expect(createDraft).not.toHaveBeenCalled();
  });

  it("generates a draft with the chosen split and navigates to it", async () => {
    createDraft.mockResolvedValue(draftResponse);
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: /configure/i }));
    fireEvent.click(screen.getByRole("button", { name: /generate draft/i }));

    expect(await screen.findByText("Generating full mock draft")).toBeInTheDocument();
    await waitFor(() =>
      expect(createDraft).toHaveBeenCalledWith("ex-1", [
        { subjectId: "s-pol", easy: 20, medium: 20, hard: 20 },
        { subjectId: "s-his", easy: 13, medium: 13, hard: 14 },
      ])
    );
    expect(message.success).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/admin/full-mock-tests/drafts/draft-1");
  });

  it("expands a row by clicking it and collapses it on a second click", async () => {
    await renderReady();
    await openPanel();
    expect(screen.getByTestId("generate-panel-ex-1")).toBeInTheDocument();
    await openPanel();
    await waitFor(() => expectPanelClosed("ex-1"));
  });

  it("keeps only one row expanded at a time", async () => {
    listExams.mockResolvedValue({
      message: "ok",
      data: [exam, secondExam],
      pagination: { ...pagination, total: 2 },
    });
    listDrafts.mockResolvedValue({ message: "ok", data: [], pagination });
    listPublished.mockResolvedValue({ message: "ok", data: [], pagination });
    render(<FullMockTestsPage />);
    await screen.findByText("NEET UG");

    const [firstButton, secondButton] = screen.getAllByRole("button", {
      name: /configure/i,
    });
    fireEvent.click(firstButton);
    expect(screen.getByTestId("generate-panel-ex-1")).toBeInTheDocument();

    // the button on another row switches the open panel
    fireEvent.click(secondButton);
    expect(screen.getByTestId("generate-panel-ex-2")).toBeInTheDocument();
    await waitFor(() => expectPanelClosed("ex-1"));

    // clicking another row body switches too
    await openPanel("UPSC Prelims");
    expect(screen.getByTestId("generate-panel-ex-1")).toBeInTheDocument();
    await waitFor(() => expectPanelClosed("ex-2"));
  });

  it("the row button toggles its own row open and closed", async () => {
    await renderReady();
    const button = screen.getByRole("button", { name: /configure/i });
    fireEvent.click(button);
    expect(screen.getByTestId("generate-panel-ex-1")).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
    await waitFor(() => expectPanelClosed("ex-1"));
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("surfaces a generate error inline with per-subject lines", async () => {
    const { EzPrepApiError } = await import("@/app/services/ezprep-api");
    createDraft.mockRejectedValue(
      new EzPrepApiError("Bad Request", 400, "/v1/full-mock-tests/drafts", {
        message: "Not enough questions",
        error: "BANK_SHORTAGE",
        details: [{ message: "Polity – hard: need 20, only 3 available" }],
      })
    );
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: /configure/i }));
    fireEvent.click(screen.getByRole("button", { name: /generate draft/i }));

    expect(
      await screen.findByText("Polity – hard: need 20, only 3 available")
    ).toBeInTheDocument();
    expect(message.error).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    // admin can retry: the generate button is usable again
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /generate draft/i })).toBeEnabled()
    );
  });

  it("surfaces a generic generate error", async () => {
    createDraft.mockRejectedValue(new Error("nope"));
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: /configure/i }));
    fireEvent.click(screen.getByRole("button", { name: /generate draft/i }));
    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });

  it("navigates to edit a draft", async () => {
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(push).toHaveBeenCalledWith("/admin/full-mock-tests/drafts/draft-1");
  });

  it("discards a draft from the list", async () => {
    discardDraft.mockResolvedValue({ message: "Draft discarded" });
    listDrafts
      .mockResolvedValueOnce({ message: "ok", data: [draft], pagination })
      .mockResolvedValueOnce({
        message: "ok",
        data: [],
        pagination: { ...pagination, total: 0 },
      });
    listExams.mockResolvedValue({ message: "ok", data: [exam], pagination });
    listPublished.mockResolvedValue({
      message: "ok",
      data: [published],
      pagination,
    });
    render(<FullMockTestsPage />);
    expect(await screen.findByText("REVIEW")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    await waitFor(() => expect(discardDraft).toHaveBeenCalledWith("draft-1"));
    expect(message.success).toHaveBeenCalled();
  });

  it("navigates to a published test", async () => {
    await renderReady();
    fireEvent.click(screen.getByRole("button", { name: "View" }));
    expect(push).toHaveBeenCalledWith("/admin/full-mock-tests/fm-1");
  });

  it("shows empty published and draft text", async () => {
    listExams.mockResolvedValue({
      message: "ok",
      data: [],
      pagination: { ...pagination, total: 0 },
    });
    listDrafts.mockResolvedValue({
      message: "ok",
      data: [],
      pagination: { ...pagination, total: 0 },
    });
    listPublished.mockResolvedValue({
      message: "ok",
      data: [],
      pagination: { ...pagination, total: 0 },
    });
    render(<FullMockTestsPage />);
    expect(await screen.findByText("No published full mocks yet")).toBeInTheDocument();
    expect(screen.getByText("No open drafts")).toBeInTheDocument();
  });

  it("surfaces exam, draft, and published fetch errors", async () => {
    listExams.mockRejectedValue(new Error("nope"));
    listDrafts.mockRejectedValue(new Error("nope"));
    listPublished.mockRejectedValue(new Error("nope"));
    render(<FullMockTestsPage />);
    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });
});
