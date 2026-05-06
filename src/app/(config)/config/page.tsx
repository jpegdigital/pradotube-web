import { Settings2, Sparkles } from "lucide-react";

export default function ConfigIndexPage() {
  return (
    <div className="config-welcome" data-canvas="muted">
      <div className="config-welcome-card">
        <span className="config-welcome-eyebrow font-body">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Studio
        </span>
        <h1 className="config-welcome-title font-heading">
          Pick a creator to start tuning.
        </h1>
        <p className="config-welcome-body font-body">
          Choose a creator from the list to manage their channels — ratings,
          age range, duration limits, sync mode, and avatars all live on the
          detail page.
        </p>
        <div className="config-welcome-hints font-body">
          <div className="config-welcome-hint">
            <Settings2 className="h-4 w-4" aria-hidden />
            <span>
              Use the <strong>+</strong> in the bottom right to add a new
              channel — it&apos;ll land in <em>Ungrouped</em> until you assign
              it.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
