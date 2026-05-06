import { getDevicesPaneData } from "./_lib/get-devices";
import { DevicesPane } from "./_components/devices-pane";

export const dynamic = "force-dynamic";

export default async function DevicesPage() {
  const data = await getDevicesPaneData();
  return <DevicesPane data={data} />;
}
