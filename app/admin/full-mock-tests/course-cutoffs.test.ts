import { describe, expect, it } from "vitest";
import {
  buildCutoffPatch,
  buildPublishCutoffs,
  cutoffsToValues,
  resolveTotalMarks,
} from "./course-cutoffs";

describe("resolveTotalMarks", () => {
  it("prefers an explicit total", () => {
    expect(resolveTotalMarks(720, [{ numberOfQuestions: 1, marksPerQuestion: 1 }])).toBe(720);
  });

  it("falls back to questions x marks per subject", () => {
    expect(
      resolveTotalMarks(undefined, [
        { numberOfQuestions: 45, marksPerQuestion: 4 },
        { numberOfQuestions: 5, marksPerQuestion: 2 },
      ])
    ).toBe(190);
    expect(resolveTotalMarks(0, [{ numberOfQuestions: 10, marksPerQuestion: 3 }])).toBe(30);
    expect(resolveTotalMarks(null, [{ numberOfQuestions: 10, marksPerQuestion: 3 }])).toBe(30);
  });

  it("is undefined when nothing can be derived", () => {
    expect(resolveTotalMarks(undefined, undefined)).toBeUndefined();
    expect(resolveTotalMarks(undefined, [])).toBeUndefined();
    expect(resolveTotalMarks(Number.NaN, [{}])).toBeUndefined();
  });
});

describe("cutoffsToValues", () => {
  it("maps stored entries by offering id", () => {
    expect(
      cutoffsToValues([
        { offeringId: "a", cutoffMarks: 620 },
        { offeringId: "b", cutoffMarks: 570 },
      ])
    ).toEqual({ a: 620, b: 570 });
  });

  it("handles missing data", () => {
    expect(cutoffsToValues(undefined)).toEqual({});
    expect(cutoffsToValues([])).toEqual({});
  });
});

describe("buildPublishCutoffs", () => {
  it("keeps only filled, positive, finite numbers", () => {
    expect(
      buildPublishCutoffs({
        a: 620,
        b: null,
        c: undefined,
        d: 0,
        e: -5,
        f: Number.NaN,
        g: 0.5,
      })
    ).toEqual([
      { offeringId: "a", cutoffMarks: 620 },
      { offeringId: "g", cutoffMarks: 0.5 },
    ]);
  });

  it("is empty when nothing was entered", () => {
    expect(buildPublishCutoffs(undefined)).toEqual([]);
    expect(buildPublishCutoffs({})).toEqual([]);
  });
});

describe("buildCutoffPatch", () => {
  const visible = ["a", "b", "c"];

  it("sends only what changed", () => {
    expect(
      buildCutoffPatch({ a: 600, b: 500 }, { a: 600, b: 510, c: 400 }, visible)
    ).toEqual([
      { offeringId: "b", cutoffMarks: 510 },
      { offeringId: "c", cutoffMarks: 400 },
    ]);
  });

  it("sends null to remove a cut-off that was cleared", () => {
    expect(buildCutoffPatch({ a: 600 }, { a: null }, visible)).toEqual([
      { offeringId: "a", cutoffMarks: null },
    ]);
    expect(buildCutoffPatch({ a: 600 }, {}, visible)).toEqual([
      { offeringId: "a", cutoffMarks: null },
    ]);
  });

  it("treats zero / invalid input as cleared", () => {
    expect(buildCutoffPatch({ a: 600 }, { a: 0 }, visible)).toEqual([
      { offeringId: "a", cutoffMarks: null },
    ]);
  });

  it("sends nothing when nothing changed", () => {
    expect(buildCutoffPatch({ a: 600 }, { a: 600 }, visible)).toEqual([]);
    expect(buildCutoffPatch({}, {}, visible)).toEqual([]);
  });

  it("never touches courses that are not on screen (e.g. deactivated)", () => {
    expect(buildCutoffPatch({ gone: 450 }, { a: 100 }, visible)).toEqual([
      { offeringId: "a", cutoffMarks: 100 },
    ]);
  });
});
