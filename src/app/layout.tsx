import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  display: "swap",
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "PradoTube — Curated YouTube for Kids",
  description:
    "A parent-curated YouTube experience. Only the channels you trust, none of the slop.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
