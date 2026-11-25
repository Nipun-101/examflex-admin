import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import QuestionsPage from "./page";

const { replace, searchParamsState } = vi.hoisted(() => ({
  replace: vi.fn(),
  searchParamsState: { current: new URLSearchParams("page=5&limit=10") },
}));

const searchParams = {
  get: (key: string) => searchParamsState.current.get(key),
  toString: () => searchParamsState.current.toString(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/admin/questions",
  useSearchParams: () => searchParams,
}));

vi.mock("@/app/services/ezprep-api", async () => {
  const actual = await vi.importActual<typeof import("@/app/services/ezprep-api")>(
    "@/app/services/ezprep-api"
  );
  return {
    ...actual,
    questionsApi: {
      list: vi.fn(),
      delete: vi.fn(),
    },
    catalogApi: {
      ...actual.catalogApi,
      listSubjects: vi.fn(),
      listAllExams: vi.fn(),
      getSubject: vi.fn(),
    },
  };
});

import { catalogApi, questionsApi } from "@/app/services/ezprep-api";

const listQuestions = vi.mocked(questionsApi.list);
const listSubjects = vi.mocked(catalogApi.listSubjects);
const listAllExams = vi.mocked(catalogApi.listAllExams);

describe("QuestionsPage", () => {
  beforeEach(() => {
    replace.mockReset();
    searchParamsState.current = new URLSearchParams("page=5&limit=10");
    listQuestions.mockReset();
    listSubjects.mockReset();
    listAllExams.mockReset();
    listSubjects.mockResolvedValue({ message: "ok", data: [] });
    listAllExams.mockResolvedValue([]);
    listQuestions.mockResolvedValue({
      message: "ok",
      data: [
        {
          id: "q-1",
          questionText: { en: { text: "Capital of India?" }, ml: { text: null } },
          options: [],
          correctAnswer: "opt-a",
          isActive: true,
        },
      ],
      pagination: { total: 50, page: 5, limit: 10, totalPages: 5, hasNextPage: false, hasPrevPage: true },
    });
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads the page from the URL and keeps it on the edit link", async () => {
    render(<QuestionsPage />);

    await waitFor(() =>
      expect(listQuestions).toHaveBeenCalledWith(
        expect.objectContaining({ page: 5, limit: 10 })
      )
    );
    expect(screen.getByRole("heading", { name: "Questions" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search question text")).toBeInTheDocument();
    expect(screen.getByText("No tags")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit question" })).toHaveAttribute(
      "href",
      "/admin/questions/q-1?page=5&limit=10"
    );
  });

  it("debounces search text into the URL and lists with filters", async () => {
    searchParamsState.current = new URLSearchParams(
      "page=2&limit=10&examId=e1&subjectId=s1"
    );
    render(<QuestionsPage />);

    await waitFor(() =>
      expect(listQuestions).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          examId: "e1",
          subjectId: "s1",
        })
      )
    );

    const input = screen.getByPlaceholderText("Search question text");
    fireEvent.change(input, { target: { value: "pres" } });
    expect(replace).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        "/admin/questions?page=1&limit=10&examId=e1&subjectId=s1&search=pres",
        { scroll: false }
      )
    );

    searchParamsState.current = new URLSearchParams(
      "page=1&limit=10&examId=e1&subjectId=s1&search=pres"
    );
    render(<QuestionsPage />);
    await waitFor(() =>
      expect(listQuestions).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          examId: "e1",
          subjectId: "s1",
          search: "pres",
        })
      )
    );
  });

  it("clears search from the URL when the input is emptied", async () => {
    searchParamsState.current = new URLSearchParams(
      "page=1&limit=10&search=pres"
    );
    render(<QuestionsPage />);
    await waitFor(() =>
      expect(listQuestions).toHaveBeenCalledWith(
        expect.objectContaining({ search: "pres" })
      )
    );

    const input = screen.getByPlaceholderText("Search question text");
    fireEvent.change(input, { target: { value: "" } });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/admin/questions?page=1&limit=10", {
        scroll: false,
      })
    );
  });

  it("shows a disabled sprint button until the selection is an allowed size", async () => {
    render(<QuestionsPage />);
    expect(await screen.findByText("Capital of India?")).toBeInTheDocument();
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[checkboxes.length - 1]);

    const button = screen.getByRole("button", { name: "+ Sprint Test" });
    expect(button).toBeDisabled();
    expect(screen.getByRole("button", { name: "+ Chapter Test" })).toBeDisabled();
    expect(screen.getByText(/Select at least 10 questions/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /clear selection \(1\)/i }));
    expect(screen.queryByRole("button", { name: "+ Sprint Test" })).not.toBeInTheDocument();
  });

  it("folds extra tags and exams into a +N chip and keeps one chapter chip", async () => {
    listQuestions.mockResolvedValue({
      message: "ok",
      data: [
        {
          id: "q-2",
          questionText: { en: { text: "Which hormone regulates sleep?" } },
          options: [],
          correctAnswer: "opt-a",
          isActive: true,
          difficultyLevel: "medium",
          subject: { id: "s1", name: "Zoology" },
          topic: { id: "t1", name: "Chemical Coordination and Integration in Humans" },
          tags: [{ name: "Endocrine" }, { name: "PYQ" }, { name: "Revision" }],
          exams: [
            { id: "e1", name: "NEET UG" },
            { id: "e2", name: "AIIMS" },
          ],
        },
      ],
      pagination: { total: 1, page: 1, limit: 10, totalPages: 1, hasNextPage: false, hasPrevPage: false },
    } as unknown as Awaited<ReturnType<typeof questionsApi.list>>);
    searchParamsState.current = new URLSearchParams("page=1&limit=10");

    render(<QuestionsPage />);

    expect(await screen.findByText("Endocrine")).toBeInTheDocument();
    expect(screen.queryByText("PYQ")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "2 more tags: PYQ, Revision" })
    ).toHaveTextContent("+2");
    expect(screen.getByText("NEET UG")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1 more exams: AIIMS" })).toHaveTextContent("+1");
    expect(
      screen.getByText("Chemical Coordination and Integration in Humans")
    ).toHaveClass("truncate");
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("Zoology")).toBeInTheDocument();
  });

  it("pages with Previous and Next and shows the visible range", async () => {
    render(<QuestionsPage />);
    expect(await screen.findByText("Capital of India?")).toBeInTheDocument();

    expect(screen.getByText("Showing 41–41 of 50 questions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(replace).toHaveBeenCalledWith("/admin/questions?page=4&limit=10", {
      scroll: false,
    });
  });

  it("shows a filter-aware empty state", async () => {
    searchParamsState.current = new URLSearchParams("page=1&limit=10&search=zzz");
    listQuestions.mockResolvedValue({
      message: "ok",
      data: [],
      pagination: { total: 0, page: 1, limit: 10, totalPages: 0, hasNextPage: false, hasPrevPage: false },
    });

    render(<QuestionsPage />);

    expect(await screen.findByText("No questions match these filters.")).toBeInTheDocument();
    expect(screen.getByText("No questions to show")).toBeInTheDocument();
  });
});
