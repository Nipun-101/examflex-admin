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
import { recommendationsApi } from "./recommendations";

describe("recommendationsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists with search params", async () => {
    vi.mocked(ezPrepApiClient.get).mockResolvedValue({
      data: [],
      pagination: { total: 0 },
    });
    await recommendationsApi.list({ examId: "e1", page: 1, limit: 20 });
    expect(ezPrepApiClient.get).toHaveBeenCalledWith("/v1/recommendations", {
      searchParams: { examId: "e1", page: 1, limit: 20 },
    });
  });

  it("creates and updates offerings", async () => {
    vi.mocked(ezPrepApiClient.post).mockResolvedValue({ data: { id: "1" } });
    vi.mocked(ezPrepApiClient.patch).mockResolvedValue({ data: { id: "1" } });
    await recommendationsApi.create({
      exam: "e1",
      title: "MBBS",
      minPercent: 75,
    });
    await recommendationsApi.update("1", { title: "BDS" });
    expect(ezPrepApiClient.post).toHaveBeenCalled();
    expect(ezPrepApiClient.patch).toHaveBeenCalledWith(
      "/v1/recommendations/1",
      expect.objectContaining({ title: "BDS" })
    );
  });

  it("gets and deletes by id", async () => {
    vi.mocked(ezPrepApiClient.get).mockResolvedValue({ data: { id: "1" } });
    vi.mocked(ezPrepApiClient.delete).mockResolvedValue({ data: { id: "1" } });
    await recommendationsApi.get("1");
    await recommendationsApi.delete("1");
    expect(ezPrepApiClient.get).toHaveBeenCalledWith("/v1/recommendations/1");
    expect(ezPrepApiClient.delete).toHaveBeenCalledWith(
      "/v1/recommendations/1"
    );
  });
});
