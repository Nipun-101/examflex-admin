import { describe, expect, it } from "vitest";
import { isEquationFormReady } from "./equation-form-ready";

const valid = {
  title: "Net force",
  shortDescription: "Cue",
  equation: "$$F=ma$$",
  subject: "subj-1",
  topic: "topic-1",
  exams: ["exam-1"],
};

describe("isEquationFormReady", () => {
  it("returns false for empty or incomplete values", () => {
    expect(isEquationFormReady(undefined)).toBe(false);
    expect(isEquationFormReady({})).toBe(false);
    expect(isEquationFormReady({ ...valid, title: "  " })).toBe(false);
    expect(isEquationFormReady({ ...valid, exams: [] })).toBe(false);
    expect(isEquationFormReady({ ...valid, topic: undefined })).toBe(false);
  });

  it("returns true when required fields are filled", () => {
    expect(isEquationFormReady(valid)).toBe(true);
    expect(isEquationFormReady({ ...valid, bulletPoints: [] })).toBe(true);
    expect(
      isEquationFormReady({ ...valid, bulletPoints: ["remember direction"] })
    ).toBe(true);
  });

  it("returns false when an added bullet is blank", () => {
    expect(isEquationFormReady({ ...valid, bulletPoints: [""] })).toBe(false);
    expect(
      isEquationFormReady({ ...valid, bulletPoints: ["ok", "  "] })
    ).toBe(false);
  });
});
