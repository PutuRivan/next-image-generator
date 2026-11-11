import "server-only";
import sharp from "sharp";
import { ApiError } from "@/lib/utils/api";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_BYTES,
  MAX_IMAGE_PIXELS,
} from "./generation";

export async function validateImage(
  file: FormDataEntryValue | null,
): Promise<File> {
  if (!(file instanceof File) || file.size === 0)
    throw new ApiError(
      400,
      "INVALID_IMAGE",
      "Choose a non-empty source image.",
    );
  if (file.size > MAX_FILE_BYTES)
    throw new ApiError(
      413,
      "FILE_TOO_LARGE",
      "Choose an image no larger than 3 MiB.",
    );
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type))
    throw new ApiError(400, "UNSUPPORTED_IMAGE", "Use JPG, PNG, or WebP.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const detectedType = bytes
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ? "image/png"
    : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      ? "image/jpeg"
      : bytes.toString("ascii", 0, 4) === "RIFF" &&
          bytes.toString("ascii", 8, 12) === "WEBP"
        ? "image/webp"
        : undefined;
  if (detectedType !== file.type)
    throw new ApiError(
      400,
      "UNSUPPORTED_IMAGE",
      "The image contents do not match the selected file type.",
    );
  try {
    const image = sharp(bytes, {
      limitInputPixels: MAX_IMAGE_PIXELS,
      failOn: "warning",
    });
    const meta = await image.metadata();
    if (
      !meta.width ||
      !meta.height ||
      meta.width * meta.height > MAX_IMAGE_PIXELS ||
      (meta.pages ?? 1) > 1
    )
      throw new Error("Unsupported dimensions or animation");
    // Decode the full image; metadata alone accepts some truncated images.
    await image.stats();
  } catch {
    throw new ApiError(
      400,
      "INVALID_IMAGE",
      "Use a valid, non-animated image up to 16 megapixels.",
    );
  }
  return file;
}
