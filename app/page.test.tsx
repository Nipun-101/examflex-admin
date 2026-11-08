import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("renders the ExamFlex landing brand, headline, and sign-in link", () => {
    render(<Home />);

    expect(screen.getByText("ExamFlex")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: "Staff console for the question bank and papers.",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Manage catalog, uploads, and mock tests from one place/
      )
    ).toBeInTheDocument();

    const signIn = screen.getByRole("link", { name: /sign in to admin/i });
    expect(signIn).toHaveAttribute("href", "/login");
  });
});
