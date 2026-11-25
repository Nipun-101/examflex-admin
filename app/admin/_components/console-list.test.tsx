import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ListFooter } from "./console-list";

describe("ListFooter", () => {
  it("shows the visible range and pages forward and back", () => {
    const onPageChange = vi.fn();
    render(
      <ListFooter
        page={2}
        pageSize={10}
        total={25}
        shownCount={10}
        noun="orders"
        onPageChange={onPageChange}
      />
    );

    expect(screen.getByText("Showing 11–20 of 25 orders")).toBeInTheDocument();
    expect(screen.getByText(/Page 2/)).toHaveTextContent("Page 2 of 3");

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
  });

  it("disables both buttons on a single empty page", () => {
    render(
      <ListFooter
        page={1}
        pageSize={10}
        total={0}
        shownCount={0}
        noun="uploads"
        onPageChange={vi.fn()}
      />
    );

    expect(screen.getByText("No uploads to show")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });
});
