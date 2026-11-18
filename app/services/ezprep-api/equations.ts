import { ezPrepApiClient } from "./browser-client";
import {
  ApiItemResponse,
  ApiListResponse,
  ApiMessageResponse,
  omitEmpty,
  omitUndefined,
} from "./envelope";
import { NamedRef } from "./catalog";

export interface Equation {
  id: string;
  title: string;
  shortDescription: string;
  equation: string;
  longDescription?: string;
  mnemonic?: string;
  bulletPoints: string[];
  subject: NamedRef | string;
  topic: NamedRef | string;
  exams: Array<NamedRef | string>;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type EquationPayload = {
  title: string;
  shortDescription: string;
  equation: string;
  longDescription?: string;
  mnemonic?: string;
  bulletPoints?: string[];
  subject: string;
  topic: string;
  exams: string[];
};

export const equationsApi = {
  list(searchParams?: {
    page?: number;
    limit?: number;
    subjectId?: string;
    topicId?: string;
    examId?: string;
    search?: string;
  }) {
    return ezPrepApiClient.get<ApiListResponse<Equation>>("/v1/equation-book", {
      searchParams,
    });
  },

  get(id: string) {
    return ezPrepApiClient.get<ApiItemResponse<Equation>>(
      `/v1/equation-book/${id}`
    );
  },

  create(body: EquationPayload) {
    return ezPrepApiClient.post<ApiItemResponse<Equation>>(
      "/v1/equation-book",
      omitEmpty(body as Record<string, unknown>)
    );
  },

  update(id: string, body: Partial<EquationPayload>) {
    return ezPrepApiClient.patch<ApiItemResponse<Equation>>(
      `/v1/equation-book/${id}`,
      omitUndefined(body as Record<string, unknown>)
    );
  },

  delete(id: string) {
    return ezPrepApiClient.delete<ApiMessageResponse>(
      `/v1/equation-book/${id}`
    );
  },
};
