import { getSubscriptionMatrix } from "./_lib/get-subscription-matrix";
import { SubscriptionMatrix } from "./_components/subscription-matrix";

export const dynamic = "force-dynamic";

export default async function SubscriptionsPage() {
  const data = await getSubscriptionMatrix();
  return <SubscriptionMatrix data={data} />;
}
