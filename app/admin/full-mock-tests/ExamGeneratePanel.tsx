"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Slider } from "antd";
import { ThunderboltOutlined } from "@ant-design/icons";
import type {
  FullMockExamListItem,
  FullMockExamSubject,
  SubjectDifficultySplit,
} from "./types";
import type { GenerateDraftError } from "./api";

type Counts = { easy: number; medium: number; hard: number };

/** Even split of a subject's quota; the remainder goes to medium then hard. */
export function defaultSplit(total: number): Counts {
  const base = Math.floor(total / 3);
  const remainder = total % 3;
  return {
    easy: base,
    medium: base + (remainder >= 2 ? 1 : 0),
    hard: base + (remainder >= 1 ? 1 : 0),
  };
}

const LEVELS = [
  { key: "easy", label: "Easy", textClass: "text-green-600", color: "#52c41a" },
  {
    key: "medium",
    label: "Medium",
    textClass: "text-orange-500",
    color: "#faad14",
  },
  { key: "hard", label: "Hard", textClass: "text-red-500", color: "#ff4d4f" },
] as const;

interface ExamGeneratePanelProps {
  exam: FullMockExamListItem;
  generating: boolean;
  /** Disable while any generation is running (including for other exams). */
  disabled: boolean;
  error: GenerateDraftError | null;
  onGenerate: (distribution?: SubjectDifficultySplit[]) => void;
}

export function ExamGeneratePanel({
  exam,
  generating,
  disabled,
  error,
  onGenerate,
}: ExamGeneratePanelProps) {
  const subjects: FullMockExamSubject[] = useMemo(
    () => exam.subjectDetails ?? [],
    [exam.subjectDetails]
  );
  const [splits, setSplits] = useState<Record<string, Counts>>(() =>
    Object.fromEntries(
      subjects.map((s) => [s.subjectId, defaultSplit(s.numberOfQuestions)])
    )
  );

  const sumOf = (c: Counts) => c.easy + c.medium + c.hard;
  const allValid = subjects.every(
    (s) => sumOf(splits[s.subjectId]) === s.numberOfQuestions
  );

  const handleGenerate = () => {
    if (subjects.length === 0) {
      onGenerate(undefined);
      return;
    }
    onGenerate(
      subjects.map((s) => ({ subjectId: s.subjectId, ...splits[s.subjectId] }))
    );
  };

  return (
    <div className="space-y-5 py-2" data-testid={`generate-panel-${exam.id}`}>
      <div>
        <div className="font-medium">Difficulty split per subject</div>
        <p className="text-gray-500 text-sm">
          Choose how many easy, medium and hard questions to draw from each
          subject. Each subject must add up to its quota.
        </p>
      </div>

      {subjects.length === 0 ? (
        <Alert
          type="info"
          showIcon
          message="Difficulty control is unavailable for this exam. Questions will be sampled automatically."
        />
      ) : (
        subjects.map((subject) => {
          const counts = splits[subject.subjectId];
          const sum = sumOf(counts);
          const valid = sum === subject.numberOfQuestions;
          return (
            <div
              key={subject.subjectId}
              className="rounded-md border border-gray-200 p-4"
              data-testid={`subject-split-${subject.subjectId}`}
            >
              <div className="font-medium mb-3">{subject.name}</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {LEVELS.map((level) => (
                  <div key={level.key}>
                    <div className="flex justify-between mb-1">
                      <span className={`${level.textClass} font-medium`}>
                        {level.label}
                      </span>
                      <span className="font-semibold">{counts[level.key]}</span>
                    </div>
                    <Slider
                      min={0}
                      max={subject.numberOfQuestions}
                      value={counts[level.key]}
                      disabled={disabled}
                      aria-label={`${subject.name} ${level.label}`}
                      onChange={(value: number) =>
                        setSplits((prev) => ({
                          ...prev,
                          [subject.subjectId]: {
                            ...prev[subject.subjectId],
                            [level.key]: value,
                          },
                        }))
                      }
                      styles={{ track: { background: level.color } }}
                    />
                  </div>
                ))}
              </div>
              <div
                className={`text-sm mt-2 ${
                  valid ? "text-green-600" : "text-red-500 font-semibold"
                }`}
              >
                Total: {sum} / {subject.numberOfQuestions}
                {!valid && ` — Must equal ${subject.numberOfQuestions}`}
              </div>
            </div>
          );
        })
      )}

      {error ? (
        <Alert
          type="error"
          showIcon
          message={error.summary}
          description={
            error.lines.length > 0 ? (
              <ul className="list-disc pl-5 m-0">
                {error.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : undefined
          }
        />
      ) : null}

      <div className="flex justify-end">
        <Button
          type="primary"
          icon={<ThunderboltOutlined />}
          loading={generating}
          disabled={disabled || !allValid}
          onClick={handleGenerate}
        >
          Generate draft
        </Button>
      </div>
    </div>
  );
}
