import type { EquationFormValues } from "./equation-form";

export function isEquationFormReady(
  values: Partial<EquationFormValues> | undefined
): boolean {
  if (!values) return false;

  const title = values.title?.trim();
  const shortDescription = values.shortDescription?.trim();
  const equation = values.equation?.trim();
  const subject = values.subject;
  const topic = values.topic;
  const exams = values.exams;
  const bulletPoints = values.bulletPoints;

  if (!title || !shortDescription || !equation || !subject || !topic) {
    return false;
  }

  if (!Array.isArray(exams) || exams.length < 1) {
    return false;
  }

  if (
    Array.isArray(bulletPoints) &&
    bulletPoints.some((item) => !String(item ?? "").trim())
  ) {
    return false;
  }

  return true;
}
