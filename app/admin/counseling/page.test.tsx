import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CounselingRequest } from "@/app/services/ezprep-api/counseling";
import CounselingPage from "./page";

vi.mock("@/app/services/ezprep-api", async () => {
  const actual = await vi.importActual<typeof import("@/app/services/ezprep-api")>(
    "@/app/services/ezprep-api"
  );
  return {
    ...actual,
    counselingApi: {
      list: vi.fn(),
      updateStatus: vi.fn(),
    },
  };
});

vi.mock("@/components/ConfirmModal", () => ({
  showConfirmModal: ({ onConfirm }: { onConfirm: () => void }) => {
    onConfirm();
  },
}));

import { counselingApi } from "@/app/services/ezprep-api";

const list = vi.mocked(counselingApi.list);
const updateStatus = vi.mocked(counselingApi.updateStatus);

function makeItem(
  overrides: Partial<CounselingRequest> = {}
): CounselingRequest {
  return {
    id: "req-1",
    userId: "user-1",
    accountSnapshot: {
      name: "Account Riya",
      email: "account@example.com",
      phone: null,
    },
    studentName: "Riya Sharma",
    whoWillJoin: "student",
    courseInterestedIn: "NEET UG",
    expectedMark: null,
    twelfthMarks: null,
    state: "Maharashtra",
    category: null,
    preferredDayTime: null,
    talkAbout: null,
    contact: {
      emailEnabled: true,
      email: "riya@example.com",
      phoneEnabled: false,
      phone: null,
    },
    status: "booked",
    statusUpdatedAt: "2026-04-01T10:00:00.000Z",
    createdAt: "2026-04-01T09:00:00.000Z",
    updatedAt: "2026-04-01T10:00:00.000Z",
    ...overrides,
  };
}

const pagination = {
  total: 1,
  page: 1,
  limit: 12,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
};

describe("CounselingPage", () => {
  beforeEach(() => {
    list.mockReset();
    updateStatus.mockReset();
    vi.spyOn(message, "error").mockImplementation(
      (() => undefined) as unknown as typeof message.error
    );
    vi.spyOn(message, "success").mockImplementation(
      (() => undefined) as unknown as typeof message.success
    );
    vi.mocked(message.error).mockClear();
    vi.mocked(message.success).mockClear();
  });

  it("lists counseling requests", async () => {
    list.mockResolvedValue({
      message: "ok",
      data: [makeItem()],
      pagination,
    });

    render(<CounselingPage />);

    expect(await screen.findByText("Riya Sharma")).toBeInTheDocument();
    expect(list).toHaveBeenCalledWith({ page: 1, limit: 12 });
  });

  it("filters by status", async () => {
    const user = userEvent.setup();
    list.mockResolvedValue({
      message: "ok",
      data: [makeItem()],
      pagination,
    });

    render(<CounselingPage />);
    await screen.findByText("Riya Sharma");

    await user.click(screen.getByRole("combobox", { name: "Filter by status" }));
    await user.click(await screen.findByText("Acknowledged"));

    await waitFor(() => {
      expect(list).toHaveBeenCalledWith({
        page: 1,
        limit: 12,
        status: "acknowledged",
      });
    });
  });

  it("advances status from the card CTA", async () => {
    const user = userEvent.setup();
    list.mockResolvedValue({
      message: "ok",
      data: [makeItem()],
      pagination,
    });
    updateStatus.mockResolvedValue({
      message: "ok",
      data: makeItem({ status: "acknowledged" }),
    });

    render(<CounselingPage />);
    await screen.findByText("Riya Sharma");

    await user.click(screen.getByRole("button", { name: "Acknowledge" }));

    await waitFor(() => {
      expect(updateStatus).toHaveBeenCalledWith("req-1", "acknowledged");
    });
    expect(message.success).toHaveBeenCalled();
  });

  it("shows an empty state", async () => {
    list.mockResolvedValue({
      message: "ok",
      data: [],
      pagination: { ...pagination, total: 0 },
    });

    render(<CounselingPage />);

    expect(
      await screen.findByText("No counseling requests match this filter.")
    ).toBeInTheDocument();
  });

  it("toasts when the list fails", async () => {
    list.mockRejectedValue(new Error("boom"));

    render(<CounselingPage />);

    await waitFor(() => {
      expect(message.error).toHaveBeenCalled();
    });
  });
});
