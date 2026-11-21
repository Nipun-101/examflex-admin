"use client";

import { Tag, Tooltip } from "antd";

/**
 * Chapter/topic chip that stays inside its table cell: long names are clipped
 * with an ellipsis and the full name shows on hover.
 */
export function TopicTag({ name }: { name: string }) {
  return (
    <Tooltip title={name}>
      <Tag color="purple" className="max-w-[10rem] truncate align-bottom">
        {name}
      </Tag>
    </Tooltip>
  );
}
