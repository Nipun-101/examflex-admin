"use client";

import { use, useEffect, useState } from "react";
import { Table, message, type TableColumnsType } from "antd";
import { ClipboardList, ListChecks } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatEzPrepError, sprintTestsApi } from "../api";
import { PageLoader } from "@/app/components/PageLoader";
import { questionTagLabels } from "@/app/components/QuestionTags";
import { OverflowChips, TruncatedChip } from "@/app/admin/_components/OverflowChips";
import {
  ClampText,
  ConsolePageShell,
  DifficultyPill,
  Pill,
} from "@/app/admin/_components/console-list";
import {
  DetailGrid,
  DetailItem,
  DetailSection,
} from "@/app/admin/_components/console-detail";
import { QuestionPreview } from "@/app/admin/full-mock-tests/QuestionPreview";
import {
  questionPreviewExpandable,
  questionPreviewOnRow,
} from "@/app/admin/full-mock-tests/questionTableExpand";
import type { SafeQuestion } from "@/app/admin/full-mock-tests/types";
import type { SprintQuestionItem, SprintTest } from "../types";

export default function PublishedSprintPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const [test, setTest] = useState<SprintTest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await sprintTestsApi.getPublished(params.id);
        setTest(response.data);
      } catch (error) {
        message.error(formatEzPrepError(error, "Failed to fetch sprint test"));
        router.push("/admin/sprint-tests");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [params.id, router]);

  if (loading || !test) {
    return <PageLoader />;
  }

  const columns: TableColumnsType<SprintQuestionItem> = [
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
        <ClampText
          text={record.questionText?.en?.text?.slice(0, 120) || "Question"}
          className="text-[14px] font-semibold leading-snug text-console-ink"
        />
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
      width: "22%",
      render: (_: unknown, record: SprintQuestionItem) => (
        <OverflowChips
          items={questionTagLabels((record as { tags?: unknown }).tags)}
          noun="tags"
          empty={<span className="text-[13px] text-console-muted">No tags</span>}
        />
      ),
    },
  ];

  return (
    <ConsolePageShell
      eyebrow="Sprint test"
      title={test.title || "Sprint Test"}
      back={{ label: "Back to Sprint tests", onClick: () => router.push("/admin/sprint-tests") }}
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
          <DetailItem label="Questions">{test.totalQuestions}</DetailItem>
          <DetailItem label="Duration">{test.durationInMinutes} minutes</DetailItem>
          <DetailItem label="Marks Per Question">{test.marksPerQuestion}</DetailItem>
          <DetailItem label="Negative Marking">{test.negativeMarking}</DetailItem>
          <DetailItem label="Passing Score">{test.passingScore ?? "Not set"}</DetailItem>
          <DetailItem label="Description" wide>
            <span className="font-normal leading-relaxed">
              {test.description || "No description"}
            </span>
          </DetailItem>
        </DetailGrid>
      </DetailSection>

      <DetailSection
        title={`Questions (${test.questions?.length || 0})`}
        icon={ListChecks}
        tone="violet"
        flush
      >
        <Table<SprintQuestionItem>
          rowKey="_id"
          dataSource={test.questions || []}
          tableLayout="fixed"
          pagination={{ pageSize: 10, position: ["bottomCenter"] }}
          onRow={questionPreviewOnRow}
          expandable={questionPreviewExpandable((record: SprintQuestionItem) => (
            <QuestionPreview question={record as SafeQuestion} />
          ))}
          columns={columns}
        />
      </DetailSection>
    </ConsolePageShell>
  );
}
