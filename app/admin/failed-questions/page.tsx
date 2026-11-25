"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { message, type TableColumnsType } from "antd";
import Link from "next/link";
import { CircleCheck, Trash2, Wrench } from "lucide-react";
import { showConfirmModal } from "@/components/ConfirmModal";
import { catalogApi, ezPrepApiClient } from "@/app/services/ezprep-api";
import { ChapterUi } from "@/app/lib/chapter-ui";
import { EzPrepApiError } from "@/app/services/ezprep-api/types";
import {
  DeleteFailedQuestionResponse,
  FailedQuestion,
  FailedQuestionListResponse,
  LookupItem,
} from "./types";
import { OverflowChips, TruncatedChip } from "../_components/OverflowChips";
import {
  ClampText,
  ColumnTitle,
  DependentFilter,
  DifficultyPill,
  EmptyCell,
  FilterSelect,
  IconActionButton,
  ListCard,
  ListFooter,
  ListPageHeader,
  ListTable,
  ListToolbar,
  Pill,
  ROW_ACTION_CLASS,
  ROW_ACTION_TONE,
  RowActions,
  SubjectLabel,
  TableEmptyState,
  type PillTone,
} from "../_components/console-list";

const STAGE_TONE: Record<string, PillTone> = {
  llm: "amber",
  validation: "red",
  parse: "red",
  import: "violet",
};

function stageLabel(stage: string) {
  if (!stage) return "Unknown";
  if (stage.toLowerCase() === "llm") return "LLM";
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

export default function FailedQuestionsPage() {
  const [items, setItems] = useState<FailedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [subjects, setSubjects] = useState<LookupItem[]>([]);
  const [topics, setTopics] = useState<LookupItem[]>([]);
  const [filteredTopics, setFilteredTopics] = useState<LookupItem[]>([]);
  const [exams, setExams] = useState<LookupItem[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedExam, setSelectedExam] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const subjectMap = useMemo(
    () => new Map(subjects.map((s) => [s._id, s.name])),
    [subjects]
  );
  const topicMap = useMemo(
    () => new Map(topics.map((t) => [t._id, t.name])),
    [topics]
  );
  const examMap = useMemo(
    () => new Map(exams.map((e) => [e._id, e.name])),
    [exams]
  );

  const fetchLookups = useCallback(async () => {
    try {
      const [subjectData, topicData, examData] = await Promise.all([
        catalogApi.listSubjects(),
        catalogApi.listTopics(),
        catalogApi.listAllExams(),
      ]);

      setSubjects(
        (subjectData.data || []).map((subject) => ({
          _id: subject.id,
          name: subject.name,
          topics: (subject.topics || []).map((topic) => ({
            _id: topic.id,
            name: topic.name,
          })),
        }))
      );
      setTopics(
        (topicData.data || []).map((topic) => ({
          _id: topic.id,
          name: topic.name,
        }))
      );
      setExams(examData.map((exam) => ({ _id: exam.id, name: exam.name })));
    } catch {
      message.error("Failed to fetch lookup data");
    }
  }, []);

  const fetchFailedQuestions = useCallback(
    async (page = 1, limit = pagination.pageSize) => {
      setLoading(true);
      try {
        const searchParams: Record<string, string | number> = { page, limit };
        if (selectedSubject) searchParams.subjectId = selectedSubject;
        if (selectedExam) searchParams.examId = selectedExam;
        if (selectedTopic) searchParams.topicId = selectedTopic;

        const response = await ezPrepApiClient.get<FailedQuestionListResponse>(
          "/v1/imports/failed-questions",
          { searchParams }
        );

        const listItems = response.data?.items ?? [];
        const paginationData = response.data?.pagination;

        setItems(listItems);
        setPagination((prev) => ({
          ...prev,
          current: paginationData?.page ?? page,
          pageSize: paginationData?.limit ?? limit,
          total: paginationData?.total ?? listItems.length,
        }));
      } catch (error) {
        const errorMessage =
          error instanceof EzPrepApiError
            ? error.message
            : "Failed to fetch failed questions";
        message.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [pagination.pageSize, selectedSubject, selectedExam, selectedTopic]
  );

  useEffect(() => {
    fetchLookups();
  }, [fetchLookups]);

  useEffect(() => {
    const loadTopicsForSubject = async () => {
      if (!selectedSubject) {
        setFilteredTopics([]);
        setSelectedTopic(null);
        return;
      }
      try {
        const { data } = await catalogApi.getSubject(selectedSubject);
        setFilteredTopics(
          (data.topics || []).map((topic) => ({
            _id: topic.id,
            name: topic.name,
          }))
        );
      } catch {
        message.error(ChapterUi.failedFetch);
        setFilteredTopics([]);
      }
    };
    loadTopicsForSubject();
  }, [selectedSubject]);

  useEffect(() => {
    fetchFailedQuestions(1);
  }, [fetchFailedQuestions]);

  const handleDelete = (record: FailedQuestion) => {
    showConfirmModal({
      title: "Delete Failed Question",
      content: `Are you sure you want to delete question #${record.questionNumber}? This action cannot be undone.`,
      onConfirm: async () => {
        setDeletingId(record.id);
        try {
          const response =
            await ezPrepApiClient.delete<DeleteFailedQuestionResponse>(
              `/v1/imports/failed-questions/${record.id}`
            );
          message.success(
            response.message || "Failed question deleted successfully"
          );

          const isLastItemOnPage = items.length === 1;
          const currentPage = pagination.current;
          const nextPage =
            isLastItemOnPage && currentPage > 1 ? currentPage - 1 : currentPage;
          await fetchFailedQuestions(nextPage);
        } catch (error) {
          const errorMessage =
            error instanceof EzPrepApiError
              ? error.message
              : "Failed to delete failed question";
          message.error(errorMessage);
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const hasFilters = Boolean(selectedExam || selectedSubject || selectedTopic);

  const columns: TableColumnsType<FailedQuestion> = [
    {
      title: <ColumnTitle>#</ColumnTitle>,
      dataIndex: "questionNumber",
      key: "questionNumber",
      width: 52,
      render: (value: number) => (
        <span className="text-[13px] font-semibold tabular-nums text-console-muted">{value}</span>
      ),
    },
    {
      title: <ColumnTitle>Question</ColumnTitle>,
      key: "question",
      // Flexible: takes the space the other columns leave.
      render: (_: unknown, record: FailedQuestion) => {
        const draft = record.question || record.questionDraft;
        const english = draft?.questionText?.en?.text || "";
        const malayalam = draft?.questionText?.ml?.text || "";
        return (
          <div className="min-w-0">
            {english ? (
              <ClampText
                text={english}
                className="text-[14px] font-semibold leading-snug text-console-ink"
              />
            ) : (
              <EmptyCell />
            )}
            {malayalam ? (
              <div className="mt-0.5 truncate text-[12.5px] text-console-muted">{malayalam}</div>
            ) : null}
          </div>
        );
      },
    },
    {
      title: <ColumnTitle>Failure</ColumnTitle>,
      key: "failure",
      width: "24%",
      render: (_: unknown, record: FailedQuestion) => (
        <div className="min-w-0">
          <Pill tone={STAGE_TONE[record.failureStage?.toLowerCase()] ?? "neutral"}>
            {stageLabel(record.failureStage)}
          </Pill>
          {record.failureMessage ? (
            <ClampText
              text={record.failureMessage}
              className="mt-1 text-[12.5px] leading-snug text-console-danger"
            />
          ) : null}
        </div>
      ),
    },
    {
      title: <ColumnTitle>Difficulty</ColumnTitle>,
      key: "difficultyLevel",
      width: 108,
      render: (_: unknown, record: FailedQuestion) => (
        <DifficultyPill level={(record.question || record.questionDraft)?.difficultyLevel} />
      ),
    },
    {
      title: <ColumnTitle>{`Subject · ${ChapterUi.singular}`}</ColumnTitle>,
      key: "topic",
      width: "20%",
      render: (_: unknown, record: FailedQuestion) => {
        const draft = record.question || record.questionDraft;
        const subjectName = draft?.subject ? subjectMap.get(draft.subject) : undefined;
        const topicName = draft?.topic ? topicMap.get(draft.topic) : undefined;
        if (!subjectName && !topicName) return <EmptyCell />;
        return (
          <div className="flex min-w-0 flex-col items-start gap-1">
            {subjectName ? <SubjectLabel name={subjectName} /> : null}
            {topicName ? <TruncatedChip label={topicName} maxWidthClass="max-w-full" /> : null}
          </div>
        );
      },
    },
    {
      title: <ColumnTitle>Exams</ColumnTitle>,
      key: "exams",
      width: "13%",
      render: (_: unknown, record: FailedQuestion) => (
        <OverflowChips
          items={((record.question || record.questionDraft)?.exams || []).map(
            (id) => examMap.get(id) ?? id
          )}
          tone="exam"
          noun="exams"
          empty={<EmptyCell />}
        />
      ),
    },
    {
      title: <ColumnTitle>Actions</ColumnTitle>,
      key: "actions",
      width: 128,
      render: (_: unknown, record: FailedQuestion) => (
        <RowActions>
          <Link
            href={`/admin/failed-questions/${record.id}`}
            className={`${ROW_ACTION_CLASS} ${ROW_ACTION_TONE.primary} !px-3.5`}
          >
            <Wrench className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            Fix
          </Link>
          <IconActionButton
            label="Delete failed question"
            tooltip="Delete"
            icon={Trash2}
            tone="danger"
            loading={deletingId === record.id}
            disabled={deletingId !== null && deletingId !== record.id}
            onClick={() => handleDelete(record)}
          />
        </RowActions>
      ),
    },
  ];

  return (
    <div className="w-full text-console-ink">
      <ListPageHeader
        eyebrow="Question bank"
        title="Failed questions"
        description="Import rows that still need a fix before they can go live."
      />

      <ListCard>
        <ListToolbar className="xl:grid-cols-3">
          <FilterSelect
            placeholder="Filter by exam"
            allowClear
            value={selectedExam}
            onChange={(value) => setSelectedExam(value)}
            options={exams.map((exam) => ({ value: exam._id, label: exam.name }))}
          />
          <FilterSelect
            placeholder="Filter by subject"
            allowClear
            value={selectedSubject}
            onChange={(value) => {
              setSelectedSubject(value);
              setSelectedTopic(null);
            }}
            options={subjects.map((subject) => ({ value: subject._id, label: subject.name }))}
          />
          <DependentFilter
            enabled={Boolean(selectedSubject)}
            hint="Pick a subject first"
            placeholder={ChapterUi.filterPlaceholder}
            allowClear
            value={selectedTopic}
            onChange={(value) => setSelectedTopic(value)}
            options={filteredTopics.map((topic) => ({ value: topic._id, label: topic.name }))}
            className="sm:col-span-2 xl:col-span-1"
          />
        </ListToolbar>

        <ListTable<FailedQuestion>
          columns={columns}
          dataSource={items}
          rowKey="id"
          loading={loading}
          // Fixed columns (#, difficulty, actions) are 288px and the rest share 57%;
          // the question column gets what is left. Below 940px the table scrolls instead.
          scroll={{ x: 940 }}
          empty={
            <TableEmptyState
              icon={CircleCheck}
              message={
                hasFilters
                  ? "No failed questions match these filters."
                  : "Nothing to fix. Every imported question went live."
              }
            />
          }
        />

        <ListFooter
          page={pagination.current}
          pageSize={pagination.pageSize}
          total={pagination.total}
          shownCount={items.length}
          noun="failed questions"
          onPageChange={(page) => fetchFailedQuestions(page)}
          onPageSizeChange={(size) => fetchFailedQuestions(1, size)}
        />
      </ListCard>
    </div>
  );
}
