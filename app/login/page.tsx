import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session-server";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const session = await getServerSession();
  if (session) redirect("/");
  return <LoginForm />;
}
