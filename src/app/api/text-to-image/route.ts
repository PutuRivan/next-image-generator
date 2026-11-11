import { generateImage } from "@/lib/ai/generate";
import {
  ApiError,
  checkGenerationAccess,
  failure,
  readBoundedBody,
  success,
} from "@/lib/utils/api";
import {
  MAX_JSON_BYTES,
  textRequestSchema,
} from "@/lib/validations/generation";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    checkGenerationAccess(request);
    if (
      request.headers
        .get("content-type")
        ?.split(";")[0]
        .trim()
        .toLowerCase() !== "application/json"
    )
      throw new ApiError(
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        "Send an application/json request.",
      );
    const bytes = await readBoundedBody(request, MAX_JSON_BYTES);
    let body: unknown;
    try {
      body = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      );
    } catch {
      throw new ApiError(
        400,
        "INVALID_JSON",
        "The request body must be valid JSON.",
      );
    }
    const parsed = textRequestSchema.safeParse(body);
    if (!parsed.success)
      throw new ApiError(
        400,
        "INVALID_REQUEST",
        "Provide a prompt between 1 and 1000 characters.",
      );
    return success(await generateImage(parsed.data.prompt));
  } catch (error) {
    return failure(error);
  }
}
