import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EditRecommendationPage from "./page";

const { push, router } = vi.hoisted(() => {
  const push = vi.fn();
  return { push, router: { push } };
});

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useParams: () => ({ id: "off-1" }),
}));

vi.mock("@/app/services/ezprep-api", async () => {
  const actual = await vi.importActual<typeof import("@/app/services/ezprep-api")>(
    "@/app/services/ezprep-api"
  );
  return {
    ...actual,
    catalogApi: { listAllExams: vi.fn() },
    recommendationsApi: { get: vi.fn(), update: vi.fn() },
  };
});

const setFieldsValue = vi.fn();

vi.mock("../offering-form", () => ({
  OfferingForm: (props: {
    title: string;
    form: { setFieldsValue: (v: unknown) => void };
    onSubmit: (values: unknown) => void;
  }) => {
    // Capture what the page loads into the form
    props.form.setFieldsValue = (values: unknown) => {
      setFieldsValue(values);
    };
    return (
      <div>
        <h1>{props.title}</h1>
        <button
          onClick={() =>
            props.onSubmit({
              exam: "e1",
              title: "MBBS (renamed)",
              sortOrder: 3,
              isActive: false,
            })
          }
        >
          save
        </button>
      </div>
    );
  },
}));

import { catalogApi, recommendationsApi } from "@/app/services/ezprep-api";

const offering = {
  id: "off-1",
  exam: { id: "e1", name: "NEET UG" },
  kind: "COURSE",
  title: "MBBS",
  subtitle: "Medicine",
  description: "d",
  minPercent: 75,
  comfortPercent: 85,
  sortOrder: 1,
  isActive: true,
};

describe("EditRecommendationPage", () => {
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
    vi.mocked(recommendationsApi.get).mockResolvedValue({ data: offering } as never);
  });

  it("does not load legacy percent values into the form", async () => {
    render(<EditRecommendationPage />);
    expect(await screen.findByText("Edit course pathway")).toBeInTheDocument();
    await waitFor(() => expect(recommendationsApi.get).toHaveBeenCalledWith("off-1"));
    expect(recommendationsApi.get).toHaveBeenCalledTimes(1);
  });

  it("updates without sending percent fields, so stored legacy values stay untouched", async () => {
    vi.mocked(recommendationsApi.update).mockResolvedValue({ data: {} } as never);
    render(<EditRecommendationPage />);
    fireEvent.click(await screen.findByText("save"));

    await waitFor(() => expect(recommendationsApi.update).toHaveBeenCalled());
    const [id, payload] = vi.mocked(recommendationsApi.update).mock.calls[0];
    expect(id).toBe("off-1");
    expect(payload).toMatchObject({
      exam: "e1",
      title: "MBBS (renamed)",
      sortOrder: 3,
      isActive: false,
    });
    expect(payload).not.toHaveProperty("minPercent");
    expect(payload).not.toHaveProperty("comfortPercent");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/recommendations"));
  });

  it("shows an error when saving fails", async () => {
    vi.mocked(recommendationsApi.update).mockRejectedValue(new Error("nope"));
    render(<EditRecommendationPage />);
    fireEvent.click(await screen.findByText("save"));
    await waitFor(() => expect(message.error).toHaveBeenCalled());
    expect(push).not.toHaveBeenCalled();
  });

  it("shows an error when the course cannot be loaded", async () => {
    vi.mocked(recommendationsApi.get).mockRejectedValue(new Error("missing"));
    render(<EditRecommendationPage />);
    await waitFor(() => expect(message.error).toHaveBeenCalled());
  });

  it("goes back to the list", async () => {
    render(<EditRecommendationPage />);
    fireEvent.click(await screen.findByText("Back to recommendations"));
    expect(push).toHaveBeenCalledWith("/admin/recommendations");
  });
});
