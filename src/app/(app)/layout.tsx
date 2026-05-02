import { AppCanvas } from "@/components/app-canvas";
import { AppHeader } from "@/components/app-header";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppCanvas />
      <AppHeader />
      <main className="relative z-10 flex-1">{children}</main>
      <footer className="relative z-10 py-8 text-center">
        <p className="font-body text-sm text-muted-foreground">
          Curated with care for little viewers
        </p>
      </footer>
    </div>
  );
}
