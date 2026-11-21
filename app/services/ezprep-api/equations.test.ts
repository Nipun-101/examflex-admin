import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./browser-client", () => ({
  ezPrepApiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import { ezPrepApiClient } from "./browser-client";
import { equationsApi, type EquationPayload } from "./equations";

const image = {
  key: "admin-images/a.png",
  bucket: "examflex-images",
  region: "ap-south-1",
};

const base: EquationPayload = {
  title: "Force",
  shortDescription: "cue",
  equation: "$$F=ma$$",
  subject: "s1",
  topic: "t1",
  exams: ["e1"],
};

describe("equationsApi image field", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ezPrepApiClient.post).mockResolvedValue({ data: {} });
    vi.mocked(ezPrepApiClient.patch).mockResolvedValue({ data: {} });
  });

  it("creates with an image", async () => {
    await equationsApi.create({ ...base, image });
    expect(ezPrepApiClient.post).toHaveBeenCalledWith(
      "/v1/equation-book",
      expect.objectContaining({ image })
    );
  });

  it("creates without an image and does not send an image key", async () => {
    await equationsApi.create({ ...base, image: null });
    const body = vi.mocked(ezPrepApiClient.post).mock.calls[0]![1] as Record<
      string,
      unknown
    >;
    expect(body).not.toHaveProperty("image");
    await equationsApi.create(base);
    expect(
      vi.mocked(ezPrepApiClient.post).mock.calls[1]![1] as Record<string, unknown>
    ).not.toHaveProperty("image");
  });

  it("updates with new metadata, with null to remove, and without it to keep", async () => {
    await equationsApi.update("1", { image });
    await equationsApi.update("1", { image: null });
    await equationsApi.update("1", { title: "Renamed" });

    const bodies = vi
      .mocked(ezPrepApiClient.patch)
      .mock.calls.map((call) => call[1] as Record<string, unknown>);
    expect(bodies[0]).toEqual({ image });
    expect(bodies[1]).toEqual({ image: null }); // explicit removal survives
    expect(bodies[2]).toEqual({ title: "Renamed" }); // untouched
    expect(bodies[2]).not.toHaveProperty("image");
  });
});
