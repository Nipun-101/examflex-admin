import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OverflowChips, TruncatedChip } from "./OverflowChips";

function mockClipped(clipped: boolean) {
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(clipped ? 300 : 80);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(100);
}

describe("OverflowChips", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the empty fallback when there are no items", () => {
    render(<OverflowChips items={[]} noun="tags" empty={<span>No tags</span>} />);
    expect(screen.getByText("No tags")).toBeInTheDocument();
  });

  it("shows only the first item when there is one", () => {
    render(<OverflowChips items={["NEET UG"]} noun="exams" empty={null} />);
    expect(screen.getByText("NEET UG")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("lists the remaining items in the +N tooltip on hover", async () => {
    render(
      <OverflowChips items={["Endocrine", "PYQ", "Revision"]} noun="tags" empty={null} />
    );

    const more = screen.getByRole("button", { name: "2 more tags: PYQ, Revision" });
    expect(more).toHaveTextContent("+2");

    fireEvent.mouseEnter(more);
    expect(await screen.findByText("PYQ")).toBeInTheDocument();
    expect(screen.getByText("Revision")).toBeInTheDocument();
  });
});

describe("TruncatedChip", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the full label on hover when the text is clipped", async () => {
    mockClipped(true);
    const label = "Chemical Coordination and Integration in Humans";
    render(<TruncatedChip label={label} />);

    fireEvent.mouseEnter(screen.getByTestId("chip"));
    expect(await screen.findByRole("tooltip")).toHaveTextContent(label);
  });

  it("skips the tooltip when the label fits", async () => {
    mockClipped(false);
    render(<TruncatedChip label="Zoology" />);

    fireEvent.mouseEnter(screen.getByTestId("chip"));
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
