import { useState, useEffect } from "react";
import { EzPrepApiError, filesApi } from "@/app/services/ezprep-api";

interface S3ObjectMetadata {
  key: string;
  bucket: string;
  region?: string;
  contentType?: string;
  size?: number;
  lastModified?: string | Date;
}

/**
 * Imported images that were never uploaded to S3 keep a placeholder bucket and
 * an `external` region (their picture lives at the source URL). The API refuses
 * to sign those, so we do not ask.
 */
const PLACEHOLDER_BUCKETS = new Set(["mathpix-import-pending"]);

export function isSignableImage(
  metadata: Pick<S3ObjectMetadata, "key" | "bucket" | "region"> | null | undefined
): boolean {
  if (!metadata?.key || !metadata.bucket) return false;
  if (PLACEHOLDER_BUCKETS.has(metadata.bucket)) return false;
  if (metadata.region === "external") return false;
  return true;
}

/** The API said "no" cleanly (bad bucket / key, or no such object). */
function isExpectedRefusal(error: unknown): error is EzPrepApiError {
  return (
    error instanceof EzPrepApiError &&
    (error.status === 400 || error.status === 404)
  );
}

export function usePresignedUrl(metadata: S3ObjectMetadata | null) {
  const [url, setUrl] = useState<string | null>(null);
  const [urlKey, setUrlKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const metadataKey = metadata?.key ?? null;

  useEffect(() => {
    let mounted = true;
    let refreshTimeout: NodeJS.Timeout;

    const refreshUrl = async () => {
      if (!metadata || !isSignableImage(metadata)) {
        if (mounted) {
          setUrl(null);
          setUrlKey(null);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        const { data } = await filesApi.signedUrl(metadata.key, metadata.bucket);
        const newUrl = data.url;

        if (mounted) {
          setUrl(newUrl);
          setUrlKey(metadata.key);
          // Schedule next refresh for 45 minutes (75% of the 1-hour expiry)
          refreshTimeout = setTimeout(refreshUrl, 45 * 60 * 1000);
        }
      } catch (error) {
        if (isExpectedRefusal(error)) {
          // Nothing the page can do about it, so no error overlay; keep the
          // detail so the bad record is easy to find.
          console.warn(
            `Image preview unavailable (${error.message}): ${metadata.bucket}/${metadata.key}`
          );
        } else {
          console.error("Error refreshing signed URL:", error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    refreshUrl();

    return () => {
      mounted = false;
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
    };
  }, [metadata?.key, metadata?.bucket]);

  return {
    url: urlKey === metadataKey ? url : null,
    loading,
  };
}
