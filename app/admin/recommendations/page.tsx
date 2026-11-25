"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { message, type TableColumnsType } from "antd";
import { Pencil, Trash2, TrendingUp } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { showConfirmModal } from "@/components/ConfirmModal";
import {
  catalogApi,
  formatEzPrepError,
  recommendationsApi,
  type RecommendationOffering,
} from "@/app/services/ezprep-api";
import { PageLoader } from "@/app/components/PageLoader";
import { TruncatedChip } from "../_components/OverflowChips";
import {
  ClampText,
  ColumnTitle,
  EmptyCell,
  FilterSelect,
  IconActionButton,
  IconActionLink,
  ListCard,
  ListFooter,
  ListPageHeader,
  ListTable,
  ListToolbar,
  Pill,
  PrimaryActionLink,
  RowActions,
  TableEmptyState,
} from "../_components/console-list";

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

  const columns: TableColumnsType<RecommendationOffering> = [
    {
      title: <ColumnTitle>Title</ColumnTitle>,
      key: "title",
      // Flexible: takes the space the other columns leave.
      render: (_: unknown, record: RecommendationOffering) => (
        <div className="min-w-0">
          <ClampText
            text={record.title}
            lines={1}
            className="text-[14px] font-semibold text-console-ink"
          />
          {record.subtitle ? (
            <ClampText
              text={record.subtitle}
              lines={1}
              className="mt-0.5 text-[12.5px] text-console-muted"
            />
          ) : null}
        </div>
      ),
    },
    {
      title: <ColumnTitle>Exam</ColumnTitle>,
      key: "exam",
      width: "24%",
      render: (_: unknown, record: RecommendationOffering) =>
        record.exam?.name ? (
          <TruncatedChip label={record.exam.name} tone="exam" maxWidthClass="max-w-full" />
        ) : (
          <EmptyCell />
        ),
    },
    {
      title: <ColumnTitle>Status</ColumnTitle>,
      key: "isActive",
      width: 120,
      render: (_: unknown, record: RecommendationOffering) =>
        record.isActive ? (
          <Pill tone="green">Active</Pill>
        ) : (
          <Pill tone="neutral">Inactive</Pill>
        ),
    },
    {
      title: <ColumnTitle>Actions</ColumnTitle>,
      key: "actions",
      width: 104,
      render: (_: unknown, record: RecommendationOffering) => (
        <RowActions>
          <IconActionLink
            href={`/admin/recommendations/${record.id}`}
            label="Edit course"
            tooltip="Edit"
            icon={Pencil}
          />
          <IconActionButton
            label="Delete course"
            tooltip="Delete"
            icon={Trash2}
            tone="danger"
            onClick={() => handleDelete(record.id)}
          />
        </RowActions>
      ),
    },
  ];

  return (
    <div className="w-full text-console-ink">
      <ListPageHeader
        eyebrow="Content"
        title="Recommendations"
        description="Course pathways per exam (e.g. MBBS under NEET). Cut-off marks for each course are entered on every full mock. College targets can be added later under the same module."
        actions={<PrimaryActionLink href="/admin/recommendations/new">Add course</PrimaryActionLink>}
      />

      <ListCard>
        <ListToolbar className="xl:grid-cols-3">
          <FilterSelect
            placeholder="Filter by exam"
            allowClear
            value={selectedExam}
            onChange={(value) => updateQuery({ examId: value, page: 1 })}
            options={exams}
          />
        </ListToolbar>

        <ListTable<RecommendationOffering>
          rowKey="id"
          loading={loading || tableLoading}
          columns={columns}
          dataSource={items}
          scroll={{ x: 640 }}
          empty={
            <TableEmptyState
              icon={TrendingUp}
              message={
                selectedExam
                  ? "No courses for this exam yet."
                  : "No course pathways yet. Add one to get started."
              }
            />
          }
        />

        <ListFooter
          page={page}
          pageSize={pageSize}
          total={total}
          shownCount={items.length}
          noun="courses"
          pageSizes={[10, 20, 50]}
          onPageChange={(nextPage) => updateQuery({ page: nextPage })}
          onPageSizeChange={(size) => updateQuery({ limit: size, page: 1 })}
        />
      </ListCard>
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
