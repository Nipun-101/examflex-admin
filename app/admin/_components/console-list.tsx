"use client";

/**
 * Shared building blocks for admin list pages (questions, equations, uploads, orders…):
 * page heading, white list card, pill search + filters, table theme, pills, icon actions,
 * and the Previous / Page N / Next footer. Pages compose these so they stay visually in sync.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import {
  ConfigProvider,
  Table,
  Tooltip,
  type SelectProps,
  type TableProps,
  type ThemeConfig,
} from "antd";
import { Loader2, Plus, Search, X, type LucideIcon } from "lucide-react";
import { Select } from "@/app/components/SearchableSelect";

export const CONSOLE_TOOLTIP_COLOR = "#173B30";

export const CONSOLE_LIST_THEME: ThemeConfig = {
  token: {
    colorPrimary: "#173B30",
    fontFamily: "inherit",
    colorBorder: "#E5E1D7",
    colorText: "#173B30",
    colorTextPlaceholder: "#5B6661",
  },
  components: {
    Table: {
      headerBg: "#F5F2EC",
      headerColor: "#173B30",
      headerSplitColor: "transparent",
      headerBorderRadius: 0,
      borderColor: "#ECE8DF",
      rowHoverBg: "#FAF8F4",
      rowSelectedBg: "#F2F6E7",
      rowSelectedHoverBg: "#EBF1DC",
      cellPaddingBlock: 14,
      cellPaddingInline: 12,
    },
    Select: {
      controlHeight: 44,
      fontSize: 15,
      optionSelectedBg: "#E3EEE5",
      optionActiveBg: "#F5F2EC",
    },
    Checkbox: {
      borderRadiusSM: 5,
      controlInteractiveSize: 18,
    },
  },
};

const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-console-green";

export const PRIMARY_PILL_CLASS = `inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-console-ink px-6 text-[15px] font-semibold text-white transition-colors hover:bg-console-ink-hover hover:text-white disabled:cursor-not-allowed disabled:bg-[#DDE3D6] disabled:text-console-muted ${FOCUS_RING}`;

/** Small text button for row-level workflow actions (Parse PDF, Fix…). */
export const ROW_ACTION_CLASS = `inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[13.5px] font-semibold transition-colors disabled:cursor-not-allowed ${FOCUS_RING}`;

export const ROW_ACTION_TONE = {
  primary:
    "bg-console-ink text-white hover:bg-console-ink-hover hover:text-white disabled:bg-[#DDE3D6] disabled:text-console-muted",
  danger:
    "border border-console-danger/30 bg-white text-console-danger hover:bg-[#FBEEEA] disabled:opacity-60",
  muted: "bg-[#EFEBE3] text-console-muted",
} as const;

/* ------------------------------------------------------------------ */
/* Page heading                                                        */
/* ------------------------------------------------------------------ */

export function ListPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <header className="min-w-0">
        <p className="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-console-green">
          {eyebrow}
        </p>
        <h1 className="m-0 mt-2 text-[34px] font-bold leading-[1.1] tracking-tight text-console-ink sm:text-[44px]">
          {title}
        </h1>
        {description ? (
          <p className="m-0 mt-3 max-w-3xl text-[15px] text-console-muted sm:text-base">
            {description}
          </p>
        ) : null}
      </header>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

export function PrimaryActionLink({
  href,
  children,
  icon: Icon = Plus,
}: {
  href: string;
  children: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <Link href={href} className={PRIMARY_PILL_CLASS}>
      <Icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Card + toolbar                                                      */
/* ------------------------------------------------------------------ */

export function ListCard({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider theme={CONSOLE_LIST_THEME}>
      <section className="mt-8 overflow-hidden rounded-[24px] border border-console-line bg-white">
        {children}
      </section>
    </ConfigProvider>
  );
}

/** Filter row at the top of the list card. Pass grid column classes for the desktop layout. */
export function ListToolbar({
  children,
  className = "xl:grid-cols-4",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 ${className}`}>
      {children}
    </div>
  );
}

export function ListSearch({
  placeholder,
  value,
  onChange,
  onSubmit,
  className = "",
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  /** Called on Enter. */
  onSubmit?: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={`relative flex min-w-0 items-center ${className}`}>
      <span className="sr-only">{placeholder}</span>
      <Search
        className="pointer-events-none absolute left-4 h-[18px] w-[18px] text-console-muted"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit?.(value);
          }
        }}
        className="h-11 w-full rounded-full border border-console-line bg-white pl-11 pr-10 text-[15px] text-console-ink outline-none transition-colors placeholder:text-console-muted/80 hover:border-console-green/30 focus:border-console-green focus:ring-2 focus:ring-console-green/[0.15] [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear"
          onClick={() => onChange("")}
          className="absolute right-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-console-muted hover:bg-console-hover hover:text-console-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-console-green"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </label>
  );
}

type FilterValue = string | number;

export type FilterSelectProps<V extends FilterValue> = Omit<
  SelectProps,
  "value" | "onChange" | "options"
> & {
  value?: V | null;
  /** Receives `null` when the selection is cleared. */
  onChange?: (value: V | null) => void;
  options: Array<{ value: V; label: ReactNode }>;
};

/** Pill-shaped filter dropdown that clips long labels. */
export function FilterSelect<V extends FilterValue = string>({
  className = "",
  value,
  onChange,
  options,
  ...props
}: FilterSelectProps<V>) {
  return (
    <Select
      popupMatchSelectWidth={false}
      {...props}
      value={value ?? undefined}
      options={options}
      onChange={(next: unknown) => onChange?.((next ?? null) as V | null)}
      className={`console-filter ${className}`}
    />
  );
}

/** Chapter-style filter that is disabled until a parent filter is picked. */
export function DependentFilter<V extends FilterValue = string>({
  enabled,
  hint,
  className = "",
  ...props
}: FilterSelectProps<V> & { enabled: boolean; hint: string }) {
  return (
    <Tooltip title={enabled ? undefined : hint} color={CONSOLE_TOOLTIP_COLOR}>
      {/* `className` lands on the wrapper so callers can control grid placement. */}
      <div className={`min-w-0 ${className}`}>
        <FilterSelect<V> {...props} disabled={!enabled} className="w-full" />
      </div>
    </Tooltip>
  );
}

/* ------------------------------------------------------------------ */
/* Table                                                               */
/* ------------------------------------------------------------------ */

export function ColumnTitle({ children }: { children: ReactNode }) {
  return (
    <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.1em] text-console-ink/80">
      {children}
    </span>
  );
}

export function EmptyCell() {
  return (
    <span className="text-console-muted" aria-label="None">
      —
    </span>
  );
}

export function TableEmptyState({
  icon: Icon,
  message,
}: {
  icon: LucideIcon;
  message: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E3EEE5] text-console-green">
        <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <p className="m-0 mt-4 text-[15px] text-console-muted">{message}</p>
    </div>
  );
}

/** antd Table with the console look: fixed layout, no built-in pagination, custom empty state. */
export function ListTable<T extends object>({
  empty,
  className = "",
  ...props
}: TableProps<T> & { empty: ReactNode }) {
  return (
    <Table<T>
      pagination={false}
      tableLayout="fixed"
      {...props}
      className={`console-table ${className}`}
      locale={{ emptyText: empty, ...props.locale }}
    />
  );
}

/** Text clipped to N lines, with the full text on hover. */
export function ClampText({
  text,
  lines = 2,
  className = "",
}: {
  text: string;
  lines?: 1 | 2 | 3;
  className?: string;
}) {
  const clamp = lines === 1 ? "truncate" : lines === 2 ? "line-clamp-2" : "line-clamp-3";
  return (
    <Tooltip
      title={text}
      color={CONSOLE_TOOLTIP_COLOR}
      placement="topLeft"
      mouseEnterDelay={0.4}
    >
      <div className={`min-w-0 break-words ${clamp} ${className}`}>{text}</div>
    </Tooltip>
  );
}

/** Uppercase subject-style label that clips with an ellipsis. */
export function SubjectLabel({ name }: { name?: string | null }) {
  if (!name) return <EmptyCell />;
  return (
    <span
      className="block truncate text-[12px] font-semibold uppercase tracking-[0.08em] text-console-ink/80"
      title={name}
    >
      {name}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Pills                                                               */
/* ------------------------------------------------------------------ */

export type PillTone = "green" | "amber" | "red" | "violet" | "blue" | "neutral" | "lime";

const PILL_TONE: Record<PillTone, { pill: string; dot: string }> = {
  green: { pill: "bg-[#E1EEE4] text-console-green", dot: "bg-console-green" },
  amber: { pill: "bg-[#FCEBD3] text-[#9A5A12]", dot: "bg-[#D98A1C]" },
  red: { pill: "bg-[#F6E0DA] text-console-danger", dot: "bg-console-danger" },
  violet: { pill: "bg-[#E8E6F6] text-[#4B4396]", dot: "bg-[#6A5FC1]" },
  blue: { pill: "bg-[#E3EBF6] text-[#2F5488]", dot: "bg-[#3E6DB0]" },
  neutral: { pill: "bg-[#EFEBE3] text-console-muted", dot: "bg-console-muted/60" },
  lime: { pill: "bg-console-lime text-console-ink", dot: "bg-console-ink" },
};

export function Pill({
  tone,
  children,
  dot = true,
  spinning = false,
}: {
  tone: PillTone;
  children: ReactNode;
  dot?: boolean;
  /** Replace the dot with a spinner for in-progress states. */
  spinning?: boolean;
}) {
  const style = PILL_TONE[tone];
  return (
    <span
      className={`inline-flex h-6 max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12.5px] font-semibold ${style.pill}`}
    >
      {spinning ? (
        <Loader2 className="h-3 w-3 shrink-0 animate-spin" aria-hidden="true" />
      ) : dot ? (
        <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`} />
      ) : null}
      <span className="truncate">{children}</span>
    </span>
  );
}

const DIFFICULTY_TONE: Record<string, PillTone> = {
  easy: "green",
  medium: "amber",
  hard: "red",
};

export function DifficultyPill({ level }: { level?: string | null }) {
  if (!level) return <EmptyCell />;
  return (
    <Pill tone={DIFFICULTY_TONE[level] ?? "neutral"}>
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </Pill>
  );
}

/* ------------------------------------------------------------------ */
/* Row icon actions                                                    */
/* ------------------------------------------------------------------ */

const ICON_BUTTON_BASE = `inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-console-line bg-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`;

const ICON_TONE = {
  default:
    "text-console-ink hover:border-console-green/40 hover:bg-[#F5F2EC] hover:text-console-ink",
  danger: "text-console-danger hover:border-console-danger/40 hover:bg-[#FBEEEA]",
} as const;

export function IconActionLink({
  href,
  label,
  tooltip,
  icon: Icon,
  tone = "default",
}: {
  href: string;
  label: string;
  tooltip?: string;
  icon: LucideIcon;
  tone?: keyof typeof ICON_TONE;
}) {
  return (
    <Tooltip title={tooltip ?? label} color={CONSOLE_TOOLTIP_COLOR}>
      <Link href={href} aria-label={label} className={`${ICON_BUTTON_BASE} ${ICON_TONE[tone]}`}>
        <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
      </Link>
    </Tooltip>
  );
}

export function IconActionButton({
  label,
  tooltip,
  icon: Icon,
  tone = "default",
  onClick,
  loading = false,
  disabled = false,
}: {
  label: string;
  tooltip?: string;
  icon: LucideIcon;
  tone?: keyof typeof ICON_TONE;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  return (
    <Tooltip title={tooltip ?? label} color={CONSOLE_TOOLTIP_COLOR}>
      <button
        type="button"
        aria-label={label}
        aria-busy={loading || undefined}
        onClick={onClick}
        disabled={disabled || loading}
        className={`${ICON_BUTTON_BASE} ${ICON_TONE[tone]}`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        )}
      </button>
    </Tooltip>
  );
}

export function RowActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-1.5">{children}</div>;
}

/* ------------------------------------------------------------------ */
/* Footer pager                                                        */
/* ------------------------------------------------------------------ */

const PAGER_BUTTON = `inline-flex h-10 items-center rounded-full border border-console-line bg-white px-5 text-[15px] font-semibold text-console-ink transition-colors hover:border-console-green/40 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-console-muted/60 disabled:hover:border-console-line ${FOCUS_RING}`;

export function ListFooter({
  page,
  pageSize,
  total,
  shownCount,
  noun,
  onPageChange,
  onPageSizeChange,
  pageSizes = [10, 20, 50],
}: {
  page: number;
  pageSize: number;
  total: number;
  /** Rows on the current page. */
  shownCount: number;
  /** Plural noun, e.g. "questions". */
  noun: string;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizes?: number[];
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, (page - 1) * pageSize + shownCount);

  return (
    <div className="flex flex-col gap-3 border-t border-console-line bg-[#F9F7F3] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="m-0 text-[15px] text-console-muted">
        {total === 0
          ? `No ${noun} to show`
          : `Showing ${first.toLocaleString()}–${last.toLocaleString()} of ${total.toLocaleString()} ${noun}`}
      </p>
      <nav aria-label="Pagination" className="flex flex-wrap items-center gap-2 sm:gap-3">
        {onPageSizeChange ? (
          <Select
            aria-label="Rows per page"
            className="console-page-size"
            value={pageSize}
            onChange={(value) => onPageSizeChange(Number(value))}
            options={pageSizes.map((size) => ({ value: size, label: `${size} / page` }))}
            showSearch={false}
          />
        ) : null}
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={PAGER_BUTTON}
        >
          Previous
        </button>
        <span className="whitespace-nowrap px-1 text-[15px] font-semibold text-console-ink">
          Page {page} <span className="font-normal text-console-muted">of {totalPages}</span>
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className={PAGER_BUTTON}
        >
          Next
        </button>
      </nav>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section-based pages (create form + list cards)                       */
/* ------------------------------------------------------------------ */

/**
 * Theme for pages built from antd Cards (paper generators, catalog CRUD). Unlike the list
 * theme it leaves form control sizes alone, so existing forms keep their layout.
 */
export const CONSOLE_SHELL_THEME: ThemeConfig = {
  token: {
    colorPrimary: "#173B30",
    colorLink: "#2F6B4F",
    colorLinkHover: "#173B30",
    fontFamily: "inherit",
    colorTextHeading: "#173B30",
  },
  components: {
    Table: CONSOLE_LIST_THEME.components?.Table,
    Card: {
      headerFontSize: 17,
      headerHeight: 60,
    },
    Checkbox: CONSOLE_LIST_THEME.components?.Checkbox,
  },
};

/**
 * Page title outside the content, then the page's existing antd Cards restyled as rounded
 * white sections (see `.console-shell` in globals.css). Behaviour inside is untouched.
 */
export function ConsolePageShell({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="console-shell w-full text-console-ink">
      <ListPageHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
      <ConfigProvider theme={CONSOLE_SHELL_THEME}>
        <div className="mt-8 space-y-6">{children}</div>
      </ConfigProvider>
    </div>
  );
}
