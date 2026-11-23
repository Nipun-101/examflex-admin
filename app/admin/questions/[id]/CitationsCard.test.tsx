import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  QuestionCitation,
  QuestionCitations,
} from "@/app/services/ezprep-api";
import { CitationsCard } from "./CitationsCard";

vi.mock("@/app/services/ezprep-api", async () => {
  const actual = await vi.importActual<typeof import("@/app/services/ezprep-api")>(
    "@/app/services/ezprep-api"
  );
  return {
    ...actual,
    questionsApi: {
      getCitations: vi.fn(),
      searchCitations: vi.fn(),
      saveCitations: vi.fn(),
      refreshCitations: vi.fn(),
    },
  };
});

import { questionsApi } from "@/app/services/ezprep-api";

const getCitations = vi.mocked(questionsApi.getCitations);
const searchCitations = vi.mocked(questionsApi.searchCitations);
const saveCitations = vi.mocked(questionsApi.saveCitations);
const refreshCitations = vi.mocked(questionsApi.refreshCitations);

const chunk = (id: string, extra: Partial<QuestionCitation> = {}): QuestionCitation => ({
  chunkId: id,
  rank: 1,
  title: `Chunk ${id}`,
  content: `Content of ${id}`,
  sourceDoc: "LAWS_OF_MOTION.pdf",
  grade: "XI",
  pageStart: 3,
  ncertPageOffset: 48,
  pageNumber: 51,
  similarity: 0.72,
  ...extra,
});

const savedState = (
  citations: QuestionCitation[],
  status: QuestionCitations["citationStatus"] = "done"
): { message: string; data: QuestionCitations } => ({
  message: "ok",
  data: { citationStatus: status, citations, citationsUpdatedAt: null },
});

function keepBox(title: string) {
  return screen.getByRole("checkbox", { name: `Keep ${title}` });
}

beforeEach(() => {
  getCitations.mockReset();
  searchCitations.mockReset();
  saveCitations.mockReset();
  refreshCitations.mockReset();
  vi.spyOn(message, "error").mockImplementation(
    (() => undefined) as unknown as typeof message.error
  );
  vi.spyOn(message, "success").mockImplementation(
    (() => undefined) as unknown as typeof message.success
  );
  vi.spyOn(message, "warning").mockImplementation(
    (() => undefined) as unknown as typeof message.warning
  );
});

describe("CitationsCard", () => {
  it("shows saved citations with grade, printed page and status", async () => {
    getCitations.mockResolvedValue(
      savedState([
        chunk("a", { rank: 1, selectedBy: "auto" }),
        chunk("b", { rank: 2, pageNumber: 7, ncertPageOffset: undefined, selectedBy: "admin" }),
      ])
    );

    render(<CitationsCard questionId="q1" />);

    const list = await screen.findByRole("list", { name: "Saved citations" });
    expect(within(list).getByText("Chunk a")).toBeInTheDocument();
    expect(within(list).getAllByText("Class XI")).toHaveLength(2);
    expect(within(list).getByText("Page 51")).toBeInTheDocument();
    expect(within(list).getByText("PDF page 7")).toBeInTheDocument();
    expect(within(list).getByText("Admin pick")).toBeInTheDocument();
    expect(screen.getByText("done")).toBeInTheDocument();
    expect(getCitations).toHaveBeenCalledWith("q1");
  });

  it("shows an empty state when nothing is saved", async () => {
    getCitations.mockResolvedValue(savedState([], "skipped"));
    render(<CitationsCard questionId="q1" />);
    expect(await screen.findByText("No citations saved")).toBeInTheDocument();
    expect(screen.getByText("skipped")).toBeInTheDocument();
  });

  it("shows the top N, keeps applied chunks selected, reorders and applies", async () => {
    getCitations.mockResolvedValue(savedState([chunk("b", { rank: 1 })]));
    searchCitations.mockResolvedValue({
      message: "ok",
      data: {
        mapped: true,
        vectorSubjectKey: "physics",
        query: "what is inertia",
        results: [chunk("a"), chunk("b"), chunk("c")],
      },
    });
    saveCitations.mockResolvedValue(
      savedState([chunk("c", { rank: 1 }), chunk("b", { rank: 2 })])
    );

    render(<CitationsCard questionId="q1" />);
    await screen.findByRole("list", { name: "Saved citations" });

    const topN = screen.getByRole("spinbutton", { name: "Number of matches" });
    fireEvent.change(topN, { target: { value: "3" } });
    fireEvent.blur(topN);
    fireEvent.click(screen.getByRole("button", { name: /show top 3/i }));

    await screen.findByText(/Matched on: what is inertia/);
    expect(searchCitations).toHaveBeenCalledWith("q1", { limit: 3 });
    expect(keepBox("Chunk b")).toBeChecked();
    expect(keepBox("Chunk a")).not.toBeChecked();
    // Nothing changed yet, so Apply is disabled.
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();

    fireEvent.click(keepBox("Chunk c"));
    fireEvent.click(screen.getByRole("button", { name: "Move Chunk c up" }));
    expect(screen.getByText("2 of 2 selected")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() =>
      expect(saveCitations).toHaveBeenCalledWith("q1", ["c", "b"])
    );
    expect(message.success).toHaveBeenCalledWith("Applied 2 citations");
  });

  it("defaults to the first 2 matches when nothing is applied yet", async () => {
    getCitations.mockResolvedValue(savedState([], "skipped"));
    searchCitations.mockResolvedValue({
      message: "ok",
      data: {
        mapped: true,
        vectorSubjectKey: "physics",
        query: "q",
        results: ["a", "b", "c", "d"].map((id) => chunk(id)),
      },
    });
    saveCitations.mockResolvedValue(savedState([chunk("a"), chunk("b")]));

    render(<CitationsCard questionId="q1" />);
    await screen.findByText("No citations saved");
    fireEvent.click(screen.getByRole("button", { name: /show top/i }));
    await screen.findByText(/Matched on: q/);

    expect(keepBox("Chunk a")).toBeChecked();
    expect(keepBox("Chunk b")).toBeChecked();
    expect(keepBox("Chunk c")).not.toBeChecked();
    expect(keepBox("Chunk d")).not.toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() =>
      expect(saveCitations).toHaveBeenCalledWith("q1", ["a", "b"])
    );
  });

  it("can clear all citations", async () => {
    getCitations.mockResolvedValue(savedState([chunk("a")]));
    searchCitations.mockResolvedValue({
      message: "ok",
      data: { mapped: true, vectorSubjectKey: "physics", query: "q", results: [chunk("a")] },
    });
    saveCitations.mockResolvedValue(savedState([]));

    render(<CitationsCard questionId="q1" />);
    await screen.findByRole("list", { name: "Saved citations" });
    fireEvent.click(screen.getByRole("button", { name: /show top/i }));
    await screen.findByText(/Matched on: q/);

    fireEvent.click(keepBox("Chunk a"));
    fireEvent.click(screen.getByRole("button", { name: /clear citations/i }));

    await waitFor(() => expect(saveCitations).toHaveBeenCalledWith("q1", []));
    expect(message.success).toHaveBeenCalledWith("Citations cleared");
  });

  it("limits the selection to 2", async () => {
    getCitations.mockResolvedValue(savedState([]));
    const results = ["a", "b", "c", "d", "e", "f"].map((id) => chunk(id));
    searchCitations.mockResolvedValue({
      message: "ok",
      data: { mapped: true, vectorSubjectKey: "physics", query: "q", results },
    });

    render(<CitationsCard questionId="q1" />);
    await screen.findByText("No citations saved");
    fireEvent.click(screen.getByRole("button", { name: /show top/i }));
    await screen.findByText(/Matched on: q/);

    expect(screen.getByText("2 of 2 selected")).toBeInTheDocument();
    fireEvent.click(keepBox("Chunk f"));

    expect(keepBox("Chunk f")).not.toBeChecked();
    expect(screen.getByText("2 of 2 selected")).toBeInTheDocument();
    expect(message.warning).toHaveBeenCalled();
  });

  it("shows figures as separate thumbnails below the text", async () => {
    getCitations.mockResolvedValue(
      savedState([
        chunk("a", {
          images: ["https://cdn.example.com/fig-1.jpg", "javascript:alert(1)"],
        }),
      ])
    );

    render(<CitationsCard questionId="q1" />);

    const figures = await screen.findByTestId("citation-figures");
    const imgs = within(figures).getAllByRole("img");
    expect(imgs).toHaveLength(1);
    expect(imgs[0]).toHaveAttribute("src", "https://cdn.example.com/fig-1.jpg");
    expect(figures.closest("a, li")).not.toBeNull();
    // The figures are outside the clamped text box, so they never overlap it.
    expect(screen.getByTestId("citation-content")).not.toContainElement(figures);
  });

  it("explains an unmapped subject", async () => {
    getCitations.mockResolvedValue(savedState([], "skipped"));
    searchCitations.mockResolvedValue({
      message: "ok",
      data: { mapped: false, vectorSubjectKey: null, query: "q", results: [] },
    });

    render(<CitationsCard questionId="q1" />);
    await screen.findByText("No citations saved");
    fireEvent.click(screen.getByRole("button", { name: /show top/i }));

    expect(
      await screen.findByText("This question's subject has no NCERT mapping")
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("refreshes automatic citations", async () => {
    getCitations.mockResolvedValue(savedState([], "failed"));
    refreshCitations.mockResolvedValue(savedState([chunk("z", { selectedBy: "auto" })]));

    render(<CitationsCard questionId="q1" />);
    await screen.findByText("No citations saved");
    fireEvent.click(screen.getByRole("button", { name: /refresh auto/i }));

    expect(await screen.findByText("Chunk z")).toBeInTheDocument();
    expect(refreshCitations).toHaveBeenCalledWith("q1");
  });

  it("reports API errors", async () => {
    getCitations.mockRejectedValue(new Error("down"));
    searchCitations.mockRejectedValue(new Error("down"));

    render(<CitationsCard questionId="q1" />);
    await waitFor(() => expect(message.error).toHaveBeenCalledTimes(1));
    fireEvent.click(await screen.findByRole("button", { name: /show top/i }));
    await waitFor(() => expect(message.error).toHaveBeenCalledTimes(2));
  });
});
