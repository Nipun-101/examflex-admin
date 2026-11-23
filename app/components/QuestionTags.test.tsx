import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  QuestionTags,
  questionTagColor,
  questionTagsColumn,
} from "./QuestionTags";

describe("QuestionTags", () => {
  it("shows No Tags when a question has none", () => {
    render(<QuestionTags />);
    expect(screen.getByText("No Tags")).toBeInTheDocument();
  });

  it("gives each tag name its own stable color", () => {
    render(<QuestionTags tags={["Scales", "Projection", "Scales"]} />);
    expect(screen.getByText("Scales")).toBeInTheDocument();
    expect(screen.getByText("Projection")).toBeInTheDocument();
    expect(screen.getAllByText("Scales")).toHaveLength(1);
    expect(questionTagColor("Scales")).toBe(questionTagColor("Scales"));
    expect(questionTagColor("Scales")).not.toBe(questionTagColor("Projection"));
    expect(questionTagColor("A")).not.toBe(questionTagColor("B"));
  });

  it("does not clip tag names unless asked to", () => {
    render(<QuestionTags tags={["A very long tag name indeed"]} />);
    expect(screen.getByText("A very long tag name indeed")).not.toHaveClass(
      "truncate"
    );
  });

  it("clips long tag names and shows the full name on hover when truncating", async () => {
    render(<QuestionTags tags={["A very long tag name indeed"]} truncate />);
    const chip = screen.getByText("A very long tag name indeed");
    expect(chip).toHaveClass("truncate", "max-w-[10rem]");
    fireEvent.mouseEnter(chip);
    expect(await screen.findByRole("tooltip")).toHaveTextContent(
      "A very long tag name indeed"
    );
  });

  it("keeps the 'No Tags' fallback when truncating", () => {
    render(<QuestionTags truncate />);
    expect(screen.getByText("No Tags")).toBeInTheDocument();
  });

  it("builds the column with or without truncation", () => {
    const plain = questionTagsColumn();
    const clipped = questionTagsColumn({ truncate: true });
    expect(plain.key).toBe("tags");
    render(<>{plain.render(["Scales"])}</>);
    expect(screen.getByText("Scales")).not.toHaveClass("truncate");
    render(<>{clipped.render(["Projection"])}</>);
    expect(screen.getByText("Projection")).toHaveClass("truncate");
  });
});
