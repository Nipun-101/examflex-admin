"use client";

import { Tooltip } from "antd";

/**
 * Chapter/topic chip that stays inside its table cell: long names are clipped
 * with an ellipsis and the full name shows on hover. Styled like the console chips.
 */
export function TopicTag({ name }: { name: string }) {
  return (
    <Tooltip title={name} color="#173B30">
      <span className="inline-block h-6 max-w-[10rem] truncate rounded-full bg-[#EFEBE3] px-2.5 align-middle text-[12.5px] font-semibold leading-6 text-console-ink">
        {name}
      </span>
    </Tooltip>
  );
}
