import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CounselingRequest } from "@/app/services/ezprep-api/counseling";
import { CounselingCard } from "./counseling-card";

function makeItem(
  overrides: Partial<CounselingRequest> = {}
): CounselingRequest {
  return {
    id: "req-1",
    userId: "user-1",
    accountSnapshot: {
      name: "Account Riya",
      email: "account@example.com",
      phone: "+911111111111",
    },
    studentName: "Riya Sharma",
    whoWillJoin: "student",
    courseInterestedIn: "NEET UG",
    expectedMark: "540 out of 720",
    twelfthMarks: "92%",
    state: "Maharashtra",
    category: "General",
    preferredDayTime: "Sunday evening",
    talkAbout: "College options",
    contact: {
      emailEnabled: true,
      email: "riya@example.com",
      phoneEnabled: true,
      phone: "+919876543210",
    },
    status: "booked",
    statusUpdatedAt: "2026-04-01T10:00:00.000Z",
    createdAt: "2026-04-01T09:00:00.000Z",
    updatedAt: "2026-04-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("CounselingCard", () => {
  it("shows booking details and the next status CTA", async () => {
    const user = userEvent.setup();
    const onAdvanceStatus = vi.fn();
    render(
      <CounselingCard item={makeItem()} onAdvanceStatus={onAdvanceStatus} />
    );

    expect(screen.getByText("Riya Sharma")).toBeInTheDocument();
    expect(screen.getByText("Booked")).toBeInTheDocument();
    expect(screen.getByText("College options")).toBeInTheDocument();
    expect(screen.getByText("riya@example.com")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Acknowledge" }));
    expect(onAdvanceStatus).toHaveBeenCalledWith("acknowledged");
  });

  it("hides the CTA when the request is completed", () => {
    render(<CounselingCard item={makeItem({ status: "completed" })} />);
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("uses distinct button styles per action", () => {
    const onAdvanceStatus = vi.fn();
    const { rerender } = render(
      <CounselingCard item={makeItem()} onAdvanceStatus={onAdvanceStatus} />
    );
    expect(screen.getByRole("button", { name: "Acknowledge" })).toHaveClass(
      "!bg-amber-50"
    );

    rerender(
      <CounselingCard
        item={makeItem({ status: "acknowledged" })}
        onAdvanceStatus={onAdvanceStatus}
      />
    );
    expect(
      screen.getByRole("button", { name: "Mark responded" })
    ).toHaveClass("bg-blue-600");

    rerender(
      <CounselingCard
        item={makeItem({ status: "responded" })}
        onAdvanceStatus={onAdvanceStatus}
      />
    );
    expect(
      screen.getByRole("button", { name: "Mark completed" })
    ).toHaveClass("!bg-emerald-600");
  });
});


