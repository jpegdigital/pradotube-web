"use client";

import { useMediaRemote, useMediaState } from "@vidstack/react";
import { Pause, Play } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

type Burst = { id: number; kind: "play" | "pause" };

export function TapToToggle() {
  const remote = useMediaRemote();
  const paused = useMediaState("paused");
  const controlsVisible = useMediaState("controlsVisible");
  const [burst, setBurst] = useState<Burst | null>(null);
  const burstId = useRef(0);

  function handleTap(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (paused) {
      remote.play(event.nativeEvent);
    } else {
      remote.pause(event.nativeEvent);
    }
    burstId.current += 1;
    setBurst({ id: burstId.current, kind: paused ? "play" : "pause" });
  }

  function handleBurstEnd() {
    setBurst(null);
  }

  return (
    <>
      <button
        type="button"
        aria-label={paused ? "Play" : "Pause"}
        onClick={handleTap}
        className={cn(
          "absolute inset-x-0 top-0 z-10 cursor-pointer touch-manipulation select-none bg-transparent",
          // leave room for the controls bar when it's visible so kids can still scrub
          controlsVisible ? "bottom-24 sm:bottom-20" : "bottom-0",
        )}
        // iOS Safari: prevent the native tap-highlight gray flash so our custom feedback is the only thing they see
        style={{ WebkitTapHighlightColor: "transparent" }}
      />
      {burst ? (
        <div
          key={burst.id}
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
          onAnimationEnd={handleBurstEnd}
        >
          <div className="tap-burst flex h-24 w-24 items-center justify-center rounded-full bg-white/95 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.55)] ring-4 ring-white/40 sm:h-28 sm:w-28">
            {burst.kind === "play" ? (
              <Play
                className="h-12 w-12 translate-x-[3px] fill-[var(--color-mint)] text-[var(--color-mint)] sm:h-14 sm:w-14"
                strokeWidth={2.5}
              />
            ) : (
              <Pause
                className="h-12 w-12 fill-[var(--color-coral)] text-[var(--color-coral)] sm:h-14 sm:w-14"
                strokeWidth={2.5}
              />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
