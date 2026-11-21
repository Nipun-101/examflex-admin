import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RecommendationOffering } from "@/app/services/ezprep-api";
import { CourseCutoffsCard } from "./CourseCutoffsCard";

vi.mock("@/app/services/ezprep-api", async () => {
  const actual = await vi.importActual<typeof import("@/app/services/ezprep-api")>(
    "@/app/services/ezprep-api"
  );
  return { ...actual, recommendationsApi: { list: vi.fn() } };
});

vi.mock("./api", async () => {
  const actual = await vi.importActual<typeof import("./api")>("./api");
  return {
    ...actual,
    fullMockApi: { updateCourseCutoffs: vi.fn() },
  };
});

import { recommendationsApi } from "@/app/services/ezprep-api";
import { fullMockApi } from "./api";

const list = vi.mocked(recommendationsApi.list);
const update = vi.mocked(fullMockApi.updateCourseCutoffs);

const course = (id: string, title: string) =>
  ({
    id,
    title,
    exam: { id: "ex-1", name: "NEET UG" },
    kind: "COURSE",
    sortOrder: 0,
    isActive: true,
  }) as RecommendationOffering;

type CardTest = Parameters<typeof CourseCutoffsCard>[0]["test"];

const baseTest: CardTest = {
  id: "fm-1",
  exam: { id: "ex-1", name: "NEET UG" },
  totalMarks: 720,
  subjectConfig: [],
  courseCutoffs: [{ offeringId: "m", cutoffMarks: 620 }],
};

function renderCard(
  test: Partial<CardTest> = {},
  onSaved = vi.fn()
) {
  render(<CourseCutoffsCard test={{ ...baseTest, ...test }} onSaved={onSaved} />);
  return onSaved;
}

describe("CourseCutoffsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    list.mockResolvedValue({
      data: [course("m", "MBBS"), course("b", "BDS")],
      pagination: {},
    } as never);
    vi.spyOn(message, "success").mockImplementation(
      (() => undefined) as unknown as typeof message.success
    );
    vi.spyOn(message, "error").mockImplementation(
      (() => undefined) as unknown as typeof message.error
    );
    vi.spyOn(message, "info").mockImplementation(
      (() => undefined) as unknown as typeof message.info
    );
  });

  it("shows saved cut-offs read-only, with the paper total", async () => {
    renderCard();
    expect(await screen.findByText("620 / 720")).toBeInTheDocument();
    expect(screen.getByText("Not set")).toBeInTheDocument();
    expect(screen.getByText(/out of 720/)).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit cut-offs" })).toBeInTheDocument();
  });

  it("derives the total from the subjects when the paper has none", async () => {
    renderCard({
      totalMarks: undefined,
      subjectConfig: [
        {
          subject: "s1",
          name: "Bio",
          numberOfQuestions: 10,
          marksPerQuestion: 4,
          hasNegativeMarking: false,
          negativeMarksPerQuestion: 0,
          questionStartIndex: 0,
          questionEndIndex: 9,
        },
      ],
    });
    expect(await screen.findByText("620 / 40")).toBeInTheDocument();
  });

  it("saves only the changed cut-offs and reports the new list", async () => {
    update.mockResolvedValue({
      message: "Course cut-offs updated successfully",
      data: {
        courseCutoffs: [
          { offeringId: "m", cutoffMarks: 610 },
          { offeringId: "b", cutoffMarks: 560 },
        ],
      },
    } as never);
    const onSaved = renderCard();

    fireEvent.click(await screen.findByRole("button", { name: "Edit cut-offs" }));
    fireEvent.change(await screen.findByLabelText("MBBS cut-off"), {
      target: { value: "610" },
    });
    fireEvent.change(screen.getByLabelText("BDS cut-off"), {
      target: { value: "560" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save cut-offs" }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith("fm-1", [
        { offeringId: "m", cutoffMarks: 610 },
        { offeringId: "b", cutoffMarks: 560 },
      ])
    );
    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith([
        { offeringId: "m", cutoffMarks: 610 },
        { offeringId: "b", cutoffMarks: 560 },
      ])
    );
    expect(message.success).toHaveBeenCalled();
    // back to read-only
    expect(await screen.findByRole("button", { name: "Edit cut-offs" })).toBeInTheDocument();
  });

  it("clearing an input sends null for that course", async () => {
    update.mockResolvedValue({ message: "ok", data: { courseCutoffs: [] } } as never);
    const onSaved = renderCard();
    fireEvent.click(await screen.findByRole("button", { name: "Edit cut-offs" }));
    fireEvent.change(await screen.findByLabelText("MBBS cut-off"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save cut-offs" }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith("fm-1", [
        { offeringId: "m", cutoffMarks: null },
      ])
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith([]));
  });

  it("does not call the API when nothing changed", async () => {
    renderCard();
    fireEvent.click(await screen.findByRole("button", { name: "Edit cut-offs" }));
    await screen.findByLabelText("MBBS cut-off");
    fireEvent.click(screen.getByRole("button", { name: "Save cut-offs" }));
    expect(update).not.toHaveBeenCalled();
    expect(message.info).toHaveBeenCalledWith("No changes to save");
    expect(await screen.findByRole("button", { name: "Edit cut-offs" })).toBeInTheDocument();
  });

  it("cancel discards edits", async () => {
    renderCard();
    fireEvent.click(await screen.findByRole("button", { name: "Edit cut-offs" }));
    fireEvent.change(await screen.findByLabelText("MBBS cut-off"), {
      target: { value: "500" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(update).not.toHaveBeenCalled();
    expect(await screen.findByText("620 / 720")).toBeInTheDocument();

    // re-opening starts from the saved values, not the discarded edit
    fireEvent.click(screen.getByRole("button", { name: "Edit cut-offs" }));
    expect(await screen.findByLabelText("MBBS cut-off")).toHaveValue("620");
  });

  it("keeps editing and shows the error when saving fails", async () => {
    update.mockRejectedValue(new Error("nope"));
    const onSaved = renderCard();
    fireEvent.click(await screen.findByRole("button", { name: "Edit cut-offs" }));
    fireEvent.change(await screen.findByLabelText("MBBS cut-off"), {
      target: { value: "615" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save cut-offs" }));

    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(onSaved).not.toHaveBeenCalled();
    // still in edit mode with the typed value (the button may briefly show a spinner)
    expect(
      await screen.findByRole("button", { name: /save cut-offs/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("MBBS cut-off")).toHaveValue("615");
  });

  it("uses the server message when none is returned", async () => {
    update.mockResolvedValue({ data: { courseCutoffs: undefined } } as never);
    const onSaved = renderCard({ courseCutoffs: undefined });
    fireEvent.click(await screen.findByRole("button", { name: "Edit cut-offs" }));
    fireEvent.change(await screen.findByLabelText("BDS cut-off"), {
      target: { value: "400" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save cut-offs" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith([]));
    expect(message.success).toHaveBeenCalledWith("Course cut-offs updated");
  });
});
