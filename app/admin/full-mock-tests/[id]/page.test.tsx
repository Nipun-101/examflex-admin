import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PublishedFullMockPage from "./page";
import type { FullMockTestListItem } from "../types";

const { push, router } = vi.hoisted(() => {
  const push = vi.fn();
  // Stable reference, like the real Next router (the page's load effect depends on it).
  return { push, router: { push } };
});

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

vi.mock("@/app/services/ezprep-api", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/services/ezprep-api")
  >("@/app/services/ezprep-api");
  return {
    ...actual,
    recommendationsApi: {
      list: vi.fn(async () => ({
        message: "ok",
        data: [
          {
            id: "off-m",
            title: "MBBS",
            exam: { id: "ex-1", name: "UPSC Prelims" },
            kind: "COURSE",
            sortOrder: 0,
            isActive: true,
          },
        ],
        pagination: {},
      })),
    },
    catalogApi: {
      ...actual.catalogApi,
      getSubject: vi.fn(async (id: string) => {
        if (id === "sub-gs") {
          return {
            message: "ok",
            data: {
              id,
              name: "General Science",
              topics: [{ id: "top-gs", name: "Physics" }],
            },
          };
        }
        return {
          message: "ok",
          data: {
            id: "sub-1",
            name: "Polity",
            topics: [{ id: "top-1", name: "Parliament" }],
          },
        };
      }),
      getTopic: vi.fn(async (id: string) => ({
        message: "ok",
        data: { id, name: "Chemistry" },
      })),
    },
  };
});

vi.mock("../api", async () => {
  const actual = await vi.importActual<typeof import("../api")>("../api");
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
      updateCourseCutoffs: vi.fn(),
    },
  };
});

import { fullMockApi } from "../api";

const getPublished = vi.mocked(fullMockApi.getPublished);
const updateCourseCutoffs = vi.mocked(fullMockApi.updateCourseCutoffs);

function paramsPromise(id = "id-1") {
  const value = { id };
  return {
    status: "fulfilled" as const,
    value,
    then(onFulfilled?: (v: { id: string }) => unknown) {
      return Promise.resolve(onFulfilled ? onFulfilled(value) : value);
    },
  } as unknown as Promise<{ id: string }>;
}

function renderPage() {
  return render(<PublishedFullMockPage params={paramsPromise()} />);
}

const testItem: FullMockTestListItem = {
  id: "id-1",
  title: "UPSC Full Mock 1",
  description: "Full paper",
  totalQuestions: 100,
  durationInMinutes: 120,
  totalMarks: 200,
  isSessionWise: true,
  exam: { id: "ex-1", name: "UPSC Prelims" },
  subjectConfig: [
    {
      subject: "sub-1",
      name: "Polity",
      numberOfQuestions: 20,
      marksPerQuestion: 2,
      hasNegativeMarking: true,
      negativeMarksPerQuestion: 0.66,
      sessionTime: 30,
      questionStartIndex: 0,
      questionEndIndex: 19,
    },
    {
      subject: "sub-2",
      name: "History",
      numberOfQuestions: 20,
      marksPerQuestion: 2,
      hasNegativeMarking: false,
      negativeMarksPerQuestion: 0,
      questionStartIndex: 20,
      questionEndIndex: 39,
    },
  ],
  subjects: [
    {
      subjectId: "sub-1",
      name: "Polity",
      numberOfQuestions: 1,
      marksPerQuestion: 2,
      hasNegativeMarking: true,
      negativeMarksPerQuestion: 0.66,
      sessionTime: 30,
      questions: [
        {
          _id: "q1",
          position: 0,
          marksPerQuestion: 2,
          negativeMarking: 0.66,
          questionText: {
            en: { text: "Who elects the President?" },
            ml: { text: null },
          },
          options: [{ id: "a", type: "text", en: "Parliament" }],
          topic: "top-1",
          difficultyLevel: "easy",
        },
      ],
    },
  ],
  marksPerQuestion: 2,
  negativeMarking: 0.66,
  passingScore: 70,
  allowRetake: true,
  shuffleOptions: false,
  showResultsImmediately: true,
  isActive: true,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

describe("PublishedFullMockPage", () => {
  beforeEach(() => {
    getPublished.mockReset();
    push.mockReset();
    vi.spyOn(message, "error").mockImplementation(
      (() => undefined) as unknown as typeof message.error
    );
    vi.mocked(message.error).mockClear();
  });

  it("shows the course cut-offs card and saves edits without touching the rest of the page", async () => {
    getPublished.mockResolvedValue({
      message: "ok",
      data: {
        ...testItem,
        courseCutoffs: [{ offeringId: "off-m", cutoffMarks: 150 }],
      },
    });
    updateCourseCutoffs.mockResolvedValue({
      message: "Course cut-offs updated successfully",
      data: {
        ...testItem,
        subjects: undefined,
        courseCutoffs: [{ offeringId: "off-m", cutoffMarks: 180 }],
      },
    });
    renderPage();

    expect(await screen.findByText("Course cut-offs")).toBeInTheDocument();
    expect(await screen.findByText("150 / 200")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit cut-offs" }));
    fireEvent.change(await screen.findByLabelText("MBBS cut-off"), {
      target: { value: "180" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save cut-offs" }));

    await waitFor(() =>
      expect(updateCourseCutoffs).toHaveBeenCalledWith("id-1", [
        { offeringId: "off-m", cutoffMarks: 180 },
      ])
    );
    // the saved value is shown, and the questions loaded for the page are still there
    expect(await screen.findByText("180 / 200")).toBeInTheDocument();
    expect(screen.getByText("Who elects the President?")).toBeInTheDocument();
    expect(screen.getByText("Subjects (2)")).toBeInTheDocument();
  });

  it("shows a loader while fetching", async () => {
    getPublished.mockReturnValue(new Promise(() => {}));
    renderPage();
    await waitFor(() => expect(document.querySelector(".ant-spin")).toBeInTheDocument());
  });

  it("renders published full mock details, subjects, and questions", async () => {
    getPublished.mockResolvedValue({ message: "ok", data: testItem });
    renderPage();

    expect(await screen.findAllByText("UPSC Full Mock 1")).not.toHaveLength(0);
    expect(screen.getByText("Session-wise")).toBeInTheDocument();
    expect(screen.getByText("UPSC Prelims")).toBeInTheDocument();
    expect(screen.getByText("Subjects (2)")).toBeInTheDocument();
    expect(screen.getAllByText("Polity").length).toBeGreaterThan(0);
    expect(screen.getAllByText("-0.66").length).toBeGreaterThan(0);
    expect(screen.getByText("None")).toBeInTheDocument();
    expect(screen.getAllByText("30 mins").length).toBeGreaterThan(0);
    expect(screen.getByText("Q1–Q20")).toBeInTheDocument();
    expect(screen.getByText("Who elects the President?")).toBeInTheDocument();
    expect(getPublished).toHaveBeenCalledWith("id-1");
  });

  it("expands a question with mathpix preview", async () => {
    getPublished.mockResolvedValue({ message: "ok", data: testItem });
    renderPage();
    expect(await screen.findByText("Who elects the President?")).toBeInTheDocument();

    const expandButton = document.querySelector(
      ".ant-table-row-expand-icon"
    ) as HTMLElement | null;
    expect(expandButton).toBeTruthy();
    fireEvent.click(expandButton!);

    await waitFor(() => {
      const expanded = document.querySelector(
        ".ant-table-expanded-row"
      ) as HTMLElement | null;
      expect(expanded).toBeTruthy();
      expect(within(expanded!).getByText("Parliament")).toBeInTheDocument();
    });
  });

  it("expands a question when the row body is clicked", async () => {
    getPublished.mockResolvedValue({ message: "ok", data: testItem });
    renderPage();
    expect(await screen.findByText("Who elects the President?")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Who elects the President?"));

    await waitFor(() => {
      const expanded = document.querySelector(
        ".ant-table-expanded-row"
      ) as HTMLElement | null;
      expect(expanded).toBeTruthy();
      expect(within(expanded!).getByText("Parliament")).toBeInTheDocument();
    });
  });

  it("clips long chapter and tag names inside the row, with the full text on hover", async () => {
    const longTopic = "Electrostatics, Current Electricity and Magnetic Effects";
    const longTag = "Previous year question from a very long named source";
    getPublished.mockResolvedValue({
      message: "ok",
      data: {
        ...testItem,
        subjects: testItem.subjects!.map((subject) => ({
          ...subject,
          questions: subject.questions.map((q) => ({
            ...q,
            topic: "top-long",
            tags: [longTag],
          })),
        })),
      },
    });
    const { catalogApi } = await import("@/app/services/ezprep-api");
    vi.mocked(catalogApi.getSubject).mockResolvedValueOnce({
      message: "ok",
      data: {
        id: "sub-1",
        name: "Polity",
        topics: [{ id: "top-long", name: longTopic }],
      },
    } as never);
    renderPage();

    const topicChip = (await screen.findAllByText(longTopic))[0];
    expect(topicChip).toHaveClass("truncate", "max-w-[10rem]");
    // Tags use the shared overflow chip: the text clips inside a width-capped chip.
    const tagChip = await screen.findByText(longTag);
    expect(tagChip).toHaveClass("truncate");
    expect(tagChip.closest('[data-testid="chip"]')?.className).toMatch(/max-w-/);

    fireEvent.mouseEnter(topicChip);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(longTopic);
  });

  it("falls back when optional fields are missing", async () => {
    getPublished.mockResolvedValue({
      message: "ok",
      data: {
        ...testItem,
        title: undefined,
        exam: null,
        isSessionWise: false,
        isActive: false,
        totalMarks: undefined,
        passingScore: undefined,
        description: undefined,
        createdAt: "",
        allowRetake: false,
        shuffleOptions: true,
        showResultsImmediately: false,
        subjectConfig: [],
        subjects: undefined,
      },
    });

    renderPage();

    expect(await screen.findByText("Full Mock Test")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.getByText("Mixed")).toBeInTheDocument();
    expect(screen.getByText("No description")).toBeInTheDocument();
    expect(screen.getByText("Subjects (0)")).toBeInTheDocument();
  });

  it("navigates back to the list", async () => {
    getPublished.mockResolvedValue({ message: "ok", data: testItem });
    renderPage();
    await screen.findAllByText("UPSC Full Mock 1");
    fireEvent.click(screen.getByRole("button", { name: /back to full mock tests/i }));
    expect(push).toHaveBeenCalledWith("/admin/full-mock-tests");
  });

  it("shows the topic name for a cross-subject replacement", async () => {
    getPublished.mockResolvedValue({
      message: "ok",
      data: {
        ...testItem,
        subjects: [
          {
            ...testItem.subjects![0],
            questions: [
              {
                ...testItem.subjects![0].questions[0],
                subject: "sub-gs",
                topic: "top-gs",
              },
            ],
          },
        ],
      },
    });

    renderPage();

    expect(await screen.findByText("Physics")).toBeInTheDocument();
    expect(screen.queryByText("top-gs")).not.toBeInTheDocument();
  });

  it("shows a topic name that is not linked on the section subject", async () => {
    getPublished.mockResolvedValue({
      message: "ok",
      data: {
        ...testItem,
        subjects: [
          {
            ...testItem.subjects![0],
            questions: [
              {
                ...testItem.subjects![0].questions[0],
                subject: "sub-1",
                topic: "top-orphan",
              },
            ],
          },
        ],
      },
    });

    renderPage();

    expect(await screen.findByText("Chemistry")).toBeInTheDocument();
    expect(screen.queryByText("top-orphan")).not.toBeInTheDocument();
  });

  it("redirects when fetch fails", async () => {
    getPublished.mockRejectedValue(new Error("nope"));
    renderPage();
    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(push).toHaveBeenCalledWith("/admin/full-mock-tests");
  });
});
