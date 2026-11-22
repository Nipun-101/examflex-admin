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
  /** Signed URL for the optional picture; absent when there is none. */
  imageUrl?: string | null;
  /** Stored metadata for the optional picture (admin responses). */
  image?: EquationImage;
  subject: NamedRef | string;
  topic: NamedRef | string;
  exams: Array<NamedRef | string>;
  /** Display priority; higher numbers are listed first. */
  sortOrder?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Stored image metadata (admins only; students get `imageUrl`). */
export interface EquationImage {
  key: string;
  bucket: string;
  region?: string;
  contentType?: string;
  size?: number;
  lastModified?: string;
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
  /** Higher numbers appear first in the list. Defaults to 0 on the API. */
  sortOrder?: number;
  /** Optional picture. On update: `null` removes it, omitted leaves it as is. */
  image?: EquationImage | null;
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
