import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session-server";
import { MaterialPickerContent } from "@/components/material-picker-content";

export default async function PickPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return <MaterialPickerContent />;
}
