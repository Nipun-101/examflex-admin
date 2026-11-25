"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
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
import { ClipboardList, ListChecks, Loader2, RefreshCw, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { showConfirmModal } from "@/components/ConfirmModal";
import { catalogApi } from "@/app/services/ezprep-api";
import { formatEzPrepError, sprintTestsApi } from "../../api";
import { PageLoader } from "@/app/components/PageLoader";
import { ChapterUi } from "@/app/lib/chapter-ui";
import { questionTagLabels } from "@/app/components/QuestionTags";
import { OverflowChips, TruncatedChip } from "@/app/admin/_components/OverflowChips";
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
import { AccessModeSwitch } from "@/app/components/AccessModeSwitch";
import { QuestionPreview } from "@/app/admin/full-mock-tests/QuestionPreview";
import {
  questionPreviewExpandable,
  questionPreviewOnRow,
  stopQuestionRowToggle,
} from "@/app/admin/full-mock-tests/questionTableExpand";
import type { SafeQuestion } from "@/app/admin/full-mock-tests/types";
import type {
  PublishSprintDraftPayload,
  SprintDraft,
  SprintDraftSubjectBlock,
  SprintQuestionItem,
  SprintSearchQuestion,
} from "../../types";

function questionTags(record: { tags?: unknown }) {
  return (
    <OverflowChips
      items={questionTagLabels(record.tags)}
      noun="tags"
      empty={<span className="text-[13px] text-console-muted">No tags</span>}
    />
  );
}

function chapterChip(name?: string) {
  return name ? <TruncatedChip label={name} maxWidthClass="max-w-full" /> : <EmptyCell />;
}

export default function SprintDraftPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const [form] = Form.useForm();
  const publishInFlight = useRef(false);
  const [draft, setDraft] = useState<SprintDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [replaceSlot, setReplaceSlot] = useState<{
    subject: SprintDraftSubjectBlock;
    question: SprintQuestionItem;
  } | null>(null);
  const [replacePagination, setReplacePagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [replaceAllowCrossSubject, setReplaceAllowCrossSubject] = useState(false);
  const [replaceSubjectId, setReplaceSubjectId] = useState<string | undefined>();
  const [replaceSubjects, setReplaceSubjects] = useState<
    { value: string; label: string }[]
  >([]);
  const [replaceTopics, setReplaceTopics] = useState<{ value: string; label: string }[]>(
    []
  );
  const [replaceSearch, setReplaceSearch] = useState("");
  const [replaceTopicId, setReplaceTopicId] = useState<string | undefined>();
  const [replaceDifficulty, setReplaceDifficulty] = useState<string | undefined>();
  const [replaceResults, setReplaceResults] = useState<SprintSearchQuestion[]>([]);
  const [replaceLoading, setReplaceLoading] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [topicNameById, setTopicNameById] = useState<Map<string, string>>(new Map());

  const loadDraft = useCallback(async () => {
    setLoading(true);
    try {
      const response = await sprintTestsApi.getDraft(params.id);
      setDraft(response.data);
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to load draft"));
      router.push("/admin/sprint-tests");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    void loadDraft();
  }, [loadDraft]);

  useEffect(() => {
    if (loading || !draft || draft.status !== "REVIEW") return;
    form.setFieldsValue({
      title: draft.settings.title,
      description: draft.settings.description,
      marksPerQuestion: draft.settings.marksPerQuestion,
      negativeMarking: draft.settings.negativeMarking,
      passingScore: draft.settings.passingScore,
      allowRetake: draft.settings.allowRetake,
      shuffleOptions: draft.settings.shuffleOptions,
      showResultsImmediately: draft.settings.showResultsImmediately,
      accessMode: draft.settings.accessMode ?? "FREE",
    });
  }, [draft, form, loading]);

  useEffect(() => {
    if (!draft) return;
    const loadTopics = async () => {
      await Promise.all(
        draft.subjects.map(async (block) => {
          try {
            const { data } = await catalogApi.getSubject(block.subjectId);
            setTopicNameById((prev) => {
              const next = new Map(prev);
              (data.topics || []).forEach((topic) => next.set(topic.id, topic.name));
              return next;
            });
          } catch {
            // Topic labels are display-only.
          }
        })
      );
    };
    void loadTopics();
  }, [draft]);

  const mergeTopicNames = (
    topics: Array<{ id: string; name: string }> | undefined
  ) => {
    if (!topics?.length) return;
    setTopicNameById((prev) => {
      const next = new Map(prev);
      topics.forEach((topic) => next.set(topic.id, topic.name));
      return next;
    });
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

  const searchReplacementQuestions = useCallback(async () => {
    if (!replaceSlot) return;
    setReplaceLoading(true);
    try {
      const response = await sprintTestsApi.searchQuestions({
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
    replaceAllowCrossSubject,
    replaceDifficulty,
    replacePagination.current,
    replacePagination.pageSize,
    replaceSearch,
    replaceSlot,
    replaceSubjectId,
    replaceTopicId,
  ]);

  useEffect(() => {
    if (replaceSlot) {
      void searchReplacementQuestions();
    }
  }, [replaceSlot, searchReplacementQuestions]);

  const openReplace = async (
    subject: SprintDraftSubjectBlock,
    question: SprintQuestionItem
  ) => {
    setReplaceSlot({ subject, question });
    setReplaceAllowCrossSubject(false);
    setReplaceSubjectId(undefined);
    setReplaceSearch("");
    setReplaceTopicId(undefined);
    setReplaceDifficulty(undefined);
    setReplaceResults([]);
    setReplacePagination((prev) => ({ ...prev, current: 1, total: 0 }));
    await loadTopicsForSubject(subject.subjectId);
  };

  const handleCrossSubjectToggle = async (enabled: boolean) => {
    setReplaceAllowCrossSubject(enabled);
    setReplaceSubjectId(undefined);
    setReplaceTopicId(undefined);
    setReplaceDifficulty(undefined);
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
      const response = await sprintTestsApi.replaceQuestion(
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

  const handlePublish = async (values: PublishSprintDraftPayload) => {
    if (publishInFlight.current) return;
    publishInFlight.current = true;
    setPublishing(true);
    try {
      const response = await sprintTestsApi.publishDraft(params.id, {
        title: values.title?.trim() || undefined,
        description: values.description?.trim() || undefined,
        marksPerQuestion: values.marksPerQuestion,
        negativeMarking: values.negativeMarking,
        passingScore: values.passingScore,
        allowRetake: values.allowRetake,
        shuffleOptions: values.shuffleOptions,
        showResultsImmediately: values.showResultsImmediately,
        accessMode: values.accessMode ?? "FREE",
      });
      message.success(response.message || "Sprint test published");
      router.push(`/admin/sprint-tests/${response.data.mockTestId}`);
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to publish draft"));
      publishInFlight.current = false;
      setPublishing(false);
    }
  };

  const handleDiscard = () => {
    showConfirmModal({
      title: "Discard Draft",
      content: "Discard this draft? Question usage is not changed.",
      onConfirm: async () => {
        try {
          const response = await sprintTestsApi.discardDraft(params.id);
          message.success(response.message || "Draft discarded");
          router.push("/admin/sprint-tests");
        } catch (error) {
          message.error(formatEzPrepError(error, "Failed to discard draft"));
        }
      },
    });
  };

  if (loading || !draft) {
    return <PageLoader />;
  }

  const editable = draft.status === "REVIEW";
  const settings = draft.settings;

  const questionColumns = (
    subject: SprintDraftSubjectBlock
  ): TableColumnsType<SprintQuestionItem> => [
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
      // Flexible: takes what the other columns leave. Click the row for the full preview.
      render: (_: unknown, record: SprintQuestionItem) => (
        <div className="min-w-0">
          <ClampText
            text={record.questionText?.en?.text?.slice(0, 100) || "Question"}
            className="text-[14px] font-semibold leading-snug text-console-ink"
          />
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
      width: "22%",
      render: (topicId?: string) =>
        chapterChip(topicId ? topicNameById.get(topicId) || topicId : undefined),
    },
    {
      title: "Difficulty",
      dataIndex: "difficultyLevel",
      key: "difficulty",
      width: 108,
      render: (level?: string) => <DifficultyPill level={level} />,
    },
    {
      title: "Tags",
      key: "tags",
      width: "16%",
      render: (_: unknown, record: SprintQuestionItem) =>
        questionTags(record as { tags?: unknown }),
    },
    ...(editable
      ? [
          {
            title: "Actions",
            key: "actions",
            width: 124,
            render: (_: unknown, record: SprintQuestionItem) => (
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

  return (
    <ConsolePageShell
      eyebrow="Sprint draft"
      title={settings.title || draft.examName}
      back={{ label: "Back to Sprint tests", onClick: () => router.push("/admin/sprint-tests") }}
      badge={<DraftStatusPill status={draft.status} />}
    >
      <DetailSection title="Sprint draft" icon={ClipboardList} tone="green">
        <DetailGrid>
          <DetailItem label="Exam">
            {draft.examName ? (
              <TruncatedChip label={draft.examName} tone="exam" maxWidthClass="max-w-full" />
            ) : (
              <EmptyCell />
            )}
          </DetailItem>
          <DetailItem label="Questions">{settings.totalQuestions}</DetailItem>
          <DetailItem label="Duration">{settings.durationInMinutes} minutes</DetailItem>
          <DetailItem label="Marks / Q">{settings.marksPerQuestion}</DetailItem>
        </DetailGrid>
      </DetailSection>

      {draft.subjects.map((subject) => (
        <DetailSection
          key={subject.subjectId}
          title={subject.name}
          icon={ListChecks}
          tone="violet"
          extra={
            <Pill tone="neutral" dot={false}>
              {subject.questions.length} questions
            </Pill>
          }
          flush
        >
          <Table<SprintQuestionItem>
            columns={questionColumns(subject)}
            dataSource={subject.questions}
            rowKey={(record: SprintQuestionItem) => `${record.position}-${record._id}`}
            tableLayout="fixed"
            pagination={false}
            onRow={questionPreviewOnRow}
            expandable={questionPreviewExpandable((record: SprintQuestionItem) => (
              <QuestionPreview question={record as SafeQuestion} />
            ))}
          />
        </DetailSection>
      ))}

      {editable ? (
        <DetailSection title="Publish" icon={Send} tone="lime">
          <Form form={form} layout="vertical" onFinish={handlePublish}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Form.Item label="Test Title" name="title">
                <Input />
              </Form.Item>
              <Form.Item label="Marks Per Question" name="marksPerQuestion">
                <InputNumber min={0} className="w-full" />
              </Form.Item>
              <Form.Item label="Negative Marking" name="negativeMarking">
                <InputNumber min={0} className="w-full" />
              </Form.Item>
              <Form.Item label="Passing Score" name="passingScore">
                <InputNumber min={0} className="w-full" />
              </Form.Item>
            </div>
            <Form.Item label="Description" name="description">
              <Input.TextArea rows={3} />
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
              <Button type="primary" htmlType="submit" loading={publishing} disabled={publishing}>
                Publish
              </Button>
              <Button danger onClick={handleDiscard}>
                Discard
              </Button>
            </Space>
          </Form>
        </DetailSection>
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
            tooltip="The slot keeps its subject, marks, and position. The replacement must still be tagged to this exam."
            className="mb-3"
          >
            <Switch
              aria-label="Allow a different subject"
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
            description={`${replaceSlot?.subject.name || "This section"} keeps this slot’s marks. Filter by the other subject (and topic) below, then click Use this.`}
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
        <Table<SprintSearchQuestion>
          size="small"
          rowKey="_id"
          tableLayout="fixed"
          loading={replaceLoading}
          dataSource={replaceResults}
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
          columns={[
            {
              title: "Question",
              key: "question",
              render: (_: unknown, record: SprintSearchQuestion) => (
                <ClampText
                  text={record.snippet || record.questionText?.en?.text || record._id}
                  className="text-[13.5px] leading-snug text-console-ink"
                />
              ),
            },
            {
              title: ChapterUi.singular,
              dataIndex: "topic",
              key: "topic",
              width: "22%",
              render: (topicId?: string) =>
                chapterChip(topicId ? topicNameById.get(topicId) || topicId : undefined),
            },
            {
              title: "Difficulty",
              dataIndex: "difficultyLevel",
              key: "difficulty",
              width: 104,
              render: (level?: string) => <DifficultyPill level={level} />,
            },
            {
              title: "Tags",
              key: "tags",
              width: "16%",
              render: (_: unknown, record: SprintSearchQuestion) =>
                questionTags(record as { tags?: unknown }),
            },
            {
              title: "Actions",
              key: "use",
              width: 112,
              render: (_: unknown, record: SprintSearchQuestion) => (
                <button
                  type="button"
                  disabled={!!replacingId}
                  aria-busy={replacingId === record._id || undefined}
                  onClick={() => void handleReplace(record._id)}
                  className={`${ROW_ACTION_CLASS} ${ROW_ACTION_TONE.primary} !h-8 !px-3`}
                >
                  {replacingId === record._id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  ) : null}
                  Use this
                </button>
              ),
            },
          ]}
        />
      </Modal>
    </ConsolePageShell>
  );
}
