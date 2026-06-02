import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session-server";
import { UsageContent } from "@/components/usage-content";

export default async function UsagePage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return <UsageContent />;
}
