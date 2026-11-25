"use client";

import { use, useEffect, useState } from "react";
import { Table, message, type TableColumnsType } from "antd";
import { ClipboardList, Layers, ListChecks } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatEzPrepError, fullMockApi } from "../api";
import { loadTopicNamesForQuestions } from "../topic-names";
import { PageLoader } from "@/app/components/PageLoader";
import { ChapterUi } from "@/app/lib/chapter-ui";
import { questionTagLabels } from "@/app/components/QuestionTags";
import { OverflowChips, TruncatedChip } from "@/app/admin/_components/OverflowChips";
import {
  ConsolePageShell,
  DifficultyPill,
  EmptyCell,
  Pill,
} from "@/app/admin/_components/console-list";
import {
  DetailGrid,
  DetailItem,
  DetailSection,
  YesNoPill,
} from "@/app/admin/_components/console-detail";
import { MarksCell, QuestionSnippetCell, SubjectMetaPills } from "../paper-ui";
import { QuestionPreview } from "../QuestionPreview";
import { CourseCutoffsCard } from "../CourseCutoffsCard";
import { TopicTag } from "../TopicTag";
import {
  questionPreviewExpandable,
  questionPreviewOnRow,
} from "../questionTableExpand";
import type {
  DraftQuestionItem,
  FullMockSubjectConfig,
  FullMockTestListItem,
} from "../types";

export default function PublishedFullMockPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = use(props.params);
  const router = useRouter();
  const [test, setTest] = useState<FullMockTestListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [topicNameById, setTopicNameById] = useState<Map<string, string>>(
    new Map()
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await fullMockApi.getPublished(params.id);
        setTest(response.data);
      } catch (error) {
        message.error(
          formatEzPrepError(error, "Failed to fetch full mock test")
        );
        router.push("/admin/full-mock-tests");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [params.id, router]);

  useEffect(() => {
    if (!test?.subjects?.length) return;

    let cancelled = false;
    void loadTopicNamesForQuestions(test.subjects).then((names) => {
      if (cancelled) return;
      setTopicNameById(names);
    });

    return () => {
      cancelled = true;
    };
  }, [test]);

  const subjectColumns: TableColumnsType<FullMockSubjectConfig> = [
    {
      title: "Subject",
      dataIndex: "name",
      key: "name",
      render: (name: string) => (
        <span className="block truncate text-[14px] font-semibold text-console-ink" title={name}>
          {name}
        </span>
      ),
    },
    { title: "Questions", dataIndex: "numberOfQuestions", key: "numberOfQuestions", width: "13%" },
    { title: "Marks / Q", dataIndex: "marksPerQuestion", key: "marksPerQuestion", width: "13%" },
    {
      title: "Negative",
      key: "negative",
      width: "13%",
      render: (_: unknown, record: FullMockSubjectConfig) =>
        record.hasNegativeMarking ? `-${record.negativeMarksPerQuestion}` : "None",
    },
    {
      title: "Session",
      dataIndex: "sessionTime",
      key: "sessionTime",
      width: "14%",
      render: (sessionTime?: number) => (sessionTime != null ? `${sessionTime} mins` : "-"),
    },
    {
      title: "Range",
      key: "range",
      width: "15%",
      render: (_: unknown, record: FullMockSubjectConfig) =>
        `Q${record.questionStartIndex + 1}–Q${record.questionEndIndex + 1}`,
    },
  ];

  const questionColumns = (): TableColumnsType<DraftQuestionItem> => [
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
      render: (_: unknown, record: DraftQuestionItem) => <QuestionSnippetCell question={record} />,
    },
    {
      title: ChapterUi.singular,
      dataIndex: "topic",
      key: "topic",
      width: "20%",
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
      render: (_: unknown, record: DraftQuestionItem) => (
        <OverflowChips
          items={questionTagLabels((record as { tags?: unknown }).tags)}
          noun="tags"
          empty={<span className="text-[13px] text-console-muted">No tags</span>}
        />
      ),
    },
    {
      title: "Marks",
      key: "marks",
      width: 88,
      render: (_: unknown, record: DraftQuestionItem) => <MarksCell record={record} />,
    },
  ];

  if (loading) {
    return <PageLoader />;
  }

  if (!test) {
    return null;
  }

  return (
    <ConsolePageShell
      eyebrow="Full mock test"
      title={test.title || "Full Mock Test"}
      back={{ label: "Back to Full mock tests", onClick: () => router.push("/admin/full-mock-tests") }}
      badge={test.isActive ? <Pill tone="green">Active</Pill> : <Pill tone="red">Inactive</Pill>}
    >
      <DetailSection title="Test details" icon={ClipboardList} tone="green">
        <DetailGrid>
          <DetailItem label="Title">{test.title || "N/A"}</DetailItem>
          <DetailItem label="Exam">
            {test.exam?.name ? (
              <TruncatedChip label={test.exam.name} tone="exam" maxWidthClass="max-w-full" />
            ) : (
              "N/A"
            )}
          </DetailItem>
          <DetailItem label="Mode">
            {test.isSessionWise ? (
              <Pill tone="violet">Session-wise</Pill>
            ) : (
              <Pill tone="blue">Mixed</Pill>
            )}
          </DetailItem>
          <DetailItem label="Total Questions">{test.totalQuestions}</DetailItem>
          <DetailItem label="Duration">{test.durationInMinutes} minutes</DetailItem>
          <DetailItem label="Total Marks">{test.totalMarks ?? "N/A"}</DetailItem>
          <DetailItem label="Passing Score">{test.passingScore ?? "Not set"}</DetailItem>
          <DetailItem label="Marks Per Question">{test.marksPerQuestion}</DetailItem>
          <DetailItem label="Negative Marking">{test.negativeMarking}</DetailItem>
          <DetailItem label="Allow Retake">
            <YesNoPill value={test.allowRetake} />
          </DetailItem>
          <DetailItem label="Shuffle Options">
            <YesNoPill value={test.shuffleOptions} />
          </DetailItem>
          <DetailItem label="Show Results Immediately">
            <YesNoPill value={test.showResultsImmediately} />
          </DetailItem>
          <DetailItem label="Created At" wide>
            {test.createdAt ? new Date(test.createdAt).toLocaleString() : "N/A"}
          </DetailItem>
          <DetailItem label="Description" wide>
            <span className="font-normal leading-relaxed">
              {test.description || "No description"}
            </span>
          </DetailItem>
        </DetailGrid>
      </DetailSection>

      <CourseCutoffsCard
        test={test}
        onSaved={(courseCutoffs) =>
          setTest((previous) => (previous ? { ...previous, courseCutoffs } : previous))
        }
      />

      <DetailSection
        title={`Subjects (${test.subjectConfig?.length || 0})`}
        icon={Layers}
        tone="sand"
        flush
      >
        <Table<FullMockSubjectConfig>
          columns={subjectColumns}
          dataSource={test.subjectConfig}
          rowKey={(record) => `${record.subject}-${record.questionStartIndex}`}
          tableLayout="fixed"
          pagination={false}
        />
      </DetailSection>

      {test.subjects?.map((subject) => (
        <DetailSection
          key={subject.subjectId}
          title={subject.name}
          icon={ListChecks}
          tone="violet"
          extra={<SubjectMetaPills subject={subject} />}
          flush
        >
          <Table<DraftQuestionItem>
            columns={questionColumns()}
            dataSource={subject.questions}
            rowKey={(record: DraftQuestionItem) => `${record.position}-${record._id}`}
            tableLayout="fixed"
            pagination={false}
            onRow={questionPreviewOnRow}
            expandable={questionPreviewExpandable((record) => <QuestionPreview question={record} />)}
          />
        </DetailSection>
      ))}
    </ConsolePageShell>
  );
}
