"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Empty,
  InputNumber,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  ReloadOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { MathpixContent } from "@/app/admin/full-mock-tests/MathpixContent";
import {
  formatEzPrepError,
  questionsApi,
  type CitationStatus,
  type QuestionCitation,
  type QuestionCitations,
} from "@/app/services/ezprep-api";

const { Text } = Typography;

/** How many top matches the admin can ask to see. The API allows up to 10. */
export const DEFAULT_TOP_N = 5;
export const MAX_TOP_N = 10;
/** Citations kept on a question; the first this-many matches by default. */
export const MAX_SAVED = 2;
const PENDING_POLL_MS = 3000;
const PENDING_POLL_TRIES = 5;

const STATUS_COLOR: Record<CitationStatus, string> = {
  pending: "processing",
  done: "success",
  failed: "error",
  skipped: "default",
};

const STATUS_HINT: Record<CitationStatus, string> = {
  pending: "Looking up NCERT citations…",
  done: "Citations are up to date.",
  failed: "The last lookup failed. Try “Refresh auto” or pick from the top matches.",
  skipped:
    "No lookup ran: the saved subject has no NCERT mapping, or citation search is not configured.",
};

function pageLabel(c: QuestionCitation): string | null {
  if (c.pageNumber == null) return null;
  return c.ncertPageOffset == null
    ? `PDF page ${c.pageNumber}`
    : `Page ${c.pageNumber}`;
}

function formatScore(value?: number): string | null {
  return typeof value === "number" ? value.toFixed(3) : null;
}

/** Title, source, grade, page and scores for one chunk. */
function CitationMeta({ citation }: { citation: QuestionCitation }) {
  const page = pageLabel(citation);
  const similarity = formatScore(citation.similarity);
  const score = formatScore(citation.score);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Text strong>{citation.title || "Untitled chunk"}</Text>
      {citation.grade ? <Tag color="blue">Class {citation.grade}</Tag> : null}
      {page ? <Tag>{page}</Tag> : null}
      {citation.sourceDoc ? (
        <Text type="secondary" className="text-xs">
          {citation.sourceDoc}
        </Text>
      ) : null}
      {similarity ? (
        <Tooltip title="Vector similarity">
          <Tag color="purple">sim {similarity}</Tag>
        </Tooltip>
      ) : null}
      {score && !similarity ? <Tag color="purple">score {score}</Tag> : null}
      {citation.selectedBy ? (
        <Tag color={citation.selectedBy === "admin" ? "gold" : "default"}>
          {citation.selectedBy === "admin" ? "Admin pick" : "Auto"}
        </Tag>
      ) : null}
    </div>
  );
}

const COLLAPSED_FADE =
  "linear-gradient(to bottom, #000 65%, transparent 100%)";

/** True while the element's content is taller than its (clamped) box. */
function useOverflowing(
  outer: React.RefObject<HTMLElement | null>,
  inner: React.RefObject<HTMLElement | null>
): boolean {
  const [overflowing, setOverflowing] = useState(false);
  useEffect(() => {
    const outerEl = outer.current;
    const innerEl = inner.current;
    if (!outerEl || !innerEl) return;
    const measure = () =>
      setOverflowing(innerEl.scrollHeight > outerEl.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    // The Mathpix render is async, so watch the content as well as the box.
    const observer = new ResizeObserver(measure);
    observer.observe(outerEl);
    observer.observe(innerEl);
    return () => observer.disconnect();
  }, [outer, inner]);
  return overflowing;
}

/**
 * Chunk preview: figures first-class below the text, text clamped with a fade
 * (never a half-cut line) until expanded.
 */
function CitationBody({ citation }: { citation: QuestionCitation }) {
  const [expanded, setExpanded] = useState(false);
  const clampRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const overflowing = useOverflowing(clampRef, contentRef);
  const fade = !expanded && overflowing;
  const images = (citation.images ?? []).filter((src) =>
    /^https?:\/\//.test(src)
  );
  return (
    <div className="mt-1">
      <div
        ref={clampRef}
        className={expanded ? "" : "max-h-24 overflow-hidden"}
        style={
          fade ? { maskImage: COLLAPSED_FADE, WebkitMaskImage: COLLAPSED_FADE } : undefined
        }
        data-testid="citation-content"
      >
        <div ref={contentRef}>
          {citation.content ? (
            <MathpixContent text={citation.content} />
          ) : (
            <Text type="secondary">No text</Text>
          )}
        </div>
      </div>
      {images.length ? (
        <div
          className="mt-3 flex flex-wrap items-start gap-3"
          data-testid="citation-figures"
        >
          {images.map((src) => (
            <a
              key={src}
              href={src}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded border border-gray-200 bg-white p-1"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt="NCERT figure"
                loading="lazy"
                className={
                  expanded
                    ? "block max-h-72 max-w-full object-contain"
                    : "block h-24 w-auto max-w-[14rem] object-contain"
                }
              />
            </a>
          ))}
        </div>
      ) : null}
      {citation.content && (expanded || overflowing) ? (
        <Button
          type="link"
          size="small"
          className="px-0"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : "Show more"}
        </Button>
      ) : null}
    </div>
  );
}

/**
 * NCERT citations for one question: shows what is saved, and lets the admin
 * search the top chunks, pick up to MAX_SAVED and set their rank.
 * Lookups use the question's saved subject.
 */
export function CitationsCard({ questionId }: { questionId: string }) {
  const [saved, setSaved] = useState<QuestionCitations | null>(null);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [topN, setTopN] = useState<number | null>(DEFAULT_TOP_N);
  const [results, setResults] = useState<QuestionCitation[] | null>(null);
  const [mapped, setMapped] = useState(true);
  const [searchedQuery, setSearchedQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const pollTries = useRef(0);

  const loadSaved = useCallback(async () => {
    try {
      const res = await questionsApi.getCitations(questionId);
      setSaved(res.data);
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to load citations"));
    } finally {
      setLoadingSaved(false);
    }
  }, [questionId]);

  useEffect(() => {
    pollTries.current = 0;
    void loadSaved();
  }, [loadSaved]);

  // A new question's background lookup may still be running.
  useEffect(() => {
    if (saved?.citationStatus !== "pending") return;
    if (pollTries.current >= PENDING_POLL_TRIES) return;
    const timer = setTimeout(() => {
      pollTries.current += 1;
      void loadSaved();
    }, PENDING_POLL_MS);
    return () => clearTimeout(timer);
  }, [saved, loadSaved]);

  const runSearch = async () => {
    const limit = Math.min(MAX_TOP_N, Math.max(1, topN ?? DEFAULT_TOP_N));
    setSearching(true);
    try {
      const res = await questionsApi.searchCitations(questionId, { limit });
      const data = res.data;
      setMapped(data.mapped);
      setSearchedQuery(data.query);
      setResults(data.results);
      // Keep what is already applied when it is among these matches;
      // otherwise default to the first MAX_SAVED matches.
      const found = new Set(data.results.map((r) => r.chunkId));
      const applied = (saved?.citations ?? [])
        .map((c) => c.chunkId)
        .filter((id) => found.has(id))
        .slice(0, MAX_SAVED);
      setSelection(
        applied.length
          ? applied
          : data.results.slice(0, MAX_SAVED).map((r) => r.chunkId)
      );
    } catch (error) {
      message.error(formatEzPrepError(error, "Citation search failed"));
    } finally {
      setSearching(false);
    }
  };

  const toggle = (chunkId: string, checked: boolean) => {
    setSelection((current) => {
      if (!checked) return current.filter((id) => id !== chunkId);
      if (current.includes(chunkId)) return current;
      if (current.length >= MAX_SAVED) {
        message.warning(`You can keep at most ${MAX_SAVED} citations`);
        return current;
      }
      return [...current, chunkId];
    });
  };

  const move = (chunkId: string, delta: -1 | 1) => {
    setSelection((current) => {
      const index = current.indexOf(chunkId);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await questionsApi.saveCitations(questionId, selection);
      setSaved(res.data);
      message.success(
        selection.length
          ? `Applied ${selection.length} citation${selection.length > 1 ? "s" : ""}`
          : "Citations cleared"
      );
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to save citations"));
    } finally {
      setSaving(false);
    }
  };

  const refreshAuto = async () => {
    setRefreshing(true);
    try {
      const res = await questionsApi.refreshCitations(questionId);
      setSaved(res.data);
      message.success("Automatic citations refreshed");
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to refresh citations"));
    } finally {
      setRefreshing(false);
    }
  };

  // Selected rows first, in rank order; then the rest in search order.
  const rows = useMemo(() => {
    if (!results) return [];
    const byId = new Map(results.map((r) => [r.chunkId, r]));
    const picked = selection
      .map((id) => byId.get(id))
      .filter((r): r is QuestionCitation => Boolean(r));
    const rest = results.filter((r) => !selection.includes(r.chunkId));
    return [...picked, ...rest];
  }, [results, selection]);

  const savedIds = (saved?.citations ?? []).map((c) => c.chunkId);
  const unchanged =
    savedIds.length === selection.length &&
    savedIds.every((id, i) => id === selection[i]);

  const columns = [
    {
      title: "Keep",
      key: "keep",
      width: 64,
      render: (_: unknown, row: QuestionCitation) => (
        <Checkbox
          aria-label={`Keep ${row.title ?? row.chunkId}`}
          checked={selection.includes(row.chunkId)}
          onChange={(e) => toggle(row.chunkId, e.target.checked)}
        />
      ),
    },
    {
      title: "Rank",
      key: "rank",
      width: 110,
      render: (_: unknown, row: QuestionCitation) => {
        const index = selection.indexOf(row.chunkId);
        if (index < 0) return <Text type="secondary">–</Text>;
        return (
          <Space size={4}>
            <Text strong>{index + 1}</Text>
            <Button
              size="small"
              icon={<ArrowUpOutlined />}
              aria-label={`Move ${row.title ?? row.chunkId} up`}
              disabled={index === 0}
              onClick={() => move(row.chunkId, -1)}
            />
            <Button
              size="small"
              icon={<ArrowDownOutlined />}
              aria-label={`Move ${row.title ?? row.chunkId} down`}
              disabled={index === selection.length - 1}
              onClick={() => move(row.chunkId, 1)}
            />
          </Space>
        );
      },
    },
    {
      title: "NCERT chunk",
      key: "chunk",
      render: (_: unknown, row: QuestionCitation) => (
        <div>
          <CitationMeta citation={{ ...row, selectedBy: undefined }} />
          <CitationBody citation={row} />
        </div>
      ),
    },
  ];

  const status = saved?.citationStatus ?? null;

  return (
    <Card
      title="NCERT citations"
      loading={loadingSaved}
      extra={
        <Space>
          {status ? (
            <Tooltip title={STATUS_HINT[status]}>
              <Tag color={STATUS_COLOR[status]}>{status}</Tag>
            </Tooltip>
          ) : null}
          <Button
            icon={<ReloadOutlined />}
            loading={refreshing}
            onClick={refreshAuto}
          >
            Refresh auto
          </Button>
        </Space>
      }
    >
      <div className="space-y-4">
        <Text type="secondary" className="block text-xs">
          Uses the saved subject. If you change the subject, update the question
          first.
        </Text>

        {saved?.citations?.length ? (
          <ol className="space-y-3 pl-0" aria-label="Saved citations">
            {saved.citations.map((c) => (
              <li
                key={c.chunkId}
                className="list-none rounded border border-gray-200 p-3"
              >
                <div className="flex gap-2">
                  <Text strong>{c.rank}.</Text>
                  <div className="min-w-0 flex-1">
                    <CitationMeta citation={c} />
                    <CitationBody citation={c} />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No citations saved"
          />
        )}

        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <Text>Show top</Text>
          <InputNumber
            aria-label="Number of matches"
            min={1}
            max={MAX_TOP_N}
            precision={0}
            value={topN}
            onChange={(value) => setTopN(typeof value === "number" ? value : null)}
            onPressEnter={runSearch}
            style={{ width: 80 }}
          />
          <Text>matches</Text>
          <Button
            type="primary"
            className="bg-blue-600 hover:bg-blue-700"
            icon={<SearchOutlined />}
            loading={searching}
            onClick={runSearch}
          >
            Show top {topN ?? DEFAULT_TOP_N}
          </Button>
        </div>

        {results && !mapped ? (
          <Alert
            type="info"
            showIcon
            message="This question's subject has no NCERT mapping"
            description="Map the subject to an NCERT vector subject on the subject edit page to enable citations."
          />
        ) : null}

        {results && mapped ? (
          <>
            <Text type="secondary" className="block text-xs">
              Pick up to {MAX_SAVED} to apply. The first {MAX_SAVED} matches are
              selected by default. Matched on: {searchedQuery}
            </Text>
            <Table
              rowKey="chunkId"
              size="small"
              columns={columns}
              dataSource={rows}
              pagination={false}
              locale={{ emptyText: "No matching NCERT chunks" }}
            />
            <div className="flex items-center justify-between">
              <Text type="secondary">
                {selection.length} of {MAX_SAVED} selected
              </Text>
              <Button
                type="primary"
                className="bg-blue-600 hover:bg-blue-700"
                loading={saving}
                disabled={unchanged}
                onClick={save}
              >
                {selection.length ? "Apply" : "Clear citations"}
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </Card>
  );
}
