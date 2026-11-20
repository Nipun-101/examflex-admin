import { beforeEach, describe, expect, it, vi } from "vitest";
import { ezPrepApiClient } from "./browser-client";
import { counselingApi } from "./counseling";

vi.mock("./browser-client", () => ({
  ezPrepApiClient: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

const get = vi.mocked(ezPrepApiClient.get);
const patch = vi.mocked(ezPrepApiClient.patch);

describe("counselingApi", () => {
  beforeEach(() => {
    get.mockReset();
    patch.mockReset();
    get.mockResolvedValue({ data: [] });
    patch.mockResolvedValue({ data: {} });
  });

  it("lists counseling requests with page, limit, and status", async () => {
    await counselingApi.list({ page: 2, limit: 24, status: "booked" });
    expect(get).toHaveBeenCalledWith("/v1/admin/counseling", {
      searchParams: { page: 2, limit: 24, status: "booked" },
    });
  });

  it("omits status when listing without a filter", async () => {
    await counselingApi.list({ page: 1, limit: 12 });
    expect(get).toHaveBeenCalledWith("/v1/admin/counseling", {
      searchParams: { page: 1, limit: 12 },
    });
  });

  it("patches status for a request", async () => {
    await counselingApi.updateStatus("req-1", "acknowledged");
    expect(patch).toHaveBeenCalledWith("/v1/admin/counseling/req-1/status", {
      status: "acknowledged",
    });
  });
});
