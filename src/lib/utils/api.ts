import "server-only";
import { getCloudflareConfig } from "@/lib/ai/cloudflare";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function success(imageUrl: string) {
  return Response.json(
    { success: true, data: { imageUrl } },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export function failure(error: unknown) {
  const safe =
    error instanceof ApiError
      ? error
      : new ApiError(
          500,
          "INTERNAL_ERROR",
          "An unexpected server error occurred.",
        );
  return Response.json(
    { success: false, error: { code: safe.code, message: safe.message } },
    { status: safe.status, headers: { "Cache-Control": "no-store" } },
  );
}

export function checkGenerationAccess(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    throw new ApiError(
      403,
      "FORBIDDEN_ORIGIN",
      "This request must come from the application origin.",
    );
  }
  getCloudflareConfig();
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_PAID_GENERATION !== "true"
  ) {
    throw new ApiError(
      503,
      "GENERATION_DISABLED",
      "Generation is disabled on this deployment.",
    );
  }
}

/** Enforce limits while reading, including requests without Content-Length. */
export async function readBoundedBody(
  request: Request,
  limit: number,
): Promise<Uint8Array<ArrayBuffer>> {
  const length = request.headers.get("content-length");
  if (length && Number(length) > limit)
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", "The request is too large.");
  if (!request.body)
    throw new ApiError(400, "INVALID_REQUEST", "The request body is missing.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new ApiError(
          413,
          "PAYLOAD_TOO_LARGE",
          "The request is too large.",
        );
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      400,
      "INVALID_REQUEST",
      "The request body could not be read.",
    );
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}
