import { ChapterUi } from "@/app/lib/chapter-ui";
import { isSprintSelectionSize, type SelectedSprintQuestion } from "./sprint-selection";

const SIZES = "10, 15, 20, 25, or 30";

export function topicWiseSelectionIssue(
  questions: SelectedSprintQuestion[]
): string | null {
  const count = questions.length;
  if (!isSprintSelectionSize(count)) {
    if (count < 10) {
      return ChapterUi.sizeAtLeast(SIZES);
    }
    return ChapterUi.sizeExact(SIZES, count);
  }

  const subjects = new Set(
    questions.map((question) => question.subjectId).filter((id): id is string => Boolean(id))
  );
  if (subjects.size !== 1 || questions.some((question) => !question.subjectId)) {
    return ChapterUi.sameSubjectRequired;
  }

  const topics = new Set(
    questions.map((question) => question.topicId).filter((id): id is string => Boolean(id))
  );
  if (topics.size !== 1 || questions.some((question) => !question.topicId)) {
    return ChapterUi.sameTopicRequired;
  }

  return null;
}

export function canCreateTopicWiseTest(
  questions: SelectedSprintQuestion[]
): boolean {
  return topicWiseSelectionIssue(questions) === null;
}
