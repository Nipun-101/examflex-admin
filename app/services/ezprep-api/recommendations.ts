import { ezPrepApiClient } from "./browser-client";
import {
  ApiItemResponse,
  ApiListResponse,
  omitEmpty,
  omitUndefined,
} from "./envelope";

export type RecommendationKind = "COURSE" | "INSTITUTION";

export interface RecommendationExamRef {
  id: string;
  name: string;
}

export interface RecommendationOffering {
  id: string;
  exam: RecommendationExamRef;
  kind: RecommendationKind;
  parentOfferingId?: string;
  title: string;
  subtitle?: string;
  description?: string;
  /** @deprecated Legacy value; pathways now use per-mock cut-off marks. */
  minPercent?: number;
  /** @deprecated Legacy value; pathways now use per-mock cut-off marks. */
  comfortPercent?: number;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RecommendationOfferingPayload {
  exam: string;
  kind?: RecommendationKind;
  parentOffering?: string;
  title: string;
  subtitle?: string;
  description?: string;
  /** @deprecated Not sent by the admin UI; cut-offs are set per full mock. */
  minPercent?: number;
  /** @deprecated Not sent by the admin UI; cut-offs are set per full mock. */
  comfortPercent?: number | null;
  sortOrder?: number;
  isActive?: boolean;
}

export const recommendationsApi = {
  list(searchParams?: {
    page?: number;
    limit?: number;
    examId?: string;
    kind?: RecommendationKind;
    activeOnly?: boolean;
    search?: string;
  }) {
    return ezPrepApiClient.get<ApiListResponse<RecommendationOffering>>(
      "/v1/recommendations",
      { searchParams }
    );
  },

  get(id: string) {
    return ezPrepApiClient.get<ApiItemResponse<RecommendationOffering>>(
      `/v1/recommendations/${id}`
    );
  },

  create(body: RecommendationOfferingPayload) {
    return ezPrepApiClient.post<ApiItemResponse<RecommendationOffering>>(
      "/v1/recommendations",
      omitEmpty({ ...body } as unknown as Record<string, unknown>)
    );
  },

  update(id: string, body: Partial<RecommendationOfferingPayload>) {
    return ezPrepApiClient.patch<ApiItemResponse<RecommendationOffering>>(
      `/v1/recommendations/${id}`,
      omitUndefined({ ...body } as unknown as Record<string, unknown>)
    );
  },

  delete(id: string) {
    return ezPrepApiClient.delete<ApiItemResponse<RecommendationOffering>>(
      `/v1/recommendations/${id}`
    );
  },
};
