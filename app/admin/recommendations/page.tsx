"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Button, Pagination, Space, Table, Tag, message } from "antd";
import { Select } from "@/app/components/SearchableSelect";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { showConfirmModal } from "@/components/ConfirmModal";
import {
  catalogApi,
  formatEzPrepError,
  recommendationsApi,
  type RecommendationOffering,
} from "@/app/services/ezprep-api";
import { PageLoader } from "@/app/components/PageLoader";

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function RecommendationsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<RecommendationOffering[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [exams, setExams] = useState<{ value: string; label: string }[]>([]);
  const fetchGeneration = useRef(0);

  const page = parsePositiveInt(searchParams?.get("page") ?? null, 1);
  const pageSize = parsePositiveInt(searchParams?.get("limit") ?? null, 20);
  const selectedExam = searchParams?.get("examId") ?? null;

  const updateQuery = (
    updates: Record<string, string | number | null | undefined>
  ) => {
    const next = new URLSearchParams(searchParams?.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value == null || value === "") {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });
    const query = next.toString();
    if (!pathname) return;
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const fetchItems = async () => {
    const generation = ++fetchGeneration.current;
    setLoading(true);
    try {
      const data = await recommendationsApi.list({
        page,
        limit: pageSize,
        examId: selectedExam || undefined,
        kind: "COURSE",
      });
      if (generation !== fetchGeneration.current) return;
      setItems(data.data || []);
      setTotal(data.pagination?.total ?? 0);
    } catch (error) {
      message.error(
        formatEzPrepError(error, "Failed to fetch recommendations")
      );
    } finally {
      if (generation === fetchGeneration.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void catalogApi
      .listAllExams()
      .then((list) =>
        setExams(list.map((exam) => ({ value: exam.id, label: exam.name })))
      )
      .catch((error) => {
        message.error(formatEzPrepError(error, "Failed to fetch exams"));
      });
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [page, pageSize, selectedExam]);

  const handleDelete = (id: string) => {
    showConfirmModal({
      title: "Delete recommendation",
      content:
        "Soft-delete this course pathway? Students will no longer see it.",
      onConfirm: async () => {
        setTableLoading(true);
        try {
          await recommendationsApi.delete(id);
          message.success("Recommendation deleted");
          await fetchItems();
        } catch (error) {
          message.error(
            formatEzPrepError(error, "Failed to delete recommendation")
          );
        } finally {
          setTableLoading(false);
        }
      },
    });
  };

  const columns = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
    },
    {
      title: "Exam",
      key: "exam",
      render: (record: RecommendationOffering) => record.exam?.name ?? "—",
    },
    {
      title: "Status",
      key: "isActive",
      width: 100,
      render: (record: RecommendationOffering) =>
        record.isActive ? (
          <Tag color="green">Active</Tag>
        ) : (
          <Tag>Inactive</Tag>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 160,
      render: (_: unknown, record: RecommendationOffering) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            className="px-1"
            onClick={() =>
              router.push(`/admin/recommendations/${record.id}`)
            }
          >
            Edit
          </Button>
          <Button
            type="link"
            size="small"
            danger
            className="px-1"
            onClick={() => handleDelete(record.id)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          Recommendations
        </h1>
        <p className="text-sm text-gray-500">
          Course pathways per exam (e.g. MBBS under NEET). Cut-off marks for
          each course are entered on every full mock. College targets can be
          added later under the same module.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          allowClear
          placeholder="Filter by exam"
          className="min-w-[220px]"
          options={exams}
          value={selectedExam}
          onChange={(value) =>
            updateQuery({ examId: (value as string) || null, page: 1 })
          }
          showSearch
          optionFilterProp="label"
        />
        <Link href="/admin/recommendations/new" className="shrink-0 ml-auto">
          <Button
            type="primary"
            className="!border-blue-600 !bg-blue-600 !text-white hover:!border-blue-700 hover:!bg-blue-700"
          >
            Add course
          </Button>
        </Link>
      </div>

      <Table
        rowKey="id"
        loading={loading || tableLoading}
        columns={columns}
        dataSource={items}
        pagination={false}
      />

      <Pagination
        current={page}
        pageSize={pageSize}
        total={total}
        showSizeChanger
        onChange={(nextPage, nextSize) =>
          updateQuery({ page: nextPage, limit: nextSize })
        }
      />
    </div>
  );
}

export default function RecommendationsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <RecommendationsPageContent />
    </Suspense>
  );
}
