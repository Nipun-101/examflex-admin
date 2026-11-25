"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
  Switch,
  Table,
  message,
  type TableColumnsType,
} from "antd";
import { Select } from "@/app/components/SearchableSelect";
import { ArrowUpRight, ClipboardList, ListChecks, Loader2, RefreshCw, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { showConfirmModal } from "@/components/ConfirmModal";
import { catalogApi } from "@/app/services/ezprep-api";
import { formatEzPrepError, fullMockApi } from "../../api";
import { loadTopicNamesForQuestions } from "../../topic-names";
import { PageLoader } from "@/app/components/PageLoader";
import { ChapterUi } from "@/app/lib/chapter-ui";
import { questionTagLabels } from "@/app/components/QuestionTags";
import { OverflowChips } from "@/app/admin/_components/OverflowChips";
import {
  ClampText,
  ConsolePageShell,
  DifficultyPill,
  EmptyCell,
  Pill,
  ROW_ACTION_CLASS,
  ROW_ACTION_TONE,
} from "@/app/admin/_components/console-list";
import {
  DetailGrid,
  DetailItem,
  DetailSection,
  DraftStatusPill,
} from "@/app/admin/_components/console-detail";
import { MarksCell, QuestionSnippetCell, SubjectMetaPills } from "../../paper-ui";
import { AccessModeSwitch } from "@/app/components/AccessModeSwitch";
import { QuestionPreview } from "../../QuestionPreview";
import { TopicTag } from "../../TopicTag";
import { CourseCutoffFields } from "../../CourseCutoffFields";
import {
  buildPublishCutoffs,
  resolveTotalMarks,
  type CourseCutoffValues,
} from "../../course-cutoffs";
import { stopQuestionRowToggle } from "../../questionTableExpand";
import type {
  DraftQuestionItem,
  DraftResponse,
  DraftSubjectBlock,
  PublishDraftPayload,
  SearchQuestionItem,
} from "../../types";

const { TextArea } = Input;

/** Publish form: same as the payload, but cut-offs are keyed by course id. */
type PublishFormValues = Omit<PublishDraftPayload, "courseCutoffs"> & {
  courseCutoffs?: CourseCutoffValues;
};
function questionTags(record: { tags?: unknown }) {
  return (
    <OverflowChips
      items={questionTagLabels(record.tags)}
      noun="tags"
      empty={<span className="text-[13px] text-console-muted">No tags</span>}
    />
  );
}

interface TopicOption {
  value: string;
  label: string;
}

export default function FullMockDraftPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = use(props.params);
  const router = useRouter();
  const [form] = Form.useForm<PublishFormValues>();
  const [draft, setDraft] = useState<DraftResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const publishInFlight = useRef(false);
  const [topicNameById, setTopicNameById] = useState<Map<string, string>>(
    new Map()
  );

  const [replaceSlot, setReplaceSlot] = useState<{
    subject: DraftSubjectBlock;
    question: DraftQuestionItem;
  } | null>(null);
  const [replaceSearch, setReplaceSearch] = useState("");
  const [replaceTopicId, setReplaceTopicId] = useState<string | undefined>();
  const [replaceDifficulty, setReplaceDifficulty] = useState<
    string | undefined
  >();
  const [replaceTopics, setReplaceTopics] = useState<TopicOption[]>([]);
  const [replaceSubjects, setReplaceSubjects] = useState<TopicOption[]>([]);
  const [replaceAllowCrossSubject, setReplaceAllowCrossSubject] =
    useState(false);
  const [replaceSubjectId, setReplaceSubjectId] = useState<string | undefined>();
  const [replaceResults, setReplaceResults] = useState<SearchQuestionItem[]>(
    []
  );
  const [replaceLoading, setReplaceLoading] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [replacePagination, setReplacePagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const isEditable = draft?.status === "REVIEW";

  const loadDraft = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fullMockApi.getDraft(params.id);
      setDraft(response.data);
      form.setFieldsValue({
        title: response.data.examSnapshot.name,
        allowRetake: true,
        shuffleOptions: false,
        keepSubjectOrder: true,
        showResultsImmediately: true,
      });
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to load draft"));
      router.push("/admin/full-mock-tests");
    } finally {
      setLoading(false);
    }
  }, [form, params.id, router]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  const mergeTopicNames = (
    topics: Array<{ id: string; name: string }> | undefined
  ) => {
    if (!topics?.length) return;
    setTopicNameById((prev) => {
      const next = new Map(prev);
      topics.forEach((topic) => {
        next.set(topic.id, topic.name);
      });
      return next;
    });
  };

  useEffect(() => {
    if (!draft) return;

    let cancelled = false;
    void loadTopicNamesForQuestions(draft.subjects).then((names) => {
      if (cancelled) return;
      setTopicNameById((prev) => {
        const next = new Map(prev);
        names.forEach((name, id) => next.set(id, name));
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [draft]);

  const searchReplacementQuestions = useCallback(async () => {
    if (!replaceSlot) return;
    setReplaceLoading(true);
    try {
      const response = await fullMockApi.searchQuestions({
        subjectId: replaceAllowCrossSubject
          ? replaceSubjectId
          : replaceSlot.subject.subjectId,
        draftId: params.id,
        search: replaceSearch.trim() || undefined,
        topicId: replaceTopicId,
        difficultyLevel: replaceDifficulty,
        page: replacePagination.current,
        limit: replacePagination.pageSize,
        allowCrossSubject: replaceAllowCrossSubject || undefined,
      });
      setReplaceResults(response.data || []);
      setReplacePagination((prev) => ({
        ...prev,
        total: response.pagination?.total ?? 0,
      }));
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to search questions"));
    } finally {
      setReplaceLoading(false);
    }
  }, [
    params.id,
    replaceDifficulty,
    replacePagination.current,
    replacePagination.pageSize,
    replaceSearch,
    replaceSlot,
    replaceTopicId,
    replaceAllowCrossSubject,
    replaceSubjectId,
  ]);

  useEffect(() => {
    if (replaceSlot) {
      void searchReplacementQuestions();
    }
  }, [replaceSlot, searchReplacementQuestions]);

  const openReplace = async (
    subject: DraftSubjectBlock,
    question: DraftQuestionItem
  ) => {
    setReplaceSlot({ subject, question });
    setReplaceSearch("");
    setReplaceTopicId(undefined);
    setReplaceDifficulty(undefined);
    setReplaceAllowCrossSubject(false);
    setReplaceSubjectId(undefined);
    setReplacePagination((prev) => ({ ...prev, current: 1, total: 0 }));
    setReplaceResults([]);

    try {
      const { data } = await catalogApi.getSubject(subject.subjectId);
      mergeTopicNames(data.topics);
      setReplaceTopics(
        (data.topics || []).map((topic) => ({
          value: topic.id,
          label: topic.name,
        }))
      );
    } catch {
      setReplaceTopics([]);
    }
  };

  const loadTopicsForSubject = async (subjectId: string) => {
    try {
      const { data } = await catalogApi.getSubject(subjectId);
      mergeTopicNames(data.topics);
      setReplaceTopics(
        (data.topics || []).map((topic) => ({
          value: topic.id,
          label: topic.name,
        }))
      );
    } catch {
      setReplaceTopics([]);
    }
  };

  const handleCrossSubjectToggle = async (enabled: boolean) => {
    setReplaceAllowCrossSubject(enabled);
    setReplaceSearch("");
    setReplaceTopicId(undefined);
    setReplaceDifficulty(undefined);
    setReplaceSubjectId(undefined);
    setReplacePagination((prev) => ({ ...prev, current: 1, total: 0 }));
    setReplaceResults([]);

    if (!enabled) {
      if (replaceSlot) {
        await loadTopicsForSubject(replaceSlot.subject.subjectId);
      } else {
        setReplaceTopics([]);
      }
      return;
    }

    setReplaceTopics([]);
    try {
      const response = await catalogApi.listSubjects();
      const subjects = response.data || [];
      setReplaceSubjects(
        subjects.map((subject) => ({
          value: subject.id,
          label: subject.name,
        }))
      );
      subjects.forEach((subject) => mergeTopicNames(subject.topics));
    } catch {
      setReplaceSubjects([]);
    }
  };

  const handleReplace = async (questionId: string) => {
    if (!replaceSlot) return;
    setReplacingId(questionId);
    try {
      const response = await fullMockApi.replaceQuestion(
        params.id,
        replaceSlot.question.position,
        questionId,
        { allowCrossSubject: replaceAllowCrossSubject || undefined }
      );
      setDraft(response.data);
      message.success(response.message || "Question replaced");
      setReplaceSlot(null);
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to replace question"));
    } finally {
      setReplacingId(null);
    }
  };

  const handlePublish = async (values: PublishFormValues) => {
    if (publishInFlight.current) {
      return;
    }
    publishInFlight.current = true;
    setPublishing(true);
    try {
      const payload: PublishDraftPayload = {
        title: values.title?.trim() || undefined,
        description: values.description?.trim() || undefined,
        allowRetake: values.allowRetake,
        shuffleOptions: values.shuffleOptions,
        showResultsImmediately: values.showResultsImmediately,
        accessMode: values.accessMode ?? "FREE",
      };
      if (draft && !draft.examSnapshot.isSessionWise) {
        payload.keepSubjectOrder = !!values.keepSubjectOrder;
      }
      if (values.passingScore != null) {
        payload.passingScore = values.passingScore;
      }
      const courseCutoffs = buildPublishCutoffs(values.courseCutoffs);
      if (courseCutoffs.length > 0) {
        payload.courseCutoffs = courseCutoffs;
      }
      const response = await fullMockApi.publishDraft(params.id, payload);
      message.success(response.message || "Full mock published");
      setDraft(response.data.draft);
      router.push(`/admin/full-mock-tests/${response.data.mockTestId}`);
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to publish draft"));
    } finally {
      publishInFlight.current = false;
      setPublishing(false);
    }
  };

  const handleDiscard = () => {
    showConfirmModal({
      title: "Discard Draft",
      content:
        "Discard this draft? Question usage is not incremented. This cannot be undone.",
      onConfirm: async () => {
        try {
          const response = await fullMockApi.discardDraft(params.id);
          message.success(response.message || "Draft discarded");
          router.push("/admin/full-mock-tests");
        } catch (error) {
          message.error(formatEzPrepError(error, "Failed to discard draft"));
        }
      },
    });
  };

  const snapshot = draft?.examSnapshot;
  const paperDuration = useMemo(() => {
    if (!draft) return null;
    if (draft.examSnapshot.isSessionWise) {
      const sum = draft.subjects.reduce(
        (total, block) => total + (block.sessionTime || 0),
        0
      );
      return sum ? `${sum} mins (sum of sessions)` : "-";
    }
    return snapshot?.duration != null ? `${snapshot.duration} mins` : "-";
  }, [draft, snapshot?.duration]);

  const questionColumns = (
    subject: DraftSubjectBlock
  ): TableColumnsType<DraftQuestionItem> => [
    {
      title: "#",
      dataIndex: "position",
      key: "position",
      width: 52,
      render: (position: number) => (
        <span className="text-[13px] font-semibold tabular-nums text-console-muted">
          {position + 1}
        </span>
      ),
    },
    {
      title: "Question",
      key: "question",
      // Flexible: takes what the other columns leave. The full preview is shown below each row.
      render: (_: unknown, record: DraftQuestionItem) => (
        <div className="min-w-0">
          <QuestionSnippetCell question={record} />
          {record.replacedFrom ? (
            <span className="mt-1 inline-block">
              <Pill tone="amber" dot={false}>
                Replaced
              </Pill>
            </span>
          ) : null}
        </div>
      ),
    },
    {
      title: ChapterUi.singular,
      dataIndex: "topic",
      key: "topic",
      width: "18%",
      render: (topicId?: string) =>
        topicId ? <TopicTag name={topicNameById.get(topicId) || topicId} /> : <EmptyCell />,
    },
    {
      title: "Difficulty",
      dataIndex: "difficultyLevel",
      key: "difficultyLevel",
      width: 108,
      render: (level?: string) => <DifficultyPill level={level} />,
    },
    {
      title: "Tags",
      key: "tags",
      width: "15%",
      render: (_: unknown, record: DraftQuestionItem) =>
        questionTags(record as { tags?: unknown }),
    },
    {
      title: "Marks",
      key: "marks",
      width: 88,
      render: (_: unknown, record: DraftQuestionItem) => <MarksCell record={record} />,
    },
    ...(isEditable
      ? [
          {
            title: "Actions",
            key: "actions",
            width: 124,
            render: (_: unknown, record: DraftQuestionItem) => (
              <button
                type="button"
                onClick={(event) => {
                  stopQuestionRowToggle(event);
                  void openReplace(subject, record);
                }}
                className={`${ROW_ACTION_CLASS} border border-console-line bg-white text-console-ink hover:border-console-ink-hover/50 hover:text-console-ink-hover`}
              >
                <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                Replace
              </button>
            ),
          },
        ]
      : []),
  ];

  const replaceColumns: TableColumnsType<SearchQuestionItem> = [
    {
      title: "Question",
      key: "question",
      render: (_: unknown, record: SearchQuestionItem) =>
        record.snippet ? (
          <ClampText text={record.snippet} className="text-[13.5px] leading-snug text-console-ink" />
        ) : (
          <QuestionSnippetCell question={record} />
        ),
    },
    {
      title: ChapterUi.singular,
      dataIndex: "topic",
      key: "topic",
      width: "22%",
      render: (topicId?: string) =>
        topicId ? <TopicTag name={topicNameById.get(topicId) || topicId} /> : <EmptyCell />,
    },
    {
      title: "Difficulty",
      dataIndex: "difficultyLevel",
      key: "difficultyLevel",
      width: 104,
      render: (level?: string) => <DifficultyPill level={level} />,
    },
    {
      title: "Tags",
      key: "tags",
      width: "16%",
      render: (_: unknown, record: SearchQuestionItem) =>
        questionTags(record as { tags?: unknown }),
    },
    {
      title: "Actions",
      key: "actions",
      width: 112,
      render: (_: unknown, record: SearchQuestionItem) => (
        <button
          type="button"
          disabled={!!replacingId}
          aria-busy={replacingId === record._id || undefined}
          onClick={() => handleReplace(record._id)}
          className={`${ROW_ACTION_CLASS} ${ROW_ACTION_TONE.primary} !h-8 !px-3`}
        >
          {replacingId === record._id ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : null}
          Use this
        </button>
      ),
    },
  ];

  if (loading || !draft) {
    return (
      <>
        <Form form={form} component={false} />
        <PageLoader />
      </>
    );
  }

  return (
    <ConsolePageShell
      eyebrow="Full mock draft"
      title={snapshot?.name || "Full Mock Draft"}
      back={{
        label: "Back to Full mock tests",
        onClick: () => {
          message.info("Draft kept — resume it anytime from the drafts list");
          router.push("/admin/full-mock-tests");
        },
      }}
      badge={<DraftStatusPill status={draft.status} />}
    >
      <DetailSection title="Exam Blueprint" icon={ClipboardList} tone="green">
        <DetailGrid>
          <DetailItem label="Exam">{snapshot?.name}</DetailItem>
          <DetailItem label="Mode">
            {snapshot?.isSessionWise ? (
              <Pill tone="violet">Session-wise</Pill>
            ) : (
              <Pill tone="blue">Mixed</Pill>
            )}
          </DetailItem>
          <DetailItem label="Total Questions">{snapshot?.totalQuestions}</DetailItem>
          <DetailItem label="Duration">{paperDuration}</DetailItem>
          <DetailItem label="Total Marks">{snapshot?.totalMarks ?? "-"}</DetailItem>
          <DetailItem label="Description" wide>
            <span className="font-normal leading-relaxed">
              {snapshot?.description || "No description"}
            </span>
          </DetailItem>
        </DetailGrid>
      </DetailSection>

      {draft.subjects.map((subject) => (
        <DetailSection
          key={subject.subjectId}
          title={subject.name}
          icon={ListChecks}
          tone="violet"
          extra={<SubjectMetaPills subject={subject} />}
          flush
        >
          <Table<DraftQuestionItem>
            columns={questionColumns(subject)}
            dataSource={subject.questions}
            rowKey={(record: DraftQuestionItem) => `${record.position}-${record._id}`}
            tableLayout="fixed"
            pagination={false}
            expandable={{
              expandedRowRender: (record) => <QuestionPreview question={record} />,
              expandedRowKeys: subject.questions.map(
                (record) => `${record.position}-${record._id}`
              ),
              showExpandColumn: false,
            }}
          />
        </DetailSection>
      ))}

      {isEditable ? (
        <DetailSection title="Publish" icon={Send} tone="lime">
          <Form
            form={form}
            layout="vertical"
            onFinish={handlePublish}
            initialValues={{
              allowRetake: true,
              shuffleOptions: false,
              keepSubjectOrder: true,
              showResultsImmediately: true,
              accessMode: "FREE",
            }}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Form.Item label="Test Title" name="title">
                <Input placeholder="Defaults to exam name if empty" />
              </Form.Item>
              <Form.Item label="Passing Score" name="passingScore">
                <InputNumber min={0} className="w-full" placeholder="Optional" />
              </Form.Item>
            </div>
            <Form.Item label="Description" name="description">
              <TextArea rows={3} placeholder="Optional description" />
            </Form.Item>
            {!snapshot?.isSessionWise ? (
              <Form.Item
                label="Keep subject order"
                name="keepSubjectOrder"
                valuePropName="checked"
                tooltip="Mixed papers only. This does not shuffle answer choices."
                extra="On: each subject stays together in exam order. Off: questions stay mixed across the paper."
              >
                <Switch />
              </Form.Item>
            ) : null}
            <Form.Item
              label="Course cut-offs (optional)"
              name="courseCutoffs"
              extra="Marks a student needs for each course on this paper. Set them based on how hard this paper is; you can also add or change them later from the published mock."
            >
              <CourseCutoffFields
                examId={draft?.examId}
                totalMarks={resolveTotalMarks(snapshot?.totalMarks, draft?.subjects)}
              />
            </Form.Item>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Form.Item label="Allow Retake" name="allowRetake" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item label="Shuffle Options" name="shuffleOptions" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item
                label="Show Results Immediately"
                name="showResultsImmediately"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <AccessModeSwitch />
            </div>
            <Space wrap>
              <Button type="primary" htmlType="submit" loading={publishing}>
                Publish Full Mock
              </Button>
              <Button danger onClick={handleDiscard}>
                Discard Draft
              </Button>
            </Space>
          </Form>
        </DetailSection>
      ) : draft.status === "PUBLISHED" && draft.publishedMockTestId ? (
        <div className="flex flex-col gap-3 rounded-[24px] border border-console-line bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="m-0 text-[15px] text-console-muted">This draft has been published.</p>
          <Button
            type="primary"
            icon={<ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
            onClick={() => router.push(`/admin/full-mock-tests/${draft.publishedMockTestId}`)}
          >
            View Published Test
          </Button>
        </div>
      ) : null}

      <Modal
        title={`Replace question #${
          replaceSlot ? replaceSlot.question.position + 1 : ""
        } — ${replaceSlot?.subject.name || ""}`}
        open={!!replaceSlot}
        onCancel={() => setReplaceSlot(null)}
        footer={null}
        width={900}
        // Same table styling and phone scrolling as the page.
        wrapClassName="console-shell"
        destroyOnHidden
      >
        <p className="mb-4 text-console-muted">
          {replaceAllowCrossSubject
            ? "Choose another subject below. This slot still belongs to the current section."
            : ChapterUi.sprintReplaceTopicMayDiffer}
        </p>
        <Form layout="vertical" className="mb-0">
          <Form.Item
            label="Allow a different subject"
            tooltip="Use this when another subject is counted inside this section (for example General Science inside General Awareness on SSC CGL). The section name, marks, and session timer do not change—only the question content does."
            className="mb-3"
          >
            <Switch
              checked={replaceAllowCrossSubject}
              checkedChildren="Yes"
              unCheckedChildren="No"
              onChange={(checked) => {
                void handleCrossSubjectToggle(checked);
              }}
            />
          </Form.Item>
        </Form>
        {replaceAllowCrossSubject ? (
          <Alert
            type="warning"
            showIcon
            className="mb-4"
            message="Section stays the same"
            description={`${replaceSlot?.subject.name || "This section"} keeps this slot’s marks and timer. Filter by the other subject (and topic) below, then click Use this.`}
          />
        ) : null}
        <Space wrap className="mb-4">
          <Input.Search
            placeholder="Search question text"
            allowClear
            className="w-64 max-w-full"
            onSearch={(value) => {
              setReplaceSearch(value);
              setReplacePagination((prev) => ({ ...prev, current: 1 }));
            }}
          />
          {replaceAllowCrossSubject ? (
            <Select
              allowClear
              placeholder="Subject"
              className="min-w-[180px]"
              options={replaceSubjects}
              value={replaceSubjectId}
              onChange={(value) => {
                setReplaceSubjectId(value);
                setReplaceTopicId(undefined);
                setReplacePagination((prev) => ({ ...prev, current: 1 }));
                if (value) {
                  void loadTopicsForSubject(value);
                } else {
                  setReplaceTopics([]);
                }
              }}
            />
          ) : null}
          <Select
            allowClear
            placeholder={ChapterUi.singular}
            className="min-w-[180px]"
            options={replaceTopics}
            value={replaceTopicId}
            disabled={replaceAllowCrossSubject && !replaceSubjectId}
            onChange={(value) => {
              setReplaceTopicId(value);
              setReplacePagination((prev) => ({ ...prev, current: 1 }));
            }}
          />
          <Select
            allowClear
            placeholder="Difficulty"
            className="min-w-[140px]"
            value={replaceDifficulty}
            onChange={(value) => {
              setReplaceDifficulty(value);
              setReplacePagination((prev) => ({ ...prev, current: 1 }));
            }}
            options={[
              { value: "easy", label: "Easy" },
              { value: "medium", label: "Medium" },
              { value: "hard", label: "Hard" },
            ]}
          />
        </Space>
        <Table<SearchQuestionItem>
          columns={replaceColumns}
          dataSource={replaceResults}
          rowKey="_id"
          tableLayout="fixed"
          loading={replaceLoading}
          size="small"
          pagination={{
            current: replacePagination.current,
            pageSize: replacePagination.pageSize,
            total: replacePagination.total,
            onChange: (page, pageSize) => {
              setReplacePagination((prev) => ({
                ...prev,
                current: page,
                pageSize: pageSize || prev.pageSize,
              }));
            },
          }}
        />
      </Modal>
    </ConsolePageShell>
  );
}
