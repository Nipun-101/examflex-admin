import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExamGeneratePanel, defaultSplit } from "./ExamGeneratePanel";
import type { FullMockExamListItem } from "./types";

const exam: FullMockExamListItem = {
  id: "ex-1",
  examName: "NEET",
  subjects: ["Physics", "Biology"],
  subjectDetails: [
    { subjectId: "s-phy", name: "Physics", numberOfQuestions: 10 },
    { subjectId: "s-bio", name: "Biology", numberOfQuestions: 8 },
  ],
  mode: "Mixed",
};

function setup(
  overrides: Partial<React.ComponentProps<typeof ExamGeneratePanel>> = {},
) {
  const onGenerate = vi.fn();
  render(
    <ExamGeneratePanel
      exam={exam}
      generating={false}
      disabled={false}
      error={null}
      onGenerate={onGenerate}
      {...overrides}
    />,
  );
  return { onGenerate };
}

describe("defaultSplit", () => {
  it("splits evenly and gives the remainder to medium then hard", () => {
    expect(defaultSplit(9)).toEqual({ easy: 3, medium: 3, hard: 3 });
    expect(defaultSplit(10)).toEqual({ easy: 3, medium: 3, hard: 4 });
    expect(defaultSplit(8)).toEqual({ easy: 2, medium: 3, hard: 3 });
    expect(defaultSplit(0)).toEqual({ easy: 0, medium: 0, hard: 0 });
  });
});

describe("ExamGeneratePanel", () => {
  it("renders a slider per difficulty for every subject with valid totals", () => {
    setup();
    expect(screen.getAllByRole("slider")).toHaveLength(6);
    expect(screen.getByText("Physics")).toBeInTheDocument();
    expect(screen.getByText("Biology")).toBeInTheDocument();
    expect(screen.getByText("Total: 10 / 10")).toBeInTheDocument();
    expect(screen.getByText("Total: 8 / 8")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /generate draft/i }),
    ).toBeEnabled();
  });

  it("generates with the default per-subject split", () => {
    const { onGenerate } = setup();
    fireEvent.click(screen.getByRole("button", { name: /generate draft/i }));
    expect(onGenerate).toHaveBeenCalledWith([
      { subjectId: "s-phy", easy: 3, medium: 3, hard: 4 },
      { subjectId: "s-bio", easy: 2, medium: 3, hard: 3 },
    ]);
  });

  it("blocks generation and flags the subject when a total is off", () => {
    const { onGenerate } = setup();
    const [easy] = screen.getAllByRole("slider");
    fireEvent.keyDown(easy, { key: "ArrowRight", keyCode: 39 });

    expect(
      screen.getByText(/Total: 11 \/ 10 — Must equal 10/),
    ).toBeInTheDocument();
    const button = screen.getByRole("button", { name: /generate draft/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onGenerate).not.toHaveBeenCalled();
    // the other subject is untouched
    expect(screen.getByText("Total: 8 / 8")).toBeInTheDocument();
  });

  it("sends the edited counts", () => {
    const { onGenerate } = setup();
    const [easy, medium] = screen.getAllByRole("slider");
    fireEvent.keyDown(easy, { key: "ArrowRight", keyCode: 39 });
    fireEvent.keyDown(medium, { key: "ArrowLeft", keyCode: 37 });
    fireEvent.click(screen.getByRole("button", { name: /generate draft/i }));
    expect(onGenerate).toHaveBeenCalledWith([
      { subjectId: "s-phy", easy: 4, medium: 2, hard: 4 },
      { subjectId: "s-bio", easy: 2, medium: 3, hard: 3 },
    ]);
  });

  it("shows each server problem as its own line", () => {
    setup({
      error: {
        summary: "Not enough questions for the chosen difficulty split",
        lines: [
          "Physics – hard: need 4, only 1 available",
          "Biology – easy: need 2, only 0 available",
        ],
      },
    });
    expect(
      screen.getByText("Not enough questions for the chosen difficulty split"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Physics – hard: need 4, only 1 available"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Biology – easy: need 2, only 0 available"),
    ).toBeInTheDocument();
  });

  it("disables generating while another generation runs", () => {
    setup({ disabled: true });
    expect(
      screen.getByRole("button", { name: /generate draft/i }),
    ).toBeDisabled();
  });

  it("falls back to automatic sampling when subject details are missing", () => {
    const { onGenerate } = setup({
      exam: { ...exam, subjectDetails: undefined },
    });
    expect(screen.queryAllByRole("slider")).toHaveLength(0);
    expect(screen.getByText(/sampled automatically/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /generate draft/i }));
    expect(onGenerate).toHaveBeenCalledWith(undefined);
  });
});
