import { MaterialFormContent } from "@/components/material-form-content";
import { getServerSession } from "@/lib/session-server";
import { redirect } from "next/navigation";

export default async function NewMaterialPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");
  return <MaterialFormContent />;
}
