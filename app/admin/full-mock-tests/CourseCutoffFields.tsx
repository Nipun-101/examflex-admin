"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Alert, Button, InputNumber, Skeleton, Space } from "antd";
import {
  formatEzPrepError,
  recommendationsApi,
  type RecommendationOffering,
} from "@/app/services/ezprep-api";
import type { CourseCutoffValues } from "./course-cutoffs";

type CourseCutoffFieldsProps = {
  /** Exam whose active COURSE offerings are listed. */
  examId: string | undefined;
  /** Paper total; used as the maximum and shown next to each input. */
  totalMarks?: number;
  /** Controlled value (works as an antd `Form.Item` control). */
  value?: CourseCutoffValues;
  onChange?: (value: CourseCutoffValues) => void;
  /** Show saved cut-offs as text instead of inputs. */
  readOnly?: boolean;
  /** Reports the course ids on screen (used to build minimal edits). */
  onCoursesLoaded?: (offeringIds: string[]) => void;
};

/**
 * One optional cut-off input per active course of an exam, in marks
 * (e.g. MBBS 620 of 720). Blank = no cut-off for that course on this paper.
 */
export function CourseCutoffFields({
  examId,
  totalMarks,
  value,
  onChange,
  readOnly = false,
  onCoursesLoaded,
}: CourseCutoffFieldsProps) {
  const [courses, setCourses] = useState<RecommendationOffering[]>([]);
  const [loading, setLoading] = useState(Boolean(examId));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!examId) {
      setCourses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await recommendationsApi.list({
        examId,
        kind: "COURSE",
        activeOnly: true,
        limit: 100,
      });
      const rows = response.data ?? [];
      setCourses(rows);
      onCoursesLoaded?.(rows.map((row) => row.id));
    } catch (loadError) {
      setError(formatEzPrepError(loadError, "Failed to load courses"));
    } finally {
      setLoading(false);
    }
    // onCoursesLoaded intentionally omitted: callers pass inline callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  useEffect(() => {
    void load();
  }, [load]);

  const setOne = (offeringId: string, next: number | null) => {
    onChange?.({ ...(value ?? {}), [offeringId]: next });
  };

  if (loading) {
    return <Skeleton active paragraph={{ rows: 2 }} title={false} />;
  }

  if (error) {
    return (
      <Alert
        type="error"
        showIcon
        message={error}
        action={
          <Button size="small" onClick={() => void load()}>
            Retry
          </Button>
        }
      />
    );
  }

  if (courses.length === 0) {
    return (
      <Alert
        type="info"
        showIcon
        message="No courses are set up for this exam yet."
        description={
          <span>
            Add courses under{" "}
            <Link href="/admin/recommendations" className="text-blue-600 underline">
              Recommendations
            </Link>{" "}
            to enter cut-offs for them here.
          </span>
        }
      />
    );
  }

  const suffix = totalMarks ? ` / ${totalMarks}` : "";

  return (
    <div className="space-y-3" data-testid="course-cutoff-fields">
      {courses.map((course) => {
        const current = value?.[course.id];
        const inputId = `course-cutoff-${course.id}`;
        return (
          <div
            key={course.id}
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <label htmlFor={inputId} className="min-w-[10rem]">
              <span className="font-medium text-gray-900">{course.title}</span>
              {course.subtitle ? (
                <span className="ml-2 text-sm text-gray-500">
                  {course.subtitle}
                </span>
              ) : null}
            </label>
            {readOnly ? (
              <span id={inputId} className="text-gray-900">
                {typeof current === "number" ? (
                  `${current}${suffix}`
                ) : (
                  <span className="text-gray-400">Not set</span>
                )}
              </span>
            ) : (
              <Space.Compact>
                <InputNumber
                  id={inputId}
                  aria-label={`${course.title} cut-off`}
                  value={current ?? null}
                  min={0.01}
                  max={totalMarks}
                  step={1}
                  placeholder="Optional"
                  onChange={(next) =>
                    setOne(
                      course.id,
                      typeof next === "number"
                        ? Math.round(next * 100) / 100 // the API accepts 2 decimals
                        : null
                    )
                  }
                />
                <Space.Addon>{totalMarks ? `/ ${totalMarks}` : "marks"}</Space.Addon>
              </Space.Compact>
            )}
          </div>
        );
      })}
    </div>
  );
}
