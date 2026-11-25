"use client";

import { Pill } from "@/app/admin/_components/console-list";
import { QuestionPreview } from "./QuestionPreview";
import type { DraftQuestionItem, DraftSubjectBlock, SafeQuestion } from "./types";

/** Pills next to a subject section title: count, marks, negative marking, session time. */
export function SubjectMetaPills({ subject }: { subject: DraftSubjectBlock }) {
  return (
    <>
      <Pill tone="neutral" dot={false}>
        {subject.questions.length} questions
      </Pill>
      <Pill tone="neutral" dot={false}>
        {subject.marksPerQuestion} mark{subject.marksPerQuestion === 1 ? "" : "s"} / Q
      </Pill>
      {subject.hasNegativeMarking ? (
        <Pill tone="red" dot={false}>
          -{subject.negativeMarksPerQuestion}
        </Pill>
      ) : (
        <Pill tone="neutral" dot={false}>
          No negative
        </Pill>
      )}
      {subject.sessionTime != null ? (
        <Pill tone="violet" dot={false}>
          {subject.sessionTime} min session
        </Pill>
      ) : null}
    </>
  );
}

/** Question snippet clipped to two lines; click the row for the full preview. */
export function QuestionSnippetCell({ question }: { question: SafeQuestion }) {
  return (
    <div className="line-clamp-2 min-w-0 break-words text-[14px] font-semibold leading-snug text-console-ink">
      <QuestionPreview question={question} snippetOnly />
    </div>
  );
}

export function MarksCell({ record }: { record: DraftQuestionItem }) {
  return (
    <span className="text-[13.5px] font-semibold tabular-nums text-console-ink">
      {record.negativeMarking
        ? `${record.marksPerQuestion} / -${record.negativeMarking}`
        : record.marksPerQuestion}
    </span>
  );
}
