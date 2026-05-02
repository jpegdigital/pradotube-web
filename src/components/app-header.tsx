import Link from "next/link";
import { SettingsMenu } from "@/components/settings-menu";

export function AppHeader() {
  return (
    <header className="player-header relative z-50 border-b border-border/50 px-5 py-3">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href="/" className="logo-link flex items-center" aria-label="PradoTube home">
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
        <SettingsMenu />
      </div>
    </header>
  );
}
