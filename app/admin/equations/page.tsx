"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { message, type TableColumnsType } from "antd";
import { Pencil, Sigma, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { showConfirmModal } from "@/components/ConfirmModal";
import {
  catalogApi,
  equationsApi,
  formatEzPrepError,
  refId,
  refName,
  type Equation,
} from "@/app/services/ezprep-api";
import { PageLoader } from "@/app/components/PageLoader";
import { ChapterUi } from "@/app/lib/chapter-ui";
import { equationsEditHref } from "./equations-list-href";
import { OverflowChips, TruncatedChip } from "../_components/OverflowChips";
import {
  ClampText,
  ColumnTitle,
  DependentFilter,
  EmptyCell,
  FilterSelect,
  IconActionButton,
  IconActionLink,
  ListCard,
  ListFooter,
  ListPageHeader,
  ListSearch,
  ListTable,
  ListToolbar,
  PrimaryActionLink,
  RowActions,
  SubjectLabel,
  TableEmptyState,
} from "../_components/console-list";

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const SEARCH_DEBOUNCE_MS = 300;

function EquationsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [equations, setEquations] = useState<Equation[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [tableLoading, setTableLoading] = useState(false);
  const [subjects, setSubjects] = useState<{ _id: string; name: string }[]>([]);
  const [exams, setExams] = useState<{ _id: string; name: string }[]>([]);
  const [topics, setTopics] = useState<{ _id: string; name: string }[]>([]);

  const page = parsePositiveInt(searchParams?.get("page") ?? null, 1);
  const pageSize = parsePositiveInt(searchParams?.get("limit") ?? null, 10);
  const selectedSubject = searchParams?.get("subjectId") ?? null;
  const selectedExam = searchParams?.get("examId") ?? null;
  const selectedTopic = searchParams?.get("topicId") ?? null;
  const selectedSearch = searchParams?.get("search") ?? "";
  const [searchInput, setSearchInput] = useState(selectedSearch);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const fetchSubjects = async () => {
    try {
      const data = await catalogApi.listSubjects();
      setSubjects(
        (data.data || []).map((subject) => ({
          _id: subject.id,
          name: subject.name,
        }))
      );
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to fetch subjects"));
    }
  };

  const fetchExams = async () => {
    try {
      const examsList = await catalogApi.listAllExams();
      setExams(examsList.map((exam) => ({ _id: exam.id, name: exam.name })));
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to fetch exams"));
    }
  };

  const fetchTopicsBySubject = async (subjectId: string) => {
    if (!subjectId) {
      setTopics([]);
      return;
    }
    try {
      const { data } = await catalogApi.getSubject(subjectId);
      setTopics(
        (data.topics || []).map((topic) => ({
          _id: topic.id,
          name: topic.name,
        }))
      );
    } catch (error) {
      message.error(formatEzPrepError(error, ChapterUi.failedFetch));
      setTopics([]);
    }
  };

  const fetchEquations = async () => {
    setLoading(true);
    try {
      const data = await equationsApi.list({
        page,
        limit: pageSize,
        subjectId: selectedSubject || undefined,
        examId: selectedExam || undefined,
        topicId: selectedTopic || undefined,
        search: selectedSearch.trim() || undefined,
      });
      setEquations(data.data || []);
      setTotal(data.pagination?.total ?? 0);
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to fetch equations"));
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchSubjects();
    void fetchExams();
  }, []);

  useEffect(() => {
    setSearchInput(selectedSearch);
  }, [selectedSearch]);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      void fetchTopicsBySubject(selectedSubject);
    } else {
      setTopics([]);
    }
  }, [selectedSubject]);

  useEffect(() => {
    void fetchEquations();
  }, [
    page,
    pageSize,
    selectedSubject,
    selectedExam,
    selectedTopic,
    selectedSearch,
  ]);

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      const trimmed = value.trim();
      updateQuery({
        search: trimmed || null,
        page: 1,
      });
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleDelete = async (id: string) => {
    showConfirmModal({
      title: "Delete Equation",
      content:
        "Are you sure you want to delete this equation? This action cannot be undone.",
      onConfirm: async () => {
        setTableLoading(true);
        try {
          await equationsApi.delete(id);
          await fetchEquations();
          message.success("Equation deleted successfully");
        } catch (error) {
          message.error(formatEzPrepError(error, "Failed to delete equation"));
        } finally {
          setTableLoading(false);
        }
      },
    });
  };

  const submitSearch = (value: string) => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    updateQuery({ search: value.trim() || null, page: 1 });
  };

  const hasFilters = Boolean(
    selectedExam || selectedSubject || selectedTopic || selectedSearch.trim()
  );

  const columns: TableColumnsType<Equation> = [
    {
      title: <ColumnTitle>Title</ColumnTitle>,
      key: "title",
      // Flexible: takes the space the fixed columns leave.
      render: (_: unknown, record: Equation) => (
        <div className="min-w-0">
          <ClampText
            text={record.title || "Untitled equation"}
            lines={1}
            className="text-[14px] font-semibold text-console-ink"
          />
          {record.shortDescription ? (
            <ClampText
              text={record.shortDescription}
              lines={1}
              className="mt-0.5 text-[12.5px] text-console-muted"
            />
          ) : null}
        </div>
      ),
    },
    {
      title: <ColumnTitle>Subject</ColumnTitle>,
      key: "subject",
      width: "11%",
      render: (_: unknown, record: Equation) => <SubjectLabel name={refName(record.subject)} />,
    },
    {
      title: <ColumnTitle>{ChapterUi.singular}</ColumnTitle>,
      key: "topic",
      width: "24%",
      render: (_: unknown, record: Equation) => {
        const name = record.topic ? refName(record.topic) || refId(record.topic) : "";
        return name ? <TruncatedChip label={name} maxWidthClass="max-w-full" /> : <EmptyCell />;
      },
    },
    {
      title: <ColumnTitle>Exams</ColumnTitle>,
      key: "exams",
      width: "17%",
      render: (_: unknown, record: Equation) => (
        <OverflowChips
          items={(record.exams || [])
            .map((exam) => refName(exam) || refId(exam) || "")
            .filter(Boolean)}
          tone="exam"
          noun="exams"
          empty={<EmptyCell />}
        />
      ),
    },
    {
      title: <ColumnTitle>Sort order</ColumnTitle>,
      key: "sortOrder",
      width: 104,
      render: (_: unknown, record: Equation) => (
        <span className="text-[14px] font-semibold tabular-nums text-console-ink">
          {record.sortOrder ?? 0}
        </span>
      ),
    },
    {
      title: <ColumnTitle>Actions</ColumnTitle>,
      key: "actions",
      width: 104,
      render: (_: unknown, record: Equation) => (
        <RowActions>
          <IconActionLink
            href={equationsEditHref(record.id, searchParams)}
            label="Edit equation"
            tooltip="Edit"
            icon={Pencil}
          />
          <IconActionButton
            label="Delete equation"
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
        eyebrow="Question bank"
        title="Equations"
        actions={<PrimaryActionLink href="/admin/equations/new">Add Equation</PrimaryActionLink>}
      />

      <ListCard>
        <ListToolbar className="xl:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <ListSearch
            placeholder="Search by title"
            value={searchInput}
            onChange={handleSearchInputChange}
            onSubmit={submitSearch}
            className="sm:col-span-2 xl:col-span-1"
          />
          <FilterSelect
            placeholder="Filter by exam"
            allowClear
            value={selectedExam}
            onChange={(value) => updateQuery({ examId: value, page: 1 })}
            options={exams.map((exam) => ({ value: exam._id, label: exam.name }))}
          />
          <FilterSelect
            placeholder="Filter by subject"
            allowClear
            value={selectedSubject}
            onChange={(value) => updateQuery({ subjectId: value, topicId: null, page: 1 })}
            options={subjects.map((subject) => ({ value: subject._id, label: subject.name }))}
          />
          <DependentFilter
            enabled={Boolean(selectedSubject)}
            hint="Pick a subject first"
            placeholder={ChapterUi.filterPlaceholder}
            allowClear
            value={selectedTopic}
            onChange={(value) => updateQuery({ topicId: value, page: 1 })}
            options={topics.map((topic) => ({ value: topic._id, label: topic.name }))}
          />
        </ListToolbar>

        <ListTable<Equation>
          rowKey="id"
          loading={loading || tableLoading}
          dataSource={equations}
          columns={columns}
          // Fixed columns (sort order + actions) are 208px and the rest share 52%; the title
          // column gets what is left. Below 900px the table scrolls instead of crushing.
          scroll={{ x: 900 }}
          empty={
            <TableEmptyState
              icon={Sigma}
              message={
                hasFilters
                  ? "No equations match these filters."
                  : "No equations yet. Add one to get started."
              }
            />
          }
        />

        <ListFooter
          page={page}
          pageSize={pageSize}
          total={total}
          shownCount={equations.length}
          noun="equations"
          onPageChange={(nextPage) => updateQuery({ page: nextPage })}
          onPageSizeChange={(size) => updateQuery({ limit: size, page: 1 })}
        />
      </ListCard>
    </div>
  );
}

export default function EquationsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <EquationsPageContent />
    </Suspense>
  );
}
