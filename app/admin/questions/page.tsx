"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Tooltip, message, type TableColumnsType } from "antd";
import { CircleHelp, Info, Pencil, Trash2, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { showConfirmModal } from "@/components/ConfirmModal";
import {
  catalogApi,
  formatEzPrepError,
  questionsApi,
  refId,
  refName,
  type Question,
} from "@/app/services/ezprep-api";
import { PageLoader } from "@/app/components/PageLoader";
import { questionTagLabels } from "@/app/components/QuestionTags";
import { questionsEditHref } from "./questions-list-href";
import { CreateSprintFromSelectionModal } from "./CreateSprintFromSelectionModal";
import { CreateTopicWiseFromSelectionModal } from "./CreateTopicWiseFromSelectionModal";
import {
  isSprintSelectionSize,
  setQuestionsSelected,
  setQuestionSelected,
  snapshotQuestion,
  sprintSelectionHint,
  type SelectedSprintQuestion,
} from "./sprint-selection";
import { ChapterUi } from "@/app/lib/chapter-ui";
import { topicWiseSelectionIssue } from "./topic-wise-selection";
import { OverflowChips, TruncatedChip } from "../_components/OverflowChips";
import {
  CONSOLE_TOOLTIP_COLOR,
  ClampText,
  ColumnTitle,
  DependentFilter,
  DifficultyPill,
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

const SELECTION_BUTTON =
  "inline-flex h-9 items-center rounded-full bg-console-ink px-4 text-[14px] font-semibold text-white transition-colors hover:bg-console-ink-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-console-green disabled:cursor-not-allowed disabled:bg-[#DDE3D6] disabled:text-console-muted";

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const SEARCH_DEBOUNCE_MS = 300;

function QuestionsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [questions, setQuestions] = useState<Question[]>([]);
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
  const [selectedQuestions, setSelectedQuestions] = useState<
    Map<string, SelectedSprintQuestion>
  >(new Map());
  const [sprintModalOpen, setSprintModalOpen] = useState(false);
  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const selectedCount = selectedQuestions.size;
  const selectedList = [...selectedQuestions.values()];
  const canCreateSprint = isSprintSelectionSize(selectedCount);
  const topicIssue = topicWiseSelectionIssue(selectedList);
  const canCreateTopic = topicIssue === null;

  const updateQuery = (updates: Record<string, string | number | null | undefined>) => {
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

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const data = await questionsApi.list({
        page,
        limit: pageSize,
        subjectId: selectedSubject || undefined,
        examId: selectedExam || undefined,
        topicId: selectedTopic || undefined,
        search: selectedSearch.trim() || undefined,
      });
      setQuestions(data.data || []);
      setTotal(data.pagination?.total ?? 0);
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to fetch questions"));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubjects();
    fetchExams();
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
    void fetchQuestions();
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
      title: "Delete Question",
      content:
        "Are you sure you want to delete this question? This action cannot be undone.",
      onConfirm: async () => {
        setTableLoading(true);
        try {
          await questionsApi.delete(id);
          await fetchQuestions();
          message.success("Question deleted successfully");
        } catch (error) {
          message.error(formatEzPrepError(error, "Failed to delete question"));
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

  const columns: TableColumnsType<Question> = [
    {
      title: <ColumnTitle>Question</ColumnTitle>,
      key: "question",
      // No width: gets whatever is left after the other columns, and stays deliberately
      // narrow (two clipped lines). The full text lives on the edit page and in the tooltip.
      render: (_: unknown, record: Question) => {
        const english = record?.questionText?.en?.text || "";
        const malayalam = record?.questionText?.ml?.text || "";
        return (
          <div className="min-w-0">
            {english ? (
              <ClampText
                text={english}
                className="text-[14px] font-semibold leading-snug text-console-ink"
              />
            ) : (
              <span className="text-[14px] text-console-muted">Untitled question</span>
            )}
            {malayalam ? (
              <div className="mt-0.5 truncate text-[12.5px] text-console-muted">{malayalam}</div>
            ) : null}
          </div>
        );
      },
    },
    {
      title: <ColumnTitle>Subject</ColumnTitle>,
      key: "subject",
      width: "9%",
      render: (_: unknown, record: Question) => <SubjectLabel name={refName(record.subject)} />,
    },
    {
      title: <ColumnTitle>Difficulty</ColumnTitle>,
      key: "difficultyLevel",
      width: 108,
      render: (_: unknown, record: Question) => <DifficultyPill level={record.difficultyLevel} />,
    },
    {
      title: <ColumnTitle>Tags</ColumnTitle>,
      key: "tags",
      width: "13%",
      render: (_: unknown, record: Question) => (
        <OverflowChips
          items={questionTagLabels(record.tags)}
          noun="tags"
          empty={<span className="text-[13px] text-console-muted">No tags</span>}
        />
      ),
    },
    {
      title: <ColumnTitle>{ChapterUi.singular}</ColumnTitle>,
      key: "topic",
      width: "22%",
      render: (_: unknown, record: Question) => {
        const name = record.topic ? refName(record.topic) || refId(record.topic) : "";
        return name ? <TruncatedChip label={name} maxWidthClass="max-w-full" /> : <EmptyCell />;
      },
    },
    {
      title: <ColumnTitle>Exams</ColumnTitle>,
      key: "exams",
      width: "16%",
      render: (_: unknown, record: Question) => (
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
      title: <ColumnTitle>Actions</ColumnTitle>,
      key: "actions",
      width: 104,
      render: (_: unknown, record: Question) => (
        <RowActions>
          <IconActionLink
            href={questionsEditHref(record.id, searchParams)}
            label="Edit question"
            tooltip="Edit"
            icon={Pencil}
          />
          <IconActionButton
            label="Delete question"
            tooltip="Delete"
            icon={Trash2}
            tone="danger"
            onClick={() => handleDelete(record.id)}
          />
        </RowActions>
      ),
    },
  ];

  const hasFilters = Boolean(
    selectedExam || selectedSubject || selectedTopic || selectedSearch.trim()
  );
  const selectionNote =
    selectedCount > 0 && !canCreateSprint
      ? { tone: selectedCount < 10 ? "info" : "warning", text: sprintSelectionHint(selectedCount) }
      : selectedCount > 0 && !canCreateTopic && topicIssue
        ? { tone: "warning", text: topicIssue }
        : null;

  return (
    <div className="w-full text-console-ink">
      <ListPageHeader
        eyebrow="Question bank"
        title="Questions"
        actions={<PrimaryActionLink href="/admin/questions/new">Add Question</PrimaryActionLink>}
      />

      <ListCard>
        <ListToolbar className="xl:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <ListSearch
            placeholder="Search question text"
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

        {selectedCount > 0 ? (
          <div className="flex flex-col gap-3 border-t border-console-line bg-[#F2F6E7] px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-[15px] font-semibold text-console-ink">
                {selectedCount} selected
              </span>
              {selectionNote ? (
                <span
                  className={`inline-flex items-center gap-1.5 text-[14px] ${
                    selectionNote.tone === "warning" ? "text-[#9A5A12]" : "text-console-muted"
                  }`}
                >
                  <Info className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                  {selectionNote.text}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Tooltip title={sprintSelectionHint(selectedCount)} color={CONSOLE_TOOLTIP_COLOR}>
                <span className="inline-block">
                  <button
                    type="button"
                    disabled={!canCreateSprint}
                    onClick={() => setSprintModalOpen(true)}
                    className={SELECTION_BUTTON}
                  >
                    + Sprint Test
                  </button>
                </span>
              </Tooltip>
              <Tooltip
                title={topicIssue || ChapterUi.canCreateFromSelection(selectedCount)}
                color={CONSOLE_TOOLTIP_COLOR}
              >
                <span className="inline-block">
                  <button
                    type="button"
                    disabled={!canCreateTopic}
                    onClick={() => setTopicModalOpen(true)}
                    className={SELECTION_BUTTON}
                  >
                    {ChapterUi.topicTestButton}
                  </button>
                </span>
              </Tooltip>
              <button
                type="button"
                aria-label={`Clear selection (${selectedCount})`}
                onClick={() => setSelectedQuestions(new Map())}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-console-line bg-white px-3.5 text-[14px] font-semibold text-console-ink transition-colors hover:border-console-green/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-console-green"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Clear
              </button>
            </div>
          </div>
        ) : null}

        <ListTable<Question>
          columns={columns}
          dataSource={questions}
          rowKey="id"
          loading={tableLoading || loading}
          // Checkbox, difficulty and actions are fixed (260px); subject, tags, chapter and
          // exams take 60% of the width; the question column gets the rest. Below 940px
          // (tablets/phones) the table scrolls sideways instead of crushing the columns.
          scroll={{ x: 940 }}
          empty={
            <TableEmptyState
              icon={CircleHelp}
              message={
                hasFilters
                  ? "No questions match these filters."
                  : "No questions yet. Add one to start the bank."
              }
            />
          }
          rowSelection={{
            columnWidth: 48,
            selectedRowKeys: [...selectedQuestions.keys()],
            preserveSelectedRowKeys: true,
            onSelect: (record, checked) => {
              setSelectedQuestions((current) =>
                setQuestionSelected(current, snapshotQuestion(record), checked)
              );
            },
            onSelectAll: (checked, _selectedRows, changeRows) => {
              setSelectedQuestions((current) =>
                setQuestionsSelected(
                  current,
                  changeRows.map((row) => snapshotQuestion(row)),
                  checked
                )
              );
            },
          }}
        />

        <ListFooter
          page={page}
          pageSize={pageSize}
          total={total}
          shownCount={questions.length}
          noun="questions"
          onPageChange={(nextPage) => updateQuery({ page: nextPage })}
          onPageSizeChange={(size) => updateQuery({ limit: size, page: 1 })}
        />
      </ListCard>

      <CreateSprintFromSelectionModal
        open={sprintModalOpen}
        questions={selectedList}
        exams={exams.map((exam) => ({ id: exam._id, name: exam.name }))}
        onClose={() => setSprintModalOpen(false)}
        onCreated={() => {
          setSelectedQuestions(new Map());
          setSprintModalOpen(false);
        }}
      />
      <CreateTopicWiseFromSelectionModal
        open={topicModalOpen}
        questions={selectedList}
        exams={exams.map((exam) => ({ id: exam._id, name: exam.name }))}
        onClose={() => setTopicModalOpen(false)}
        onCreated={() => {
          setSelectedQuestions(new Map());
          setTopicModalOpen(false);
        }}
      />
    </div>
  );
}

export default function QuestionsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <QuestionsPageContent />
    </Suspense>
  );
}
