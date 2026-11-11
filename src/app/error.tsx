"use client";
import { Button } from "@/components/ui/button";
export default function ErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto max-w-[1440px] px-6 pt-[30px] pb-7 min-[741px]:pt-8 min-[1001px]:px-10">
      <h1>This workspace could not load.</h1>
      <p>Please reload the interface. This will not start a new generation.</p>
      <Button onClick={reset}>Reload interface</Button>
    </main>
  );
}
