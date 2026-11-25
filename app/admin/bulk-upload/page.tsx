"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Spin, Tooltip, message, type TableColumnsType } from "antd";
import { FileUp, FileText, Import, RotateCcw, Upload } from "lucide-react";
import { catalogApi, ezPrepApiClient } from "@/app/services/ezprep-api";
import { ChapterUi } from "@/app/lib/chapter-ui";
import { EzPrepApiError } from "@/app/services/ezprep-api/types";
import {
  BulkUpload,
  BulkUploadListResponse,
  BulkUploadProcessingAction,
  BulkUploadStatus,
  BULK_UPLOAD_STATUSES,
  BULK_UPLOAD_POLLING_INTERVAL_MS,
  ENRICH_CONFIG,
  EnrichAcceptedResponse,
  ImportQuestionsResponse,
  LookupItem,
  PARSE_PDF_CONFIG,
  ParsePdfAcceptedResponse,
} from "./types";
import { OverflowChips, TruncatedChip } from "../_components/OverflowChips";
import {
  CONSOLE_TOOLTIP_COLOR,
  ClampText,
  ColumnTitle,
  DependentFilter,
  EmptyCell,
  FilterSelect,
  ListCard,
  ListFooter,
  ListPageHeader,
  ListSearch,
  ListTable,
  ListToolbar,
  Pill,
  PrimaryActionLink,
  ROW_ACTION_CLASS,
  ROW_ACTION_TONE,
  SubjectLabel,
  TableEmptyState,
  type PillTone,
} from "../_components/console-list";

const PROCESSING_MODAL_CONTENT: Record<
  BulkUploadProcessingAction,
  { title: string; description: string; loadingMessage: string }
> = {
  import: {
    title: "Importing Questions",
    description:
      "Saving enriched questions to the database. Please wait...",
    loadingMessage: "Importing questions, please wait...",
  },
};

const STATUS_TONE: Record<BulkUploadStatus, { tone: PillTone; spinning?: boolean }> = {
  uploaded: { tone: "blue" },
  parsing: { tone: "blue", spinning: true },
  parsed: { tone: "violet" },
  processing: { tone: "amber", spinning: true },
  enriched: { tone: "lime" },
  completed: { tone: "green" },
  failed: { tone: "red" },
};

function formatStatus(status: BulkUploadStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

export default function BulkUploadPage() {
  const [uploads, setUploads] = useState<BulkUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [processingUpload, setProcessingUpload] = useState<{
    id: string;
    filename: string;
    action: BulkUploadProcessingAction;
  } | null>(null);
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
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<BulkUploadStatus | null>(
    null
  );
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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

  const fetchUploads = useCallback(
    async (page = 1, limit = pagination.pageSize) => {
      setLoading(true);
      try {
        const searchParams: Record<string, string | number> = { page, limit };
        if (selectedSubject) searchParams.subjectId = selectedSubject;
        if (selectedTopic) searchParams.topicId = selectedTopic;
        if (selectedStatus) searchParams.status = selectedStatus;
        if (searchQuery.trim()) searchParams.search = searchQuery.trim();

        const response = await ezPrepApiClient.get<BulkUploadListResponse>(
          "/v1/imports/uploads",
          { searchParams }
        );

        const uploads = response.data?.uploads ?? [];
        const paginationData = response.data?.pagination;

        setUploads(uploads);
        setPagination((prev) => ({
          ...prev,
          current: paginationData?.page ?? page,
          pageSize: paginationData?.limit ?? limit,
          total: paginationData?.total ?? uploads.length,
        }));
      } catch (error) {
        const errorMessage =
          error instanceof EzPrepApiError
            ? error.message
            : "Failed to fetch uploads";
        message.error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [
      pagination.pageSize,
      selectedSubject,
      selectedTopic,
      selectedStatus,
      searchQuery,
    ]
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
    fetchUploads(1);
  }, [fetchUploads]);

  useEffect(() => {
    const hasInProgress = uploads.some(
      (upload) => upload.status === "parsing" || upload.status === "processing"
    );
    if (!hasInProgress) return;

    const interval = setInterval(() => {
      void fetchUploads(pagination.current);
    }, BULK_UPLOAD_POLLING_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [uploads, fetchUploads, pagination.current]);

  const handleParse = async (upload: BulkUpload) => {
    setActionLoadingId(upload.id);

    try {
      const response = await ezPrepApiClient.post<ParsePdfAcceptedResponse>(
        `/v1/imports/parse-pdf/${upload.id}`,
        PARSE_PDF_CONFIG
      );

      message.success(
        response.message ||
          "PDF parsing started. The status will update when processing completes."
      );
      await fetchUploads(pagination.current);
    } catch (error) {
      const errorMessage =
        error instanceof EzPrepApiError
          ? error.message
          : "Failed to start PDF parsing";
      message.error(errorMessage);
      await fetchUploads(pagination.current);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleEnrich = async (upload: BulkUpload) => {
    setActionLoadingId(upload.id);

    try {
      const response = await ezPrepApiClient.post<EnrichAcceptedResponse>(
        `/v1/imports/enrich/${upload.id}`,
        ENRICH_CONFIG
      );

      message.success(
        response.message ||
          "AI enrichment started. The status will update when processing completes."
      );
      await fetchUploads(pagination.current);
    } catch (error) {
      const errorMessage =
        error instanceof EzPrepApiError
          ? error.message
          : "Failed to start AI enrichment";
      message.error(errorMessage);
      await fetchUploads(pagination.current);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleImport = async (upload: BulkUpload) => {
    setActionLoadingId(upload.id);
    setProcessingUpload({
      id: upload.id,
      filename: upload.filename,
      action: "import",
    });

    const loadingToast = message.loading(
      PROCESSING_MODAL_CONTENT.import.loadingMessage,
      0
    );

    try {
      const response = await ezPrepApiClient.post<ImportQuestionsResponse>(
        `/v1/imports/questions/${upload.id}`
      );

      loadingToast();

      const summary =
        response.data?.summary ||
        response.message ||
        "Questions imported successfully";

      message.success(summary);
      await fetchUploads(pagination.current);
    } catch (error) {
      loadingToast();
      const errorMessage =
        error instanceof EzPrepApiError
          ? error.message
          : "Failed to import questions";
      message.error(errorMessage);
      await fetchUploads(pagination.current);
    } finally {
      setActionLoadingId(null);
      setProcessingUpload(null);
    }
  };

  const renderActionButton = (record: BulkUpload) => {
    const isLoading = actionLoadingId === record.id;
    const busy = isLoading ? <Spin size="small" className="!mr-0.5" /> : null;

    switch (record.status) {
      case "uploaded":
        return (
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleParse(record)}
            className={`${ROW_ACTION_CLASS} ${ROW_ACTION_TONE.primary}`}
          >
            {busy}
            Parse PDF
          </button>
        );
      case "parsing":
        return (
          <button type="button" disabled className={`${ROW_ACTION_CLASS} ${ROW_ACTION_TONE.muted}`}>
            Parsing...
          </button>
        );
      case "parsed":
        return (
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleEnrich(record)}
            className={`${ROW_ACTION_CLASS} ${ROW_ACTION_TONE.primary}`}
          >
            {busy}
            AI Enrich
          </button>
        );
      case "processing":
        return (
          <button type="button" disabled className={`${ROW_ACTION_CLASS} ${ROW_ACTION_TONE.muted}`}>
            Processing...
          </button>
        );
      case "enriched":
        return (
          <Tooltip title="Import enriched questions to the question bank" color={CONSOLE_TOOLTIP_COLOR}>
            <button
              type="button"
              aria-label="Add to Question Bank"
              disabled={isLoading}
              onClick={() => handleImport(record)}
              className={`${ROW_ACTION_CLASS} ${ROW_ACTION_TONE.primary}`}
            >
              {busy ?? <Import className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />}
              Add to bank
            </button>
          </Tooltip>
        );
      case "failed":
        return (
          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleParse(record)}
            className={`${ROW_ACTION_CLASS} ${ROW_ACTION_TONE.danger}`}
          >
            {busy ?? <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />}
            Retry
          </button>
        );
      case "completed":
      default:
        return null;
    }
  };

  const hasFilters = Boolean(
    selectedSubject || selectedTopic || selectedStatus || searchQuery.trim()
  );

  const columns: TableColumnsType<BulkUpload> = [
    {
      title: <ColumnTitle>File</ColumnTitle>,
      key: "filename",
      // Flexible: takes the space the other columns leave.
      render: (_: unknown, record: BulkUpload) => (
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F1ECE1] text-[#7A5A2E]">
            <FileText className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <ClampText
              text={record.filename}
              lines={1}
              className="text-[14px] font-semibold text-console-ink"
            />
            {record.title && record.title !== record.filename && !isUuidLike(record.title) ? (
              <ClampText
                text={record.title}
                lines={1}
                className="mt-0.5 text-[12.5px] text-console-muted"
              />
            ) : null}
            <div className="mt-0.5 text-[12px] text-console-muted/80">
              {formatFileSize(record.fileSize ?? 0)}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: <ColumnTitle>Subject</ColumnTitle>,
      key: "subject",
      width: "11%",
      render: (_: unknown, record: BulkUpload) => (
        <SubjectLabel name={subjectMap.get(record.subjectId) ?? record.subjectId} />
      ),
    },
    {
      title: <ColumnTitle>{ChapterUi.singular}</ColumnTitle>,
      key: "topic",
      width: "18%",
      render: (_: unknown, record: BulkUpload) =>
        record.topicId ? (
          <TruncatedChip
            label={topicMap.get(record.topicId) ?? record.topicId}
            maxWidthClass="max-w-full"
          />
        ) : (
          <EmptyCell />
        ),
    },
    {
      title: <ColumnTitle>Exams</ColumnTitle>,
      key: "exams",
      width: "14%",
      render: (_: unknown, record: BulkUpload) => (
        <OverflowChips
          items={(record.examIds || []).map((id) => examMap.get(id) ?? id)}
          tone="exam"
          noun="exams"
          empty={<EmptyCell />}
        />
      ),
    },
    {
      title: <ColumnTitle>Status</ColumnTitle>,
      key: "status",
      width: "14%",
      render: (_: unknown, record: BulkUpload) => {
        const style = STATUS_TONE[record.status] ?? { tone: "neutral" as const };
        return (
          <div className="min-w-0">
            <Pill tone={style.tone} spinning={style.spinning}>
              {formatStatus(record.status)}
            </Pill>
            {record.status === "failed" && record.errorMessage ? (
              <ClampText
                text={record.errorMessage}
                className="mt-1 text-[12px] leading-snug text-console-danger"
              />
            ) : null}
          </div>
        );
      },
    },
    {
      title: <ColumnTitle>Actions</ColumnTitle>,
      key: "actions",
      width: 148,
      render: (_: unknown, record: BulkUpload) => renderActionButton(record),
    },
  ];

  return (
    <div className="w-full text-console-ink">
      <ListPageHeader
        eyebrow="Question bank"
        title="Bulk upload"
        description="Upload PDFs, parse them, enrich with AI, then add the questions to the bank."
        actions={
          <PrimaryActionLink href="/admin/bulk-upload/upload" icon={Upload}>
            Upload
          </PrimaryActionLink>
        }
      />

      <ListCard>
        <ListToolbar className="xl:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <ListSearch
            placeholder="Search by file name"
            value={searchInput}
            onChange={(value) => {
              setSearchInput(value);
              if (!value) setSearchQuery("");
            }}
            onSubmit={(value) => setSearchQuery(value.trim())}
            className="sm:col-span-2 xl:col-span-1"
          />
          <FilterSelect<BulkUploadStatus>
            placeholder="Filter by status"
            allowClear
            value={selectedStatus}
            onChange={(value) => setSelectedStatus(value)}
            options={BULK_UPLOAD_STATUSES.map((status) => ({
              value: status,
              label: formatStatus(status),
            }))}
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
          />
        </ListToolbar>

        <ListTable<BulkUpload>
          columns={columns}
          dataSource={uploads}
          rowKey="id"
          loading={loading}
          // Actions are fixed (148px), the rest share 57%; the file column gets what is left.
          scroll={{ x: 900 }}
          empty={
            <TableEmptyState
              icon={FileUp}
              message={
                hasFilters
                  ? "No uploads match these filters."
                  : "No uploads yet. Upload a PDF to start an import."
              }
            />
          }
        />

        <ListFooter
          page={pagination.current}
          pageSize={pagination.pageSize}
          total={pagination.total}
          shownCount={uploads.length}
          noun="uploads"
          onPageChange={(page) => fetchUploads(page)}
          onPageSizeChange={(size) => fetchUploads(1, size)}
        />
      </ListCard>

      <Modal
        open={!!processingUpload}
        footer={null}
        closable={false}
        maskClosable={false}
        centered
        width={400}
      >
        <div className="flex flex-col items-center gap-5 py-8">
          <Spin size="large" />
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-lg font-semibold text-console-ink">
              <Import className="h-5 w-5 text-console-green" strokeWidth={1.75} aria-hidden="true" />
              {processingUpload
                ? PROCESSING_MODAL_CONTENT[processingUpload.action].title
                : ""}
            </div>
            <p className="mt-2 break-all text-console-muted">{processingUpload?.filename}</p>
            <p className="mt-3 text-sm text-console-muted/80">
              {processingUpload
                ? PROCESSING_MODAL_CONTENT[processingUpload.action].description
                : ""}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
