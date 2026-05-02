import { notFound } from "next/navigation";
import { ShowsGrid } from "../_components/shows-grid";
import { getShowsInitial } from "../_lib/get-shows";

export default async function CreatorShowsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { firstPage, creators } = await getShowsInitial(slug);
  if (firstPage.videos.length === 0) notFound();

  return (
    <ShowsGrid
      initialPage={firstPage}
      creators={creators}
      activeSlug={slug}
    />
  );
}
