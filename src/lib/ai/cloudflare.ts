import "server-only";
import { createAI } from "agents/models/ai-sdk";
import { z } from "zod";
import { ApiError } from "@/lib/utils/api";

const modelId = z
  .string()
  .trim()
  .regex(/^@cf\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/)
  .refine((value) => !value.endsWith("/.") && !value.endsWith("/.."))
  .transform((value) => value as `@cf/${string}`);

const configuration = z.object({
  textToImageModel: modelId.default("@cf/black-forest-labs/flux-1-schnell"),
  imageToImageModel: modelId.default("@cf/black-forest-labs/flux-2-klein-9b"),
  accountId: z
    .string()
    .trim()
    .regex(/^[a-f\d]{32}$/i),
  apiToken: z
    .string()
    .trim()
    .min(1)
    .refine((token) => !/[\r\n]/.test(token)),
});

export function getCloudflareConfig() {
  const result = configuration.safeParse({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
    textToImageModel: process.env.CLOUDFLARE_TEXT_TO_IMAGE_MODEL,
    imageToImageModel: process.env.CLOUDFLARE_IMAGE_TO_IMAGE_MODEL,
  });
  if (!result.success)
    throw new ApiError(
      503,
      "MISSING_CONFIGURATION",
      "Generation is unavailable. Check the Cloudflare credentials and model IDs in the server environment.",
    );
  return result.data;
}

// Lazy initialization permits builds without credentials and server-only validation.
export function getCloudflare() {
  const { accountId, apiToken } = getCloudflareConfig();
  return createAI({ accountId, apiToken });
}
