import { Aperture } from "lucide-react";
import Link from "next/link";
import { ImageGenerator } from "@/components/image-generator/image-generator";
import { ThemeToggle } from "@/components/image-generator/theme-toggle";

export default function Home() {
  return (
    <>
      <header className="h-[70px] min-[741px]:h-[84px]">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-5 px-6 min-[1001px]:px-10">
          <Link
            className="flex items-center gap-3 font-display text-[23px] font-semibold tracking-[-0.5px] no-underline"
            href="/"
            aria-label="Image Lab home"
          >
            <span className="grid size-9 place-items-center text-accent">
              <Aperture size={23} />
            </span>
            Image Lab
          </Link>
          <nav
            className="flex items-center gap-2 min-[741px]:gap-[18px]"
            aria-label="Project links"
          >
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main
        id="main"
        className="mx-auto max-w-[1440px] px-6 pt-[30px] pb-7 min-[741px]:pt-8 min-[1001px]:px-10"
      >
        <div className="mb-6 flex items-center justify-between gap-5 min-[741px]:mb-9">
          <div>
            <h1 className="mb-2.5 font-display text-[clamp(32px,3.4vw,48px)] leading-[1.1] font-medium tracking-[-1.5px]">
              Make room for an image.
            </h1>
            <p className="text-[15px] text-muted">
              Describe a scene or rework an image of your own.
            </p>
          </div>
        </div>
        <ImageGenerator />
      </main>
    </>
  );
}
