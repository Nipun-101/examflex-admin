"use client";

/**
 * Building blocks for admin detail pages (published papers, drafts…): white sections with an
 * icon header, label/value tiles that reflow from 4 columns down to 1, and yes/no pills.
 * Use inside `ConsolePageShell` so tables pick up the console theme and phone scrolling.
 */

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Pill } from "./console-list";

export type SectionTone = "green" | "violet" | "amber" | "lime" | "sand" | "rose";

const SECTION_TONE: Record<SectionTone, string> = {
  green: "bg-[#E3EEE5] text-[#2F6B4F]",
  violet: "bg-[#E8E6F6] text-[#4B4396]",
  amber: "bg-[#FCEBD3] text-[#9A5A12]",
  lime: "bg-[#EEF3D3] text-[#56651B]",
  sand: "bg-[#F1ECE1] text-[#7A5A2E]",
  rose: "bg-[#F7E1E5] text-[#B23A58]",
};

/**
 * Rounded white section. `flush` drops the body padding so a table runs edge to edge
 * (like the list pages); the table then scrolls sideways inside the section on phones.
 */
export function DetailSection({
  title,
  icon: Icon,
  tone = "green",
  extra,
  flush = false,
  children,
}: {
  title: ReactNode;
  icon?: LucideIcon;
  tone?: SectionTone;
  extra?: ReactNode;
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[24px] border border-console-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ECE8DF] px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {Icon ? (
            <span
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${SECTION_TONE[tone]}`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </span>
          ) : null}
          <h2 className="m-0 min-w-0 break-words text-[18px] font-bold text-console-ink">{title}</h2>
        </div>
        {extra ? <div className="flex flex-wrap items-center gap-2">{extra}</div> : null}
      </div>
      <div className={flush ? "" : "px-5 py-5 sm:px-6"}>{children}</div>
    </section>
  );
}

/** Responsive grid of detail tiles: 1 column on phones, up to 4 on wide screens. */
export function DetailGrid({ children }: { children: ReactNode }) {
  return (
    <dl className="m-0 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</dl>
  );
}

export function DetailItem({
  label,
  children,
  wide = false,
}: {
  label: ReactNode;
  children: ReactNode;
  /** Span the full row (long text such as a description). */
  wide?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-xl bg-[#F5F2EC] px-4 py-3 ${
        wide ? "sm:col-span-2 xl:col-span-4" : ""
      }`}
    >
      <dt className="text-[13px] leading-5 text-console-muted">{label}</dt>
      <dd className="m-0 mt-1 min-w-0 break-words text-[15px] font-semibold text-console-ink">
        {children}
      </dd>
    </div>
  );
}

export function YesNoPill({ value }: { value: boolean | undefined | null }) {
  return value ? <Pill tone="green">Yes</Pill> : <Pill tone="neutral">No</Pill>;
}

const DRAFT_STATUS: Record<string, { tone: Parameters<typeof Pill>[0]["tone"]; label: string; spinning?: boolean }> = {
  REVIEW: { tone: "amber", label: "In review" },
  GENERATING: { tone: "blue", label: "Generating", spinning: true },
  PUBLISHING: { tone: "blue", label: "Publishing", spinning: true },
  PUBLISHED: { tone: "green", label: "Published" },
  DISCARDED: { tone: "neutral", label: "Discarded" },
};

/** Status of a paper draft (chapter-wise, full mock, sprint). Unknown values show as-is. */
export function DraftStatusPill({ status }: { status: string }) {
  const style = DRAFT_STATUS[status] ?? { tone: "neutral" as const, label: status };
  return (
    <Pill tone={style.tone} spinning={style.spinning}>
      {style.label}
    </Pill>
  );
}
