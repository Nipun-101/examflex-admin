"use client";

import { useEffect, useState } from "react";
import { message } from "antd";
import {
  ArrowLeftRight,
  Ban,
  CircleCheck,
  Clock,
  Crown,
  FileCheck,
  IndianRupee,
  Landmark,
  OctagonAlert,
  Receipt,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Tag,
  TrendingUp,
  Undo2,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { PageLoader } from "@/app/components/PageLoader";
import {
  accountingApi,
  formatEzPrepError,
  formatPaiseAsRupees,
  type AccountingOverview,
  type MoneyTotal,
} from "@/app/services/ezprep-api";

type Tone = "green" | "lime" | "violet" | "amber" | "red" | "rose" | "sand" | "orange";

/** Icon tile colours, matching the dashboard. */
const TONE_TILE: Record<Tone, string> = {
  green: "bg-[#E3EEE5] text-[#2F6B4F]",
  lime: "bg-[#EEF3D3] text-[#56651B]",
  violet: "bg-[#E8E6F6] text-[#4B4396]",
  amber: "bg-[#FCEBD3] text-[#9A5A12]",
  red: "bg-[#F6E0DA] text-[#B5432F]",
  rose: "bg-[#F7E1E5] text-[#B23A58]",
  sand: "bg-[#F1ECE1] text-[#7A5A2E]",
  orange: "bg-[#F9E2D6] text-[#B4482A]",
};

type SplitPart = { label: string; value: number; color: string };

type AccountingCard = {
  key: string;
  label: string;
  value: string;
  description: string;
  detail?: string;
  icon: LucideIcon;
  tone: Tone;
  /** Dark highlighted card (the design's lead metric). */
  featured?: boolean;
  /** Proportion bar with a legend under the description. */
  split?: { label: string; parts: SplitPart[] };
};

type AccountingSection = {
  title: string;
  intro: string;
  cards: AccountingCard[];
};

function formatCount(value: number): string {
  return value.toLocaleString("en-IN");
}

function formatMoney(rows: MoneyTotal[]): string {
  if (rows.length === 0) {
    return formatPaiseAsRupees(0);
  }
  return rows
    .map((row) =>
      row.currency === "INR"
        ? formatPaiseAsRupees(row.amountPaise)
        : `${row.currency} ${formatPaiseAsRupees(row.amountPaise).replace(/^₹/, "")}`
    )
    .join(" · ");
}

function formatUpdated(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "recently";
  }
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function card(partial: AccountingCard): AccountingCard {
  return partial;
}

function sections(overview: AccountingOverview): AccountingSection[] {
  const { people, entitlements, orders, catalog, money } = overview;
  return [
    {
      title: "People",
      intro: "Paid access is a usable entitlement, not the profile plan.",
      cards: [
        card({
          key: "paid-users",
          label: "Paid users",
          value: formatCount(people.paidUsers),
          description: "Distinct accounts with a usable entitlement right now.",
          icon: Crown,
          tone: "green",
        }),
        card({
          key: "free-users",
          label: "Free users",
          value: formatCount(people.freeUsers),
          description: "Learners without a usable entitlement.",
          icon: User,
          tone: "lime",
        }),
        card({
          key: "learners",
          label: "Learners",
          value: formatCount(people.learners),
          description: "Registered students, including paid and free.",
          icon: Users,
          tone: "violet",
          split: {
            label: "Paid and free learners",
            parts: [
              { label: "Paid", value: people.paidUsers, color: "bg-console-green" },
              { label: "Free", value: people.freeUsers, color: "bg-[#C9DE9A]" },
            ],
          },
        }),
      ],
    },
    {
      title: "Entitlements",
      intro: "Grants expire when their end date passes. The status stays active until then.",
      cards: [
        card({
          key: "issued",
          label: "Entitlements issued",
          value: formatCount(entitlements.issued),
          description: "Every grant ever created, including expired and revoked.",
          icon: ShieldCheck,
          tone: "lime",
          featured: true,
          split: {
            label: "Entitlements by status",
            parts: [
              { label: "Active", value: entitlements.active, color: "bg-[#C4DD8A]" },
              { label: "Expired", value: entitlements.expired, color: "bg-[#E9B35A]" },
              { label: "Revoked", value: entitlements.revoked, color: "bg-[#E98A73]" },
            ],
          },
        }),
        card({
          key: "active",
          label: "Active now",
          value: formatCount(entitlements.active),
          description: "Grants that still unlock content.",
          icon: CircleCheck,
          tone: "green",
        }),
        card({
          key: "expired",
          label: "Entitlements expired",
          value: formatCount(entitlements.expired),
          description: "Grants whose end date has passed. Lifetime grants stay out.",
          icon: Clock,
          tone: "amber",
        }),
        card({
          key: "revoked",
          label: "Entitlements revoked",
          value: formatCount(entitlements.revoked),
          description: "Grants withdrawn by a refund or an admin.",
          icon: Ban,
          tone: "red",
        }),
      ],
    },
    {
      title: "Orders",
      intro: "A refunded order is the reversed purchase. There is no separate revoked status.",
      cards: [
        card({
          key: "paid-orders",
          label: "Orders received",
          value: formatCount(orders.paid),
          description: "Paid orders that have not been refunded.",
          detail: `Pending payment ${formatCount(orders.pending)} · Failed ${formatCount(orders.failed)}`,
          icon: Receipt,
          tone: "sand",
        }),
        card({
          key: "refunded-orders",
          label: "Orders revoked",
          value: formatCount(orders.refunded),
          description: "Paid orders reversed after a completed refund.",
          detail: `Checkout expired ${formatCount(orders.expired)} · Cancelled ${formatCount(orders.cancelled)}`,
          icon: Undo2,
          tone: "rose",
        }),
      ],
    },
    {
      title: "Catalog",
      intro: "Deleted products are left out of these counts.",
      cards: [
        card({
          key: "products",
          label: "Products",
          value: formatCount(catalog.products.published),
          description: "Published products learners can buy.",
          detail: `Draft ${formatCount(catalog.products.draft)} · Archived ${formatCount(catalog.products.archived)}`,
          icon: ShoppingBag,
          tone: "violet",
        }),
        card({
          key: "offers",
          label: "Offers",
          value: formatCount(catalog.offers.active),
          description: "Active prices currently available on a product.",
          detail: `Inactive ${formatCount(catalog.offers.inactive)}`,
          icon: Tag,
          tone: "rose",
        }),
      ],
    },
    {
      title: "Money",
      intro: "Amounts are totals in rupees. Duplicate captures are not treated as revenue.",
      cards: [
        card({
          key: "payments",
          label: "Payments received",
          value: formatMoney(money.paymentsReceived),
          description: "Primary payments that were captured, including ones later refunded.",
          icon: IndianRupee,
          tone: "green",
        }),
        card({
          key: "refunds",
          label: "Refunds issued",
          value: formatMoney(money.refundsIssued),
          description: "Completed refunds of real orders, including partial refunds.",
          icon: Undo2,
          tone: "red",
        }),
        card({
          key: "net",
          label: "Net receipts",
          value: formatMoney(money.netReceipts),
          description: "Payments received minus order refunds.",
          icon: TrendingUp,
          tone: "lime",
        }),
        card({
          key: "tax",
          label: "Tax on paid orders",
          value: formatMoney(money.taxOnPaidOrders),
          description: "GST still attached to orders that have not been refunded.",
          icon: Landmark,
          tone: "violet",
        }),
        card({
          key: "duplicate-refunds",
          label: "Duplicate capture refunds",
          value: formatMoney(money.duplicateCaptureRefunds),
          description: "Money returned for a second capture. Not included in refunds issued.",
          icon: ArrowLeftRight,
          tone: "orange",
        }),
        card({
          key: "invoices",
          label: "Invoices issued",
          value: formatCount(money.invoicesIssued),
          description: "Tax invoices generated for paid orders.",
          icon: FileCheck,
          tone: "sand",
        }),
      ],
    },
  ];
}

const GRID_BY_COUNT: Record<number, string> = {
  2: "sm:grid-cols-2 xl:grid-cols-3",
  3: "sm:grid-cols-2 xl:grid-cols-3",
  4: "sm:grid-cols-2 xl:grid-cols-4",
};

function SplitBar({ split, featured }: { split: NonNullable<AccountingCard["split"]>; featured: boolean }) {
  const total = split.parts.reduce((sum, part) => sum + Math.max(0, part.value), 0);
  return (
    <div className="mt-5">
      <div
        role="img"
        aria-label={`${split.label}: ${split.parts
          .map((part) => `${part.label} ${formatCount(part.value)}`)
          .join(", ")}`}
        className={`flex h-2.5 w-full overflow-hidden rounded-full ${
          featured ? "bg-white/[0.15]" : "bg-[#EEF0E8]"
        }`}
      >
        {total > 0
          ? split.parts.map((part) =>
              part.value > 0 ? (
                <span
                  key={part.label}
                  className={`h-full ${part.color}`}
                  style={{ width: `${(part.value / total) * 100}%` }}
                />
              ) : null
            )
          : null}
      </div>
      <ul
        aria-hidden="true"
        className={`m-0 mt-3 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-[14px] font-semibold ${
          featured ? "text-white" : "text-console-ink"
        }`}
      >
        {split.parts.map((part) => (
          <li key={part.label} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${part.color}`} />
            {part.label} {formatCount(part.value)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AccountingCardView({ card: item }: { card: AccountingCard }) {
  const Icon = item.icon;
  const featured = item.featured === true;
  return (
    <article
      className={`flex h-full min-w-0 flex-col rounded-[20px] border p-5 sm:p-6 ${
        featured ? "border-console-ink bg-console-ink text-white" : "border-console-line bg-white"
      }`}
    >
      <span
        className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          featured ? "bg-console-lime text-console-ink" : TONE_TILE[item.tone]
        }`}
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <p
        className={`m-0 mt-5 text-[15px] font-semibold ${featured ? "text-white" : "text-console-ink"}`}
      >
        {item.label}
      </p>
      <p
        className={`m-0 mt-1 break-words text-[32px] font-bold leading-[1.1] tracking-tight tabular-nums sm:text-[40px] ${
          featured ? "text-console-lime" : "text-console-ink"
        }`}
      >
        {item.value}
      </p>
      <p
        className={`m-0 mt-2 text-[15px] leading-relaxed ${
          featured ? "text-white/80" : "text-console-muted"
        }`}
      >
        {item.description}
      </p>
      {item.detail ? (
        <ul className="m-0 mt-4 flex list-none flex-wrap gap-2 p-0">
          {item.detail.split(" · ").map((part) => (
            <li
              key={part}
              className={`inline-flex h-7 items-center rounded-full px-3 text-[13px] font-semibold ${
                featured ? "bg-white/10 text-white" : "bg-[#F5F2EC] text-console-ink"
              }`}
            >
              {part}
            </li>
          ))}
        </ul>
      ) : null}
      {item.split ? (
        <>
          {/* Keeps the bar at the bottom so cards in a row line up. */}
          <div aria-hidden="true" className="flex-1" />
          <SplitBar split={item.split} featured={featured} />
        </>
      ) : null}
    </article>
  );
}

// Accounting page for admin users to view the accounting overview
export default function AccountingPage() {
  const [overview, setOverview] = useState<AccountingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await accountingApi.getOverview();
        if (!cancelled) {
          setOverview(response.data);
        }
      } catch (reason) {
        if (!cancelled) {
          const text = formatEzPrepError(reason, "Failed to load accounting");
          setError(text);
          message.error(text);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <PageLoader />;
  }

  if (error || !overview) {
    return (
      <div className="flex items-start gap-3 rounded-[20px] border border-[#EFC9BF] bg-[#FBEEEA] px-5 py-4 text-[15px] text-console-danger">
        <OctagonAlert className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
        <p className="m-0 min-w-0 break-words">{error ?? "Failed to load accounting"}</p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-clip text-console-ink">
      <header>
        <h1 className="m-0 text-[34px] font-bold leading-[1.1] tracking-tight text-console-ink sm:text-[44px]">
          Accounting
        </h1>
        <p className="m-0 mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-console-line bg-white px-3.5 py-1.5 text-[14px] text-console-ink">
          <RefreshCw className="h-4 w-4 shrink-0 text-console-green" strokeWidth={1.75} aria-hidden="true" />
          <span className="min-w-0 break-words">
            Updated {formatUpdated(overview.computedAt)} · refreshes hourly
          </span>
        </p>
      </header>

      {sections(overview).map((section) => {
        const headingId = `accounting-${section.title.toLowerCase()}`;
        return (
          <section key={section.title} aria-labelledby={headingId} className="mt-10 min-w-0">
            <h2
              id={headingId}
              className="m-0 text-lg font-bold uppercase tracking-[0.02em] text-console-ink"
            >
              {section.title}
            </h2>
            <p className="m-0 mt-1 break-words text-[15px] text-console-muted">{section.intro}</p>
            <div
              className={`mt-4 grid grid-cols-1 gap-4 sm:gap-5 ${
                GRID_BY_COUNT[section.cards.length] ?? "sm:grid-cols-2 xl:grid-cols-3"
              }`}
            >
              {section.cards.map((item) => (
                <AccountingCardView key={item.key} card={item} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
