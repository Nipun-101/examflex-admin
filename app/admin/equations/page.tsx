"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Table, Button, Space, message, Pagination, Tag, Input } from "antd";
import { Select } from "@/app/components/SearchableSelect";
import Link from "next/link";
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

  const columns = [
    {
      title: "Title",
      key: "title",
      render: (record: Equation) => (
        <div>
          <div className="font-medium">{record.title}</div>
          <div className="text-gray-500 mt-1 text-sm line-clamp-1">
            {record.shortDescription}
          </div>
        </div>
      ),
    },
    {
      title: "Subject",
      key: "subject",
      render: (record: Equation) => refName(record.subject) || "-",
    },
    {
      title: ChapterUi.singular,
      key: "topic",
      render: (record: Equation) =>
        record.topic ? (
          <Tag key={refId(record.topic)}>
            {refName(record.topic) || refId(record.topic)}
          </Tag>
        ) : (
          "-"
        ),
    },
    {
      title: "Exams",
      key: "exams",
      render: (record: Equation) => (
        <>
          {record.exams?.map((exam) => (
            <Tag key={refId(exam)} color="blue">
              {refName(exam) || refId(exam)}
            </Tag>
          ))}
        </>
      ),
    },
    {
      title: "Sort order",
      key: "sortOrder",
      render: (record: Equation) => record.sortOrder ?? 0,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: Equation) => (
        <Space>
          <Link href={equationsEditHref(record.id, searchParams)}>
            <Button type="primary" className="bg-blue-600 hover:bg-blue-700">
              Edit
            </Button>
          </Link>
          <Button danger onClick={() => handleDelete(record.id)}>
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold m-0">Equations</h1>

      <div className="flex items-center gap-4 flex-wrap">
        <Input.Search
          allowClear
          placeholder="Search by title"
          value={searchInput}
          onChange={(event) => handleSearchInputChange(event.target.value)}
          className="w-64"
        />
        <Select
          allowClear
          placeholder="Filter by exam"
          className="w-52"
          value={selectedExam}
          onChange={(value) =>
            updateQuery({ examId: value || null, page: 1 })
          }
          options={exams.map((exam) => ({
            value: exam._id,
            label: exam.name,
          }))}
        />
        <Select
          allowClear
          placeholder="Filter by subject"
          className="w-52"
          value={selectedSubject}
          onChange={(value) =>
            updateQuery({
              subjectId: value || null,
              topicId: null,
              page: 1,
            })
          }
          options={subjects.map((subject) => ({
            value: subject._id,
            label: subject.name,
          }))}
        />
        <Select
          allowClear
          placeholder={ChapterUi.filterPlaceholder}
          className="w-52"
          value={selectedTopic}
          disabled={!selectedSubject}
          onChange={(value) =>
            updateQuery({ topicId: value || null, page: 1 })
          }
          options={topics.map((topic) => ({
            value: topic._id,
            label: topic.name,
          }))}
        />
        <Link href="/admin/equations/new" className="shrink-0 ml-auto">
          <Button type="primary" className="bg-blue-600 hover:bg-blue-700">
            Add Equation
          </Button>
        </Link>
      </div>

      <Table
        rowKey="id"
        loading={loading || tableLoading}
        dataSource={equations}
        columns={columns}
        pagination={false}
      />

      <div className="flex justify-end">
        <Pagination
          current={page}
          pageSize={pageSize}
          total={total}
          showSizeChanger
          pageSizeOptions={[10, 20, 50]}
          onChange={(nextPage, nextSize) =>
            updateQuery({ page: nextPage, limit: nextSize })
          }
        />
      </div>
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
