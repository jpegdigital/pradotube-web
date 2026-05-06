import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SettingsMenu } from "@/components/settings-menu";

export function ConfigHeader() {
  return (
    <header className="player-header relative z-50 px-5 py-3">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="logo-link flex items-center"
            aria-label="PradoTube home"
          >
            <span className="logo-balloon-text" aria-hidden="true">
              <span style={{ color: "var(--coral)" }}>P</span>
              <span style={{ color: "#FF6E2C" }}>r</span>
              <span style={{ color: "var(--peach)" }}>a</span>
              <span style={{ color: "var(--sunflower)" }}>d</span>
              <span style={{ color: "#89E219" }}>o</span>
              <span style={{ color: "var(--mint)" }}>T</span>
              <span style={{ color: "var(--teal)" }}>u</span>
              <span style={{ color: "var(--sky)" }}>b</span>
              <span style={{ color: "var(--lavender)" }}>e</span>
            </span>
          </Link>
          <span
            className="config-eyebrow font-body hidden items-center text-[10px] font-extrabold tracking-[0.18em] uppercase sm:inline-flex"
            aria-hidden
          >
            Config
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/shows"
            className="config-back-link font-body inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Back to feed</span>
            <span className="sm:hidden">Feed</span>
          </Link>
          <SettingsMenu />
        </div>
      </div>
    </header>
  );
}
