import { Tv } from "lucide-react";
import { ShowsGrid } from "./_components/shows-grid";
import { getShowsInitial } from "./_lib/get-shows";

export default async function ShowsPage() {
  const { firstPage, creators } = await getShowsInitial();

  if (firstPage.videos.length === 0) {
    return (
      <div data-canvas="muted" className="flex flex-1 items-center justify-center">
        <div className="relative z-10 flex flex-col items-center gap-5 px-6 pt-24 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-linear-to-br from-primary/20 to-lavender/20 ring-1 ring-primary/15">
            <Tv className="h-9 w-9 text-primary" />
          </div>
          <h1 className="font-heading text-2xl text-foreground">
            No videos available yet
          </h1>
          <p className="font-body max-w-md text-muted-foreground">
            Ask a parent to set up your subscriptions!
          </p>
        </div>
      </div>
    );
  }

  return (
    <ShowsGrid
      initialPage={firstPage}
      creators={creators}
      activeSlug={null}
    />
  );
}
