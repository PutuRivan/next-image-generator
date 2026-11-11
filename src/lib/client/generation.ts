export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export function validateImageFile(file: File): string | null {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    return "Choose a JPG, PNG, or WebP image.";
  if (file.size === 0) return "The selected image is empty.";
  if (file.size > MAX_IMAGE_BYTES) return "Choose an image smaller than 3 MiB.";
  return null;
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
export async function parseGenerationResponse(
  response: Response,
): Promise<string> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    if (response.ok) throw new Error("The server returned an invalid result.");
    throw new Error(
      response.status === 413
        ? "Request failed (HTTP 413). Try a smaller image."
        : `Request failed (HTTP ${response.status}). Please try again later.`,
    );
  }
  if (!response.ok || (record(payload) && payload.success === false)) {
    if (
      record(payload) &&
      record(payload.error) &&
      typeof payload.error.message === "string"
    )
      throw new Error(payload.error.message);
    throw new Error(
      `Request failed (HTTP ${response.status}). Please try again later.`,
    );
  }
  if (
    !record(payload) ||
    payload.success !== true ||
    !record(payload.data) ||
    typeof payload.data.imageUrl !== "string"
  )
    throw new Error("The server returned an invalid result.");
  if (
    !/^data:image\/jpeg;base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      payload.data.imageUrl,
    ) ||
    payload.data.imageUrl.length < 28 ||
    payload.data.imageUrl.length > 4 * 1024 * 1024 + 100
  )
    throw new Error("The server returned an invalid result.");
  return payload.data.imageUrl;
}
