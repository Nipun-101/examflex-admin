import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EzPrepApiError, filesApi } from "@/app/services/ezprep-api";
import { isSignableImage, usePresignedUrl } from "./usePresignedUrl";

vi.mock("@/app/services/ezprep-api", async () => {
  const actual = await vi.importActual<typeof import("@/app/services/ezprep-api")>(
    "@/app/services/ezprep-api"
  );
  return {
    ...actual,
    filesApi: {
      ...actual.filesApi,
      signedUrl: vi.fn(),
    },
  };
});

const signedUrl = vi.mocked(filesApi.signedUrl);
type SignedUrlResponse = Awaited<ReturnType<typeof filesApi.signedUrl>>;

describe("usePresignedUrl", () => {
  beforeEach(() => {
    signedUrl.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returns a null url when metadata is missing", async () => {
    const { result } = renderHook(() => usePresignedUrl(null));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.url).toBeNull();
    expect(signedUrl).not.toHaveBeenCalled();
  });

  it("returns the signed url on success", async () => {
    signedUrl.mockResolvedValue({
      message: "ok",
      data: { url: "https://cdn.example/a.png" },
    });

    const { result } = renderHook(() =>
      usePresignedUrl({ key: "a.png", bucket: "media" })
    );

    await waitFor(() =>
      expect(result.current.url).toBe("https://cdn.example/a.png")
    );
    expect(result.current.loading).toBe(false);
    expect(signedUrl).toHaveBeenCalledWith("a.png", "media");
  });

  it("clears loading after an error and leaves the url null", async () => {
    signedUrl.mockRejectedValue(new Error("nope"));

    const { result } = renderHook(() =>
      usePresignedUrl({ key: "a.png", bucket: "media" })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.url).toBeNull();
    expect(console.error).toHaveBeenCalled();
  });

  it("hides a stale url when the metadata key changes", async () => {
    signedUrl.mockResolvedValueOnce({
      message: "ok",
      data: { url: "https://cdn.example/old.png" },
    });

    const { result, rerender } = renderHook(
      ({ metadata }) => usePresignedUrl(metadata),
      {
        initialProps: {
          metadata: { key: "old.png", bucket: "media" },
        },
      }
    );

    await waitFor(() =>
      expect(result.current.url).toBe("https://cdn.example/old.png")
    );

    let resolveNext: ((value: SignedUrlResponse) => void) | undefined;
    signedUrl.mockReturnValueOnce(
      new Promise<SignedUrlResponse>((resolve) => {
        resolveNext = resolve;
      })
    );

    rerender({ metadata: { key: "new.png", bucket: "media" } });

    await waitFor(() => expect(result.current.url).toBeNull());

    await act(async () => {
      resolveNext?.({
        message: "ok",
        data: { url: "https://cdn.example/new.png" },
      });
    });

    await waitFor(() =>
      expect(result.current.url).toBe("https://cdn.example/new.png")
    );
  });

  it("does not apply a signed url after unmount", async () => {
    let resolveSigned: ((value: SignedUrlResponse) => void) | undefined;
    signedUrl.mockReturnValue(
      new Promise<SignedUrlResponse>((resolve) => {
        resolveSigned = resolve;
      })
    );

    const { unmount } = renderHook(() =>
      usePresignedUrl({ key: "a.png", bucket: "media" })
    );

    unmount();

    await act(async () => {
      resolveSigned?.({
        message: "ok",
        data: { url: "https://cdn.example/a.png" },
      });
    });

    expect(signedUrl).toHaveBeenCalled();
  });

  describe("images that cannot be signed", () => {
    beforeEach(() => {
      vi.mocked(console.error).mockClear();
    });

    it("does not ask the API to sign an import placeholder bucket", async () => {
      const { result } = renderHook(() =>
        usePresignedUrl({ key: "question-imports/u/a.png", bucket: "mathpix-import-pending" })
      );
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.url).toBeNull();
      expect(signedUrl).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
    });

    it("does not ask the API to sign externally hosted images", async () => {
      const { result } = renderHook(() =>
        usePresignedUrl({ key: "a.png", bucket: "media", region: "external" })
      );
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.url).toBeNull();
      expect(signedUrl).not.toHaveBeenCalled();
    });

    it("recognises signable and unsignable metadata", () => {
      expect(isSignableImage({ key: "a.png", bucket: "media" })).toBe(true);
      expect(isSignableImage({ key: "a.png", bucket: "media", region: "ap-south-1" })).toBe(true);
      expect(isSignableImage({ key: "", bucket: "media" })).toBe(false);
      expect(isSignableImage({ key: "a.png", bucket: "" })).toBe(false);
      expect(isSignableImage({ key: "a.png", bucket: "mathpix-import-pending" })).toBe(false);
      expect(isSignableImage({ key: "a.png", bucket: "media", region: "external" })).toBe(false);
      expect(isSignableImage(null)).toBe(false);
      expect(isSignableImage(undefined)).toBe(false);
    });
  });

  describe("when the API refuses to sign", () => {
    beforeEach(() => {
      vi.mocked(console.error).mockClear();
      vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.mocked(console.warn).mockClear();
    });

    it.each([
      [400, "Bucket is not allowed"],
      [404, "Object not found"],
    ])("warns (not errors) on a clean %s refusal and shows no image", async (status, message) => {
      signedUrl.mockRejectedValue(
        new EzPrepApiError(message, status, "/v1/files/signed-url", {})
      );
      const { result } = renderHook(() =>
        usePresignedUrl({ key: "admin-images/a.png", bucket: "other-bucket" })
      );
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.url).toBeNull();
      expect(console.error).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining(`${message}): other-bucket/admin-images/a.png`)
      );
    });

    it.each([401, 403, 500, 502])(
      "still reports a %s as an error (not an expected refusal)",
      async (status) => {
        signedUrl.mockRejectedValue(
          new EzPrepApiError("boom", status, "/v1/files/signed-url", {})
        );
        const { result } = renderHook(() =>
          usePresignedUrl({ key: "a.png", bucket: "media" })
        );
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(console.error).toHaveBeenCalled();
        expect(console.warn).not.toHaveBeenCalled();
      }
    );
  });
});

