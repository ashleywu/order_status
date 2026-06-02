import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session-server";
import { ReviewContent } from "@/components/review-content";

export default async function ReviewPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return <ReviewContent />;
}
