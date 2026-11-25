"use client";

import { ConfigProvider, Pagination, Spin, message } from "antd";
import { Search, Users, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  formatEzPrepError,
  usersApi,
  type AppUser,
  type AppUsersActiveSummary,
} from "@/app/services/ezprep-api";
import { excludeAdmins } from "./helpers";
import { UserCard } from "./user-card";

const DEFAULT_PAGE_SIZE = 12;

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [activeSummary, setActiveSummary] = useState<AppUsersActiveSummary | null>(
    null
  );
  const [summaryLoading, setSummaryLoading] = useState(true);
  const fetchGeneration = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setSummaryLoading(true);
    void usersApi
      .activeSummary()
      .then((response) => {
        if (!cancelled) setActiveSummary(response.data);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setActiveSummary(null);
        message.error(formatEzPrepError(error, "Failed to load active users"));
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchUsers = useCallback(async () => {
    const generation = ++fetchGeneration.current;
    setLoading(true);
    try {
      const response = await usersApi.list({
        page,
        limit: pageSize,
        search: search || undefined,
      });
      if (generation !== fetchGeneration.current) {
        return;
      }
      const learners = excludeAdmins(response.data || []);
      setUsers(learners);
      setTotal(response.pagination?.total ?? learners.length);
    } catch (error) {
      if (generation !== fetchGeneration.current) {
        return;
      }
      setUsers([]);
      setTotal(0);
      message.error(formatEzPrepError(error, "Failed to fetch users"));
    } finally {
      if (generation === fetchGeneration.current) {
        setLoading(false);
      }
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const handleSearch = (value: string) => {
    setPage(1);
    setSearch(value.trim());
  };

  return (
    <div className="w-full text-console-ink">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <header className="min-w-0">
          <p className="m-0 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-console-green">
            <Users className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            Learners
          </p>
          <h1 className="m-0 mt-2 text-[34px] font-bold leading-[1.1] tracking-tight text-console-ink sm:text-[44px]">
            Users
          </h1>
          <p className="m-0 mt-3 text-[15px] text-console-muted sm:text-base">
            Learners using the app. Open a card to review profile and recent scores.
          </p>
        </header>

        <div role="search" className="flex w-full gap-2 lg:w-auto lg:shrink-0">
          <label className="relative flex min-w-0 flex-1 items-center lg:w-[360px] lg:flex-none">
            <span className="sr-only">Search learners</span>
            <Search
              className="pointer-events-none absolute left-4 h-[18px] w-[18px] text-console-muted"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Search name, email, or phone"
              value={searchInput}
              onChange={(event) => {
                const value = event.target.value;
                setSearchInput(value);
                if (!value) {
                  handleSearch("");
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSearch(searchInput);
                }
              }}
              className="h-11 w-full rounded-full border border-console-line bg-white pl-11 pr-10 text-[15px] text-console-ink outline-none transition-colors placeholder:text-console-muted/80 hover:border-console-green/30 focus:border-console-green focus:ring-2 focus:ring-console-green/[0.15] [&::-webkit-search-cancel-button]:hidden"
            />
            {searchInput ? (
              <button
                type="button"
                aria-label="Clear"
                onClick={() => {
                  setSearchInput("");
                  handleSearch("");
                }}
                className="absolute right-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-console-muted hover:bg-console-hover hover:text-console-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-console-green"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </label>
          <button
            type="button"
            onClick={() => handleSearch(searchInput)}
            className="inline-flex h-11 shrink-0 items-center rounded-full bg-console-ink px-6 text-[15px] font-semibold text-white transition-colors hover:bg-console-ink-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-console-green"
          >
            Search
          </button>
        </div>
      </div>

      {summaryLoading && !activeSummary ? (
        <div className="mt-8 flex min-h-[110px] items-center justify-center rounded-[20px] border border-console-line bg-white">
          <Spin />
        </div>
      ) : activeSummary ? (
        <ActiveUsersStrip summary={activeSummary} />
      ) : null}

      <div className="mt-8">
        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Spin size="large" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center rounded-[20px] border border-dashed border-console-line bg-white/60 px-6 py-16 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E3EEE5] text-console-green">
              <Users className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <p className="m-0 mt-4 text-[15px] text-console-muted">
              {search
                ? "No learners match that search."
                : "No learners yet. Students appear here after they sign up."}
            </p>
          </div>
        ) : (
          <>
            <p className="m-0 mb-4 text-[15px] text-console-muted">
              Showing {users.length} of {total} learner{total === 1 ? "" : "s"}
            </p>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {users.map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
            </div>
            <div className="mt-8 flex justify-center sm:justify-end">
              <ConfigProvider
                theme={{
                  token: {
                    colorPrimary: "#173B30",
                    borderRadius: 999,
                    colorBgContainer: "#ffffff",
                  },
                }}
              >
                <Pagination
                  current={page}
                  pageSize={pageSize}
                  total={total}
                  showSizeChanger
                  pageSizeOptions={["12", "24", "48"]}
                  onChange={(nextPage, nextSize) => {
                    setPage(nextPage);
                    setPageSize(nextSize);
                  }}
                />
              </ConfigProvider>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ActiveUsersStrip({ summary }: { summary: AppUsersActiveSummary }) {
  return (
    <section
      aria-label="Active learners"
      className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5"
    >
      <ActiveMetric
        label="Active last 1 day"
        value={summary.last1Day}
        hint="Unique learners with activity in the past 24 hours"
        tile="bg-[#E3EEE5]"
      />
      <ActiveMetric
        label="Active last 7 days"
        value={summary.last7Days}
        hint="Unique learners with activity in the past week"
        tile="bg-[#E8E6F6]"
      />
    </section>
  );
}

function ActiveMetric({
  label,
  value,
  hint,
  tile,
}: {
  label: string;
  value: number;
  hint: string;
  tile: string;
}) {
  return (
    <div className="flex items-center gap-5 rounded-[20px] border border-console-line bg-white p-5 sm:p-6">
      <span
        className={`inline-flex h-16 min-w-[64px] shrink-0 items-center justify-center rounded-2xl px-3 text-[32px] font-bold tabular-nums leading-none text-console-ink ${tile}`}
      >
        {value.toLocaleString("en-IN")}
      </span>
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-console-green">
          {label}
        </div>
        <div className="mt-1 text-[15px] leading-snug text-console-muted">{hint}</div>
      </div>
    </div>
  );
}
