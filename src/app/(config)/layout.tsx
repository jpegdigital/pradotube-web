import { redirect } from "next/navigation";
import { AppCanvas } from "@/components/app-canvas";
import { verifySession } from "@/lib/auth/dal";
import { ConfigHeader } from "./_components/config-header";
import { ConfigSidebar } from "./_components/config-sidebar";
import { NewChannelDialog } from "./_components/new-channel-dialog";
import { getConfigSidebar } from "./_lib/get-creators";

export default async function ConfigLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await verifySession();
  if (!session.isAdmin) redirect("/403");

  const sidebar = await getConfigSidebar();

  return (
    <div className="config-root flex h-screen flex-col overflow-hidden">
      <AppCanvas />
      <ConfigHeader />
      <div className="config-shell">
        <ConfigSidebar data={sidebar} />
        <main className="config-main">
          <div className="config-main-inner">{children}</div>
        </main>
      </div>
      <NewChannelDialog />
    </div>
  );
}
