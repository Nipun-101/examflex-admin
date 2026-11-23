import type { CourseCutoffEntry, CourseCutoffUpdate } from "./types";

/** Form state: offering id -> marks (blank / cleared = null or undefined). */
export type CourseCutoffValues = Record<string, number | null | undefined>;

function isUsable(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * Paper total used as the upper bound for cut-off inputs. Mirrors the API:
 * explicit total marks, otherwise questions x marks per subject.
 */
export function resolveTotalMarks(
  totalMarks: number | null | undefined,
  subjects:
    | Array<{
        numberOfQuestions?: number | null;
        marksPerQuestion?: number | null;
      }>
    | undefined
): number | undefined {
  if (typeof totalMarks === "number" && Number.isFinite(totalMarks) && totalMarks > 0) {
    return totalMarks;
  }
  const sum = (subjects ?? []).reduce(
    (total, row) =>
      total + (row.numberOfQuestions ?? 0) * (row.marksPerQuestion ?? 0),
    0
  );
  return sum > 0 ? sum : undefined;
}

/** Stored cut-offs -> form values. */
export function cutoffsToValues(
  entries: CourseCutoffEntry[] | undefined
): Record<string, number> {
  const values: Record<string, number> = {};
  for (const entry of entries ?? []) {
    values[entry.offeringId] = entry.cutoffMarks;
  }
  return values;
}

/** Publish payload: only the courses the admin actually filled in. */
export function buildPublishCutoffs(
  values: CourseCutoffValues | undefined
): CourseCutoffEntry[] {
  return Object.entries(values ?? {})
    .filter((entry): entry is [string, number] => isUsable(entry[1]))
    .map(([offeringId, cutoffMarks]) => ({ offeringId, cutoffMarks }));
}

/**
 * Edit payload for a published paper: only what changed.
 * - new or different number -> set it
 * - had a number, now blank -> null (removes it)
 * Courses that are not on screen (e.g. deactivated) are never touched.
 */
export function buildCutoffPatch(
  initial: Record<string, number>,
  current: CourseCutoffValues,
  visibleOfferingIds: string[]
): CourseCutoffUpdate[] {
  const patch: CourseCutoffUpdate[] = [];
  for (const offeringId of visibleOfferingIds) {
    const before = initial[offeringId];
    const after = current[offeringId];
    if (isUsable(after)) {
      if (after !== before) patch.push({ offeringId, cutoffMarks: after });
    } else if (before !== undefined) {
      patch.push({ offeringId, cutoffMarks: null });
    }
  }
  return patch;
}
