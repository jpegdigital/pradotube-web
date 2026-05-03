import Link from "next/link";
import { requireEnv } from "@/lib/env";

export default function SetupPage() {
  const authUrl = requireEnv(
    process.env.NEXT_PUBLIC_AUTH_URL,
    "NEXT_PUBLIC_AUTH_URL"
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-md text-center">
        <h1 className="font-heading text-4xl text-foreground sm:text-5xl">
          Hi! 👋
        </h1>
        <p className="mt-4 font-body text-lg text-muted-foreground">
          Ask a grown-up to set this up. When they&rsquo;re ready, tap below.
        </p>

        <Link
          href="/pair"
          className="mt-10 inline-flex h-14 w-full items-center justify-center rounded-full bg-primary px-8 font-heading text-xl text-primary-foreground shadow-md transition-all hover:brightness-110 active:scale-[0.98]"
        >
          Set me up
        </Link>

        <p className="mt-12 font-body text-sm text-muted-foreground">
          <a
            href={`${authUrl}/login`}
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            I&rsquo;m a grown-up &rarr;
          </a>
        </p>
      </div>
    </main>
  );
}
