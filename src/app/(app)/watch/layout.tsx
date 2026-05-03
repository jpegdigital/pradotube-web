import { UpNextDrawer } from "./_components/up-next-drawer";
import { getUpNext } from "./_lib/get-up-next";
import { getWatchCreators } from "./_lib/get-watch-creators";

export default async function WatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [upNext, creators] = await Promise.all([
    getUpNext(),
    getWatchCreators(),
  ]);

  return (
    <div data-canvas="muted" className="px-2 pb-16 sm:px-3 lg:px-5">
      <div className="mx-auto max-w-5xl">{children}</div>
      <UpNextDrawer initialPage={upNext} creators={creators} />
    </div>
  );
}
