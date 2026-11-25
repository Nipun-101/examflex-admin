"use client";

import { Table, message, type TableColumnsType } from "antd";
import { ClipboardList, ListChecks } from "lucide-react";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  formatEzPrepError,
  mockTestsApi,
  refName,
  type MockTestQuestion,
} from "@/app/services/ezprep-api";
import { PageLoader } from "@/app/components/PageLoader";
import { ChapterUi } from "@/app/lib/chapter-ui";
import { questionTagLabels } from "@/app/components/QuestionTags";
import { OverflowChips, TruncatedChip } from "@/app/admin/_components/OverflowChips";
import {
  ClampText,
  ConsolePageShell,
  EmptyCell,
  Pill,
  SubjectLabel,
} from "@/app/admin/_components/console-list";
import {
  DetailGrid,
  DetailItem,
  DetailSection,
  YesNoPill,
} from "@/app/admin/_components/console-detail";
import { QuestionPreview } from "@/app/admin/full-mock-tests/QuestionPreview";
import {
  questionPreviewExpandable,
  questionPreviewOnRow,
} from "@/app/admin/full-mock-tests/questionTableExpand";
import type { SafeQuestion } from "@/app/admin/full-mock-tests/types";

export default function MockTestDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = use(props.params);
  const [mockTest, setMockTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchMockTest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const fetchMockTest = async () => {
    setLoading(true);
    try {
      const { data } = await mockTestsApi.get(params.id);
      setMockTest(data);
    } catch (error) {
      message.error(formatEzPrepError(error, 'Failed to fetch mock test details'));
      router.push('/admin/mock-tests');
    } finally {
      setLoading(false);
    }
  };

  const questionColumns: TableColumnsType<MockTestQuestion> = [
    {
      title: "Question",
      key: "question",
      // Flexible: takes what the other columns leave. Click the row for the full preview.
      render: (_: unknown, record: MockTestQuestion) => (
        <ClampText
          text={record?.questionText?.en?.text?.slice(0, 120) || "Question"}
          className="text-[14px] font-semibold leading-snug text-console-ink"
        />
      ),
    },
    {
      title: "Subject",
      key: "subject",
      width: "14%",
      render: (_: unknown, record: MockTestQuestion) => (
        <SubjectLabel name={refName(record?.subject) || "N/A"} />
      ),
    },
    {
      title: ChapterUi.singular,
      key: "topic",
      width: "24%",
      render: (_: unknown, record: MockTestQuestion) =>
        refName(record?.topic) ? (
          <TruncatedChip label={refName(record.topic)!} maxWidthClass="max-w-full" />
        ) : (
          <EmptyCell />
        ),
    },
    {
      title: "Tags",
      key: "tags",
      width: "18%",
      render: (_: unknown, record: MockTestQuestion) => (
        <OverflowChips
          items={questionTagLabels((record as { tags?: unknown }).tags)}
          noun="tags"
          empty={<span className="text-[13px] text-console-muted">No tags</span>}
        />
      ),
    },
  ];

  if (loading) {
    return <PageLoader />;
  }

  if (!mockTest) {
    return null;
  }

  const questions = (mockTest.questions || mockTest.questionIds) ?? [];
  const mix = mockTest.difficultyDistribution;

  return (
    <ConsolePageShell
      eyebrow={ChapterUi.paperTypeTitle + " test"}
      title={mockTest.title || "Mock Test Details"}
      back={{ label: `Back to ${ChapterUi.navPapers}`, onClick: () => router.push("/admin/mock-tests") }}
      badge={
        mockTest.isActive ? <Pill tone="green">Active</Pill> : <Pill tone="red">Inactive</Pill>
      }
    >
      <DetailSection title="Test details" icon={ClipboardList} tone="green">
        <DetailGrid>
          <DetailItem label="Title">{mockTest.title || "N/A"}</DetailItem>
          <DetailItem label="Total Questions">{mockTest.totalQuestions}</DetailItem>
          <DetailItem label="Duration">{mockTest.durationInMinutes} minutes</DetailItem>
          <DetailItem label="Generation Mode">
            <Pill tone="neutral" dot={false}>
              {mockTest.generationMode}
            </Pill>
          </DetailItem>
          <DetailItem label="Exam">
            {refName(mockTest.exam) ? (
              <TruncatedChip label={refName(mockTest.exam)!} tone="exam" maxWidthClass="max-w-full" />
            ) : (
              "N/A"
            )}
          </DetailItem>
          <DetailItem label="Subject">
            <SubjectLabel name={refName(mockTest.subject) || "N/A"} />
          </DetailItem>
          <DetailItem label={ChapterUi.singular}>
            {refName(mockTest.topic) ? (
              <TruncatedChip label={refName(mockTest.topic)!} maxWidthClass="max-w-full" />
            ) : (
              "Not set"
            )}
          </DetailItem>
          <DetailItem label="Difficulty Distribution">
            {mix ? (
              <span className="flex flex-wrap gap-1.5">
                <Pill tone="green">Easy: {mix.easy}</Pill>
                <Pill tone="amber">Medium: {mix.medium}</Pill>
                <Pill tone="red">Hard: {mix.hard}</Pill>
              </span>
            ) : (
              "Not set"
            )}
          </DetailItem>
          <DetailItem label="Marks Per Question">{mockTest.marksPerQuestion}</DetailItem>
          <DetailItem label="Negative Marking">{mockTest.negativeMarking}</DetailItem>
          <DetailItem label="Passing Score">{mockTest.passingScore || "Not set"}</DetailItem>
          <DetailItem label="Allow Retake">
            <YesNoPill value={mockTest.allowRetake} />
          </DetailItem>
          <DetailItem label="Shuffle Options">
            <YesNoPill value={mockTest.shuffleOptions} />
          </DetailItem>
          <DetailItem label="Show Results Immediately">
            <YesNoPill value={mockTest.showResultsImmediately} />
          </DetailItem>
          <DetailItem label="Created At" wide>
            {new Date(mockTest.createdAt).toLocaleString()}
          </DetailItem>
          <DetailItem label="Description" wide>
            <span className="font-normal leading-relaxed">
              {mockTest.description || "No description"}
            </span>
          </DetailItem>
        </DetailGrid>
      </DetailSection>

      <DetailSection title={`Questions (${questions.length})`} icon={ListChecks} tone="violet" flush>
        <Table<MockTestQuestion>
          columns={questionColumns}
          dataSource={questions}
          rowKey="id"
          tableLayout="fixed"
          pagination={{ pageSize: 10, position: ["bottomCenter"] }}
          onRow={questionPreviewOnRow}
          expandable={questionPreviewExpandable(
            (record: MockTestQuestion) => (
              <QuestionPreview
                question={{
                  _id: record.id,
                  questionText: {
                    en: record.questionText?.en || { text: null },
                    ml: record.questionText?.ml || { text: null },
                  },
                  optionType: record.optionType,
                  correctAnswer: record.correctAnswer,
                  options: record.options || [],
                } as SafeQuestion}
              />
            )
          )}
        />
      </DetailSection>
    </ConsolePageShell>
  );
}
