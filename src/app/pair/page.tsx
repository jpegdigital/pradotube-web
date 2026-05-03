"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";

const CODE_LENGTH = 6;

export default function PairPage() {
  const [digits, setDigits] = useState<string[]>(() =>
    Array.from({ length: CODE_LENGTH }, () => "")
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const focusIndex = useCallback((idx: number) => {
    const target = inputsRef.current[idx];
    if (target) {
      target.focus();
      target.select();
    }
  }, []);

  const submitCode = useCallback(async (code: string) => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/devices/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? "Could not pair this device");
      }
      // Full reload so the freshly-set sb-* cookie is picked up by the
      // proxy on the next navigation.
      window.location.href = "/";
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not pair this device"
      );
      setSubmitting(false);
    }
  }, []);

  const handleChange = (idx: number, value: string) => {
    const cleaned = value.replace(/[^0-9]/g, "").slice(0, 1);
    setDigits((prev) => {
      const next = [...prev];
      next[idx] = cleaned;
      return next;
    });
    if (cleaned && idx < CODE_LENGTH - 1) {
      focusIndex(idx + 1);
    }
  };

  const handleKeyDown = (
    idx: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      focusIndex(idx - 1);
    }
    if (e.key === "ArrowLeft" && idx > 0) {
      e.preventDefault();
      focusIndex(idx - 1);
    }
    if (e.key === "ArrowRight" && idx < CODE_LENGTH - 1) {
      e.preventDefault();
      focusIndex(idx + 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/[^0-9]/g, "");
    if (!pasted) return;
    e.preventDefault();
    const next = Array.from({ length: CODE_LENGTH }, (_, i) => pasted[i] ?? "");
    setDigits(next);
    const lastFilled = Math.min(pasted.length, CODE_LENGTH) - 1;
    focusIndex(Math.max(0, lastFilled));
    if (pasted.length >= CODE_LENGTH) {
      void submitCode(next.join(""));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join("");
    if (code.length === CODE_LENGTH) {
      void submitCode(code);
    }
  };

  const isComplete = digits.every((d) => d !== "");

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-md text-center">
        <h1 className="font-heading text-3xl text-foreground sm:text-4xl">
          Enter the code
        </h1>
        <p className="mt-3 font-body text-muted-foreground">
          The grown-up made a 6-digit code for you.
        </p>

        <form onSubmit={handleSubmit} className="mt-10">
          <div className="flex justify-center gap-2 sm:gap-3">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputsRef.current[i] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                autoComplete="one-time-code"
                aria-label={`Digit ${i + 1}`}
                value={d}
                disabled={submitting}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                onFocus={(e) => e.target.select()}
                className="font-heading h-16 w-12 rounded-2xl border-2 border-border bg-card text-center text-3xl text-foreground caret-primary outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/20 disabled:opacity-60 sm:h-20 sm:w-14 sm:text-4xl"
              />
            ))}
          </div>

          {error && (
            <p
              role="alert"
              className="mt-6 font-body text-sm font-semibold text-destructive"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!isComplete || submitting}
            className="mt-8 inline-flex h-14 w-full items-center justify-center rounded-full bg-primary px-8 font-heading text-xl text-primary-foreground shadow-md transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Setting up…" : "Let’s go"}
          </button>
        </form>

        <p className="mt-10 font-body text-sm text-muted-foreground">
          <Link
            href="/setup"
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            &larr; Back
          </Link>
        </p>
      </div>
    </main>
  );
}
