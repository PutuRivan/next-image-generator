/* eslint-disable @next/next/no-img-element -- Local blob previews and provider URLs are displayed directly; avoid optimizer fetches and arbitrary remote-domain configuration. */
"use client";

import {
  ArrowUpRight,
  Download,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  parseGenerationResponse,
  validateImageFile,
} from "@/lib/client/generation";

type Mode = "text" | "image";
type Result = {
  url: string;
  source: string | null;
  prompt: string;
  mode: Mode;
};
const EXAMPLE =
  "A small seaside café at golden hour, watercolor illustration, warm colors, no text";

export function ImageGenerator() {
  const [mode, setMode] = useState<Mode>("text");
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [imageError, setImageError] = useState(false);
  const pending = useRef(false);
  const requestController = useRef<AbortController | null>(null);
  const resultSource = useRef<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (preview) return () => URL.revokeObjectURL(preview);
  }, [preview]);
  useEffect(
    () => () => {
      requestController.current?.abort();
      if (resultSource.current) URL.revokeObjectURL(resultSource.current);
    },
    [],
  );

  function chooseFile(selected: File | undefined) {
    setError("");
    setPreview(null);
    if (!selected) {
      setFile(null);
      return;
    }
    const invalid = validateImageFile(selected);
    if (invalid) {
      setError(invalid);
      setFile(null);
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  async function generate(event?: FormEvent) {
    event?.preventDefault();
    if (pending.current) return;
    setError("");
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || cleanPrompt.length > 1000) {
      setError("Describe your image in 1–1000 characters.");
      return;
    }
    if (mode === "image" && !file) {
      setError("Choose a source image before generating.");
      return;
    }
    pending.current = true;
    setBusy(true);
    setDownloadError("");
    requestController.current = new AbortController();
    // Aborting the browser request does not guarantee cancellation of a paid provider job.
    const timeout = setTimeout(
      () => requestController.current?.abort(),
      125_000,
    );
    try {
      let body: string | FormData;
      if (mode === "image") {
        const form = new FormData();
        form.append("prompt", cleanPrompt);
        form.append("image", file!);
        body = form;
      } else {
        body = JSON.stringify({ prompt: cleanPrompt });
      }
      const response = await fetch(
        `/api/${mode === "text" ? "text-to-image" : "image-to-image"}`,
        {
          method: "POST",
          body,
          ...(mode === "text"
            ? { headers: { "Content-Type": "application/json" } }
            : {}),
          signal: requestController.current.signal,
        },
      );
      const url = await parseGenerationResponse(response);
      if (resultSource.current) URL.revokeObjectURL(resultSource.current);
      resultSource.current =
        mode === "image" && file ? URL.createObjectURL(file) : null;
      setResult({
        url,
        source: resultSource.current,
        prompt: cleanPrompt,
        mode,
      });
      setImageError(false);
      requestAnimationFrame(() => heading.current?.focus());
    } catch (cause) {
      setError(
        cause instanceof Error && cause.name === "AbortError"
          ? "The request timed out. A provider job may still be running and may incur a charge. Check your Cloudflare dashboard before trying again."
          : cause instanceof TypeError
            ? "Could not reach the server. Check your connection before trying again."
            : cause instanceof Error
              ? cause.message
              : "Generation failed. Please try again later.",
      );
    } finally {
      clearTimeout(timeout);
      pending.current = false;
      setBusy(false);
    }
  }

  async function download() {
    if (!result || downloading) return;
    setDownloading(true);
    setDownloadError("");
    try {
      const response = await fetch(result.url);
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) throw new Error();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `image-lab-${Date.now()}.${blob.type === "image/jpeg" ? "jpg" : blob.type === "image/webp" ? "webp" : "png"}`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setDownloadError(
        "The image host did not allow a direct download. Open the image and save it from your browser.",
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 items-stretch overflow-hidden rounded-xl border border-border bg-surface min-[741px]:grid-cols-[310px_minmax(0,1fr)] min-[1001px]:grid-cols-[340px_minmax(0,1fr)]">
        <section
          className="min-w-0 border-b border-border bg-surface min-[741px]:border-r min-[741px]:border-b-0"
          aria-label="Generation settings"
        >
          <div className="px-6 py-[26px]">
            <Tabs
              value={mode}
              onValueChange={(value) => {
                if (!busy) {
                  setMode(value as Mode);
                  setError("");
                }
              }}
            >
              <TabsList aria-label="Generation mode">
                <TabsTrigger value="text" disabled={busy}>
                  Text to image
                </TabsTrigger>
                <TabsTrigger value="image" disabled={busy}>
                  Image to image
                </TabsTrigger>
              </TabsList>
              <TabsContent value="text">
                <p className="mt-[9px] max-w-[65ch] text-[13px] leading-[1.6] text-muted">
                  Create a new image from a written prompt.
                </p>
              </TabsContent>
              <TabsContent value="image">
                <p className="mt-[9px] max-w-[65ch] text-[13px] leading-[1.6] text-muted">
                  Upload an image and describe what to change.
                </p>
              </TabsContent>
            </Tabs>
            <form onSubmit={generate}>
              <fieldset disabled={busy} className="m-0 min-w-0 border-0 p-0">
                {mode === "image" && (
                  <div className="mt-[27px]">
                    <div className="mb-2.5 flex items-center justify-between gap-2.5">
                      <label
                        className="text-[13px] font-semibold"
                        htmlFor="source-image"
                      >
                        Source image
                      </label>
                      <span className="text-[11px] text-muted">
                        Up to 3 MiB
                      </span>
                    </div>
                    <input
                      id="source-image"
                      className="block w-full rounded-lg border border-dashed border-border bg-field p-3 text-xs"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => chooseFile(event.target.files?.[0])}
                      aria-describedby="source-hint"
                    />
                    <p
                      id="source-hint"
                      className="mt-[9px] max-w-[65ch] text-[13px] leading-[1.6] text-muted"
                    >
                      JPG, PNG, or WebP. Only upload images you have permission
                      to use.
                    </p>
                    {preview && (
                      <img
                        className="mt-3 max-h-[170px] w-full rounded-md bg-background object-contain"
                        src={preview}
                        alt="Selected source"
                      />
                    )}
                  </div>
                )}
                <div className="mt-[27px]">
                  <div className="mb-2.5 flex items-center justify-between gap-2.5">
                    <label
                      className="text-[13px] font-semibold"
                      htmlFor="prompt"
                    >
                      Describe your image
                    </label>
                    <span className="text-[11px] text-muted">
                      {prompt.length}/1000
                    </span>
                  </div>
                  <textarea
                    id="prompt"
                    className="block min-h-[184px] w-full resize-y rounded-[5px] border border-border bg-field p-[13px] text-sm leading-[1.7] text-foreground placeholder:text-muted/90"
                    rows={6}
                    maxLength={1000}
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder={
                      mode === "text"
                        ? "A quiet coastal town, soft morning light, watercolor illustration…"
                        : "Describe how you want to transform your image…"
                    }
                    aria-describedby="prompt-hint"
                  />
                  <p
                    id="prompt-hint"
                    className="mt-[9px] max-w-[65ch] text-[13px] leading-[1.6] text-muted"
                  >
                    Include a subject, a setting, and a visual style.
                  </p>
                  <button
                    className="mt-2.5 cursor-pointer border-0 bg-transparent p-0 text-[13px] text-accent underline underline-offset-[3px] disabled:cursor-not-allowed disabled:opacity-55"
                    type="button"
                    onClick={() => setPrompt(EXAMPLE)}
                  >
                    Try an example prompt
                  </button>
                </div>
                {mode === "image" && (
                  <div className="mt-[27px]">
                    <p className="mt-[9px] max-w-[65ch] text-[13px] leading-[1.6] text-muted">
                      Output is 1024 × 1024. Your reference is resized before
                      processing.
                    </p>
                  </div>
                )}
                <div className="mt-[30px]">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={busy}
                    aria-label={busy ? "Generating image" : "Generate image"}
                  >
                    {busy && (
                      <LoaderCircle
                        className="animate-spin [animation-duration:1.2s] motion-reduce:animate-none"
                        size={17}
                      />
                    )}
                    {busy ? "Generating image…" : "Generate image"}
                  </Button>
                  <p className="mt-2.5 text-center text-xs text-muted">
                    Each generation uses your Cloudflare AI allocation.
                  </p>
                </div>
              </fieldset>
            </form>
            {error && (
              <div
                className="mt-[18px] rounded-lg border border-[#d99a9a] bg-[#fdf3f3] p-3 text-xs text-[#a52c32] dark:bg-[#321f24] dark:text-[#ffb5b5]"
                role="alert"
              >
                {error}
              </div>
            )}
          </div>
          <div className="flex items-start gap-2 border-t border-border px-6 py-[18px] text-[11px] text-muted">
            <ShieldCheck size={14} className="mt-0.5 shrink-0" />
            <span>
              Your images are sent to Cloudflare Workers AI for processing.
              Results are not saved in this app.
            </span>
          </div>
        </section>
        <section
          className="flex min-w-0 flex-col bg-canvas"
          aria-label="Generated image"
          aria-busy={busy}
        >
          <div className="flex items-center justify-between gap-[15px] px-7 py-[22px]">
            <h2 className="text-sm font-semibold" ref={heading} tabIndex={-1}>
              Preview
            </h2>
            <span className="text-xs text-muted">
              {busy
                ? "Processing"
                : result
                  ? "Generation complete"
                  : "No image yet"}
            </span>
          </div>
          {busy ? (
            <div className="grid min-h-80 flex-1 place-items-center px-5 pt-2 pb-6 min-[741px]:min-h-[460px] min-[741px]:px-8 min-[741px]:pt-6 min-[741px]:pb-9">
              <output
                className="flex aspect-square w-full max-w-[480px] flex-col items-center justify-center bg-surface p-6 text-center shadow-[0_2px_5px_#24332e0a,0_18px_40px_-24px_#24332e45] min-[741px]:p-8"
                aria-live="polite"
              >
                <LoaderCircle
                  size={24}
                  className="mb-5 animate-spin [animation-duration:1.2s] text-accent motion-reduce:animate-none"
                  aria-hidden="true"
                />
                <strong className="mb-2 max-w-[15ch] font-display text-[clamp(24px,2.5vw,34px)] leading-[1.2] font-normal tracking-[-0.7px]">
                  Generating your image
                </strong>
                <span className="max-w-[29ch] text-[13px] leading-[1.7] text-muted">
                  This can take a little while. Keep this page open while your
                  image is generated.
                </span>
              </output>
            </div>
          ) : result ? (
            <>
              <div
                className={`grid gap-4 px-7 pt-2 pb-7 ${result.source ? "min-[741px]:grid-cols-2" : ""}`}
              >
                {result.source && (
                  <figure className="m-0 min-w-0">
                    <img
                      className="block max-h-[560px] min-h-40 w-full rounded-md bg-background object-contain"
                      src={result.source}
                      alt="Original source for this generation"
                    />
                    <figcaption className="mt-2 text-[13px] text-muted [overflow-wrap:anywhere]">
                      Original image
                    </figcaption>
                  </figure>
                )}
                <figure className="m-0 min-w-0">
                  <img
                    className="block max-h-[560px] min-h-40 w-full rounded-md bg-background object-contain"
                    src={result.url}
                    alt="AI-generated result"
                    onError={() => setImageError(true)}
                  />
                  <figcaption className="mt-2 text-[13px] text-muted [overflow-wrap:anywhere]">
                    {result.prompt}
                  </figcaption>
                </figure>
              </div>
              {imageError && (
                <p
                  className="mt-[9px] max-w-[65ch] text-[13px] leading-[1.6] text-muted px-5 pb-4"
                  role="alert"
                >
                  The result URL was returned, but the image could not load. The
                  host may be unavailable or the URL may have expired.
                </p>
              )}
              <div className="flex flex-wrap gap-[9px] px-7 pb-5">
                <Button type="button" onClick={download} disabled={downloading}>
                  <Download size={15} />
                  {downloading ? "Downloading…" : "Download image"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void generate()}
                >
                  <RefreshCw size={15} />
                  Generate again
                </Button>
                <Button asChild variant="ghost">
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open image
                    <ArrowUpRight size={14} />
                  </a>
                </Button>
              </div>
              <p className="m-0 max-w-[65ch] px-5 pb-[18px] text-[13px] leading-[1.6] text-muted">
                Generate again uses your current settings and starts another
                paid request.
              </p>
              {downloadError && (
                <p
                  className="mx-5 mb-5 rounded-lg border border-[#d99a9a] bg-[#fdf3f3] p-3 text-xs text-[#a52c32] dark:bg-[#321f24] dark:text-[#ffb5b5]"
                  role="alert"
                >
                  {downloadError}
                </p>
              )}
            </>
          ) : (
            <div className="grid min-h-80 flex-1 place-items-center px-5 pt-2 pb-6 min-[741px]:min-h-[460px] min-[741px]:px-8 min-[741px]:pt-6 min-[741px]:pb-9">
              <div className="flex aspect-square w-full max-w-[480px] flex-col items-center justify-center bg-surface p-6 text-center shadow-[0_2px_5px_#24332e0a,0_18px_40px_-24px_#24332e45] min-[741px]:p-8">
                <h3 className="mb-2 max-w-[15ch] font-display text-[clamp(24px,2.5vw,34px)] leading-[1.2] font-normal tracking-[-0.7px]">
                  A space for your next image.
                </h3>
                <p className="max-w-[29ch] text-[13px] leading-[1.7] text-muted">
                  {mode === "text"
                    ? "Write a prompt, then choose Generate image."
                    : "Choose a source image and describe your changes."}
                </p>
              </div>
            </div>
          )}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3.5 px-7 py-4 text-xs text-muted">
            <span>One image per generation</span>
            <span>Cloudflare Workers AI</span>
          </div>
        </section>
      </div>
      <footer className="mt-[18px] flex flex-wrap justify-between gap-2.5 text-xs text-muted">
        <span>
          Review generated images before use. Download the ones you want to
          keep.
        </span>
      </footer>
    </>
  );
}
