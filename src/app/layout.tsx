import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";

export const metadata: Metadata = {
  title: "Image Lab — AI Image Generator",
  description:
    "Create images from words and transform your own images with Next.js and Cloudflare Workers AI.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="m-0 bg-background font-sans leading-[1.55] text-foreground [-webkit-tap-highlight-color:transparent]">
        <ThemeProvider
          attribute="data-theme"
          storageKey="frame-theme"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
