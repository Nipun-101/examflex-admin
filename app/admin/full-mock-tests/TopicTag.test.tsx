import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TopicTag } from "./TopicTag";

const LONG = "Electrostatics, Current Electricity and Magnetic Effects of Current";

describe("TopicTag", () => {
  it("clips the name inside its cell instead of widening the row", () => {
    render(<TopicTag name={LONG} />);
    const tag = screen.getByText(LONG);
    expect(tag).toHaveClass("truncate", "max-w-[10rem]");
  });

  it("shows the full name on hover", async () => {
    render(<TopicTag name={LONG} />);
    fireEvent.mouseEnter(screen.getByText(LONG));
    expect(await screen.findByRole("tooltip")).toHaveTextContent(LONG);
  });

  it("renders short names unchanged", () => {
    render(<TopicTag name="Optics" />);
    expect(screen.getByText("Optics")).toBeInTheDocument();
  });
});
