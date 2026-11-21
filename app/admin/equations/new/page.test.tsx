import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreateEquationPage from "./page";

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
    catalogApi: { listSubjects: vi.fn(), listAllExams: vi.fn() },
    equationsApi: { create: vi.fn() },
  };
});

const IMAGE = {
  key: "admin-images/a.png",
  bucket: "examflex-images",
  region: "ap-south-1",
  contentType: "image/png",
  size: 10,
};

let submitted: Record<string, unknown> = {};

// The form is covered in equation-form.test.tsx; here we check what the page sends.
vi.mock("../equation-form", () => ({
  EquationForm: (props: { onSubmit: (values: unknown) => Promise<void> }) => (
    <button onClick={() => void props.onSubmit(submitted)}>save</button>
  ),
}));

import { catalogApi, equationsApi } from "@/app/services/ezprep-api";

const base = {
  title: "Force",
  shortDescription: "cue",
  equation: "$$F=ma$$",
  bulletPoints: ["  keep  ", "   "],
  subject: "s1",
  topic: "t1",
  exams: ["e1"],
};

describe("CreateEquationPage image", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(message, "success").mockImplementation(
      (() => undefined) as unknown as typeof message.success
    );
    vi.spyOn(message, "error").mockImplementation(
      (() => undefined) as unknown as typeof message.error
    );
    vi.mocked(catalogApi.listSubjects).mockResolvedValue({ data: [] } as never);
    vi.mocked(catalogApi.listAllExams).mockResolvedValue([] as never);
    vi.mocked(equationsApi.create).mockResolvedValue({ data: {} } as never);
  });

  it("sends the uploaded image with the equation", async () => {
    submitted = { ...base, image: IMAGE };
    render(<CreateEquationPage />);
    fireEvent.click(await screen.findByText("save"));
    await waitFor(() => expect(equationsApi.create).toHaveBeenCalled());
    const payload = vi.mocked(equationsApi.create).mock.calls[0]![0];
    expect(payload.image).toEqual(IMAGE);
    expect(payload.bulletPoints).toEqual(["  keep  "]); // existing cleanup unchanged
  });

  it("omits the image when none was uploaded", async () => {
    submitted = { ...base };
    render(<CreateEquationPage />);
    fireEvent.click(await screen.findByText("save"));
    await waitFor(() => expect(equationsApi.create).toHaveBeenCalled());
    expect(vi.mocked(equationsApi.create).mock.calls[0]![0]).not.toHaveProperty(
      "image"
    );
  });

  it("ignores malformed image values instead of sending them", async () => {
    submitted = { ...base, image: { key: "", bucket: "b" } };
    render(<CreateEquationPage />);
    fireEvent.click(await screen.findByText("save"));
    await waitFor(() => expect(equationsApi.create).toHaveBeenCalled());
    expect(vi.mocked(equationsApi.create).mock.calls[0]![0]).not.toHaveProperty(
      "image"
    );
  });
});
