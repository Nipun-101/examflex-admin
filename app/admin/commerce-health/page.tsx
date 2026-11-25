"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeftRight,
  ArrowRight,
  CircleHelp,
  Clock,
  Copy,
  DatabaseZap,
  Eye,
  FileClock,
  FileText,
  FileX,
  Flag,
  History,
  Info,
  MapPinOff,
  OctagonAlert,
  RotateCcw,
  ShieldAlert,
  ShoppingBag,
  TriangleAlert,
  Undo2,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import {
  WEBHOOK_REENABLE_NOTE,
  commerceHealthApi,
  healthCards,
  type CommerceHealthReport,
  type HealthCardModel,
} from "@/app/services/ezprep-api/commerce-health";
import { formatEzPrepError } from "@/app/services/ezprep-api";
import { PageLoader } from "@/app/components/PageLoader";

const FLAG_LABELS: Record<keyof CommerceHealthReport["flags"], string> = {
  commerceEnabled: "Commerce enabled",
  paymentProvider: "Payment provider",
  instanceId: "Instance id",
  invoicesEnabled: "Invoices enabled",
  reconciliationEnabled: "Reconciliation enabled",
  accessEnforcementMode: "Access enforcement mode",
  webhookRetryWindowMinutes: "Webhook retry window (minutes)",
  lateCaptureWatchHours: "Late capture watch (hours)",
  reconciliationBatch: "Reconciliation batch",
  reconciliationMaxAttempts: "Reconciliation max attempts",
  refundUnknownWindowMinutes: "Refund unknown window (minutes)",
};

type Tone = "violet" | "amber" | "green" | "orange" | "red" | "rose" | "sand";

/** Icon tile colours, matching the dashboard and list pages. */
const TONE_TILE: Record<Tone, string> = {
  violet: "bg-[#E8E6F6] text-[#4B4396]",
  amber: "bg-[#FCEBD3] text-[#9A5A12]",
  green: "bg-[#E3EEE5] text-[#2F6B4F]",
  orange: "bg-[#F9E2D6] text-[#B4482A]",
  red: "bg-[#F6E0DA] text-[#B5432F]",
  rose: "bg-[#F7E1E5] text-[#B23A58]",
  sand: "bg-[#F1ECE1] text-[#7A5A2E]",
};

const CARD_META: Record<string, { description: string; icon: LucideIcon; tone: Tone }> = {
  pendingPastWindow: {
    description:
      "Orders still waiting after the usual payment window. They were not paid or closed in time.",
    icon: Clock,
    tone: "violet",
  },
  needsReview: {
    description:
      "Orders flagged for someone to check by hand. Open one to see why it needs a decision.",
    icon: TriangleAlert,
    tone: "amber",
  },
  underLateWatch: {
    description:
      "Paid orders still inside the 72-hour late-capture watch. A payment can still arrive.",
    icon: Eye,
    tone: "green",
  },
  lateCaptures7d: {
    description:
      "Payments captured later than usual, in the last 7 days. The money arrived after the order had moved on.",
    icon: History,
    tone: "orange",
  },
  paidUnprovisioned: {
    description:
      "Paid orders that have not unlocked the purchase yet. The learner paid, but access was not granted.",
    icon: ShoppingBag,
    tone: "red",
  },
  paidWithoutInvoice: {
    description:
      "Paid orders that still have no invoice. The sale is complete, but the bill was not created.",
    icon: FileText,
    tone: "rose",
  },
  invoiceWithoutPdf: {
    description:
      "Invoices created without a PDF. The invoice exists, but there is no file to download.",
    icon: FileX,
    tone: "rose",
  },
  invoicesIssuedLate: {
    description:
      "Invoices that went out later than expected. The bill was created after the usual time.",
    icon: FileClock,
    tone: "violet",
  },
  redundantPurchases: {
    description:
      "A second buy of something the learner already has. They paid again for access they already own.",
    icon: Copy,
    tone: "amber",
  },
  duplicates: {
    description:
      "The same payment was captured more than once. The extra capture should be refunded, not treated as a new sale.",
    icon: ArrowLeftRight,
    tone: "orange",
  },
  refundsUnknownOutcome: {
    description:
      "Refunds that were sent, with no final result yet. It is not clear whether the money went back.",
    icon: CircleHelp,
    tone: "violet",
  },
  externalRefunds7d: {
    description:
      "Refunds started outside this admin, in the last 7 days. They were made in the payment dashboard, not here.",
    icon: Undo2,
    tone: "orange",
  },
  partialExternalRefunds: {
    description:
      "Only part of the payment was refunded outside this admin. The learner got some of the money back, not the full amount.",
    icon: RotateCcw,
    tone: "orange",
  },
  refundsOnUnpaidOrders7d: {
    description:
      "A refund landed on an order that was never paid. Money was returned for a purchase that did not complete.",
    icon: OctagonAlert,
    tone: "red",
  },
  webhookIgnored: {
    description:
      "Payment notices skipped in the last 24 hours. They belonged to another copy of the app, or to a payment this app does not have.",
    icon: Webhook,
    tone: "green",
  },
  sellerStateMismatches: {
    description:
      "The seller state on the order does not match the invoice. Tax may be filed against the wrong state.",
    icon: MapPinOff,
    tone: "amber",
  },
  indexWarnings: {
    description:
      "A required index is missing. Some order lists may be slow or incomplete until it is added.",
    icon: DatabaseZap,
    tone: "sand",
  },
  enforcementWarnings: {
    description:
      "Paid access may stay open until enforcement is turned on. Learners can still open paid papers without buying them.",
    icon: ShieldAlert,
    tone: "red",
  },
};

export default function CommerceHealthPage() {
  const [report, setReport] = useState<CommerceHealthReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    commerceHealthApi
      .get()
      .then((response) => {
        if (!cancelled) setReport(response.data);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(formatEzPrepError(reason, "Failed to load commerce health"));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-[20px] border border-[#EFC9BF] bg-[#FBEEEA] px-5 py-4 text-[15px] text-console-danger">
        <OctagonAlert className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
        <p className="m-0 min-w-0 break-words">{error}</p>
      </div>
    );
  }
  if (!report) {
    return (
      <div aria-label="Loading commerce health">
        <PageLoader />
      </div>
    );
  }

  const healthy = report.status === "ok";

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-clip text-console-ink">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="m-0 text-[34px] font-bold leading-[1.1] tracking-tight text-console-ink sm:text-[44px]">
          Commerce health
        </h1>
        <span
          className={`inline-flex h-8 items-center gap-2 rounded-full px-3.5 text-[14px] font-semibold ${
            healthy ? "bg-[#E1EEE4] text-console-green" : "bg-[#F6E0DA] text-console-danger"
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${healthy ? "bg-console-green" : "bg-console-danger"}`}
          />
          {report.status}
        </span>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-3">
        {healthCards(report).map((item) => (
          <HealthCardView key={item.key} card={item} />
        ))}
      </div>

      <Section icon={Webhook} tone="green" title="Webhooks">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-8">
          <dl className="m-0 min-w-0">
            <InfoRow label="Last processed">{formatWhen(report.webhook.lastWebhookProcessedAt)}</InfoRow>
            <InfoRow label="Signature rejections">
              {report.webhook.signatureRejections1h} in the last hour,{" "}
              {report.webhook.signatureRejections24h} in 24 hours
            </InfoRow>
            <InfoRow label="Failed / ignored (24 hours)">
              {report.webhook.failed24h} failed, {report.webhook.ignored24h} ignored
            </InfoRow>
            <InfoRow label="Silent while paid">
              <span
                className={`inline-flex h-7 items-center rounded-full px-3 text-[13px] font-semibold ${
                  report.webhook.webhookSilentWhilePaid
                    ? "bg-[#F6E0DA] text-console-danger"
                    : "bg-[#E1EEE4] text-console-green"
                }`}
              >
                {report.webhook.webhookSilentWhilePaid ? "Yes" : "No"}
              </span>
            </InfoRow>
          </dl>
          <div className="flex min-w-0 items-start gap-3 self-start rounded-2xl bg-[#F0F3E6] px-5 py-4">
            <Info className="mt-1 h-[18px] w-[18px] shrink-0 text-console-green" strokeWidth={1.75} aria-hidden="true" />
            <p className="m-0 min-w-0 text-[14.5px] leading-[1.7] text-console-ink/[0.85]">
              {WEBHOOK_REENABLE_NOTE}
            </p>
          </div>
        </div>
      </Section>

      <Section icon={Flag} tone="violet" title="Effective flags">
        <dl className="m-0 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(Object.keys(FLAG_LABELS) as Array<keyof CommerceHealthReport["flags"]>).map((key) => (
            <FlagTile key={key} label={FLAG_LABELS[key]} value={report.flags[key]} />
          ))}
        </dl>
      </Section>
    </div>
  );
}

function HealthCardView({ card }: { card: HealthCardModel }) {
  const meta = CARD_META[card.key];
  const Icon = meta?.icon ?? Info;
  const needsAttention = card.count > 0;

  return (
    <article className="flex h-full min-w-0 flex-col rounded-[20px] border border-console-line bg-white p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            TONE_TILE[meta?.tone ?? "sand"]
          }`}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <h3 className="m-0 min-w-0 flex-1 break-words text-[17px] font-bold leading-snug text-console-ink">
          {card.title}
        </h3>
        <span
          className={`inline-flex h-11 min-w-[44px] shrink-0 items-center justify-center rounded-full px-2.5 text-[18px] font-bold tabular-nums leading-none ${
            needsAttention
              ? "bg-console-danger text-white"
              : "border border-console-line bg-[#F5F2EC] text-console-ink"
          }`}
        >
          {card.count}
        </span>
      </div>

      <p className="m-0 mt-4 text-[14.5px] leading-relaxed text-console-muted">
        {meta?.description ?? "Something in commerce needs a look."}
      </p>

      {card.detail ? (
        <p className="m-0 mt-3 break-words text-[14px] font-medium leading-6 text-console-ink">
          {card.detail}
        </p>
      ) : null}

      {/* Pushes the oldest-row and actions to the bottom so cards in a row line up. */}
      <div aria-hidden="true" className="min-h-[16px] flex-1" />

      <div className="flex items-center justify-between gap-3 rounded-xl bg-[#F5F2EC] px-4 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-console-ink/80">
          Oldest
        </span>
        <span className="min-w-0 break-words text-right text-[14px] font-semibold text-console-ink">
          {card.oldestAt ? formatWhen(card.oldestAt) : "—"}
        </span>
      </div>

      {card.orderNumbers.length > 0 ? (
        <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
          {card.orderNumbers.map((orderNumber) => (
            <li key={orderNumber} className="min-w-0 max-w-full">
              <Link
                href={`/admin/orders?search=${encodeURIComponent(orderNumber)}`}
                className="inline-flex max-w-full min-h-9 items-center break-all rounded-full bg-[#E3EEE5] px-3.5 py-1 text-[13px] font-semibold text-console-green underline decoration-console-green/40 underline-offset-4 transition-colors hover:bg-[#D3E6D7] hover:text-console-ink"
              >
                {orderNumber}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {card.flag ? (
        <Link
          href={`/admin/orders?flag=${card.flag}`}
          className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 self-start rounded-full border border-console-line bg-white px-5 text-[14px] font-semibold text-console-ink transition-colors hover:border-console-ink-hover/50 hover:text-console-ink-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-console-green sm:w-auto"
        >
          Filtered orders
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : null}
    </article>
  );
}

function Section({
  icon: Icon,
  tone,
  title,
  children,
}: {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-8 min-w-0 overflow-hidden rounded-[24px] border border-console-line bg-white">
      <div className="flex items-center gap-3 border-b border-[#ECE8DF] px-5 py-4 sm:px-7 sm:py-5">
        <span
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONE_TILE[tone]}`}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <h2 className="m-0 text-[20px] font-bold text-console-ink">{title}</h2>
      </div>
      <div className="px-5 py-5 sm:px-7 sm:py-6">{children}</div>
    </section>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-[#ECE8DF] py-4 first:pt-1 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <dt className="shrink-0 text-[14.5px] text-console-muted">{label}</dt>
      <dd className="m-0 min-w-0 break-words text-[14.5px] font-semibold text-console-ink sm:text-right">
        {children}
      </dd>
    </div>
  );
}

function FlagTile({ label, value }: { label: string; value: boolean | number | string }) {
  const isBoolean = typeof value === "boolean";
  return (
    <div className="min-w-0 rounded-xl bg-[#F5F2EC] px-4 py-3">
      <dt className="text-[13px] leading-5 text-console-muted">{label}</dt>
      <dd className="m-0 mt-1 flex min-w-0 items-center gap-2 text-[19px] font-bold text-console-ink">
        {isBoolean ? (
          <span
            aria-hidden="true"
            className={`h-2 w-2 shrink-0 rounded-full ${value ? "bg-console-green" : "bg-console-danger"}`}
          />
        ) : null}
        <span className="min-w-0 break-words">{formatFlagValue(value)}</span>
      </dd>
    </div>
  );
}

function formatFlagValue(value: boolean | number | string): string {
  if (typeof value === "boolean") return value ? "On" : "Off";
  return String(value);
}

function formatWhen(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN");
}
