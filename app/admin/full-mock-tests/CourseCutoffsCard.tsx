"use client";

import { useMemo, useState } from "react";
import { Button, Card, Space, message } from "antd";
import { formatEzPrepError, fullMockApi } from "./api";
import { CourseCutoffFields } from "./CourseCutoffFields";
import {
  buildCutoffPatch,
  cutoffsToValues,
  resolveTotalMarks,
  type CourseCutoffValues,
} from "./course-cutoffs";
import type { CourseCutoffEntry, FullMockTestListItem } from "./types";

type CourseCutoffsCardProps = {
  test: Pick<
    FullMockTestListItem,
    "id" | "exam" | "totalMarks" | "subjectConfig" | "courseCutoffs"
  >;
  onSaved: (courseCutoffs: CourseCutoffEntry[]) => void;
};

/**
 * Course cut-offs on a published full mock. This is the only part of a
 * published paper that can still be edited; everything else stays frozen.
 */
export function CourseCutoffsCard({ test, onSaved }: CourseCutoffsCardProps) {
  const initial = useMemo(
    () => cutoffsToValues(test.courseCutoffs),
    [test.courseCutoffs]
  );
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftValues, setDraftValues] = useState<CourseCutoffValues>(initial);
  const [visibleIds, setVisibleIds] = useState<string[]>([]);

  const totalMarks = resolveTotalMarks(test.totalMarks, test.subjectConfig);

  const startEditing = () => {
    setDraftValues(initial);
    setEditing(true);
  };

  const cancel = () => {
    setDraftValues(initial);
    setEditing(false);
  };

  const save = async () => {
    const patch = buildCutoffPatch(initial, draftValues, visibleIds);
    if (patch.length === 0) {
      message.info("No changes to save");
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      const response = await fullMockApi.updateCourseCutoffs(test.id, patch);
      onSaved(response.data.courseCutoffs ?? []);
      message.success(response.message || "Course cut-offs updated");
      setEditing(false);
    } catch (error) {
      message.error(formatEzPrepError(error, "Failed to update cut-offs"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title="Course cut-offs"
      extra={
        editing ? (
          <Space>
            <Button onClick={cancel} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="primary"
              loading={saving}
              onClick={() => void save()}
            >
              Save cut-offs
            </Button>
          </Space>
        ) : (
          <Button onClick={startEditing}>Edit cut-offs</Button>
        )
      }
    >
      <p className="mb-4 text-sm text-gray-500">
        Marks a student needs for each course on this paper
        {totalMarks ? ` (out of ${totalMarks})` : ""}. Leave a course blank if
        you have not decided its cut-off. This is the only part of a published
        mock that can be edited.
      </p>
      <CourseCutoffFields
        examId={test.exam?.id}
        totalMarks={totalMarks}
        value={editing ? draftValues : initial}
        onChange={setDraftValues}
        readOnly={!editing}
        onCoursesLoaded={setVisibleIds}
      />
    </Card>
  );
}
