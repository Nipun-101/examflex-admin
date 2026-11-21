import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreateRecommendationPage from "./page";

const { push, router } = vi.hoisted(() => {
  const push = vi.fn();
  return { push, router: { push } };
});

vi.mock("next/navigation", () => ({ useRouter: () => router }));

vi.mock("@/app/services/ezprep-api", async () => {
  const actual = await vi.importActual<typeof import("@/app/services/ezprep-api")>(
    "@/app/services/ezprep-api"
  );
  return {
    ...actual,
    catalogApi: { listAllExams: vi.fn() },
    recommendationsApi: { create: vi.fn() },
  };
});

// The form itself is covered in offering-form.test.tsx; here we check what the page sends.
vi.mock("../offering-form", () => ({
  OfferingForm: (props: {
    title: string;
    examOptions: Array<{ value: string; label: string }>;
    onSubmit: (values: unknown) => void;
  }) => (
    <div>
      <h1>{props.title}</h1>
      <span data-testid="exams">
        {props.examOptions.map((o) => o.label).join(",")}
      </span>
      <button
        onClick={() =>
          props.onSubmit({
            exam: "e1",
            title: "MBBS",
            subtitle: "Medicine",
            description: "d",
            sortOrder: 2,
          })
        }
      >
        submit
      </button>
    </div>
  ),
}));

import { catalogApi, recommendationsApi } from "@/app/services/ezprep-api";

describe("CreateRecommendationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(message, "success").mockImplementation(
      (() => undefined) as unknown as typeof message.success
    );
    vi.spyOn(message, "error").mockImplementation(
      (() => undefined) as unknown as typeof message.error
    );
    vi.mocked(catalogApi.listAllExams).mockResolvedValue([
      { id: "e1", name: "NEET UG" },
    ] as never);
  });

  it("loads exams and creates a course without any percent thresholds", async () => {
    vi.mocked(recommendationsApi.create).mockResolvedValue({ data: {} } as never);
    render(<CreateRecommendationPage />);

    expect(await screen.findByText("Add course pathway")).toBeInTheDocument();
    expect(screen.getByTestId("exams")).toHaveTextContent("NEET UG");

    fireEvent.click(screen.getByText("submit"));
    await waitFor(() => expect(recommendationsApi.create).toHaveBeenCalled());
    const payload = vi.mocked(recommendationsApi.create).mock.calls[0][0];
    expect(payload).toEqual({
      exam: "e1",
      kind: "COURSE",
      title: "MBBS",
      subtitle: "Medicine",
      description: "d",
      sortOrder: 2,
    });
    expect(payload).not.toHaveProperty("minPercent");
    expect(payload).not.toHaveProperty("comfortPercent");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/recommendations"));
  });

  it("shows an error and stays when creating fails", async () => {
    vi.mocked(recommendationsApi.create).mockRejectedValue(new Error("nope"));
    render(<CreateRecommendationPage />);
    fireEvent.click(await screen.findByText("submit"));
    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(push).not.toHaveBeenCalled();
  });

  it("reports a failure to load exams", async () => {
    vi.mocked(catalogApi.listAllExams).mockRejectedValue(new Error("down"));
    render(<CreateRecommendationPage />);
    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });

  it("goes back to the list", async () => {
    render(<CreateRecommendationPage />);
    fireEvent.click(await screen.findByText("Back to recommendations"));
    expect(push).toHaveBeenCalledWith("/admin/recommendations");
  });
});
