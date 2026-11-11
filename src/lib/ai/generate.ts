import "server-only";
import { generateImage as sdkGenerateImage } from "ai";
import sharp from "sharp";
import { z } from "zod";
import { ApiError } from "@/lib/utils/api";
import { MAX_IMAGE_PIXELS } from "@/lib/validations/generation";
import { getCloudflare, getCloudflareConfig } from "./cloudflare";

export const PROVIDER_DEADLINE_MS = 110_000;
const MAX_OUTPUT_BYTES = 3 * 1024 * 1024;
const editResult = z.object({
  success: z.literal(true),
  result: z.object({
    image: z
      .string()
      .min(4)
      .max((MAX_OUTPUT_BYTES * 4) / 3)
      .regex(
        /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/,
      ),
  }),
});

function invalidOutput() {
  return new ApiError(
    502,
    "INVALID_PROVIDER_RESPONSE",
    "The image service returned an invalid result.",
  );
}

function providerFailure(status?: number, data?: unknown): ApiError {
  const envelope = z
    .object({ errors: z.array(z.object({ code: z.number() })).optional() })
    .safeParse(data);
  const codes = envelope.success
    ? (envelope.data.errors?.map((e) => e.code) ?? [])
    : [];
  if (status === 429 || codes.includes(3036))
    return new ApiError(
      429,
      "QUOTA_EXCEEDED",
      "Cloudflare quota or rate limit reached. Check your daily allocation and try again later.",
    );
  if (
    status === 408 ||
    status === 504 ||
    codes.includes(3007) ||
    codes.includes(3008)
  )
    return new ApiError(
      504,
      "GENERATION_TIMEOUT",
      "Cloudflare generation timed out. Check usage before retrying.",
    );
  if (status === 401 || status === 403)
    return new ApiError(
      503,
      "PROVIDER_AUTH_FAILED",
      "Cloudflare access is unavailable. Ask the operator to check the account, token permissions, and model access.",
    );
  return new ApiError(
    502,
    "GENERATION_FAILED",
    "Image generation failed. Check Cloudflare availability before trying again.",
  );
}

/** Normalize verified bytes, strip metadata, and bound the base64 response for serverless hosts. */
async function normalize(bytes: Uint8Array): Promise<string> {
  if (!bytes.length || bytes.length > MAX_OUTPUT_BYTES) throw invalidOutput();
  try {
    const decoder = sharp(bytes, {
      limitInputPixels: MAX_IMAGE_PIXELS,
      failOn: "warning",
    });
    const meta = await decoder.metadata();
    if (
      !["jpeg", "png", "webp"].includes(meta.format ?? "") ||
      (meta.pages ?? 1) > 1
    )
      throw invalidOutput();
    const jpeg = await decoder
      .rotate()
      .resize({
        width: 1024,
        height: 1024,
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: "white" })
      .jpeg({ quality: 90 })
      .toBuffer();
    if (jpeg.length > MAX_OUTPUT_BYTES) throw invalidOutput();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    throw invalidOutput();
  }
}

async function edit(
  prompt: string,
  file: File,
  signal: AbortSignal,
): Promise<Uint8Array> {
  const { accountId, apiToken, imageToImageModel } = getCloudflareConfig();
  // Cloudflare's Klein reference inputs must be smaller than 512x512.
  // Decode all accepted formats to PNG; strip metadata and normalize orientation.
  const source = await sharp(Buffer.from(await file.arrayBuffer()), {
    limitInputPixels: MAX_IMAGE_PIXELS,
    failOn: "warning",
  })
    .rotate()
    .resize({
      width: 511,
      height: 511,
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();
  signal.throwIfAborted();
  const form = new FormData();
  form.set("prompt", prompt);
  form.set("width", "1024");
  form.set("height", "1024");
  form.set(
    "input_image_0",
    new Blob([new Uint8Array(source)], { type: "image/png" }),
    "reference.png",
  );
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${imageToImageModel}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiToken}` },
      body: form,
      signal,
      redirect: "error",
    },
  );
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    if (!response.ok) throw providerFailure(response.status);
    throw invalidOutput();
  }
  if (!response.ok) throw providerFailure(response.status, data);
  const parsed = editResult.safeParse(data);
  if (!parsed.success) {
    if (
      data &&
      typeof data === "object" &&
      "success" in data &&
      data.success === false
    )
      throw providerFailure(response.status, data);
    throw invalidOutput();
  }
  return Buffer.from(parsed.data.result.image, "base64");
}

/** Both routes use this service; only editing needs the multipart REST adapter. */
export async function generateImage(
  prompt: string,
  image?: { file: File },
): Promise<string> {
  const { textToImageModel } = getCloudflareConfig();
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const operation = async () => {
    const bytes = image
      ? await edit(prompt, image.file, controller.signal)
      : (
        await sdkGenerateImage({
          model: getCloudflare().image(textToImageModel),
          prompt,
          n: 1,
          maxRetries: 0,
          abortSignal: controller.signal,
        })
      ).image.uint8Array;
    return normalize(bytes);
  };
  try {
    return await Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new ApiError(
              504,
              "GENERATION_TIMEOUT",
              "Generation took too long. Check your Cloudflare usage before retrying; cancellation may not stop inference.",
            ),
          );
          controller.abort();
        }, PROVIDER_DEADLINE_MS);
      }),
    ]);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const parsed = z
      .object({
        status: z.number().optional(),
        statusCode: z.number().optional(),
        data: z.unknown().optional(),
      })
      .safeParse(error);
    throw providerFailure(
      parsed.success
        ? (parsed.data.status ?? parsed.data.statusCode)
        : undefined,
      parsed.success ? parsed.data.data : undefined,
    );
  } finally {
    if (timer) clearTimeout(timer);
  }
}
