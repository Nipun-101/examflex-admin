"use client";

import { Button, Tag } from "antd";
import {
  COUNSELING_NEXT_ACTION_LABELS,
  COUNSELING_NEXT_STATUS,
  COUNSELING_STATUS_LABELS,
  type CounselingRequest,
  type CounselingRequestStatus,
} from "@/app/services/ezprep-api/counseling";

const STATUS_COLORS: Record<CounselingRequestStatus, string> = {
  booked: "gold",
  acknowledged: "processing",
  responded: "blue",
  completed: "success",
};

/** Button look for the next-status CTA, keyed by the card's current status. */
const ACTION_BUTTON_STYLES: Partial<
  Record<
    CounselingRequestStatus,
    { type: "default" | "primary"; className: string }
  >
> = {
  booked: {
    type: "default",
    className:
      "!border-amber-400 !bg-amber-50 !text-amber-900 hover:!border-amber-500 hover:!bg-amber-100",
  },
  acknowledged: {
    // Plain primary: the app-wide theme makes it the console dark green.
    type: "primary",
    className: "",
  },
  responded: {
    type: "primary",
    className:
      "!border-emerald-600 !bg-emerald-600 hover:!border-emerald-700 hover:!bg-emerald-700",
  },
};

const WHO_LABELS = {
  student: "Student",
  student_and_parent: "Student + parent",
} as const;

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div className="mt-0.5 break-words text-sm text-neutral-800">{value}</div>
    </div>
  );
}

export type CounselingCardProps = {
  item: CounselingRequest;
  actionLoading?: boolean;
  onAdvanceStatus?: (next: CounselingRequestStatus) => void;
};

export function CounselingCard({
  item,
  actionLoading = false,
  onAdvanceStatus,
}: CounselingCardProps) {
  const nextStatus = COUNSELING_NEXT_STATUS[item.status];
  const actionLabel = COUNSELING_NEXT_ACTION_LABELS[item.status];
  const snapshot = item.accountSnapshot;

  return (
    <article
      className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
      data-testid="counseling-card"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="m-0 text-base font-semibold text-neutral-900">
              {item.studentName || snapshot.name || "Unnamed student"}
            </h2>
            <Tag color={STATUS_COLORS[item.status]} className="m-0">
              {COUNSELING_STATUS_LABELS[item.status]}
            </Tag>
          </div>
          <p className="mt-1 mb-0 text-xs text-neutral-500">
            Requested {formatWhen(item.createdAt)}
            {item.statusUpdatedAt
              ? ` · Status updated ${formatWhen(item.statusUpdatedAt)}`
              : ""}
          </p>
        </div>
        {nextStatus && actionLabel && onAdvanceStatus ? (
          <Button
            type={ACTION_BUTTON_STYLES[item.status]?.type ?? "primary"}
            className={
              ACTION_BUTTON_STYLES[item.status]?.className ?? ""
            }
            loading={actionLoading}
            onClick={() => onAdvanceStatus(nextStatus)}
          >
            {actionLabel}
          </Button>
        ) : null}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Detail label="Account name" value={snapshot.name} />
        <Detail label="Account email" value={snapshot.email} />
        <Detail label="Account phone" value={snapshot.phone} />
        <Detail label="User ID" value={item.userId} />
        <Detail label="Who will join" value={WHO_LABELS[item.whoWillJoin]} />
        <Detail label="Course interested in" value={item.courseInterestedIn} />
        <Detail label="Expected mark" value={item.expectedMark} />
        <Detail label="12th marks" value={item.twelfthMarks} />
        <Detail label="State" value={item.state} />
        <Detail label="Category" value={item.category} />
        <Detail label="Preferred day and time" value={item.preferredDayTime} />
        {item.contact.emailEnabled ? (
          <Detail label="Contact email" value={item.contact.email} />
        ) : null}
        {item.contact.phoneEnabled ? (
          <Detail label="Contact phone" value={item.contact.phone} />
        ) : null}
      </div>

      {item.talkAbout ? (
        <div className="mt-4 rounded-xl bg-neutral-50 px-3 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
            What they want to talk about
          </div>
          <p className="mt-1 mb-0 whitespace-pre-wrap text-sm text-neutral-800">
            {item.talkAbout}
          </p>
        </div>
      ) : null}
    </article>
  );
}
