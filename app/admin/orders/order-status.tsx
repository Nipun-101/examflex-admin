"use client";

import type { OrderStatus } from "@/app/services/ezprep-api";
import { Pill, type PillTone } from "../_components/console-list";

export const ORDER_STATUS_STYLE: Record<OrderStatus, { tone: PillTone; label: string }> = {
  CREATED: { tone: "neutral", label: "Created" },
  PENDING_PAYMENT: { tone: "amber", label: "Pending payment" },
  PAID: { tone: "green", label: "Paid" },
  FAILED: { tone: "red", label: "Failed" },
  EXPIRED: { tone: "neutral", label: "Expired" },
  CANCELLED: { tone: "neutral", label: "Cancelled" },
  REFUNDED: { tone: "violet", label: "Refunded" },
};

/** Order status as a coloured pill; unknown values show as-is. */
export function OrderStatusPill({ status }: { status: string }) {
  const style = ORDER_STATUS_STYLE[status as OrderStatus] ?? {
    tone: "neutral" as const,
    label: status,
  };
  return <Pill tone={style.tone}>{style.label}</Pill>;
}
