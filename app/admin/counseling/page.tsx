"use client";

import { Empty, Pagination, Select, Spin, Typography, message } from "antd";
import { CustomerServiceOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useRef, useState } from "react";
import { showConfirmModal } from "@/components/ConfirmModal";
import {
  COUNSELING_NEXT_ACTION_LABELS,
  COUNSELING_STATUS_LABELS,
  counselingApi,
  formatEzPrepError,
  type CounselingRequest,
  type CounselingRequestStatus,
} from "@/app/services/ezprep-api";
import { CounselingCard } from "./counseling-card";

const { Title, Text } = Typography;

const DEFAULT_PAGE_SIZE = 12;

const STATUS_FILTER_OPTIONS: {
  value: CounselingRequestStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "All statuses" },
  { value: "booked", label: COUNSELING_STATUS_LABELS.booked },
  { value: "acknowledged", label: COUNSELING_STATUS_LABELS.acknowledged },
  { value: "responded", label: COUNSELING_STATUS_LABELS.responded },
  { value: "completed", label: COUNSELING_STATUS_LABELS.completed },
];

export default function CounselingPage() {
  const [items, setItems] = useState<CounselingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<
    CounselingRequestStatus | "all"
  >("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const listGeneration = useRef(0);

  const fetchList = useCallback(async () => {
    const generation = ++listGeneration.current;
    setLoading(true);
    try {
      const response = await counselingApi.list({
        page,
        limit: pageSize,
        ...(statusFilter === "all" ? {} : { status: statusFilter }),
      });
      if (generation !== listGeneration.current) return;
      const rows = response.data || [];
      setItems(rows);
      setTotal(response.pagination?.total ?? rows.length);
    } catch (error) {
      if (generation !== listGeneration.current) return;
      setItems([]);
      setTotal(0);
      message.error(formatEzPrepError(error, "Failed to load counseling requests"));
    } finally {
      if (generation === listGeneration.current) setLoading(false);
    }
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const advanceStatus = (
    item: CounselingRequest,
    next: CounselingRequestStatus
  ) => {
    const actionLabel = COUNSELING_NEXT_ACTION_LABELS[item.status] ?? "Update";
    showConfirmModal({
      title: `${actionLabel}?`,
      content: `Move this request from ${COUNSELING_STATUS_LABELS[item.status]} to ${COUNSELING_STATUS_LABELS[next]}.`,
      onConfirm: () => {
        void (async () => {
          setActionLoadingId(item.id);
          try {
            await counselingApi.updateStatus(item.id, next);
            message.success(`Marked as ${COUNSELING_STATUS_LABELS[next]}`);
            await fetchList();
          } catch (error) {
            message.error(
              formatEzPrepError(error, "Failed to update counseling status")
            );
          } finally {
            setActionLoadingId(null);
          }
        })();
      },
    });
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[#1677ff]">
            <CustomerServiceOutlined className="text-xl" />
            <Text className="text-xs font-semibold uppercase tracking-[0.16em]">
              Learners
            </Text>
          </div>
          <Title level={3} className="!mb-1 !mt-1">
            Counseling
          </Title>
          <Text type="secondary">
            1:1 session requests from Analysis. Advance each card one status at a
            time.
          </Text>
        </div>
        <Select
          aria-label="Filter by status"
          className="w-full sm:w-52"
          value={statusFilter}
          options={STATUS_FILTER_OPTIONS}
          onChange={(value: CounselingRequestStatus | "all") => {
            setStatusFilter(value);
            setPage(1);
          }}
        />
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spin size="large" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 py-16">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No counseling requests match this filter."
          />
        </div>
      ) : (
        <>
          <Text type="secondary" className="mb-3 block">
            Showing {items.length} of {total} request{total === 1 ? "" : "s"}
          </Text>
          <div className="flex flex-col gap-4">
            {items.map((item) => (
              <CounselingCard
                key={item.id}
                item={item}
                actionLoading={actionLoadingId === item.id}
                onAdvanceStatus={(next) => advanceStatus(item, next)}
              />
            ))}
          </div>
          <div className="mt-6 flex justify-end">
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
          </div>
        </>
      )}
    </div>
  );
}
