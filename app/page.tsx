import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session-server";
import { HomeContent } from "@/components/home-content";

export default async function HomePage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return <HomeContent />;
}
