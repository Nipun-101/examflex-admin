import { ezPrepApiClient } from "./browser-client";
import { ApiItemResponse, ApiListResponse } from "./envelope";

export type CounselingRequestStatus =
  | "booked"
  | "acknowledged"
  | "responded"
  | "completed";

export type CounselingWhoWillJoin = "student" | "student_and_parent";

export interface CounselingAccountSnapshot {
  name: string | null;
  email: string | null;
  phone: string | null;
}

export interface CounselingContact {
  emailEnabled: boolean;
  email: string | null;
  phoneEnabled: boolean;
  phone: string | null;
}

export interface CounselingRequest {
  id: string;
  userId: string;
  accountSnapshot: CounselingAccountSnapshot;
  studentName: string | null;
  whoWillJoin: CounselingWhoWillJoin;
  courseInterestedIn: string | null;
  expectedMark: string | null;
  twelfthMarks: string | null;
  state: string | null;
  category: string | null;
  preferredDayTime: string | null;
  talkAbout: string | null;
  contact: CounselingContact;
  status: CounselingRequestStatus;
  statusUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListCounselingParams {
  page?: number;
  limit?: number;
  status?: CounselingRequestStatus;
}

export const COUNSELING_STATUS_LABELS: Record<CounselingRequestStatus, string> =
  {
    booked: "Booked",
    acknowledged: "Acknowledged",
    responded: "Responded",
    completed: "Completed",
  };

export const COUNSELING_NEXT_STATUS: Partial<
  Record<CounselingRequestStatus, CounselingRequestStatus>
> = {
  booked: "acknowledged",
  acknowledged: "responded",
  responded: "completed",
};

export const COUNSELING_NEXT_ACTION_LABELS: Partial<
  Record<CounselingRequestStatus, string>
> = {
  booked: "Acknowledge",
  acknowledged: "Mark responded",
  responded: "Mark completed",
};

export const counselingApi = {
  list(searchParams?: ListCounselingParams) {
    const params: Record<string, string | number | undefined> = {};
    if (searchParams?.page != null) params.page = searchParams.page;
    if (searchParams?.limit != null) params.limit = searchParams.limit;
    if (searchParams?.status) params.status = searchParams.status;

    return ezPrepApiClient.get<ApiListResponse<CounselingRequest>>(
      "/v1/admin/counseling",
      { searchParams: params }
    );
  },

  updateStatus(id: string, status: CounselingRequestStatus) {
    return ezPrepApiClient.patch<ApiItemResponse<CounselingRequest>>(
      `/v1/admin/counseling/${id}/status`,
      { status }
    );
  },
};
