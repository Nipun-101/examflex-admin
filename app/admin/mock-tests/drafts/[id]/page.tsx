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
import { ClipboardList, ListChecks, Loader2, RefreshCw, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { showConfirmModal } from "@/components/ConfirmModal";
import { PageLoader } from "@/app/components/PageLoader";
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
import { loadTopicNamesForQuestions } from "@/app/admin/full-mock-tests/topic-names";
import type { SafeQuestion } from "@/app/admin/full-mock-tests/types";
import { ChapterUi } from "@/app/lib/chapter-ui";
import { formatEzPrepError, topicWiseDraftsApi } from "../../api";
import type {
  PublishTopicWiseDraftPayload,
  TopicWiseDraft,
  TopicWiseDraftSettings,
  TopicWiseDraftSubjectBlock,
  TopicWiseQuestionItem,
  TopicWiseSearchQuestion,
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

function PublishDraftForm({
  settings,
  publishing,
  onPublish,
  onDiscard,
}: {
  settings: TopicWiseDraftSettings;
  publishing: boolean;
  onPublish: (values: PublishTopicWiseDraftPayload) => void;
  onDiscard: () => void;
}) {
  const [form] = Form.useForm<PublishTopicWiseDraftPayload>();

  return (
    <DetailSection title="Publish" icon={Send} tone="lime">
      <Form
        form={form}
        layout="vertical"
        onFinish={onPublish}
        initialValues={{
          title: settings.title,
          description: settings.description,
          marksPerQuestion: settings.marksPerQuestion,
          negativeMarking: settings.negativeMarking,
          passingScore: settings.passingScore,
          allowRetake: settings.allowRetake,
          shuffleOptions: settings.shuffleOptions,
          showResultsImmediately: settings.showResultsImmediately,
          accessMode: settings.accessMode ?? "FREE",
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Form.Item
            label="Allow Retake"
            name="allowRetake"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            label="Shuffle Options"
            name="shuffleOptions"
            valuePropName="checked"
          >
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
        <Space>
          <Button
            type="primary"
            htmlType="submit"
            loading={publishing}
            disabled={publishing}
          >
            Publish
          </Button>
          <Button danger onClick={onDiscard}>
            Discard
          </Button>
        </Space>
      </Form>
    </DetailSection>
  );
}

export default function TopicWiseDraftPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = use(props.params);
  const router = useRouter();
  const publishInFlight = useRef(false);
  const [draft, setDraft] = useState<TopicWiseDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [replaceSlot, setReplaceSlot] = useState<{
    subject: TopicWiseDraftSubjectBlock;
    question: TopicWiseQuestionItem;
  } | null>(null);
  const [replacePagination, setReplacePagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [replaceSearch, setReplaceSearch] = useState("");
  const [replaceResults, setReplaceResults] = useState<TopicWiseSearchQuestion[]>(
    []
  );
  const [replaceLoading, setReplaceLoading] = useState(false);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [topicNameById, setTopicNameById] = useState<Map<string, string>>(
    new Map()
  );

  const loadDraft = useCallback(async () => {
    setLoading(true);
    try {
      const response = await topicWiseDraftsApi.getDraft(params.id);
      setDraft(response.data);
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to load draft"));
      router.push("/admin/mock-tests");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    void loadDraft();
  }, [loadDraft]);

  useEffect(() => {
    if (!draft) return;
    let cancelled = false;
    void loadTopicNamesForQuestions(draft.subjects).then((names) => {
      if (cancelled) return;
      setTopicNameById((prev) => {
        const next = new Map(prev);
        names.forEach((name, id) => next.set(id, name));
        if (draft.topicId && draft.topicName) {
          next.set(draft.topicId, draft.topicName);
        }
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [draft]);

  const searchReplacementQuestions = useCallback(async () => {
    if (!replaceSlot || !draft) return;
    setReplaceLoading(true);
    try {
      const response = await topicWiseDraftsApi.searchQuestions({
        draftId: params.id,
        search: replaceSearch.trim() || undefined,
        page: replacePagination.current,
        limit: replacePagination.pageSize,
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
    draft,
    params.id,
    replacePagination.current,
    replacePagination.pageSize,
    replaceSearch,
    replaceSlot,
  ]);

  useEffect(() => {
    if (replaceSlot) {
      void searchReplacementQuestions();
    }
  }, [replaceSlot, searchReplacementQuestions]);

  const openReplace = (
    subject: TopicWiseDraftSubjectBlock,
    question: TopicWiseQuestionItem
  ) => {
    setReplaceSlot({ subject, question });
    setReplaceSearch("");
    setReplaceResults([]);
    setReplacePagination((prev) => ({ ...prev, current: 1, total: 0 }));
  };

  const handleReplace = async (questionId: string) => {
    if (!replaceSlot) return;
    setReplacingId(questionId);
    try {
      const response = await topicWiseDraftsApi.replaceQuestion(
        params.id,
        replaceSlot.question.position,
        questionId
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

  const handlePublish = async (values: PublishTopicWiseDraftPayload) => {
    if (publishInFlight.current) return;
    publishInFlight.current = true;
    setPublishing(true);
    try {
      const response = await topicWiseDraftsApi.publishDraft(params.id, {
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
      message.success(response.message || "Mock test published");
      router.push(`/admin/mock-tests/${response.data.mockTestId}`);
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to publish draft"));
      publishInFlight.current = false;
      setPublishing(false);
    }
  };

  const handleDiscard = () => {
    showConfirmModal({
      title: "Discard Draft",
      content: "Discard this draft? Nothing is written to published mock tests.",
      onConfirm: async () => {
        try {
          const response = await topicWiseDraftsApi.discardDraft(params.id);
          message.success(response.message || "Draft discarded");
          router.push("/admin/mock-tests");
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
  const mix = settings.difficultyDistribution;

  const questionColumns = (
    subject: TopicWiseDraftSubjectBlock
  ): TableColumnsType<TopicWiseQuestionItem> => [
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
      render: (_: unknown, record: TopicWiseQuestionItem) => (
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
        topicId ? (
          <TruncatedChip label={topicNameById.get(topicId) || topicId} maxWidthClass="max-w-full" />
        ) : (
          <EmptyCell />
        ),
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
      render: (_: unknown, record: TopicWiseQuestionItem) =>
        questionTags(record as { tags?: unknown }),
    },
    ...(editable
      ? [
          {
            title: "Actions",
            key: "actions",
            width: 124,
            render: (_: unknown, record: TopicWiseQuestionItem) => (
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
      eyebrow={`${ChapterUi.paperTypeTitle} draft`}
      title={settings.title || ChapterUi.draftFallbackTitle}
      back={{ label: `Back to ${ChapterUi.navPapers}`, onClick: () => router.push("/admin/mock-tests") }}
      badge={<DraftStatusPill status={draft.status} />}
    >
      <DetailSection title="Draft" icon={ClipboardList} tone="green">
        <DetailGrid>
          <DetailItem label="Exam">
            {draft.examName ? (
              <TruncatedChip label={draft.examName} tone="exam" maxWidthClass="max-w-full" />
            ) : (
              <EmptyCell />
            )}
          </DetailItem>
          <DetailItem label="Subject">{draft.subjectName}</DetailItem>
          <DetailItem label={ChapterUi.singular}>
            {draft.topicName || draft.topicId || ChapterUi.missingOnDraft}
          </DetailItem>
          <DetailItem label="Duration">{settings.durationInMinutes} mins</DetailItem>
          <DetailItem label="Difficulty" wide>
            <span className="flex flex-wrap gap-1.5">
              <Pill tone="green">{mix.easy} easy</Pill>
              <Pill tone="amber">{mix.medium} medium</Pill>
              <Pill tone="red">{mix.hard} hard</Pill>
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
          extra={
            <span className="text-[14px] font-semibold text-console-muted">
              {subject.questions.length} questions
            </span>
          }
          flush
        >
          <Table<TopicWiseQuestionItem>
            columns={questionColumns(subject)}
            dataSource={subject.questions}
            rowKey={(record: TopicWiseQuestionItem) => `${record.position}-${record._id}`}
            tableLayout="fixed"
            pagination={false}
            onRow={questionPreviewOnRow}
            expandable={questionPreviewExpandable((record: TopicWiseQuestionItem) => (
              <QuestionPreview question={record as SafeQuestion} />
            ))}
          />
        </DetailSection>
      ))}

      {editable && !draft.topicId ? (
        <Alert
          type="error"
          showIcon
          className="!rounded-[20px]"
          message={ChapterUi.noTopicOnDraft}
          description={ChapterUi.noTopicOnDraftHint}
          action={
            <Button danger onClick={handleDiscard}>
              Discard draft
            </Button>
          }
        />
      ) : null}

      {editable && draft.topicId ? (
        <PublishDraftForm
          settings={settings}
          publishing={publishing}
          onPublish={handlePublish}
          onDiscard={handleDiscard}
        />
      ) : null}

      <Modal
        title={`Replace question #${replaceSlot ? replaceSlot.question.position + 1 : ""}`}
        open={!!replaceSlot}
        onCancel={() => setReplaceSlot(null)}
        footer={null}
        width={900}
        // Same table styling and phone scrolling as the page.
        wrapClassName="console-shell"
        destroyOnHidden
      >
        <p className="mb-4 text-console-muted">{ChapterUi.replacementMustMatch}</p>
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
          <TruncatedChip label={draft.topicName || ChapterUi.locked} maxWidthClass="max-w-[240px]" />
        </Space>
        <Table<TopicWiseSearchQuestion>
          size="small"
          rowKey="_id"
          tableLayout="fixed"
          loading={replaceLoading}
          dataSource={replaceResults}
          onRow={questionPreviewOnRow}
          expandable={questionPreviewExpandable((record) => (
            <QuestionPreview question={record as SafeQuestion} />
          ))}
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
              render: (_: unknown, record: TopicWiseSearchQuestion) => (
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
              width: "24%",
              render: (topicId?: string) =>
                topicId ? (
                  <TruncatedChip
                    label={topicNameById.get(topicId) || topicId}
                    maxWidthClass="max-w-full"
                  />
                ) : (
                  <EmptyCell />
                ),
            },
            {
              title: "Tags",
              key: "tags",
              width: "18%",
              render: (_: unknown, record: TopicWiseSearchQuestion) =>
                questionTags(record as { tags?: unknown }),
            },
            {
              title: "",
              key: "use",
              width: 112,
              render: (_: unknown, record: TopicWiseSearchQuestion) => (
                <button
                  type="button"
                  disabled={replacingId === record._id}
                  aria-busy={replacingId === record._id || undefined}
                  onClick={(event) => {
                    stopQuestionRowToggle(event);
                    void handleReplace(record._id);
                  }}
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
