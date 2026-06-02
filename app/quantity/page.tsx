import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session-server";
import { QuantityContent } from "@/components/quantity-content";

export default async function QuantityPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return <QuantityContent />;
}
