"use client";

import { useRef, useState, type ReactNode } from "react";
import { Tooltip } from "antd";

export type ChipTone = "neutral" | "exam";

const TONE: Record<ChipTone, string> = {
  neutral: "bg-[#EFEBE3] text-console-ink",
  exam: "bg-[#E8E6F6] text-[#3F3790] uppercase tracking-[0.03em]",
};

const CHIP_BASE =
  "inline-flex h-6 min-w-0 items-center rounded-full px-2.5 text-[12.5px] font-semibold leading-none whitespace-nowrap";

const TOOLTIP_COLOR = "#173B30";

/**
 * One chip that clips long text with an ellipsis. The tooltip with the full text only
 * opens when the label is actually clipped, so short labels don't get a redundant hover.
 */
export function TruncatedChip({
  label,
  tone = "neutral",
  maxWidthClass = "max-w-[160px]",
}: {
  label: string;
  tone?: ChipTone;
  maxWidthClass?: string;
}) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <Tooltip
      title={label}
      color={TOOLTIP_COLOR}
      open={open}
      onOpenChange={(next) => {
        const node = textRef.current;
        setOpen(next && !!node && node.scrollWidth > node.clientWidth);
      }}
    >
      <span
        className={`${CHIP_BASE} ${TONE[tone]} ${maxWidthClass}`}
        data-testid="chip"
      >
        <span ref={textRef} className="min-w-0 truncate">
          {label}
        </span>
      </span>
    </Tooltip>
  );
}

/**
 * Shows the first item as a chip and folds the rest into a "+N" chip whose tooltip lists them.
 * Always a single line, so rows keep their height whatever the data looks like.
 */
export function OverflowChips({
  items,
  tone = "neutral",
  noun,
  empty,
  maxWidthClass,
}: {
  items: string[];
  tone?: ChipTone;
  /** Plural noun for the "+N" chip's accessible label, e.g. "tags". */
  noun: string;
  empty: ReactNode;
  /** Override the first chip's max width. By default it fills the cell, leaving room for "+N". */
  maxWidthClass?: string;
}) {
  if (items.length === 0) {
    return <>{empty}</>;
  }

  const [first, ...rest] = items;

  return (
    <span className="flex w-full min-w-0 flex-nowrap items-center gap-1">
      <TruncatedChip
        label={first}
        tone={tone}
        // Reserve room for the "+N" chip (up to "+99") so both always fit on one line.
        maxWidthClass={
          maxWidthClass ?? (rest.length > 0 ? "max-w-[calc(100%-48px)]" : "max-w-full")
        }
      />
      {rest.length > 0 ? (
        <Tooltip
          color={TOOLTIP_COLOR}
          title={
            <ul className="m-0 flex max-h-60 list-none flex-col gap-1 overflow-y-auto p-0 py-0.5 text-[13px]">
              {rest.map((item) => (
                <li key={item} className="break-words">
                  {item}
                </li>
              ))}
            </ul>
          }
        >
          <span
            tabIndex={0}
            role="button"
            aria-label={`${rest.length} more ${noun}: ${rest.join(", ")}`}
            className={`${CHIP_BASE} shrink-0 cursor-default border border-console-line bg-white !normal-case text-console-ink outline-none focus-visible:ring-2 focus-visible:ring-console-green`}
          >
            +{rest.length}
          </span>
        </Tooltip>
      ) : null}
    </span>
  );
}
