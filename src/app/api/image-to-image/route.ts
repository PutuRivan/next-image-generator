import { generateImage } from "@/lib/ai/generate";
import {
  ApiError,
  checkGenerationAccess,
  failure,
  readBoundedBody,
  success,
} from "@/lib/utils/api";
import {
  imageFieldsSchema,
  MAX_MULTIPART_BYTES,
} from "@/lib/validations/generation";
import { validateImage } from "@/lib/validations/image";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    checkGenerationAccess(request);
    const contentType = request.headers.get("content-type") ?? "";
    if (
      contentType.split(";")[0].trim().toLowerCase() !== "multipart/form-data"
    )
      throw new ApiError(
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        "Send a multipart/form-data request.",
      );
    const bytes = await readBoundedBody(request, MAX_MULTIPART_BYTES);
    let form: FormData;
    try {
      form = await new Response(bytes, {
        headers: { "content-type": contentType },
      }).formData();
    } catch {
      throw new ApiError(
        400,
        "INVALID_FORM_DATA",
        "The request body must be valid multipart form data.",
      );
    }
    if (
      [...form.keys()].some((key) => !["prompt", "image"].includes(key)) ||
      ["prompt", "image"].some((key) => form.getAll(key).length > 1)
    )
      throw new ApiError(
        400,
        "INVALID_REQUEST",
        "The form contains unsupported or duplicate fields.",
      );
    const parsed = imageFieldsSchema.safeParse({
      prompt: form.get("prompt"),
    });
    if (!parsed.success)
      throw new ApiError(
        400,
        "INVALID_REQUEST",
        "Provide a prompt between 1 and 1000 characters.",
      );
    const file = await validateImage(form.get("image"));
    return success(
      await generateImage(parsed.data.prompt, {
        file,
      }),
    );
  } catch (error) {
    return failure(error);
  }
}
