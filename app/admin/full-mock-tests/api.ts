import { ezPrepApiClient } from "@/app/services/ezprep-api";
import type {
  ApiItemResponse,
  ApiListResponse,
  ApiMessageResponse,
} from "@/app/services/ezprep-api";
import type {
  CourseCutoffUpdate,
  DraftResponse,
  DraftListItem,
  FullMockExamListItem,
  FullMockTestListItem,
  PublishDraftPayload,
  PublishDraftResult,
  SearchQuestionItem,
  SubjectDifficultySplit,
} from "./types";

import { EzPrepApiError, formatEzPrepError } from "@/app/services/ezprep-api";

export { formatEzPrepError };

export interface GenerateDraftError {
  /** Headline for the toast / alert. */
  summary: string;
  /** One line per problem (e.g. per subject and difficulty). May be empty. */
  lines: string[];
}

/**
 * Turns a failed draft generation into something an admin can act on.
 * The API returns one `message` per problem inside `details` for
 * BANK_SHORTAGE and DIFFICULTY_DISTRIBUTION_INVALID; list them individually.
 */
export function describeGenerateDraftError(error: unknown): GenerateDraftError {
  const fallback = "Failed to generate draft";
  if (error instanceof EzPrepApiError && error.status === 400) {
    const data =
      error.data && typeof error.data === "object"
        ? (error.data as Record<string, unknown>)
        : null;
    const code = data?.error ?? data?.code;
    const details = data?.details;
    if (
      (code === "BANK_SHORTAGE" || code === "DIFFICULTY_DISTRIBUTION_INVALID") &&
      Array.isArray(details)
    ) {
      const lines = details
        .map((item) =>
          item && typeof item === "object"
            ? (item as Record<string, unknown>).message
            : undefined
        )
        .filter((line): line is string => typeof line === "string");
      if (lines.length > 0) {
        return {
          summary:
            code === "BANK_SHORTAGE"
              ? "Not enough questions for the chosen difficulty split"
              : "The difficulty split is invalid",
          lines,
        };
      }
    }
  }
  return { summary: formatEzPrepError(error, fallback), lines: [] };
}

const BASE = "/v1/full-mock-tests";

export const fullMockApi = {
  listExams(searchParams: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    return ezPrepApiClient.get<ApiListResponse<FullMockExamListItem>>(
      `${BASE}/exams`,
      { searchParams }
    );
  },

  /**
   * `difficultyDistribution` is the admin's explicit easy/medium/hard split per
   * exam subject. Omit it to let the server sample without difficulty control.
   */
  createDraft(examId: string, difficultyDistribution?: SubjectDifficultySplit[]) {
    return ezPrepApiClient.post<ApiItemResponse<DraftResponse>>(
      `${BASE}/drafts`,
      difficultyDistribution?.length
        ? { examId, difficultyDistribution }
        : { examId }
    );
  },

  listDrafts(searchParams: {
    examId?: string;
    page?: number;
    limit?: number;
  }) {
    return ezPrepApiClient.get<ApiListResponse<DraftListItem>>(
      `${BASE}/drafts`,
      { searchParams }
    );
  },

  getDraft(id: string) {
    return ezPrepApiClient.get<ApiItemResponse<DraftResponse>>(
      `${BASE}/drafts/${id}`
    );
  },

  searchQuestions(searchParams: {
    subjectId?: string;
    draftId?: string;
    search?: string;
    topicId?: string;
    difficultyLevel?: string;
    page?: number;
    limit?: number;
    allowCrossSubject?: boolean;
  }) {
    return ezPrepApiClient.get<ApiListResponse<SearchQuestionItem>>(
      `${BASE}/questions`,
      { searchParams }
    );
  },

  replaceQuestion(
    draftId: string,
    position: number,
    questionId: string,
    options?: { allowCrossSubject?: boolean }
  ) {
    return ezPrepApiClient.patch<ApiItemResponse<DraftResponse>>(
      `${BASE}/drafts/${draftId}/questions/${position}`,
      {
        questionId,
        ...(options?.allowCrossSubject ? { allowCrossSubject: true } : {}),
      }
    );
  },

  publishDraft(draftId: string, payload: PublishDraftPayload) {
    return ezPrepApiClient.post<ApiItemResponse<PublishDraftResult>>(
      `${BASE}/drafts/${draftId}/publish`,
      payload
    );
  },

  discardDraft(draftId: string) {
    return ezPrepApiClient.delete<ApiMessageResponse>(
      `${BASE}/drafts/${draftId}`
    );
  },

  listPublished(searchParams: {
    examId?: string;
    page?: number;
    limit?: number;
  }) {
    return ezPrepApiClient.get<ApiListResponse<FullMockTestListItem>>(BASE, {
      searchParams,
    });
  },

  getPublished(id: string) {
    return ezPrepApiClient.get<ApiItemResponse<FullMockTestListItem>>(
      `${BASE}/${id}`
    );
  },

  /**
   * Set or clear per-course cut-off marks on a published paper. The API
   * writes only `courseCutoffs`; nothing else on the paper can change here.
   */
  updateCourseCutoffs(id: string, courseCutoffs: CourseCutoffUpdate[]) {
    return ezPrepApiClient.patch<ApiItemResponse<FullMockTestListItem>>(
      `${BASE}/${id}/course-cutoffs`,
      { courseCutoffs }
    );
  },
};
