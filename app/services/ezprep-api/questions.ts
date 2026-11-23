import { ezPrepApiClient } from "./browser-client";
import {
  ApiItemResponse,
  ApiListResponse,
  ApiMessageResponse,
  omitEmpty,
  omitUndefined,
} from "./envelope";
import { NamedRef } from "./catalog";

export interface QuestionImage {
  key: string;
  bucket: string;
  region?: string;
  contentType?: string;
  size?: number;
  lastModified?: string | Date;
  url?: string;
}

export interface QuestionTextLocale {
  text?: string | null;
  image?: QuestionImage | null;
}

export interface QuestionOption {
  id: string;
  type: string;
  en?: string | null;
  ml?: string | null;
  image?: QuestionImage | null;
}

export interface QuestionExplanation {
  en?: string | null;
  ml?: string | null;
  image?: QuestionImage | null;
  images?: QuestionImage[];
}

export type CitationStatus = "pending" | "done" | "failed" | "skipped";

/** One NCERT chunk cited by a question (saved) or suggested by a search. */
export interface QuestionCitation {
  chunkId: string;
  rank: number;
  title?: string;
  /** Full chunk text (Mathpix markdown). */
  content?: string;
  chunkIndex?: number;
  images?: string[];
  sourceDoc?: string;
  /** sourceDoc without ".pdf" and with spaces for underscores. */
  chapterName?: string;
  documentType?: string;
  grade?: string;
  /** Page inside the source PDF. */
  pageStart?: number;
  ncertPageOffset?: number;
  /** Printed NCERT page: pageStart + ncertPageOffset. */
  pageNumber?: number;
  score?: number;
  similarity?: number;
  selectedBy?: "auto" | "admin";
}

export interface QuestionCitations {
  citationStatus: CitationStatus | null;
  citations: QuestionCitation[];
  citationsUpdatedAt: string | null;
}

export interface CitationSearchResult {
  mapped: boolean;
  vectorSubjectKey: string | null;
  query: string;
  results: QuestionCitation[];
}

export interface Question {
  id: string;
  questionText: {
    en?: QuestionTextLocale;
    ml?: QuestionTextLocale;
  };
  optionType?: string;
  options: QuestionOption[];
  explanation?: QuestionExplanation;
  correctAnswer: string;
  subject?: NamedRef | string | null;
  topic?: NamedRef | string | null;
  exams?: Array<NamedRef | string>;
  tagIds?: string[];
  tags?: string[];
  difficultyLevel?: string;
  source?: string;
  citations?: QuestionCitation[];
  citationStatus?: CitationStatus | null;
  citationsUpdatedAt?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type QuestionPayload = {
  questionText: Question["questionText"];
  optionType?: string;
  options: QuestionOption[];
  explanation?: QuestionExplanation;
  correctAnswer: string;
  subject?: string | null;
  topic?: string | null;
  exams?: string[];
  tagIds?: string[];
  difficultyLevel?: string;
};

export const questionsApi = {
  list(searchParams?: {
    page?: number;
    limit?: number;
    subjectId?: string;
    topicId?: string;
    examId?: string;
    search?: string;
  }) {
    return ezPrepApiClient.get<ApiListResponse<Question>>("/v1/questions", {
      searchParams,
    });
  },

  get(id: string) {
    return ezPrepApiClient.get<ApiItemResponse<Question>>(`/v1/questions/${id}`);
  },

  create(body: QuestionPayload) {
    return ezPrepApiClient.post<ApiItemResponse<Question>>(
      "/v1/questions",
      omitEmpty(body as Record<string, unknown>)
    );
  },

  update(id: string, body: QuestionPayload) {
    return ezPrepApiClient.patch<ApiItemResponse<Question>>(
      `/v1/questions/${id}`,
      omitUndefined(body as Record<string, unknown>)
    );
  },

  delete(id: string) {
    return ezPrepApiClient.delete<ApiMessageResponse>(`/v1/questions/${id}`);
  },

  getCitations(id: string) {
    return ezPrepApiClient.get<ApiItemResponse<QuestionCitations>>(
      `/v1/questions/${id}/citations`
    );
  },

  /** Fresh NCERT search for one question; `q` overrides the query text. */
  searchCitations(id: string, params?: { limit?: number; q?: string }) {
    const searchParams: { limit?: number; q?: string } = {};
    if (params?.limit !== undefined) searchParams.limit = params.limit;
    if (params?.q) searchParams.q = params.q;
    return ezPrepApiClient.get<ApiItemResponse<CitationSearchResult>>(
      `/v1/questions/${id}/citations/search`,
      { searchParams }
    );
  },

  /** Saves chunks in rank order (first = rank 1). An empty list clears them. */
  saveCitations(id: string, chunkIds: string[]) {
    return ezPrepApiClient.put<ApiItemResponse<QuestionCitations>>(
      `/v1/questions/${id}/citations`,
      { chunkIds }
    );
  },

  /** Re-runs the automatic top citations, replacing any admin selection. */
  refreshCitations(id: string) {
    return ezPrepApiClient.post<ApiItemResponse<QuestionCitations>>(
      `/v1/questions/${id}/citations/refresh`
    );
  },
};
