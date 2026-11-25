"use client";

import { message, type TableColumnsType } from "antd";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, Receipt } from "lucide-react";
import {
  formatEzPrepError,
  formatPaiseAsRupees,
  ordersApi,
  type AdminOrder,
  type AdminOrderFlag,
  type OrderStatus,
} from "@/app/services/ezprep-api";
import {
  ColumnTitle,
  EmptyCell,
  FilterSelect,
  IconActionLink,
  ListCard,
  ListFooter,
  ListPageHeader,
  ListSearch,
  ListTable,
  ListToolbar,
  Pill,
  RowActions,
  TableEmptyState,
  type PillTone,
} from "../_components/console-list";

const STATUS_STYLE: Record<OrderStatus, { tone: PillTone; label: string }> = {
  CREATED: { tone: "neutral", label: "Created" },
  PENDING_PAYMENT: { tone: "amber", label: "Pending payment" },
  PAID: { tone: "green", label: "Paid" },
  FAILED: { tone: "red", label: "Failed" },
  EXPIRED: { tone: "neutral", label: "Expired" },
  CANCELLED: { tone: "neutral", label: "Cancelled" },
  REFUNDED: { tone: "violet", label: "Refunded" },
};

function formatCreated(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    date: date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    time: date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }),
  };
}

const STATUS_FILTER_OPTIONS: Array<{ value: OrderStatus | ""; label: string }> = [
  { value: "", label: "All statuses" },
  { value: "PAID", label: "Paid" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "PENDING_PAYMENT", label: "Pending payment" },
  { value: "FAILED", label: "Failed" },
  { value: "EXPIRED", label: "Expired" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "CREATED", label: "Created" },
];

const FLAG_FILTER_OPTIONS: Array<{ value: AdminOrderFlag | ""; label: string }> = [
  { value: "", label: "All flags" },
  { value: "needsReview", label: "Needs review" },
  { value: "unprovisioned", label: "Unprovisioned" },
  { value: "uninvoiced", label: "Uninvoiced" },
  { value: "lateCapture", label: "Late capture" },
  { value: "redundantPurchase", label: "Redundant purchase" },
  { value: "duplicate", label: "Duplicate payment" },
];

function flagFromQuery(value: string | null): AdminOrderFlag | "" {
  return FLAG_FILTER_OPTIONS.some((option) => option.value === value && value !== "")
    ? (value as AdminOrderFlag)
    : "";
}

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [search, setSearch] = useState(searchParams?.get("search") ?? "");
  const [searchInput, setSearchInput] = useState(search);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [flagFilter, setFlagFilter] = useState<AdminOrderFlag | "">(
    flagFromQuery(searchParams?.get("flag") ?? null)
  );
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  const fetchOrders = useCallback(async () => {
    setTableLoading(true);
    try {
      const response = await ordersApi.list({
        page: pagination.current,
        limit: pagination.pageSize,
        status: statusFilter || undefined,
        search: search || undefined,
        flag: flagFilter || undefined,
      });
      setOrders(response.data || []);
      setPagination((prev) => ({
        ...prev,
        total: response.pagination?.total ?? response.data.length,
      }));
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to load orders"));
    } finally {
      setTableLoading(false);
    }
  }, [pagination.current, pagination.pageSize, search, statusFilter, flagFilter]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const applySearch = (value: string) => {
    setSearch(value.trim());
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const hasFilters = Boolean(search || statusFilter || flagFilter);

  const columns: TableColumnsType<AdminOrder> = [
    {
      title: <ColumnTitle>Order</ColumnTitle>,
      key: "orderNumber",
      // Flexible: takes the space the other columns leave.
      render: (_: unknown, row: AdminOrder) => (
        <div className="min-w-0">
          <Link
            href={`/admin/orders/${row.id}`}
            className="block truncate text-[14px] font-semibold text-console-ink hover:text-console-green hover:underline"
            title={row.orderNumber}
          >
            {row.orderNumber}
          </Link>
          {row.paymentProvider ? (
            <div className="mt-0.5 truncate text-[12.5px] capitalize text-console-muted">
              {row.paymentProvider}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: <ColumnTitle>Status</ColumnTitle>,
      key: "status",
      width: 160,
      render: (_: unknown, row: AdminOrder) => {
        const style = STATUS_STYLE[row.status] ?? { tone: "neutral" as const, label: row.status };
        return <Pill tone={style.tone}>{style.label}</Pill>;
      },
    },
    {
      title: <ColumnTitle>Amount</ColumnTitle>,
      key: "amount",
      width: 128,
      render: (_: unknown, row: AdminOrder) => (
        <span className="text-[14px] font-semibold tabular-nums text-console-ink">
          {formatPaiseAsRupees(row.amount)}
        </span>
      ),
    },
    {
      title: <ColumnTitle>User</ColumnTitle>,
      key: "user",
      width: "28%",
      render: (_: unknown, row: AdminOrder) => {
        const name = row.user?.name?.trim() || "Unknown user";
        const userId = row.user?.id || row.userId;
        return (
          <div className="min-w-0">
            {userId ? (
              <Link
                href={`/admin/users/${userId}`}
                className="block truncate text-[14px] font-semibold text-console-ink hover:text-console-green hover:underline"
                title={name}
              >
                {name}
              </Link>
            ) : (
              <span className="block truncate text-[14px] font-semibold text-console-ink">
                {name}
              </span>
            )}
            {row.user?.email ? (
              <div className="mt-0.5 truncate text-[12.5px] text-console-muted">
                {row.user.email}
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      title: <ColumnTitle>Created</ColumnTitle>,
      key: "createdAt",
      width: 150,
      render: (_: unknown, row: AdminOrder) => {
        const created = formatCreated(row.createdAt);
        if (!created) return <EmptyCell />;
        return (
          <div className="text-[13.5px] leading-snug">
            <div className="text-console-ink">{created.date}</div>
            <div className="text-console-muted">{created.time}</div>
          </div>
        );
      },
    },
    {
      title: <ColumnTitle>Open</ColumnTitle>,
      key: "actions",
      width: 72,
      render: (_: unknown, row: AdminOrder) => (
        <RowActions>
          <IconActionLink
            href={`/admin/orders/${row.id}`}
            label={`Open order ${row.orderNumber}`}
            tooltip="Open order"
            icon={ArrowUpRight}
          />
        </RowActions>
      ),
    },
  ];

  return (
    <div className="w-full text-console-ink">
      <ListPageHeader
        eyebrow="Commerce"
        title="Orders"
        description="Every purchase with its payment status. Open an order for payments, invoices, and refunds."
      />

      <ListCard>
        <ListToolbar className="xl:grid-cols-[1.3fr_1fr_1fr]">
          <ListSearch
            placeholder="Search order number"
            value={searchInput}
            onChange={(value) => {
              setSearchInput(value);
              if (!value) applySearch("");
            }}
            onSubmit={applySearch}
            className="sm:col-span-2 xl:col-span-1"
          />
          <FilterSelect<AdminOrderFlag | "">
            aria-label="Order flag"
            value={flagFilter}
            options={FLAG_FILTER_OPTIONS}
            onChange={(value) => {
              setFlagFilter(value ?? "");
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
          />
          <FilterSelect<OrderStatus | "">
            aria-label="Order status"
            value={statusFilter}
            options={STATUS_FILTER_OPTIONS}
            onChange={(value) => {
              setStatusFilter(value ?? "");
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
          />
        </ListToolbar>

        <ListTable<AdminOrder>
          columns={columns}
          dataSource={orders}
          rowKey="id"
          loading={tableLoading}
          // Fixed columns are 510px and user takes 28%; the order column gets the rest.
          scroll={{ x: 880 }}
          empty={
            <TableEmptyState
              icon={Receipt}
              message={hasFilters ? "No orders match these filters." : "No orders yet."}
            />
          }
        />

        <ListFooter
          page={pagination.current}
          pageSize={pagination.pageSize}
          total={pagination.total}
          shownCount={orders.length}
          noun="orders"
          pageSizes={[10, 20, 50, 100]}
          onPageChange={(page) => setPagination((prev) => ({ ...prev, current: page }))}
          onPageSizeChange={(size) =>
            setPagination((prev) => ({ ...prev, current: 1, pageSize: size }))
          }
        />
      </ListCard>
    </div>
  );
}
