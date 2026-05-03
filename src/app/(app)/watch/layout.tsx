import { UpNextSidebar } from "./_components/up-next-sidebar";
import { getUpNext } from "./_lib/get-up-next";

export default async function WatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const upNext = await getUpNext();

  return (
    <div data-canvas="muted" className="px-2 pb-16 sm:px-3 lg:px-4">
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-3 xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-4">
        <div className="min-w-0">{children}</div>
        <UpNextSidebar initialPage={upNext} />
      </div>
    </div>
  );
}
