import { Play, Tv } from "lucide-react";
import Link from "next/link";

export function EmptyCreatorsState() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="relative z-10 flex flex-col items-center gap-5 px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-linear-to-br from-primary/20 to-lavender/20 ring-1 ring-primary/15">
          <Tv className="h-9 w-9 text-primary" />
        </div>
        <h1 className="font-heading text-2xl text-foreground">No creators yet</h1>
        <p className="font-body max-w-md text-muted-foreground">
          No creators are subscribed for your account yet. Ask a parent to set
          up your feed!
        </p>
        <Link
          href="/shows"
          className="font-body mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/25 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/30"
        >
          <Play className="h-4 w-4" />
          Go to Feed
        </Link>
      </div>
    </div>
  );
}
