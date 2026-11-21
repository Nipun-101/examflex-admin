import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { message } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EditEquationPage from "./page";

const { push, router } = vi.hoisted(() => {
  const push = vi.fn();
  return { push, router: { push } };
});
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    use: (value: unknown) => {
      if (value && typeof value === "object" && "then" in value) {
        return (value as { value?: { id: string } }).value ?? { id: "eq-1" };
      }
      return actual.use(value as never);
    },
  };
});

vi.mock("@/app/services/ezprep-api", async () => {
  const actual = await vi.importActual<typeof import("@/app/services/ezprep-api")>(
    "@/app/services/ezprep-api"
  );
  return {
    ...actual,
    catalogApi: { listSubjects: vi.fn(), listAllExams: vi.fn() },
    equationsApi: { get: vi.fn(), update: vi.fn() },
  };
});

const loaded: Record<string, unknown> = {};
let submitted: Record<string, unknown> = {};

vi.mock("../equation-form", () => ({
  EquationForm: (props: {
    form: { setFieldsValue: (v: Record<string, unknown>) => void };
    onSubmit: (values: unknown) => Promise<void>;
  }) => {
    // capture what the page loads into the form
    props.form.setFieldsValue = (values) => {
      Object.assign(loaded, values);
    };
    return <button onClick={() => void props.onSubmit(submitted)}>save</button>;
  },
}));

import { catalogApi, equationsApi } from "@/app/services/ezprep-api";

const IMAGE = {
  key: "admin-images/old.png",
  bucket: "examflex-images",
  region: "ap-south-1",
};
const NEW_IMAGE = { ...IMAGE, key: "admin-images/new.png" };

const base = {
  title: "Force",
  shortDescription: "cue",
  equation: "$$F=ma$$",
  bulletPoints: [],
  subject: "s1",
  topic: "t1",
  exams: ["e1"],
};

function stored(extra: Record<string, unknown> = {}) {
  return {
    data: {
      id: "eq-1",
      ...base,
      subject: { id: "s1", name: "Physics" },
      topic: { id: "t1", name: "Laws" },
      exams: [{ id: "e1", name: "NEET" }],
      isActive: true,
      ...extra,
    },
  };
}

function paramsPromise() {
  const value = { id: "eq-1" };
  return {
    status: "fulfilled" as const,
    value,
    then(onFulfilled?: (v: { id: string }) => unknown) {
      return Promise.resolve(onFulfilled ? onFulfilled(value) : value);
    },
  } as unknown as Promise<{ id: string }>;
}

async function renderAndSave() {
  render(<EditEquationPage params={paramsPromise()} />);
  fireEvent.click(await screen.findByText("save"));
  await waitFor(() => expect(equationsApi.update).toHaveBeenCalled());
  return vi.mocked(equationsApi.update).mock.calls[0]![1];
}

describe("EditEquationPage image", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(loaded)) delete loaded[key];
    vi.spyOn(message, "success").mockImplementation(
      (() => undefined) as unknown as typeof message.success
    );
    vi.spyOn(message, "error").mockImplementation(
      (() => undefined) as unknown as typeof message.error
    );
    vi.mocked(catalogApi.listSubjects).mockResolvedValue({ data: [] } as never);
    vi.mocked(catalogApi.listAllExams).mockResolvedValue([] as never);
    vi.mocked(equationsApi.update).mockResolvedValue({ data: {} } as never);
  });

  it("loads the saved image into the form so it is shown and kept", async () => {
    vi.mocked(equationsApi.get).mockResolvedValue(
      stored({ image: IMAGE, imageUrl: "https://signed/x" }) as never
    );
    render(<EditEquationPage params={paramsPromise()} />);
    await screen.findByText("save");
    await waitFor(() => expect(loaded.image).toEqual(IMAGE));
  });

  it("loads no image for an equation that has none", async () => {
    vi.mocked(equationsApi.get).mockResolvedValue(stored() as never);
    render(<EditEquationPage params={paramsPromise()} />);
    await screen.findByText("save");
    await waitFor(() => expect(loaded).toHaveProperty("title"));
    expect(loaded.image).toBeUndefined();
  });

  it("keeps the image when the admin saves without touching it", async () => {
    vi.mocked(equationsApi.get).mockResolvedValue(stored({ image: IMAGE }) as never);
    submitted = { ...base, image: IMAGE };
    const payload = await renderAndSave();
    expect(payload.image).toEqual(IMAGE);
  });

  it("sends the replacement when a new image was uploaded", async () => {
    vi.mocked(equationsApi.get).mockResolvedValue(stored({ image: IMAGE }) as never);
    submitted = { ...base, image: NEW_IMAGE };
    const payload = await renderAndSave();
    expect(payload.image).toEqual(NEW_IMAGE);
  });

  it("sends null to remove the image when the admin removed it", async () => {
    vi.mocked(equationsApi.get).mockResolvedValue(stored({ image: IMAGE }) as never);
    submitted = { ...base }; // image cleared in the form
    const payload = await renderAndSave();
    expect(payload).toHaveProperty("image", null);
  });

  it("leaves the image out entirely for an equation that never had one", async () => {
    vi.mocked(equationsApi.get).mockResolvedValue(stored() as never);
    submitted = { ...base };
    const payload = await renderAndSave();
    expect(payload).not.toHaveProperty("image");
  });

  it("adds an image to an equation that had none", async () => {
    vi.mocked(equationsApi.get).mockResolvedValue(stored() as never);
    submitted = { ...base, image: NEW_IMAGE };
    const payload = await renderAndSave();
    expect(payload.image).toEqual(NEW_IMAGE);
  });
});
