import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RecommendationOffering } from "@/app/services/ezprep-api";
import type { CourseCutoffValues } from "./course-cutoffs";
import { CourseCutoffFields } from "./CourseCutoffFields";

vi.mock("@/app/services/ezprep-api", async () => {
  const actual = await vi.importActual<typeof import("@/app/services/ezprep-api")>(
    "@/app/services/ezprep-api"
  );
  return {
    ...actual,
    recommendationsApi: { list: vi.fn() },
  };
});

import { recommendationsApi } from "@/app/services/ezprep-api";

const list = vi.mocked(recommendationsApi.list);

const course = (id: string, title: string, extra: Partial<RecommendationOffering> = {}) =>
  ({
    id,
    title,
    exam: { id: "e1", name: "NEET UG" },
    kind: "COURSE",
    sortOrder: 0,
    isActive: true,
    ...extra,
  }) as RecommendationOffering;

function Harness(props: {
  initial?: CourseCutoffValues;
  totalMarks?: number;
  readOnly?: boolean;
  onValue?: (value: CourseCutoffValues) => void;
  onCoursesLoaded?: (ids: string[]) => void;
}) {
  const [value, setValue] = useState<CourseCutoffValues>(props.initial ?? {});
  return (
    <CourseCutoffFields
      examId="e1"
      totalMarks={props.totalMarks}
      value={value}
      readOnly={props.readOnly}
      onCoursesLoaded={props.onCoursesLoaded}
      onChange={(next) => {
        setValue(next);
        props.onValue?.(next);
      }}
    />
  );
}

describe("CourseCutoffFields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads active COURSE offerings for the exam and shows one optional input each", async () => {
    list.mockResolvedValue({
      data: [course("m", "MBBS", { subtitle: "Medicine" }), course("b", "BDS")],
      pagination: {},
    } as never);
    const onCoursesLoaded = vi.fn();

    render(<Harness totalMarks={720} onCoursesLoaded={onCoursesLoaded} />);

    expect(await screen.findByLabelText("MBBS cut-off")).toBeInTheDocument();
    expect(screen.getByLabelText("BDS cut-off")).toBeInTheDocument();
    expect(screen.getByText("Medicine")).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText("Optional")).toHaveLength(2);
    expect(screen.getAllByText("/ 720")).toHaveLength(2);
    expect(list).toHaveBeenCalledWith({
      examId: "e1",
      kind: "COURSE",
      activeOnly: true,
      limit: 100,
    });
    expect(onCoursesLoaded).toHaveBeenCalledWith(["m", "b"]);
  });

  it("does not trigger antd's deprecated addonAfter warning", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    list.mockResolvedValue({ data: [course("m", "MBBS")], pagination: {} } as never);
    render(<Harness totalMarks={720} />);
    await screen.findByLabelText("MBBS cut-off");
    const messages = errors.mock.calls.map((call) => String(call[0]));
    expect(messages.some((m) => m.includes("addonAfter"))).toBe(false);
    expect(screen.getByText("/ 720")).toBeInTheDocument();
    errors.mockRestore();
  });

  it("reports typed values keyed by course and keeps the other courses", async () => {
    list.mockResolvedValue({
      data: [course("m", "MBBS"), course("b", "BDS")],
      pagination: {},
    } as never);
    const onValue = vi.fn();
    render(<Harness totalMarks={720} initial={{ b: 570 }} onValue={onValue} />);

    const mbbs = await screen.findByLabelText("MBBS cut-off");
    fireEvent.change(mbbs, { target: { value: "620" } });
    expect(onValue).toHaveBeenLastCalledWith({ b: 570, m: 620 });

    fireEvent.change(mbbs, { target: { value: "" } });
    expect(onValue).toHaveBeenLastCalledWith({ b: 570, m: null });
  });

  it("shows existing values in the inputs", async () => {
    list.mockResolvedValue({ data: [course("m", "MBBS")], pagination: {} } as never);
    render(<Harness totalMarks={720} initial={{ m: 600 }} />);
    expect(await screen.findByLabelText("MBBS cut-off")).toHaveValue("600");
  });

  it("uses a generic 'marks' suffix when the paper total is unknown", async () => {
    list.mockResolvedValue({ data: [course("m", "MBBS")], pagination: {} } as never);
    render(<Harness />);
    await screen.findByLabelText("MBBS cut-off");
    expect(screen.getByText("marks")).toBeInTheDocument();
  });

  it("renders read-only text with 'Not set' for blank courses", async () => {
    list.mockResolvedValue({
      data: [course("m", "MBBS"), course("b", "BDS")],
      pagination: {},
    } as never);
    render(<Harness readOnly totalMarks={720} initial={{ m: 620 }} />);

    expect(await screen.findByText("620 / 720")).toBeInTheDocument();
    expect(screen.getByText("Not set")).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });

  it("read-only without a total omits the suffix", async () => {
    list.mockResolvedValue({ data: [course("m", "MBBS")], pagination: {} } as never);
    render(<Harness readOnly initial={{ m: 620 }} />);
    expect(await screen.findByText("620")).toBeInTheDocument();
  });

  it("explains how to add courses when the exam has none", async () => {
    list.mockResolvedValue({ data: [], pagination: {} } as never);
    render(<Harness totalMarks={720} />);
    expect(
      await screen.findByText("No courses are set up for this exam yet.")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Recommendations" })).toHaveAttribute(
      "href",
      "/admin/recommendations"
    );
  });

  it("treats a missing data array as no courses", async () => {
    list.mockResolvedValue({ pagination: {} } as never);
    render(<Harness />);
    expect(
      await screen.findByText("No courses are set up for this exam yet.")
    ).toBeInTheDocument();
  });

  it("shows an error with a retry that reloads the list", async () => {
    list.mockRejectedValueOnce(new Error("boom"));
    list.mockResolvedValueOnce({
      data: [course("m", "MBBS")],
      pagination: {},
    } as never);
    render(<Harness totalMarks={720} />);

    expect(await screen.findByText(/boom|Failed to load courses/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByLabelText("MBBS cut-off")).toBeInTheDocument();
    expect(list).toHaveBeenCalledTimes(2);
  });

  it("does not call the API without an exam", async () => {
    render(
      <CourseCutoffFields examId={undefined} value={{}} onChange={() => {}} />
    );
    await waitFor(() =>
      expect(
        screen.getByText("No courses are set up for this exam yet.")
      ).toBeInTheDocument()
    );
    expect(list).not.toHaveBeenCalled();
  });
});
