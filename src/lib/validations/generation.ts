import { z } from "zod";

export const MAX_FILE_BYTES = 3 * 1024 * 1024;
export const MAX_MULTIPART_BYTES = MAX_FILE_BYTES + 64 * 1024;
export const MAX_JSON_BYTES = 16 * 1024;
export const MAX_IMAGE_PIXELS = 16_000_000;
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

// Use UTF-16 length to match textarea maxLength and the client-side counter.
export const promptSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => value.length <= 1000);
export const textRequestSchema = z.strictObject({ prompt: promptSchema });
export const imageFieldsSchema = z.strictObject({
  prompt: promptSchema,
});
