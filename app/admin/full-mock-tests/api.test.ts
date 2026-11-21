import { beforeEach, describe, expect, it, vi } from "vitest";
import { EzPrepApiError, ezPrepApiClient } from "@/app/services/ezprep-api";
import { describeGenerateDraftError, fullMockApi } from "./api";

vi.mock("@/app/services/ezprep-api", async () => {
  const actual = await vi.importActual<typeof import("@/app/services/ezprep-api")>(
    "@/app/services/ezprep-api"
  );
  return {
    ...actual,
    ezPrepApiClient: {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const get = vi.mocked(ezPrepApiClient.get);
const post = vi.mocked(ezPrepApiClient.post);
const patch = vi.mocked(ezPrepApiClient.patch);
const del = vi.mocked(ezPrepApiClient.delete);

beforeEach(() => {
  get.mockReset().mockResolvedValue({ message: "ok", data: [] });
  post.mockReset().mockResolvedValue({ message: "ok", data: {} });
  patch.mockReset().mockResolvedValue({ message: "ok", data: {} });
  del.mockReset().mockResolvedValue({ message: "ok" });
});

describe("fullMockApi", () => {
  it("covers exams, drafts, search, replace, publish, discard, and published tests", async () => {
    await fullMockApi.listExams({ page: 1, search: "upsc" });
    await fullMockApi.createDraft("e1");
    await fullMockApi.listDrafts({ examId: "e1", page: 1 });
    await fullMockApi.getDraft("d1");
    await fullMockApi.searchQuestions({
      subjectId: "s1",
      page: 1,
      allowCrossSubject: true,
    });
    await fullMockApi.replaceQuestion("d1", 3, "q9", {
      allowCrossSubject: true,
    });
    await fullMockApi.publishDraft("d1", { title: "Paper 1" });
    await fullMockApi.discardDraft("d1");
    await fullMockApi.listPublished({ examId: "e1" });
    await fullMockApi.getPublished("m1");

    expect(get).toHaveBeenCalledWith("/v1/full-mock-tests/exams", {
      searchParams: { page: 1, search: "upsc" },
    });
    expect(post).toHaveBeenCalledWith("/v1/full-mock-tests/drafts", { examId: "e1" });
    expect(get).toHaveBeenCalledWith("/v1/full-mock-tests/drafts", {
      searchParams: { examId: "e1", page: 1 },
    });
    expect(get).toHaveBeenCalledWith("/v1/full-mock-tests/drafts/d1");
    expect(get).toHaveBeenCalledWith("/v1/full-mock-tests/questions", {
      searchParams: { subjectId: "s1", page: 1, allowCrossSubject: true },
    });
    expect(patch).toHaveBeenCalledWith(
      "/v1/full-mock-tests/drafts/d1/questions/3",
      { questionId: "q9", allowCrossSubject: true }
    );
    expect(post).toHaveBeenCalledWith("/v1/full-mock-tests/drafts/d1/publish", {
      title: "Paper 1",
    });
    expect(del).toHaveBeenCalledWith("/v1/full-mock-tests/drafts/d1");
    expect(get).toHaveBeenCalledWith("/v1/full-mock-tests", {
      searchParams: { examId: "e1" },
    });
    expect(get).toHaveBeenCalledWith("/v1/full-mock-tests/m1");
  });

  it("updates course cut-offs with a PATCH that carries only the cut-offs", async () => {
    await fullMockApi.updateCourseCutoffs("m1", [
      { offeringId: "o1", cutoffMarks: 620 },
      { offeringId: "o2", cutoffMarks: null },
    ]);
    expect(patch).toHaveBeenCalledWith("/v1/full-mock-tests/m1/course-cutoffs", {
      courseCutoffs: [
        { offeringId: "o1", cutoffMarks: 620 },
        { offeringId: "o2", cutoffMarks: null },
      ],
    });
  });

  it("publishes with optional course cut-offs in the payload", async () => {
    await fullMockApi.publishDraft("d1", {
      title: "Paper 1",
      courseCutoffs: [{ offeringId: "o1", cutoffMarks: 620 }],
    });
    expect(post).toHaveBeenCalledWith("/v1/full-mock-tests/drafts/d1/publish", {
      title: "Paper 1",
      courseCutoffs: [{ offeringId: "o1", cutoffMarks: 620 }],
    });
  });
});

describe("createDraft difficulty split", () => {
  it("sends only examId when no split is given", async () => {
    await fullMockApi.createDraft("e1");
    expect(post).toHaveBeenLastCalledWith("/v1/full-mock-tests/drafts", {
      examId: "e1",
    });
  });

  it("sends the per-subject split when provided", async () => {
    const split = [{ subjectId: "s1", easy: 5, medium: 3, hard: 2 }];
    await fullMockApi.createDraft("e1", split);
    expect(post).toHaveBeenLastCalledWith("/v1/full-mock-tests/drafts", {
      examId: "e1",
      difficultyDistribution: split,
    });
  });
});

describe("describeGenerateDraftError", () => {
  const apiError = (data: unknown, status = 400) =>
    new EzPrepApiError("Bad Request", status, "/v1/full-mock-tests/drafts", data);

  it("lists every shortage with subject, difficulty and counts", () => {
    const result = describeGenerateDraftError(
      apiError({
        message: "Not enough questions for the chosen difficulty split.",
        error: "BANK_SHORTAGE",
        details: [
          { message: "Physics – hard: need 10, only 6 available" },
          { message: "Chemistry – easy: need 5, only 0 available" },
        ],
      })
    );
    expect(result.summary).toBe(
      "Not enough questions for the chosen difficulty split"
    );
    expect(result.lines).toEqual([
      "Physics – hard: need 10, only 6 available",
      "Chemistry – easy: need 5, only 0 available",
    ]);
  });

  it("lists invalid-split problems", () => {
    const result = describeGenerateDraftError(
      apiError({
        error: "DIFFICULTY_DISTRIBUTION_INVALID",
        details: [{ message: "Physics: easy + medium + hard is 9 but the exam needs 10" }],
      })
    );
    expect(result.summary).toBe("The difficulty split is invalid");
    expect(result.lines).toHaveLength(1);
  });

  it("falls back to the generic formatter for other errors", () => {
    expect(describeGenerateDraftError(new Error("boom"))).toEqual({
      summary: "Failed to generate draft",
      lines: [],
    });
    const legacy = describeGenerateDraftError(
      apiError({
        message: "Not enough questions for subject",
        error: "BANK_SHORTAGE",
        details: { subjectName: "Physics", needed: 25, available: 12 },
      })
    );
    expect(legacy.lines).toEqual([]);
    expect(legacy.summary).toContain("Not enough questions for subject");
  });
});
