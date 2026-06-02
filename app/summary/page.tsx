import { SummaryContent } from "@/components/summary-content";
import { getServerSession } from "@/lib/session-server";
import { redirect } from "next/navigation";

export default async function SummaryPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return <SummaryContent />;
}
