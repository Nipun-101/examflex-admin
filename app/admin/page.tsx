"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Modal, Table, Typography, message } from "antd";
import {
  ArrowRight,
  Book,
  CircleHelp,
  CirclePlay,
  CircleX,
  FileCheck,
  FlaskConical,
  Layers,
  List,
  Tag,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  adminDashboardApi,
  formatEzPrepError,
  type AdminDashboardSummary,
} from "@/app/services/ezprep-api";
import { PageLoader } from "@/app/components/PageLoader";
import { ChapterUi } from "@/app/lib/chapter-ui";

type MetricKey =
  | "users"
  | "questions"
  | "failed-questions"
  | "mock-tests"
  | "full-mock-tests"
  | "sprint-tests"
  | "attempts"
  | "exams"
  | "subjects"
  | "topics"
  | "tags";

type DashboardCard = {
  key: MetricKey;
  label: string;
  countKey: keyof AdminDashboardSummary;
  description: string;
  icon: LucideIcon;
  /** Tailwind classes for the icon tile (background + icon colour). */
  tile: string;
  /** Render a non-zero count in the alert colour. */
  alert?: boolean;
};

type DashboardSection = {
  title: string;
  description: string;
  /** Tailwind grid classes; desktop column count follows the design. */
  grid: string;
  cards: DashboardCard[];
};

const TILE = {
  green: "bg-[#E3EEE5] text-[#2F6B4F]",
  violet: "bg-[#E8E6F6] text-[#5A4FB3]",
  red: "bg-[#F6E0DA] text-[#B5432F]",
  lime: "bg-[#EEF3D3] text-[#56651B]",
  sand: "bg-[#F1ECE1] text-[#7A5A2E]",
  rose: "bg-[#F7E1E5] text-[#B23A58]",
} as const;

const FOUR_UP = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4";
const THREE_UP = "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3";

const SECTIONS: DashboardSection[] = [
  {
    title: "Learners and content",
    description: "Who is practising, and what is live in the question bank.",
    grid: FOUR_UP,
    cards: [
      {
        key: "users",
        label: "Active learners",
        countKey: "activeLearners",
        description: "Signed-up students who can take tests right now.",
        icon: Users,
        tile: TILE.green,
      },
      {
        key: "questions",
        label: "Active questions",
        countKey: "activeQuestions",
        description: "Live bank items available to papers and attempts.",
        icon: CircleHelp,
        tile: TILE.violet,
      },
      {
        key: "failed-questions",
        label: "Failed questions",
        countKey: "failedQuestions",
        description: "Import rows that still need a fix before they can go live.",
        icon: CircleX,
        tile: TILE.red,
        alert: true,
      },
      {
        key: "attempts",
        label: "Attempts",
        countKey: "attempts",
        description: "All student sittings, including in-progress and completed.",
        icon: CirclePlay,
        tile: TILE.lime,
      },
    ],
  },
  {
    title: "Papers",
    description: "Published papers plus draft pipeline status.",
    grid: THREE_UP,
    cards: [
      {
        key: "mock-tests",
        label: "Mock tests",
        countKey: "mockTests",
        description: ChapterUi.dashboardPapersDescription,
        icon: FlaskConical,
        tile: TILE.green,
      },
      {
        key: "full-mock-tests",
        label: "Full mock tests",
        countKey: "fullMockTests",
        description: "Published full-exam papers plus draft pipeline status.",
        icon: FileCheck,
        tile: TILE.sand,
      },
      {
        key: "sprint-tests",
        label: "Sprint tests",
        countKey: "sprintTests",
        description: "Published short mixed papers plus draft pipeline status.",
        icon: Zap,
        tile: TILE.rose,
      },
    ],
  },
  {
    title: "Catalog",
    description: "Active exams, subjects, chapters, and tags that questions attach to.",
    grid: FOUR_UP,
    cards: [
      {
        key: "exams",
        label: "Exams",
        countKey: "exams",
        description: "Active exams in the catalog.",
        icon: Book,
        tile: TILE.lime,
      },
      {
        key: "subjects",
        label: "Subjects",
        countKey: "subjects",
        description: "Active subjects under each exam.",
        icon: Layers,
        tile: TILE.violet,
      },
      {
        key: "topics",
        label: ChapterUi.plural,
        countKey: "topics",
        description: "Chapters that questions attach to.",
        icon: List,
        tile: TILE.green,
      },
      {
        key: "tags",
        label: "Tags",
        countKey: "tags",
        description: "Tags used to group and filter questions.",
        icon: Tag,
        tile: TILE.sand,
      },
    ],
  },
];

const ALL_CARDS = SECTIONS.flatMap((section) => section.cards);

const DETAIL_FETCHERS: Record<MetricKey, () => Promise<{ data: unknown }>> = {
  users: () => adminDashboardApi.getUsers(),
  questions: () => adminDashboardApi.getQuestions(),
  "failed-questions": () => adminDashboardApi.getFailedQuestions(),
  "mock-tests": () => adminDashboardApi.getMockTests(),
  "full-mock-tests": () => adminDashboardApi.getFullMockTests(),
  "sprint-tests": () => adminDashboardApi.getSprintTests(),
  attempts: () => adminDashboardApi.getAttempts(),
  exams: () => adminDashboardApi.getExams(),
  subjects: () => adminDashboardApi.getSubjects(),
  topics: () => adminDashboardApi.getTopics(),
  tags: () => adminDashboardApi.getTags(),
};

function namedColumns(nameTitle: string) {
  return [
    { title: nameTitle, dataIndex: "name", key: "name" },
    { title: "Count", dataIndex: "count", key: "count", width: 100 },
  ];
}

function DetailTables({ metric, data }: { metric: MetricKey; data: unknown }) {
  const row = data as Record<string, unknown>;

  if (metric === "users") {
    return (
      <Table
        size="small"
        pagination={false}
        rowKey="label"
        dataSource={[
          { label: "Total learners", count: row.totalLearners },
          { label: "Active", count: row.activeLearners },
          { label: "Inactive", count: row.inactiveLearners },
          { label: "New (7 days)", count: row.newLast7Days },
          { label: "New (30 days)", count: row.newLast30Days },
        ]}
        columns={[
          { title: "Metric", dataIndex: "label", key: "label" },
          { title: "Count", dataIndex: "count", key: "count" },
        ]}
      />
    );
  }

  if (metric === "questions") {
    return (
      <>
        <Table
          size="small"
          pagination={false}
          rowKey="difficulty"
          className="mb-4"
          dataSource={
            (row.byDifficulty as Array<{ difficulty: string; count: number }>) ||
            []
          }
          columns={[
            { title: "Difficulty", dataIndex: "difficulty", key: "difficulty" },
            { title: "Count", dataIndex: "count", key: "count" },
          ]}
        />
        <Table
          size="small"
          pagination={false}
          rowKey={(item) => `${item.subjectId}-${item.topicId || item.topicName}`}
          dataSource={
            (row.bySubjectAndTopic as Array<{
              subjectId: string;
              subjectName: string;
              topicId?: string;
              topicName: string;
              count: number;
            }>) || []
          }
          columns={[
            { title: "Subject", dataIndex: "subjectName", key: "subjectName" },
            { title: ChapterUi.singular, dataIndex: "topicName", key: "topicName" },
            { title: "Count", dataIndex: "count", key: "count", width: 100 },
          ]}
        />
      </>
    );
  }

  if (metric === "failed-questions") {
    return (
      <>
        <Table
          size="small"
          pagination={false}
          rowKey="name"
          className="mb-4"
          dataSource={(row.byStage as Array<{ name: string; count: number }>) || []}
          columns={namedColumns("Failure stage")}
        />
        <Table
          size="small"
          pagination={false}
          rowKey={(item) => item.id || item.name}
          dataSource={(row.bySubject as Array<{ id?: string; name: string; count: number }>) || []}
          columns={namedColumns("Subject")}
        />
      </>
    );
  }

  if (metric === "mock-tests") {
    return (
      <Table
        size="small"
        pagination={false}
        rowKey={(item) => item.id || item.name}
        dataSource={(row.byExam as Array<{ id?: string; name: string; count: number }>) || []}
        columns={namedColumns("Exam")}
      />
    );
  }

  if (metric === "full-mock-tests" || metric === "sprint-tests") {
    return (
      <>
        <Table
          size="small"
          pagination={false}
          rowKey={(item) => item.id || item.name}
          className="mb-4"
          dataSource={(row.byExam as Array<{ id?: string; name: string; count: number }>) || []}
          columns={namedColumns("Exam")}
        />
        <Typography.Title level={5}>Drafts by status</Typography.Title>
        <Table
          size="small"
          pagination={false}
          rowKey="name"
          dataSource={(row.draftsByStatus as Array<{ name: string; count: number }>) || []}
          columns={namedColumns("Status")}
        />
      </>
    );
  }

  if (metric === "attempts") {
    return (
      <Table
        size="small"
        pagination={false}
        scroll={{ x: true }}
        rowKey={(item) => item.examId || item.examName}
        dataSource={
          (row.byExam as Array<{
            examId?: string;
            examName: string;
            attempts: number;
            uniqueUsers: number;
            submitted: number;
            expired: number;
            inProgress: number;
            timeConsumedLabel: string;
            allottedMinutes: number;
          }>) || []
        }
        columns={[
          { title: "Exam", dataIndex: "examName", key: "examName" },
          { title: "Attempts", dataIndex: "attempts", key: "attempts" },
          { title: "Unique users", dataIndex: "uniqueUsers", key: "uniqueUsers" },
          { title: "Submitted", dataIndex: "submitted", key: "submitted" },
          { title: "Expired", dataIndex: "expired", key: "expired" },
          { title: "In progress", dataIndex: "inProgress", key: "inProgress" },
          { title: "Time used", dataIndex: "timeConsumedLabel", key: "timeConsumedLabel" },
          { title: "Allotted (min)", dataIndex: "allottedMinutes", key: "allottedMinutes" },
        ]}
      />
    );
  }

  if (metric === "exams") {
    return (
      <Table
        size="small"
        pagination={false}
        rowKey={(item) => item.id || item.name}
        dataSource={(row.byCategory as Array<{ id?: string; name: string; count: number }>) || []}
        columns={namedColumns("Category")}
      />
    );
  }

  if (metric === "subjects") {
    return (
      <Table
        size="small"
        pagination={false}
        rowKey="id"
        dataSource={
          (row.rows as Array<{
            id: string;
            name: string;
            topicCount: number;
            isActive: boolean;
          }>) || []
        }
        columns={[
          { title: "Subject", dataIndex: "name", key: "name" },
          { title: ChapterUi.plural, dataIndex: "topicCount", key: "topicCount" },
          {
            title: "Active",
            dataIndex: "isActive",
            key: "isActive",
            render: (value: boolean) => (value ? "Yes" : "No"),
          },
        ]}
      />
    );
  }

  if (metric === "topics") {
    return (
      <Table
        size="small"
        pagination={false}
        rowKey="id"
        dataSource={
          (row.rows as Array<{
            id: string;
            name: string;
            subjectName: string;
          }>) || []
        }
        columns={[
          { title: ChapterUi.singular, dataIndex: "name", key: "name" },
          { title: "Subject", dataIndex: "subjectName", key: "subjectName" },
        ]}
      />
    );
  }

  return (
    <Table
      size="small"
      pagination={false}
      rowKey="id"
      dataSource={
        (row.rows as Array<{
          id: string;
          name: string;
          subjectName: string;
          topicName?: string;
        }>) || []
      }
      columns={[
        { title: "Tag", dataIndex: "name", key: "name" },
        { title: "Subject", dataIndex: "subjectName", key: "subjectName" },
        { title: ChapterUi.singular, dataIndex: "topicName", key: "topicName" },
      ]}
    />
  );
}

function MetricCard({
  card,
  count,
  onOpen,
}: {
  card: DashboardCard;
  count: number;
  onOpen: (key: MetricKey) => void;
}) {
  const Icon = card.icon;
  const alerting = card.alert && count > 0;

  return (
    <button
      type="button"
      onClick={() => onOpen(card.key)}
      className="group flex h-full w-full cursor-pointer flex-col rounded-[20px] border border-solid border-console-line bg-white p-5 text-left transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-console-green/30 hover:shadow-[0_12px_28px_-16px_rgba(23,59,48,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-console-green sm:p-6"
    >
      <span className="flex w-full items-center justify-between gap-3">
        <span
          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.tile}`}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-console-green">
          View details
          <ArrowRight
            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </span>
      <p className="mb-0 mt-5 text-[15px] font-semibold text-console-ink">
        {card.label}
      </p>
      <span
        className={`mt-1 block text-[40px] font-bold leading-[1.1] tracking-tight tabular-nums sm:text-[44px] ${
          alerting ? "text-console-danger" : "text-console-ink"
        }`}
      >
        {count.toLocaleString()}
      </span>
      <span className="mt-2 block text-[15px] leading-relaxed text-console-muted">
        {card.description}
      </span>
    </button>
  );
}

function AttentionBanner({ failedCount }: { failedCount: number }) {
  const noun = failedCount === 1 ? "question is" : "questions are";
  return (
    <section
      aria-labelledby="dashboard-attention-title"
      className="mt-8 flex flex-col gap-5 rounded-3xl bg-console-ink px-6 py-6 sm:px-8 sm:py-7 md:flex-row md:items-center md:justify-between"
    >
      <div className="min-w-0">
        <p className="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-console-lime">
          Needs attention
        </p>
        <h2
          id="dashboard-attention-title"
          className="m-0 mt-2 text-[22px] font-bold leading-tight tracking-tight text-white sm:text-[26px]"
        >
          {`${failedCount.toLocaleString()} ${noun} waiting for a fix.`}
        </h2>
        <p className="m-0 mt-2 text-[15px] text-white/80">
          Import rows that still need a fix before they can go live.
        </p>
      </div>
      <Link
        href="/admin/failed-questions"
        className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-console-lime px-6 text-[15px] font-semibold text-console-ink transition-colors hover:bg-[#E6EFAE] hover:text-console-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-console-lime"
      >
        Review failed questions
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState<MetricKey | null>(null);
  const [detailCache, setDetailCache] = useState<Partial<Record<MetricKey, unknown>>>({});
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await adminDashboardApi.getSummary();
        if (!cancelled) {
          setSummary(response.data);
        }
      } catch (error) {
        if (!cancelled) {
          message.error(formatEzPrepError(error, "Failed to load dashboard"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const openMetric = async (key: MetricKey) => {
    setActiveMetric(key);
    if (detailCache[key]) {
      return;
    }
    setDetailLoading(true);
    try {
      const response = await DETAIL_FETCHERS[key]();
      setDetailCache((current) => ({ ...current, [key]: response.data }));
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to load details"));
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading || !summary) {
    return <PageLoader />;
  }

  const modalTitle =
    ALL_CARDS.find((card) => card.key === activeMetric)?.label || "Details";

  return (
    <div className="text-console-ink">
      <header>
        <p className="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-console-green">
          Admin console
        </p>
        <h1 className="m-0 mt-2 text-[34px] font-bold leading-[1.1] tracking-tight text-console-ink sm:text-[44px]">
          Dashboard
        </h1>
        <p className="m-0 mt-3 text-[15px] text-console-muted sm:text-base">
          Snapshot of learners, content, and papers. Click a card for the breakdown.
        </p>
      </header>

      {summary.failedQuestions > 0 ? (
        <AttentionBanner failedCount={summary.failedQuestions} />
      ) : null}

      {SECTIONS.map((section) => {
        const headingId = `dashboard-section-${section.title.toLowerCase().replace(/\s+/g, "-")}`;
        return (
          <section key={section.title} aria-labelledby={headingId} className="mt-10">
            <h2
              id={headingId}
              className="m-0 text-lg font-bold uppercase tracking-[0.02em] text-console-ink"
            >
              {section.title}
            </h2>
            <p className="m-0 mt-1 text-[15px] text-console-muted">
              {section.description}
            </p>
            <div className={`mt-4 ${section.grid}`}>
              {section.cards.map((card) => (
                <MetricCard
                  key={card.key}
                  card={card}
                  count={summary[card.countKey] ?? 0}
                  onOpen={openMetric}
                />
              ))}
            </div>
          </section>
        );
      })}

      <Modal
        open={activeMetric !== null}
        title={modalTitle}
        footer={null}
        width={900}
        onCancel={() => setActiveMetric(null)}
      >
        {detailLoading || !activeMetric || detailCache[activeMetric] == null ? (
          <PageLoader />
        ) : (
          <DetailTables metric={activeMetric} data={detailCache[activeMetric]} />
        )}
      </Modal>
    </div>
  );
}
