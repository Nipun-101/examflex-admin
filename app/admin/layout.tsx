"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Loader2, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ExamFlexIcon } from "@/app/components/ExamFlexIcon";
import { fetchAdminSession } from "@/lib/fetch-admin-session";
import { PageLoader } from "@/app/components/PageLoader";
import { instanceConfigApi } from "@/app/services/ezprep-api/instance-config";
import { commerceHealthApi } from "@/app/services/ezprep-api/commerce-health";
import { adminDashboardApi } from "@/app/services/ezprep-api/admin-dashboard";
import { EzPrepApiError } from "@/app/services/ezprep-api/types";
import {
  applyInstanceDocumentBranding,
  toInstanceBranding,
  type InstanceBranding,
} from "./instance-branding";
import {
  ADMIN_NAV_GROUPS,
  findActiveNavItem,
  type AdminNavItem,
} from "./admin-nav";

/** Hard-coded ExamFlex mark; instance branding only drives the tab title and favicon. */
function BrandMark({ compact }: { compact: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <ExamFlexIcon className="h-10 w-10 shrink-0 rounded-xl shadow-[0_0_0_1px_rgba(23,59,48,0.06)]" />
      <span
        className={`flex min-w-0 flex-col gap-1 ${compact ? "lg:hidden" : ""}`}
      >
        <span className="truncate text-xl font-bold leading-none tracking-tight text-console-ink">
          examflex
        </span>
        <span className="inline-flex w-fit items-center rounded-full bg-console-ink px-2 py-[3px] text-[10px] font-bold uppercase leading-none tracking-[0.12em] text-console-lime">
          Admin
        </span>
      </span>
    </span>
  );
}

const SIDEBAR_STORAGE_KEY = "examflex-admin.sidebar-collapsed";

function NavLink({
  item,
  active,
  failedCount,
  healthDegraded,
  railCollapsed,
}: {
  item: AdminNavItem;
  active: boolean;
  failedCount: number;
  healthDegraded: boolean;
  /** Desktop icon-only rail. Labels stay in the DOM as screen-reader text. */
  railCollapsed: boolean;
}) {
  const Icon = item.icon;
  const showFailedBadge = item.badge === "failed-questions" && failedCount > 0;
  const showHealthDot = item.badge === "commerce-health" && healthDegraded;
  // In the rail, text bits become screen-reader only on desktop; the mobile drawer is unaffected.
  const railText = railCollapsed ? "lg:sr-only" : "";
  const failedLabel = failedCount > 99 ? "99+" : String(failedCount);

  const link = (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={[
        "group flex h-11 items-center gap-3 rounded-full px-4 text-[15px] transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-console-green",
        railCollapsed
          ? "lg:mx-auto lg:w-11 lg:justify-center lg:gap-0 lg:px-0"
          : "",
        active
          ? "bg-console-ink font-semibold text-white hover:text-white"
          : "font-medium text-console-ink hover:bg-console-hover hover:text-console-ink",
      ].join(" ")}
    >
      <span className="relative inline-flex shrink-0">
        <Icon
          className={`h-[18px] w-[18px] ${active ? "text-white" : "text-console-ink/80"}`}
          strokeWidth={1.75}
          aria-hidden="true"
        />
        {railCollapsed && (showFailedBadge || showHealthDot) ? (
          <span
            aria-hidden="true"
            className={`absolute -right-1.5 -top-1.5 hidden h-2.5 w-2.5 rounded-full ring-2 lg:block ${
              showFailedBadge ? "bg-console-danger" : "bg-red-500"
            } ${active ? "ring-console-ink" : "ring-console-canvas"}`}
          />
        ) : null}
      </span>
      <span className={`min-w-0 flex-1 truncate ${railText}`}>
        {item.label}
      </span>
      {showFailedBadge ? (
        <span
          className={`inline-flex h-6 min-w-[24px] shrink-0 items-center justify-center rounded-full bg-console-danger px-1.5 text-xs font-bold text-white ${railText}`}
        >
          <span aria-hidden="true">{failedLabel}</span>
          <span className="sr-only">{`, ${failedCount} need a fix`}</span>
        </span>
      ) : null}
      {showHealthDot ? (
        <span
          className={`inline-block h-2 w-2 shrink-0 rounded-full bg-red-500 ${railText}`}
          aria-label="Commerce degraded"
        />
      ) : null}
    </Link>
  );

  if (!railCollapsed) {
    return link;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={12}
        // Tooltips only matter for the desktop rail; the mobile drawer shows labels.
        className="hidden items-center gap-2 rounded-lg border-0 bg-console-ink px-3 py-1.5 text-[13px] font-semibold text-white shadow-[0_8px_20px_-8px_rgba(23,59,48,0.5)] lg:flex"
      >
        {item.label}
        {showFailedBadge ? (
          <span className="rounded-full bg-console-danger px-1.5 text-[11px] font-bold leading-[18px]">
            {failedLabel}
          </span>
        ) : null}
        {showHealthDot ? (
          <span className="text-[12px] font-medium text-red-300">Degraded</span>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  // On small screens the sidebar is a drawer (`collapsed` = drawer closed).
  // From `lg` up it is always shown, either full width or as an icon rail (`railCollapsed`).
  const [collapsed, setCollapsed] = useState(true);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [branding, setBranding] = useState<InstanceBranding | null>(null);
  const [brandingReady, setBrandingReady] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [healthDegraded, setHealthDegraded] = useState(false);
  const [failedCount, setFailedCount] = useState(0);

  const closeSidebar = () => setCollapsed(true);
  const toggleSidebar = () => setCollapsed((open) => !open);
  const toggleRail = () => {
    setRailCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // Storage can be unavailable (private mode); the toggle still works for this visit.
      }
      return next;
    });
  };

  useEffect(() => {
    try {
      setRailCollapsed(
        window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1",
      );
    } catch {
      // Keep the expanded default.
    }
  }, []);

  useEffect(() => {
    closeSidebar();
  }, [pathname]);

  useEffect(() => {
    if (collapsed) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSidebar();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [collapsed]);

  useEffect(() => {
    let cancelled = false;
    const verifySession = async () => {
      try {
        const response = await fetchAdminSession();
        if (cancelled) return;
        if (response.status === 401 || response.status === 403) {
          router.replace("/login");
          return;
        }
        setSessionReady(true);
      } catch {
        if (!cancelled) {
          setSessionReady(true);
        }
      }
    };
    void verifySession();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (!sessionReady) return;

    let cancelled = false;
    const loadInstanceConfig = async () => {
      try {
        const response = await instanceConfigApi.get();
        if (cancelled) return;
        setBranding(toInstanceBranding(response.data));
        setBrandingReady(true);
      } catch (error) {
        if (cancelled) return;
        if (
          error instanceof EzPrepApiError &&
          (error.status === 401 || error.status === 403)
        ) {
          router.replace("/login");
          return;
        }
        setBranding(null);
        setBrandingReady(true);
      }
    };

    void loadInstanceConfig();
    return () => {
      cancelled = true;
    };
  }, [sessionReady, router]);

  useEffect(() => {
    if (!sessionReady) return;
    let cancelled = false;
    commerceHealthApi
      .get()
      .then((response) => {
        if (!cancelled) setHealthDegraded(response.data.status === "degraded");
      })
      .catch(() => {
        if (!cancelled) setHealthDegraded(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionReady]);

  useEffect(() => {
    if (!sessionReady) return;
    let cancelled = false;
    adminDashboardApi
      .getSummary()
      .then((response) => {
        if (!cancelled) setFailedCount(response.data?.failedQuestions ?? 0);
      })
      .catch(() => {
        if (!cancelled) setFailedCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionReady]);

  useEffect(() => {
    if (!brandingReady) return;
    return applyInstanceDocumentBranding(branding);
  }, [branding, brandingReady]);

  const handleLogout = async () => {
    if (signingOut) {
      return;
    }
    setSigningOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        setSigningOut(false);
        return;
      }
      router.replace("/login");
      router.refresh();
    } catch {
      setSigningOut(false);
    }
  };

  const activeItem = findActiveNavItem(pathname);

  return (
    <div className="min-h-screen bg-console-canvas text-console-ink">
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 border-b border-console-line bg-console-canvas lg:h-[76px] lg:border-b-0">
        <div
          className={[
            "flex min-w-0 flex-1 items-center gap-2 pl-2 pr-3 sm:pl-3",
            "lg:flex-none lg:shrink-0 lg:border-r lg:border-console-line lg:transition-[width,padding] lg:duration-300 lg:ease-out",
            railCollapsed
              ? "lg:w-[76px] lg:justify-center lg:px-0"
              : "lg:w-[248px] lg:px-6",
          ].join(" ")}
        >
          <button
            type="button"
            onClick={toggleSidebar}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-console-ink hover:bg-console-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-console-green lg:hidden"
            aria-label={collapsed ? "Open navigation" : "Close navigation"}
            aria-expanded={!collapsed}
            aria-controls="admin-sidebar"
          >
            {collapsed ? (
              <Menu className="h-5 w-5" aria-hidden="true" />
            ) : (
              <X className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
          <Link
            href="/admin"
            className="flex min-w-0 items-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-console-green"
            aria-label="Go to admin dashboard"
          >
            <BrandMark compact={railCollapsed} />
          </Link>
        </div>

        <div className="flex shrink-0 items-center justify-end px-3 sm:px-4 lg:flex-1 lg:justify-between lg:border-b lg:border-console-line lg:px-10">
          <div className="hidden items-center gap-3 lg:flex">
            <button
              type="button"
              onClick={toggleRail}
              className="-ml-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-console-muted transition-colors hover:bg-console-hover hover:text-console-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-console-green"
              aria-label={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!railCollapsed}
              aria-controls="admin-sidebar"
            >
              {railCollapsed ? (
                <PanelLeftOpen
                  className="h-[18px] w-[18px]"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              ) : (
                <PanelLeftClose
                  className="h-[18px] w-[18px]"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              )}
            </button>
            <span aria-hidden="true" className="h-5 w-px bg-console-line" />
            <nav aria-label="Breadcrumb">
              <ol className="m-0 flex list-none items-center gap-2 p-0 text-[15px]">
                <li>
                  <Link
                    href="/admin"
                    className="text-console-muted hover:text-console-ink"
                  >
                    Admin
                  </Link>
                </li>
                <li aria-hidden="true" className="text-console-muted/60">
                  /
                </li>
                <li
                  aria-current="page"
                  className="font-semibold text-console-ink"
                >
                  {activeItem?.label ?? "Dashboard"}
                </li>
              </ol>
            </nav>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
            aria-busy={signingOut}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-console-line bg-white px-4 text-sm font-semibold text-console-ink shadow-[0_1px_2px_rgba(23,59,48,0.04)] transition-colors hover:border-console-green/40 hover:bg-[#FBFAF7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-console-green disabled:cursor-wait disabled:opacity-70 lg:h-11 lg:px-6 lg:text-[15px]"
          >
            {signingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            Sign out
          </button>
        </div>
      </header>

      {!collapsed && (
        <div
          className="fixed inset-x-0 bottom-0 top-16 z-20 bg-black/50 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <aside
        id="admin-sidebar"
        className={[
          "fixed bottom-0 left-0 top-16 z-30 w-[272px] max-w-[85vw] overflow-y-auto overflow-x-hidden overscroll-contain border-r border-console-line bg-console-canvas",
          "transition-[transform,visibility,width] duration-300 ease-out lg:top-[76px] lg:max-w-none lg:translate-x-0 lg:visible",
          railCollapsed ? "lg:w-[76px]" : "lg:w-[248px]",
          collapsed ? "invisible -translate-x-full" : "visible translate-x-0",
        ].join(" ")}
      >
        <TooltipProvider delayDuration={100} skipDelayDuration={300}>
          <nav aria-label="Admin navigation" className="px-4 pb-8 pt-5">
            {ADMIN_NAV_GROUPS.map((group, index) => (
              <div
                key={group.label}
                className={
                  index === 0 ? "" : railCollapsed ? "mt-6 lg:mt-3" : "mt-6"
                }
              >
                <p
                  className={`mb-2 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-console-green ${
                    railCollapsed ? "lg:sr-only" : ""
                  }`}
                >
                  {group.label}
                </p>
                {railCollapsed && index > 0 ? (
                  <span
                    aria-hidden="true"
                    className="mx-auto mb-3 hidden h-px w-8 bg-console-line lg:block"
                  />
                ) : null}
                <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                  {group.items.filter((item) => !item.hidden).map((item) => (
                    <li key={item.href}>
                      <NavLink
                        item={item}
                        active={activeItem?.href === item.href}
                        failedCount={failedCount}
                        healthDegraded={healthDegraded}
                        railCollapsed={railCollapsed}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </TooltipProvider>
      </aside>

      <main
        className={`pt-16 lg:pt-[76px] lg:transition-[padding] lg:duration-300 lg:ease-out ${
          railCollapsed ? "lg:pl-[76px]" : "lg:pl-[248px]"
        }`}
      >
        <div className="w-full px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          {sessionReady && brandingReady ? children : <PageLoader />}
        </div>
      </main>
    </div>
  );
}
